// Section rewrite agent — for orphan-fix smart mode.
//
// Given a source page and a target it should link to, the agent:
//   1. Reads the source's existing body content (all i18n strings under its namespace)
//   2. Picks 2-3 ADJACENT existing keys to rewrite together (a "section cluster")
//   3. Rewrites those keys so the cluster reads as a coherent block of prose,
//      with one of them naturally hosting the link to the target
//   4. The non-link keys get extended/refined to set up + follow on from the link
//
// Output: full 7-locale rewrites for the affected keys, plus a Pre/Text/Post
// split for the key that hosts the link. apply() then:
//   - Replaces existing key values across all 7 locales (i18n JSON)
//   - For the link-hosting key, splits into 3 new keys (keyPre/keyText/keyPost)
//   - Edits source JSX to convert <p>{t('key')}</p> -> <p>{t('keyPre')}<a>{t('keyText')}</a>{t('keyPost')}</p>
//
// This is more invasive than orphan-fix's "PS at bottom" but produces prose
// where the link is inside an existing paragraph that's been expanded to host
// it — no new appended sections, no seam.

import { Octokit } from '@octokit/rest';
import { chatOnce } from './anthropicClient.js';
import { knowledgeForPrompt } from './serviceKnowledge.js';

const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', branch: 'master' },
};

// Mirror PAGE_TO_BODY_NAMESPACE from smartLinkInsertion.js. We only need the
// body namespace to slice the source body. Keeping it inline so this file
// is self-contained.
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

// Slice the body keys for a source page. Skip Pre/Text/Post triplets from
// previous link insertions (they're already linked and shouldn't be re-rewritten).
function sliceBody(enJson, sourcePage) {
  const ns = PAGE_TO_BODY_NAMESPACE[sourcePage];
  if (!ns) return { ns: null, sections: [] };
  const body = enJson[ns] || {};
  const sections = [];
  for (const [k, v] of Object.entries(body)) {
    if (typeof v !== 'string') continue;
    if (/(Link|Body|Bridge|bridge_)(Pre|Text|Post)$/.test(k)) continue;
    sections.push({ key: `${ns}.${k}`, shortKey: k, text: v });
  }
  return { ns, sections };
}

// Pre-classify each section by role so we don't ask the agent to pick
// hosts from paragraphs that are structurally bad fits (action/wrap-up
// at the end of a journey). Score each section as high|medium|low host
// quality. Agent only sees high+medium candidates.
//
// Signals (in order of strength):
//   - i18n key name patterns (intro / overview / before / how → high;
//     final / outro / day{N+} where N is last → low)
//   - Body content phrases ("drop your car", "next morning", "before
//     you leave", "head home" → low; "starts at", "before you go",
//     "how to arrive", "planning" → high)
//   - Position in body (first third = high default; last third = low
//     default; middle = medium)
function classifySection(shortKey, text, position, total) {
  const k = shortKey.toLowerCase();
  const tHead = (text || '').toLowerCase().slice(0, 250);
  const tFull = (text || '').toLowerCase();
  const positionRatio = total > 1 ? position / (total - 1) : 0;

  // Hard "low" signals — action / trip-end paragraphs
  const ACTION_PHRASES = [
    'drop your car', 'drop off your car', 'return the car', 'return your car',
    'final morning', 'final night', 'the next morning', 'the next day',
    'before you leave', 'leaving montenegro', 'head home', 'head back',
    'last leg', 'last day', 'last morning', 'final stop', 'fly home',
  ];
  if (ACTION_PHRASES.some(p => tFull.includes(p))) {
    return { role: 'action', hostQuality: 'low' };
  }
  // Key-name signals for end-of-trip
  if (/^(final|outro|wrapup|conclusion|farewell|departure)/.test(k)) {
    return { role: 'wrapup', hostQuality: 'low' };
  }
  // Last 20% of paragraphs default to low unless overridden by setup signals
  const lateInDocument = positionRatio > 0.8;

  // Hard "high" signals — setup / planning / overview
  if (/^(intro|hero|overview|summary|plan|prep|before|howto|how|arrive|arrival|getting|trip)/i.test(k)) {
    return { role: 'setup', hostQuality: 'high' };
  }
  const SETUP_PHRASES = [
    'starts at', 'this itinerary', 'this guide', 'this trip', 'this route',
    'before you go', 'how to arrive', 'getting there', 'getting around',
    'planning', 'when to visit', 'what to bring', 'pickup', 'pick up',
    'collect your car at', 'rental pickup',
  ];
  if (SETUP_PHRASES.some(p => tHead.includes(p))) {
    return { role: 'setup', hostQuality: 'high' };
  }

  // Position-based default
  if (positionRatio < 0.25) return { role: 'narrative', hostQuality: 'high' };
  if (lateInDocument) return { role: 'narrative', hostQuality: 'low' };
  return { role: 'narrative', hostQuality: 'medium' };
}

// Generate a section rewrite plan for one (source, target) edge.
// Returns:
//   {
//     ns: 'blogRoadtrip',
//     affectedKeys: ['day5', 'day6'],        // shortKeys (without namespace prefix)
//     linkHostKey: 'day5',                   // which one will be split into Pre/Text/Post
//     newValues: {
//       'day5': {
//         en: '<full prose>',
//         linkSplit: { pre: '...', anchor: '...', post: '...' }
//       },
//       'day6': { en: '<full prose>' }       // no link, just rewritten
//     },
//     reason: '...'
//   }
export async function generateSectionRewrite({
  siteId,
  sourcePage,
  targetPath,
  anchorVariant,        // pre-assigned variant — used as default but agent can pick a better one
  anchorPool,           // optional — full pool of variants for this target so agent can pick prose-friendly
  targetTopQuery,
  forceHostKey,
}) {
  const en = await fetchEnJson(siteId);
  const { ns, sections } = sliceBody(en, sourcePage);
  if (!ns || sections.length === 0) {
    throw new Error(`No body content found for ${sourcePage} (namespace ${PAGE_TO_BODY_NAMESPACE[sourcePage] || 'unknown'})`);
  }

  // Classify each section by role (setup / narrative / action / wrapup) so
  // we can SHOW these hints to the agent — it sees the full page and picks
  // based on full context. Pre-filtering was too paternalistic; with richer
  // signals + a clear "avoid low-quality hosts" rule, the agent makes
  // better choices itself.
  const classified = sections.map((s, i) => ({
    ...s,
    classification: classifySection(s.shortKey, s.text, i, sections.length),
  }));

  const system = `You are a content editor for a Montenegro car-rental site (montenegrocarhire.com). Your task: pick the BEST existing paragraph to host a link to a related Montenegro page, and rewrite ONLY that paragraph to embed the anchor naturally.

Hard rules:

1. Pick exactly ONE existing i18n key as the LINK HOST. Choose where the link is GENUINELY USEFUL to a reader of that paragraph — typically a setup/planning paragraph (intro, "before you go", "how to arrive"), NOT an action/instruction paragraph at the end of a journey ("drop your car off"). If the only natural placement options are end-of-trip / drop-off paragraphs, the link will read forced no matter what — in that case, set "reason" to start with "WEAK FOOTHOLD:" and pick the least-bad host. The user will see this and can choose to discard.

2. Include 1-2 ADJACENT keys (immediately before or after the host) in your output. You MAY light-edit these adjacent paragraphs IF doing so helps the link host flow naturally with what comes before/after — e.g. tweak a transition phrase, smooth a pivot. If a context paragraph reads fine as-is, return it unchanged. Stay within +20% of each context paragraph's original length.

3. Rewrite the LINK HOST paragraph substantively — restructure sentences, reorder ideas, shift emphasis to set up the link naturally. This is NOT just appending a sentence; restructure the existing prose so the link feels like part of the paragraph's flow from the start. Constraints:
   - Stay within +50% of original length
   - Preserve every FACTUAL element from the original (distances, drive times, road numbers, location names, descriptions like "scenic", "best restaurant scene", etc.)
   - PICK THE BEST ANCHOR VARIANT from the pool provided. Different anchor texts fit different sentence structures:
     • Verb-phrase anchors ("car rental at Podgorica Airport") read naturally inside sentences as an action: "...book your car rental at Podgorica Airport before your flight..."
     • Noun-phrase anchors ("Podgorica Airport car rentals") read as a service/brand and force "X are available" / "X offer..." constructions, which sound forced
     • For prose insertion, prefer exact / contextual / partial variants over longtail / nakedUrl. Use longtail only if it genuinely fits the sentence as a noun-phrase reference.
     • You MUST use one of the provided anchor texts verbatim — don't invent new wording
   - Output the host paragraph split into pre / anchor / post (anchor = the variant text you chose)
   - Output the chosen variant's label in chosenAnchorLabel (one of: exact, partial, branded, contextual, longtail, nakedUrl, weak)
   - The rewrite should read as if this is how the paragraph was originally written, not as if a sentence was bolted on

4. ABSOLUTELY DO NOT FABRICATE FACTS. Specifically:
   - NEVER mention any price, rate, daily/weekly figure, EUR amount, or "cheaper/more expensive" comparison. Pricing varies and any specific claim is fabrication.
   - No claims about availability, popularity, or vague comparisons ("lower rates", "better availability", "popular choice", "great value")
   - No invented place names, distances, road numbers, route details, restaurant counts, hotel chains
   - No marketing superlatives ("the best", "the most", "the easiest")
   - If the original paragraph stated a fact, keep it accurate — you may rephrase it but not change its specifics
   - You may add NEUTRAL transitional language (e.g. "the next morning," "from there", "after that") and topical mentions of the target page

5. Tone: matter-of-fact, practical, rental-customer-oriented. Match the surrounding paragraphs' voice exactly.

6. Whole site is Montenegro car-rental — every page is in the same topical bubble. Don't force "Speaking of cars," transitions; the link should sit naturally as part of route/logistics/pickup discussion.

7. NEVER use em dashes (—) anywhere in your output. Use a period, comma, semicolon, or "and" instead. This includes the en strings, the linkSplit pre/post, and the reason field. Em dashes are a tell that the prose was rewritten and we want this to read like the original.

7. SERVICE FACTS reference. Below is verified data about the actual rental service. You MAY draw on it ONLY when the rewrite is naturally already discussing logistics that overlap with these facts (e.g. if the original sentence mentions "pickup", you may correctly name the actual pickup locations). Hard rules:
   - Don't shoehorn service facts in. If the original prose wasn't heading toward insurance/extras/age/cross-border, leave them out.
   - Anything NOT in the SERVICE FACTS below is UNKNOWN — never invent details.
   - Fields marked "TODO" haven't been verified — DO NOT use them in output.

SERVICE FACTS:
${knowledgeForPrompt()}

Output strict JSON only. No markdown, no commentary.`;

  // Build the anchor pool the agent can pick from. Default to just the
  // pre-assigned variant if the caller didn't pass a pool.
  const anchorOptions = (anchorPool && anchorPool.length > 0)
    ? anchorPool
    : [{ label: anchorVariant.label, text: anchorVariant.text }];

  const userPrompt = `Source page: ${sourcePage}
Target page: ${targetPath}
Target top GSC query: ${targetTopQuery || '(unknown)'}

Anchor variants you may pick from (choose the one that reads most natural in YOUR chosen host paragraph):
${JSON.stringify(anchorOptions, null, 2)}

The pre-suggested variant (use it only if it fits well — otherwise pick a better one above):
- label: ${anchorVariant.label}
- text: "${anchorVariant.text}"
${forceHostKey ? `\nUSER-FORCED HOST: the user has explicitly chosen "${forceHostKey}" as the link host. Use it as the linkHostKey — do not pick anything else. Build the cluster around it.` : ''}

FULL body of the source page (in declaration / render order). Each paragraph is tagged with its narrative role to help you choose:
- "setup" — intro / planning / arrival logistics. STRONG host candidate. Reader is making decisions here.
- "narrative" — mid-trip storytelling. Acceptable host if topically adjacent.
- "action" — instruction / mid-trip moves ("drop your car", "head south"). WEAK host. Link will read forced.
- "wrapup" — end of journey, departure. WEAK host. Reader is leaving.

Pick the paragraph where a reader would NATURALLY benefit from the link — typically setup for "where to pick up" links, or mid-narrative for "while you're there" links. Action and wrapup paragraphs at the end of journeys produce forced output every time. If the only options are action/wrapup, set "reason" to start with "WEAK FOOTHOLD:" and pick the least-bad option.

${JSON.stringify(classified.map(s => ({ key: s.shortKey, role: s.classification.role, text: s.text })), null, 2)}

Output JSON shape:
{
  "affectedKeys": ["<contextKey1>", "<linkHostKey>", "<contextKey2 optional>"],
  "linkHostKey": "<one of the affectedKeys — the one that will host the link>",
  "chosenAnchorLabel": "<exact|partial|branded|contextual|longtail|nakedUrl|weak — must match one in the pool above>",
  "chosenAnchorText": "<the anchor text you picked — must match one in the pool above verbatim>",
  "newValues": {
    "<contextKey1>": { "en": "<EXACT original text — do not modify>" },
    "<linkHostKey>": {
      "en": "<rewritten paragraph CONTAINING the chosen anchor text inline>",
      "linkSplit": { "pre": "<text before anchor>", "anchor": "<the chosenAnchorText>", "post": "<text after anchor>" }
    },
    "<contextKey2 optional>": { "en": "<EXACT original text — do not modify>" }
  },
  "reason": "<one short sentence why this host + this anchor variant>"
}

CRITICAL:
- Only the linkHostKey's "en" differs from the original. Context keys' "en" must match the input EXACTLY.
- Only the linkHostKey has a linkSplit field.
- pre + anchor + post must concatenate to exactly the en string for the link host.
- chosenAnchorText must appear verbatim in the en string of the link host.`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 3500,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.affectedKeys) || parsed.affectedKeys.length < 1) {
    throw new Error('Section rewrite response missing affectedKeys');
  }
  if (!parsed.linkHostKey || !parsed.affectedKeys.includes(parsed.linkHostKey)) {
    throw new Error('Section rewrite response missing valid linkHostKey');
  }
  const hostEntry = parsed.newValues?.[parsed.linkHostKey];
  if (!hostEntry?.linkSplit?.pre == null || !hostEntry?.linkSplit?.anchor || !hostEntry?.linkSplit?.post == null) {
    throw new Error('Section rewrite response missing linkSplit for link host key');
  }
  const validKeys = new Set(sections.map(s => s.shortKey));
  for (const k of parsed.affectedKeys) {
    if (!validKeys.has(k)) throw new Error(`Section rewrite picked invalid key ${k}`);
  }

  // Validate chosen anchor — must be one of the pool. If agent invented a
  // new anchor or picked one not in the pool, fall back to the linkSplit's
  // anchor text and try to find a label match in the pool.
  const validAnchorTexts = new Set(anchorOptions.map(a => a.text));
  let resolvedAnchorLabel = parsed.chosenAnchorLabel || anchorVariant.label;
  let resolvedAnchorText = parsed.chosenAnchorText || hostEntry.linkSplit.anchor;
  if (!validAnchorTexts.has(resolvedAnchorText)) {
    // Fall back: use the linkSplit's anchor text if it's in the pool;
    // otherwise use the pre-assigned variant.
    const splitAnchor = hostEntry.linkSplit.anchor;
    if (validAnchorTexts.has(splitAnchor)) {
      resolvedAnchorText = splitAnchor;
      const found = anchorOptions.find(a => a.text === splitAnchor);
      if (found) resolvedAnchorLabel = found.label;
    } else {
      resolvedAnchorText = anchorVariant.text;
      resolvedAnchorLabel = anchorVariant.label;
    }
  } else {
    const found = anchorOptions.find(a => a.text === resolvedAnchorText);
    if (found) resolvedAnchorLabel = found.label;
  }

  // Post-validation — scan the rewritten host for forced / marketing /
  // fabrication patterns Claude sometimes still slips through. Each match
  // is reported as a quality flag the UI can show.
  const hostNew = parsed.newValues?.[parsed.linkHostKey]?.en || '';
  const hostLow = hostNew.toLowerCase();
  const qualityFlags = [];
  const FORCED_PATTERNS = [
    { re: /\bif you need to\b/i, label: 'forced qualifier ("if you need to")' },
    { re: /\bfor a different\b/i, label: 'forced qualifier ("for a different")' },
    { re: /\bmany (visitors|travellers|drivers|people)\b/i, label: 'unverifiable claim ("many visitors/travellers")' },
    { re: /\b(convenient|popular|easy|quick|seamless|smooth)\b/i, label: 'marketing adjective' },
    { re: /\b(best|cheapest|lowest|widest|biggest)\b/i, label: 'superlative claim' },
    { re: /\b\d+\s*(km|kilometres|miles|minutes|euros?|€)\b/i, label: 'specific number — verify it\'s in original prose' },
    { re: /\b(offers? (?:convenient|the best|great))\b/i, label: 'marketing phrase' },
  ];
  for (const { re, label } of FORCED_PATTERNS) {
    if (re.test(hostNew) && !re.test(sections.find(s => s.shortKey === parsed.linkHostKey)?.text || '')) {
      qualityFlags.push(label);
    }
  }

  const reason = stripEmDashes(parsed.reason || '');
  const weakFoothold = reason.toUpperCase().startsWith('WEAK FOOTHOLD');

  return {
    ns,
    affectedKeys: parsed.affectedKeys,
    linkHostKey: parsed.linkHostKey,
    newValues: sanitizeNewValues(parsed.newValues),
    reason,
    weakFoothold,
    targetPath,
    // Anchor label = whichever variant the agent CHOSE (may differ from the
    // pre-assigned one). Translation step uses this to resolve per-locale
    // anchor from the matrix correctly.
    anchorLabel: resolvedAnchorLabel,
    chosenAnchorText: resolvedAnchorText,
    originalSuggestedAnchorLabel: anchorVariant.label,
    sourcePage,
    qualityFlags,
    // include current EN values so the UI can show before/after diff
    currentValues: Object.fromEntries(
      parsed.affectedKeys.map(k => {
        const s = sections.find(x => x.shortKey === k);
        return [k, s?.text || ''];
      })
    ),
    // Full body — used by UI to let user override host paragraph
    bodyOptions: sections.map(s => ({
      key: s.shortKey,
      text: s.text,
      role: classified.find(c => c.shortKey === s.shortKey)?.classification.role || 'narrative',
    })),
    usage, authMode, fallback, fallbackReason,
  };
}

// Translate the EN section-rewrite output into the other 6 locales.
// anchorMatrix supplies the per-locale anchor text for the link host.
export async function translateSectionRewrite({
  enRewrite,        // result from generateSectionRewrite — has newValues, linkHostKey, ns
  anchorMatrix,     // full per-locale matrix from buildOrphanFixList
}) {
  // Pick per-locale anchor texts using the same fallback chain the UI uses
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
    if (loc === 'en') {
      anchorByLocale.en = enRewrite.newValues[enRewrite.linkHostKey].linkSplit.anchor;
      continue;
    }
    const variants = anchorMatrix?.[loc] || [];
    let v = variants.find(x => x.label === enRewrite.anchorLabel);
    if (!v) {
      for (const fb of FALLBACK_BY_LABEL[enRewrite.anchorLabel] || []) {
        v = variants.find(x => x.label === fb);
        if (v) break;
      }
    }
    anchorByLocale[loc] = v?.text || enRewrite.newValues[enRewrite.linkHostKey].linkSplit.anchor;
  }

  // Build EN payload for the translator: each affected key with its EN prose
  // + linkSplit for the host key + per-locale anchor lookup table
  const enForTranslate = {};
  for (const k of enRewrite.affectedKeys) {
    const v = enRewrite.newValues[k];
    enForTranslate[k] = { en: v.en };
    if (k === enRewrite.linkHostKey) {
      enForTranslate[k].linkSplit = v.linkSplit;
    }
  }

  const system = `You are a localisation translator for a Montenegro car-rental site.
Translate the given EN paragraphs into 6 locales: de, fr, it, me, pl, ru.
- For paragraphs WITHOUT a linkSplit: just translate the EN string into each locale.
- For the linkHost paragraph (with linkSplit): translate the pre + post; the anchor text is FIXED per locale (provided to you), use as-is.
- Match source character count within plus/minus 25%.
- Each locale uses its native rental term (DE Mietwagen, FR location de voiture, IT noleggio auto, ME rent a car, PL wypożyczalnia, RU аренда).
- Tone: factual, practical, rental-customer-oriented.
- NEVER use em dashes in any output. Use periods, commas, or "and" instead.

Output strict JSON only.`;

  const userPrompt = `Translate these EN paragraphs into 6 locales for source ${enRewrite.sourcePage} → target ${enRewrite.targetPath}.

Per-locale anchor text for the link host (FIXED — use exactly):
${JSON.stringify(anchorByLocale, null, 2)}

EN content:
${JSON.stringify(enForTranslate, null, 2)}

Output JSON shape:
{
  "translations": {
    "<key>": {
      "de": "<full prose>",
      "fr": "<full prose>",
      "it": "<full prose>",
      "me": "<full prose>",
      "pl": "<full prose>",
      "ru": "<full prose>"
    },
    ... (one entry per affectedKey)
  },
  "linkHostSplits": {
    "de": { "pre": "...", "anchor": "<anchorByLocale.de>", "post": "..." },
    "fr": { "pre": "...", "anchor": "<anchorByLocale.fr>", "post": "..." },
    "it": { "pre": "...", "anchor": "<anchorByLocale.it>", "post": "..." },
    "me": { "pre": "...", "anchor": "<anchorByLocale.me>", "post": "..." },
    "pl": { "pre": "...", "anchor": "<anchorByLocale.pl>", "post": "..." },
    "ru": { "pre": "...", "anchor": "<anchorByLocale.ru>", "post": "..." }
  }
}`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 5000,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.translations || !parsed.linkHostSplits) {
    throw new Error('Section translate response missing translations or linkHostSplits');
  }

  // Build the full per-locale newValues
  const merged = {};
  for (const k of enRewrite.affectedKeys) {
    const enValue = enRewrite.newValues[k];
    merged[k] = { en: enValue.en };
    if (k === enRewrite.linkHostKey) {
      merged[k].linkSplit = enValue.linkSplit;
    }
    for (const loc of ['de', 'fr', 'it', 'me', 'pl', 'ru']) {
      const t = parsed.translations[k]?.[loc];
      if (t) merged[k][loc] = t;
      if (k === enRewrite.linkHostKey) {
        const split = parsed.linkHostSplits[loc];
        if (split) {
          merged[k][`linkSplit_${loc}`] = {
            pre: split.pre || '',
            anchor: anchorByLocale[loc],  // force locale-fixed anchor
            post: split.post || '',
          };
        }
      }
    }
  }

  return {
    ...enRewrite,
    newValues: sanitizeNewValues(merged),
    translated: true,
    translateUsage: usage,
    translateAuthMode: authMode,
    translateFallback: fallback,
    translateFallbackReason: fallbackReason,
  };
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Strip em dashes that the agent might have slipped in despite prompt rules.
// Replaces " — " with ". " (sentence break) and bare "—" with ", " (clause).
// Also normalises double-spaces and double-periods that may result.
function stripEmDashes(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\s+—\s+/g, '. ')   // " — " becomes ". "
    .replace(/—/g, ', ')          // bare "—" becomes ", "
    .replace(/\.\s*\./g, '.')    // collapse ".."
    .replace(/,\s*,/g, ',')      // collapse ",,"
    .replace(/\s+/g, ' ')        // normalise whitespace
    .trim();
}

function sanitizeNewValues(newValues) {
  if (!newValues) return newValues;
  const out = {};
  for (const [k, v] of Object.entries(newValues)) {
    const cleaned = { ...v };
    if (typeof v.en === 'string') cleaned.en = stripEmDashes(v.en);
    for (const loc of ['de', 'fr', 'it', 'me', 'pl', 'ru']) {
      if (typeof v[loc] === 'string') cleaned[loc] = stripEmDashes(v[loc]);
    }
    if (v.linkSplit) {
      cleaned.linkSplit = {
        pre: stripEmDashes(v.linkSplit.pre || ''),
        anchor: v.linkSplit.anchor,  // never touch anchor
        post: stripEmDashes(v.linkSplit.post || ''),
      };
    }
    for (const loc of ['de', 'fr', 'it', 'me', 'pl', 'ru']) {
      const lk = `linkSplit_${loc}`;
      if (v[lk]) {
        cleaned[lk] = {
          pre: stripEmDashes(v[lk].pre || ''),
          anchor: v[lk].anchor,
          post: stripEmDashes(v[lk].post || ''),
        };
      }
    }
    out[k] = cleaned;
  }
  return out;
}

const JSX_FILES = {
  '/': 'src/components/HomeClient.jsx',
  '/about': 'src/components/pages/About.jsx',
  '/kotor': 'src/components/pages/Kotor.jsx', '/budva': 'src/components/pages/Budva.jsx',
  '/tivat': 'src/components/pages/Tivat.jsx', '/podgorica': 'src/components/pages/Podgorica.jsx',
  '/perast': 'src/components/pages/Perast.jsx', '/herceg-novi': 'src/components/pages/HercegNovi.jsx',
  '/ulcinj': 'src/components/pages/Ulcinj.jsx', '/bar': 'src/components/pages/Bar.jsx',
  '/niksic': 'src/components/pages/Niksic.jsx', '/montenegro': 'src/components/pages/Montenegro.jsx',
  '/podgorica-airport': 'src/components/pages/PodgoricaAirport.jsx',
  '/tivat-airport': 'src/components/pages/TivatAirport.jsx',
  '/dubrovnik-airport': 'src/components/pages/DubrovnikAirport.jsx',
  '/border-crossing-guide': 'src/components/pages/BorderCrossing.jsx',
  '/montenegro-driving-guide': 'src/components/pages/DrivingGuide.jsx',
  '/blog/montenegro-road-trip-10-days': 'src/components/pages/blog/MontenegroRoadTrip10Days.jsx',
  '/blog/montenegro-camping-car': 'src/components/pages/blog/MontenegroCampingCar.jsx',
  '/blog/montenegro-beaches-by-car': 'src/components/pages/blog/MontenegroBeachesByCar.jsx',
  '/blog/montenegro-monasteries-circuit': 'src/components/pages/blog/MontenegroMonasteriesCircuit.jsx',
  '/blog/montenegro-mountain-passes': 'src/components/pages/blog/MontenegroMountainPasses.jsx',
  '/blog/montenegro-national-parks': 'src/components/pages/blog/MontenegroNationalParks.jsx',
  '/blog/montenegro-autumn-colours': 'src/components/pages/blog/MontenegroAutumnColours.jsx',
  '/blog/montenegro-wine-road': 'src/components/pages/blog/MontenegroWineRoad.jsx',
  '/blog/tara-river-canyon-drive': 'src/components/pages/blog/TaraRiverCanyonDrive.jsx',
};

async function getFile(gh, owner, repo, path, ref) {
  const { data } = await gh.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file') throw new Error(`${path} is not a file`);
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') };
}

async function putFile(gh, owner, repo, path, branch, content, sha, message) {
  await gh.repos.createOrUpdateFileContents({
    owner, repo, path, branch, message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha,
  });
}

// Apply a section-rewrite to a branch. Updates i18n JSONs for all 7 locales:
//   - For each affectedKey: write the new locale-specific value
//   - For the linkHostKey: also write Pre/Text/Post triplet (keyPre/keyText/keyPost)
//     under the same namespace, with the per-locale linkSplit values
// JSX surgery: replace <p>{t('ns.linkHostKey')}</p> with the multi-part Pre/Text/Post pattern.
// Other affected keys (non-host) just get their JSON values updated — JSX unchanged.
export async function applySectionRewriteToBranch({ gh, owner, repo, branch, sectionRewrite }) {
  const { ns, affectedKeys, linkHostKey, newValues, targetPath, sourcePage } = sectionRewrite;

  // 1. Update all 7 locale JSONs
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    if (typeof data[ns] !== 'object' || data[ns] == null) data[ns] = {};
    let touched = 0;
    for (const k of affectedKeys) {
      const v = newValues[k];
      // Fall back to EN if locale-specific value missing (e.g. user queued
      // EN-only without translating). Non-EN visitors get EN copy — not
      // ideal but better than a missing i18n key showing as raw key name.
      const localeValue = (typeof v[loc] === 'string' ? v[loc] : v.en);
      if (typeof localeValue !== 'string') continue;
      data[ns][k] = localeValue;
      touched++;
      // For the link host, ALSO write the Pre/Text/Post triplet
      if (k === linkHostKey) {
        const split = (loc === 'en' ? v.linkSplit : v[`linkSplit_${loc}`]) || v.linkSplit;
        if (split) {
          data[ns][`${k}Pre`] = split.pre || '';
          data[ns][`${k}Text`] = split.anchor || '';
          data[ns][`${k}Post`] = split.post || '';
          touched += 3;
        }
      }
    }
    if (touched === 0) continue;
    await putFile(gh, owner, repo, path, branch, JSON.stringify(data, null, 2) + '\n', sha,
      `i18n(${loc}): section-rewrite ${sourcePage} → ${targetPath} (${touched} keys)`);
  }

  // 2. JSX surgery for the link host — convert <p>{t('ns.host')}</p> to the multi-part form
  const jsxPath = JSX_FILES[sourcePage];
  if (!jsxPath) {
    console.warn(`[section-rewrite] no JSX_FILES mapping for ${sourcePage}`);
    return { hostJsxRewritten: false };
  }
  const jsxFile = await getFile(gh, owner, repo, jsxPath, branch);
  const fqHostKey = `${ns}.${linkHostKey}`;
  const escapedKey = escapeRegex(fqHostKey);
  // Matches <p>{t('FQ_KEY')}</p> with optional whitespace + single/double/backtick quotes
  const hostRe = new RegExp(
    `<p>\\s*\\{\\s*t\\(\\s*['"\`]${escapedKey}['"\`]\\s*\\)\\s*\\}\\s*<\\/p>`,
  );
  if (!hostRe.test(jsxFile.content)) {
    console.warn(`[section-rewrite] couldn't find <p>{t('${fqHostKey}')}</p> in ${jsxPath} — JSX unchanged, link not visible`);
    return { hostJsxRewritten: false };
  }
  const replacement = `<p>{t('${ns}.${linkHostKey}Pre')}<a href={localePath('${targetPath}')}>{t('${ns}.${linkHostKey}Text')}</a>{t('${ns}.${linkHostKey}Post')}</p>`;
  const updatedJsx = jsxFile.content.replace(hostRe, replacement);
  await putFile(gh, owner, repo, jsxPath, branch, updatedJsx, jsxFile.sha,
    `feat: weave inbound link from ${sourcePage} → ${targetPath} into ${linkHostKey}`);
  return { hostJsxRewritten: true };
}
