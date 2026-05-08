// Smart link-insertion agent.
//
// Replaces the template-based orphanFixProseTemplates.js with a Claude call
// that:
//   1. Reads the source page's existing body content (i18n strings)
//   2. Picks the BEST i18n key to insert AFTER (topical relevance to target)
//   3. Writes a new bridging paragraph in all 7 locales that hosts the anchor
//      and flows naturally with surrounding prose
//
// Output shape (one call per (sourcePage, target, anchor) edge):
// {
//   insertAfterKey: 'blogRoadtrip.dayOneIntro',  // existing key to follow
//   prose: {
//     en: { pre: '...', anchor: 'Car Hire at Podgorica Airport', post: '...' },
//     de: { pre: '...', anchor: 'Mietwagen am Flughafen Podgorica', post: '...' },
//     ... (all 7 locales)
//   }
// }
//
// Used by ship-queue's applyOrphanFixToBranch (replaces the template lookup +
// hardcoded "insert at bottom" path) when item.smart === true.

import { Octokit } from '@octokit/rest';
import { chatOnce } from './anthropicClient.js';

const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', branch: 'master' },
};

// Map source page → namespace where its body lives in en.json (mirror of
// implementOrphanFix.js SOURCE_FILES). Used to slice just the relevant
// content for Claude rather than sending the whole 2MB locale file.
const PAGE_TO_BODY_NAMESPACE = {
  '/': 'home',
  '/about': 'aboutBody',
  '/kotor': 'kotorBody', '/budva': 'budvaBody', '/tivat': 'tivatBody',
  '/podgorica': 'podgoricaBody', '/perast': 'perastBody', '/herceg-novi': 'hercegNoviBody',
  '/ulcinj': 'ulcinjBody', '/bar': 'barBody', '/niksic': 'niksicBody',
  '/montenegro': 'montenegroBody',
  '/podgorica-airport': 'podgoricaAirportBody',
  '/tivat-airport': 'tivatAirportBody',
  '/dubrovnik-airport': 'dubrovnikAirportBody',
  '/border-crossing-guide': 'borderCrossingBody',
  '/montenegro-driving-guide': 'drivingGuideBody',
  '/blog/montenegro-road-trip-10-days': 'blogRoadtrip',
  '/blog/montenegro-camping-car': 'blogCamping',
  '/blog/montenegro-beaches-by-car': 'blogBeaches',
  '/blog/montenegro-monasteries-circuit': 'blogMonasteries',
  '/blog/montenegro-mountain-passes': 'blogPasses',
  '/blog/montenegro-national-parks': 'blogParks',
  '/blog/montenegro-autumn-colours': 'blogAutumn',
  '/blog/montenegro-wine-road': 'blogWine',
  '/blog/tara-river-canyon-drive': 'blogTara',
};

function octokit() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_TOKEN env var not set');
  return new Octokit({ auth: token });
}

async function fetchEnJson(siteId, branch) {
  const cfg = SITE_REPOS[siteId];
  if (!cfg) throw new Error(`No repo config for ${siteId}`);
  const gh = octokit();
  const { data } = await gh.repos.getContent({
    owner: cfg.owner, repo: cfg.repo,
    path: 'src/i18n/locales/en.json',
    ref: branch || cfg.branch,
  });
  if (Array.isArray(data) || data.type !== 'file') throw new Error('en.json not a file');
  return JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));
}

// Slice the source page's body keys (string entries only) so we only send
// what's relevant to Claude. Returns array of { key, kind, text } in
// declaration order (which approximates render order in the JSX).
function sliceBody(enJson, sourcePage) {
  const ns = PAGE_TO_BODY_NAMESPACE[sourcePage];
  if (!ns) return [];
  const body = enJson[ns] || {};
  const sections = [];
  for (const [k, v] of Object.entries(body)) {
    if (typeof v !== 'string') continue;
    // Skip existing link-component keys (Pre/Text/Post triplets) — they're
    // already structured for links, not narrative paragraphs we'd insert near.
    if (/(Link|Body)(Pre|Text|Post)$/.test(k)) continue;
    sections.push({ key: `${ns}.${k}`, kind: k, text: v });
  }
  return sections;
}

// Generate a single smart insertion plan for one (sourcePage → target) edge.
// `anchorVariant` is { label, text } picked by the suggestion engine.
// `targetTopQuery` is the GSC top query for the target (helps Claude write
// prose that sounds natural and topically aligned).
export async function generateSmartInsertion({
  siteId,
  sourcePage,
  targetPath,
  anchorVariant,
  targetTopQuery,
}) {
  const en = await fetchEnJson(siteId);
  const body = sliceBody(en, sourcePage);
  if (body.length === 0) {
    throw new Error(`No body content found for ${sourcePage} (namespace ${PAGE_TO_BODY_NAMESPACE[sourcePage] || 'unknown'})`);
  }

  const system = `You are a content editor for a Montenegro car-rental site (montenegrocarhire.com). Your task: insert ONE natural cross-reference paragraph into a page that already exists.

Hard rules:
1. Pick exactly ONE existing i18n key to insert AFTER — choose the paragraph that's MOST topically related to the target (so the new paragraph reads as a natural continuation, not a non-sequitur).
2. Write a new paragraph in 7 locales (en, de, fr, it, me, pl, ru) using a Pre / anchor / Post structure:
   - "pre" + <anchor link to target> + "post" rendered as <p>{pre}<a>{anchor}</a>{post}</p>
   - The anchor TEXT is fixed (given to you). You can place it anywhere in the sentence — beginning, middle, end — wherever reads most natural.
3. The new paragraph must:
   - Bridge naturally from the previous (existing) paragraph's topic
   - Mention the target page contextually (why a reader of THIS page might want THAT page)
   - Read as a single sentence or two, not a paragraph block
   - Stay under ~200 chars per locale (matching surrounding paragraphs)
4. Each locale uses its native rental term: DE Mietwagen, FR location de voiture, IT noleggio auto, ME rent a car, PL wypożyczalnia, RU аренда. The given anchor text is already in the right locale (we'll provide a per-locale anchor in step 2 — for now just write the EN version with the EN anchor).

Output strict JSON only. No markdown, no commentary.`;

  const userPrompt = `Source page: ${sourcePage}
Target page: ${targetPath}
Target top GSC query: ${targetTopQuery || '(unknown)'}
Anchor text (EN): "${anchorVariant.text}"
Anchor variant label: ${anchorVariant.label}

Existing body content of source page (in declaration order):
${JSON.stringify(body.map(s => ({ key: s.key, text: s.text })), null, 2)}

Output JSON:
{
  "insertAfterKey": "<one of the keys above>",
  "reason": "<one sentence why this insertion point>",
  "prose": {
    "en": { "pre": "...", "anchor": "${anchorVariant.text}", "post": "..." }
  }
}`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 1500,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.insertAfterKey || !parsed.prose?.en) {
    throw new Error('Smart insertion response missing insertAfterKey or prose.en');
  }
  // Validate that insertAfterKey actually exists in the body we sent
  if (!body.find(s => s.key === parsed.insertAfterKey)) {
    throw new Error(`Smart insertion picked invalid key ${parsed.insertAfterKey}`);
  }

  return {
    insertAfterKey: parsed.insertAfterKey,
    reason: parsed.reason,
    prose: { en: parsed.prose.en },  // EN only at this stage
    usage, authMode, fallback, fallbackReason,
  };
}

// Translate the EN prose to the other 6 locales. Separate call so EN
// iteration doesn't burn locale tokens. anchorMatrix (from buildOrphanFixList)
// provides the per-locale anchor text — we tell Claude to use that exact
// string so it matches our anchor diversification policy.
export async function translateSmartInsertion({
  enProse,
  targetPath,
  anchorMatrix,
  anchorLabel,
}) {
  // Pick the per-locale anchor texts from the matrix (with fallback through
  // the same chain as the UI's CandidateSourceRow uses).
  const FALLBACK_BY_LABEL = {
    longtail: ['exact', 'partial', 'contextual'],
    contextual: ['partial', 'exact'],
    branded: ['exact', 'partial'],
    partial: ['exact', 'contextual'],
    exact: ['partial', 'contextual'],
    generic: ['partial'],
    nakedUrl: ['exact'],
    weak: ['weak', 'generic'],
  };
  const anchorByLocale = {};
  for (const loc of LOCALES) {
    const variants = anchorMatrix?.[loc] || [];
    let v = variants.find(x => x.label === anchorLabel);
    if (!v) {
      for (const fb of FALLBACK_BY_LABEL[anchorLabel] || []) {
        v = variants.find(x => x.label === fb);
        if (v) break;
      }
    }
    anchorByLocale[loc] = v?.text || enProse.anchor;
  }

  const system = `You are a localisation translator for a Montenegro car-rental site.
Translate the given English Pre + Post bridging text into 6 locales: de, fr, it, me, pl, ru.
The anchor text per locale is FIXED — do not translate or modify it. Just translate the surrounding pre/post.
Match source character count within ±25%. Keep tone identical. Output strict JSON only.`;

  const userPrompt = `Translate this bridging paragraph into 6 locales for a link to ${targetPath}.

EN content:
${JSON.stringify(enProse, null, 2)}

Per-locale anchor text (FIXED — use as-is):
${JSON.stringify(anchorByLocale, null, 2)}

Output JSON shape:
{
  "translations": {
    "de": { "pre": "...", "anchor": "${anchorByLocale.de}", "post": "..." },
    "fr": { "pre": "...", "anchor": "${anchorByLocale.fr}", "post": "..." },
    "it": { "pre": "...", "anchor": "${anchorByLocale.it}", "post": "..." },
    "me": { "pre": "...", "anchor": "${anchorByLocale.me}", "post": "..." },
    "pl": { "pre": "...", "anchor": "${anchorByLocale.pl}", "post": "..." },
    "ru": { "pre": "...", "anchor": "${anchorByLocale.ru}", "post": "..." }
  }
}`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 3000,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.translations) throw new Error('Translation response missing translations');

  return {
    prose: {
      en: enProse,
      de: parsed.translations.de,
      fr: parsed.translations.fr,
      it: parsed.translations.it,
      me: parsed.translations.me,
      pl: parsed.translations.pl,
      ru: parsed.translations.ru,
    },
    usage, authMode, fallback, fallbackReason,
  };
}

export { PAGE_TO_BODY_NAMESPACE };
