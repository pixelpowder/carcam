// Autonomous content rewrite agent.
// Given a page on a configured site, the agent:
//   1. Fetches current i18n content for the page (from GitHub raw)
//   2. Reads the page's GSC top queries from the latest snapshot (if any)
//   3. Asks Claude to generate rewrites for all relevant sections in 7 locales
//   4. Validates the response shape
//   5. Returns a rewrite plan ready to be applied via Octokit
//
// Triggered by POST /api/internal-links/auto-rewrite. The Implement step
// shares logic with implementContentRewrite.js — same Octokit pattern.

import { Octokit } from '@octokit/rest';
import { chatOnce } from './anthropicClient.js';
import { loadLatestSnapshot } from './internalLinksSnapshots.js';
import { squashMergeAndCleanup } from './githubMerge.js';
import { logImplementations } from './implementationLog.js';

const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];

// Repo + page outline mappings — must match what carcam knows about each site.
const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', branch: 'master', defaultBranch: 'master' },
};

// Per-page content namespace mapping. Keys we should consider for rewrite
// when the agent runs on this page. Matches PAGE_TO_NAMESPACE used elsewhere
// but flat so the agent can iterate.
const PAGE_CONFIGS = {
  '/podgorica-airport': {
    metaNamespace: 'podgorica-airport',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'podgoricaAirportBody',
    // Skip these body keys — they're internal-link wrappers from round 1/2 work
    // and rewriting would break the links.
    bodySkipKeys: ['drivingLinkPre', 'drivingLinkText', 'drivingLinkPost', 'cityLinkPre', 'cityLinkText', 'cityLinkPost'],
  },
  '/tivat-airport': {
    metaNamespace: 'tivat-airport',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'tivatAirportBody',
    bodySkipKeys: [],
  },
  '/dubrovnik-airport': {
    metaNamespace: 'dubrovnik-airport',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'dubrovnikAirportBody',
    bodySkipKeys: ['borderLinkPre', 'borderLinkText', 'borderLinkPost', 'perastLinkPre', 'perastLinkText', 'perastLinkPost'],
  },
  '/kotor': {
    metaNamespace: 'kotor',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'kotorBody',
    bodySkipKeys: ['airportLinkPre', 'airportLinkText', 'airportLinkPost', 'perastLinkPre', 'perastLinkText', 'perastLinkPost'],
  },
  '/budva': {
    metaNamespace: 'budva',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'budvaBody',
    bodySkipKeys: [],
  },
  '/podgorica': {
    metaNamespace: 'podgorica',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'podgoricaBody',
    bodySkipKeys: ['airportLinkPre', 'airportLinkText', 'airportLinkPost'],
  },
  '/perast': {
    metaNamespace: 'perast',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'perastBody',
    bodySkipKeys: [],
  },
  '/herceg-novi': {
    metaNamespace: 'herceg-novi',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'hercegNoviBody',
    bodySkipKeys: [],
  },
  '/ulcinj': {
    metaNamespace: 'ulcinj',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'ulcinjBody',
    bodySkipKeys: [],
  },
  '/bar': {
    metaNamespace: 'bar',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'barBody',
    bodySkipKeys: [],
  },
  '/niksic': {
    metaNamespace: 'niksic',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'niksicBody',
    bodySkipKeys: [],
  },
  '/montenegro': {
    metaNamespace: 'montenegro',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'montenegroBody',
    bodySkipKeys: [],
  },
  '/border-crossing-guide': {
    metaNamespace: 'border-crossing',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'borderCrossingBody',
    bodySkipKeys: [],
  },
  '/montenegro-driving-guide': {
    metaNamespace: 'driving-guide',
    metaKeys: ['title', 'subtitle', 'seoDesc'],
    bodyNamespace: 'drivingGuideBody',
    bodySkipKeys: [],
  },
};

function octokit() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_TOKEN env var not set');
  return new Octokit({ auth: token });
}

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

// Build the list of i18n keys + current values to rewrite for a page.
function buildSectionsFromEn(enJson, cfg) {
  const sections = [];
  // Meta-level keys
  const metaNs = enJson[cfg.metaNamespace] || {};
  for (const k of cfg.metaKeys) {
    if (typeof metaNs[k] === 'string') {
      sections.push({ key: `${cfg.metaNamespace}.${k}`, kind: k, current: metaNs[k] });
    }
  }
  // Body-level keys
  const bodyNs = enJson[cfg.bodyNamespace] || {};
  for (const [k, v] of Object.entries(bodyNs)) {
    if (typeof v !== 'string') continue;
    if (cfg.bodySkipKeys.includes(k)) continue;
    sections.push({ key: `${cfg.bodyNamespace}.${k}`, kind: k, current: v });
  }
  return sections;
}

// Ask Claude to generate EN-only rewrites for all sections, plus 2-3
// "link bridge" paragraphs that insert OUTBOUND links to related priority
// pages at natural points in the body. Bridges are emitted as Pre/anchor/Post
// triplets that get JSX-surgery'd into the source page on apply.
async function generateEnRewrites({ page, sections, topQueries, brandGuide, relatedTargets = [] }) {
  const linkAware = relatedTargets.length > 0;
  const linkSection = linkAware
    ? `\n5. Output 2-3 "link bridge" paragraphs that insert OUTBOUND links from this page to other related Montenegro pages. Each bridge:
   - picks an existing body i18n key as its insertion point (insertAfterKey) — the new paragraph will render directly after that key's <p>
   - is one short sentence (60-180 chars) that bridges naturally from the previous paragraph's topic
   - hosts the anchor link to the target page
   - reads as natural editorial prose, not a "see also"
   - can place the anchor anywhere in the sentence (start/middle/end)
   Pick insertion points where the topical adjacency is strong (e.g. after a paragraph about driving inland, bridge to /podgorica).`
    : '';

  const system = `You are an SEO content rewriter for a Montenegro car-rental site. Rewrite page sections so they:
1. Lead with the GSC-validated top query for the page (when natural)
2. Stay within character limits (titles ≤ 60, meta descriptions 150-160, paragraphs match input length within ±20%)
3. Keep factual accuracy (distances, route numbers, airport codes, times)
4. Add rental-specific angles where relevant (pickup process, drive times, no shuttle, etc.)${linkSection}

Output strict JSON only. No prose, no markdown, no explanation.`;

  const relatedContext = linkAware
    ? `\n\nRelated pages on this site (pick 2-3 to link to where most natural):
${relatedTargets.map(t => {
        const anchors = (t.anchorPool || []).slice(0, 6).map(a => `"${a.text}" (${a.label})`).join(', ');
        return `- ${t.targetPath} — top query "${t.topQuery || '?'}" — anchor options: ${anchors}`;
      }).join('\n')}`
    : '';

  const userPrompt = `Rewrite these sections for the page ${page}, English only.

GSC top queries (high to low impressions):
${topQueries.map(q => `- "${q.query}" (${q.impressions} imp, pos ${q.position?.toFixed?.(1) ?? '?'})`).join('\n')}

Brand voice notes:
${brandGuide}${relatedContext}

Sections to rewrite (JSON):
${JSON.stringify(sections.map(s => ({ key: s.key, kind: s.kind, currentEn: s.current })), null, 2)}

Output JSON shape:
{
  "rewrites": {
    "<i18nKey>": { "en": "..." },
    ...
  }${linkAware ? `,
  "linkBridges": [
    {
      "insertAfterKey": "<i18nKey from sections>",
      "targetPath": "<one of the related target paths>",
      "anchorLabel": "<exact|partial|branded|contextual|longtail>",
      "anchor": "<exact anchor text from the options list>",
      "pre": "<EN text before the anchor>",
      "post": "<EN text after the anchor>",
      "reason": "<one short sentence why this insertion point>"
    },
    ... (2-3 entries)
  ]` : ''}
}`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 9000,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.rewrites || typeof parsed.rewrites !== 'object') {
    throw new Error('Agent response missing `rewrites` object');
  }
  // Validate link bridges — drop any with bad insertAfterKey or unknown target
  const sectionKeys = new Set(sections.map(s => s.key));
  const validTargets = new Set(relatedTargets.map(t => t.targetPath));
  const linkBridges = (parsed.linkBridges || []).filter(b => {
    if (!b.insertAfterKey || !sectionKeys.has(b.insertAfterKey)) return false;
    if (!b.targetPath || !validTargets.has(b.targetPath)) return false;
    if (!b.anchor || !b.pre == null || !b.post == null) return false;
    return true;
  });
  return { rewrites: parsed.rewrites, linkBridges, usage, authMode, fallback, fallbackReason };
}

// Translate previously-generated EN rewrites into the other 6 locales.
// Mechanical step — separate so iteration on EN doesn't keep eating locale tokens.
// If linkBridges are present, pre/post are translated too; anchor texts are
// passed in per-locale (from anchorMatrix lookup) and Claude must use them as-is.
async function translateRewrites({ page, enRewrites, linkBridges = [], bridgeAnchorsByLocale = [] }) {
  const system = `You are a localisation translator for a Montenegro car-rental site.
Translate the given English content into 6 locales: de, fr, it, me, pl, ru.

Each locale uses its native rental term:
- de: Mietwagen
- fr: location de voiture
- it: noleggio auto
- me: rent a car (or 'iznajmljivanje auta' depending on flow)
- pl: wypożyczalnia samochodów / wynajem samochodów
- ru: аренда авто / прокат авто

Match the source character count within ±20%. Keep factual values (distances, codes, times) identical. Output strict JSON only.`;

  const bridgeBlock = linkBridges.length > 0 ? `

EN link bridges (translate pre/post, use given anchors as-is):
${JSON.stringify(linkBridges.map((b, i) => ({
        index: i,
        targetPath: b.targetPath,
        en: { pre: b.pre, anchor: b.anchor, post: b.post },
        anchorByLocale: bridgeAnchorsByLocale[i] || {},
      })), null, 2)}` : '';

  const userPrompt = `Translate these EN sections to 6 locales for ${page}.

EN content (JSON):
${JSON.stringify(enRewrites, null, 2)}${bridgeBlock}

Output JSON shape:
{
  "translations": {
    "<i18nKey>": {
      "de": "...", "fr": "...", "it": "...", "me": "...", "pl": "...", "ru": "..."
    },
    ...
  }${linkBridges.length > 0 ? `,
  "bridgeTranslations": [
    {
      "index": 0,
      "de": { "pre": "...", "anchor": "<from anchorByLocale.de>", "post": "..." },
      "fr": { "pre": "...", "anchor": "<from anchorByLocale.fr>", "post": "..." },
      "it": { "pre": "...", "anchor": "<from anchorByLocale.it>", "post": "..." },
      "me": { "pre": "...", "anchor": "<from anchorByLocale.me>", "post": "..." },
      "pl": { "pre": "...", "anchor": "<from anchorByLocale.pl>", "post": "..." },
      "ru": { "pre": "...", "anchor": "<from anchorByLocale.ru>", "post": "..." }
    },
    ... (one per bridge)
  ]` : ''}
}`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 14000,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.translations || typeof parsed.translations !== 'object') {
    throw new Error('Translator response missing `translations` object');
  }
  return {
    translations: parsed.translations,
    bridgeTranslations: parsed.bridgeTranslations || [],
    usage, authMode, fallback, fallbackReason,
  };
}

// Step 1: Generate rewrites (no PR yet). Returns the proposed content
// alongside current values so the UI can show a side-by-side diff for
// review before the user commits to opening a PR.
//
// `relatedTargets` (optional) is an array of { targetPath, topQuery, anchorPool }
// — when provided, the agent will ALSO produce 2-3 link-bridge paragraphs
// linking out from this page to those related pages.
export async function generateAutoRewrite({ siteId, page, brandGuide, relatedTargets = [] }) {
  const repoCfg = SITE_REPOS[siteId];
  if (!repoCfg) throw new Error(`No repo configured for siteId ${siteId}`);
  const cfg = PAGE_CONFIGS[page];
  if (!cfg) throw new Error(`No page config registered for ${page}. Add to PAGE_CONFIGS.`);

  const { owner, repo, defaultBranch } = repoCfg;
  const gh = octokit();

  // 1. Fetch current en.json
  const enFile = await getFile(gh, owner, repo, 'src/i18n/locales/en.json', defaultBranch);
  const en = JSON.parse(enFile.content);
  const sections = buildSectionsFromEn(en, cfg);
  if (sections.length === 0) throw new Error(`No sections found for ${page} in namespaces ${cfg.metaNamespace} / ${cfg.bodyNamespace}`);

  // 2. Get GSC top queries from latest snapshot
  let topQueries = [];
  try {
    const snap = await loadLatestSnapshot(siteId);
    const opp = snap?.opportunities?.find(o => o.page === page);
    topQueries = (opp?.top3Queries || [])
      .filter(q => q.impressions >= 3)
      .slice(0, 5);
  } catch { /* fine — proceed without query context */ }

  // 3. Generate rewrites via Claude
  const defaultBrandGuide = `- Site: montenegrocarhire.com (Montenegro car rental)
- EN copy: lead with "car rental", "car hire" as secondary mention only — never both as primary
- Avoid TGD code outside parenthetical references (zero GSC impressions)
- Tone: factual, practical, rental-customer-oriented (drive times, pickup process, road numbers)
- Each locale uses its native term: DE Mietwagen, FR location de voiture, IT noleggio auto, ME rent a car, PL wypożyczalnia samochodów, RU аренда авто`;
  const { rewrites, linkBridges, usage, authMode, fallback, fallbackReason } = await generateEnRewrites({
    page, sections, topQueries,
    brandGuide: brandGuide || defaultBrandGuide,
    relatedTargets,
  });

  // Build outline so the UI can display in document order with current alongside
  const outline = sections.map(s => ({
    key: s.key,
    kind: s.kind,
    label: s.kind, // simple — could be enriched per kind
    currentEn: s.current,
    proposedEn: rewrites[s.key]?.en || null,
    hasRewrite: !!rewrites[s.key],
  }));

  // Assign each bridge a stable namespace key (used to add Pre/Text/Post i18n
  // keys + as the JSX line marker). Format: bridge_{slug}_{i}
  const bridgeKeys = (linkBridges || []).map((b, i) => {
    const slug = b.targetPath.slice(1).replace(/[^a-z0-9]+/gi, '').toLowerCase();
    return `bridge_${slug}_${i}`;
  });
  const enrichedBridges = (linkBridges || []).map((b, i) => ({
    ...b,
    bridgeKey: bridgeKeys[i],
  }));

  return {
    rewrites,            // full 7-locale content per i18nKey
    linkBridges: enrichedBridges,  // array of { insertAfterKey, targetPath, anchor, pre, post, anchorLabel, reason, bridgeKey }
    outline,             // array of { key, kind, currentEn, proposedEn, hasRewrite }
    topQueries,
    sectionCount: Object.keys(rewrites).length,
    bridgeCount: enrichedBridges.length,
    usage,
    authMode,
    fallback,
    fallbackReason,
  };
}

// Map a page path to the JSX file that renders it (mirror of SOURCE_FILES
// in implementOrphanFix.js — we need this for the link-bridge JSX surgery).
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
};

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Apply auto-rewrite changes to an existing branch (used by ship-queue).
// Caller already has the rewrites payload from the generate/translate step.
// `linkBridges` (optional): array of { insertAfterKey, targetPath, bridgeKey, prose: {en,de,...} }
// where prose[loc] = { pre, anchor, post }. We add Pre/Text/Post i18n keys
// and edit the source JSX to insert a new <p> with the link after the
// chosen insertAfterKey's <p>.
export async function applyAutoRewriteToBranch({ gh, owner, repo, branch, page, rewrites, linkBridges = [] }) {
  const cfg = PAGE_CONFIGS[page];
  const bodyNs = cfg?.bodyNamespace;

  // 1. Update i18n JSONs — section rewrites + bridge Pre/Text/Post keys
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    let touched = 0;
    // Section rewrites
    for (const [i18nKey, perLocale] of Object.entries(rewrites)) {
      const value = perLocale[loc];
      if (!value) continue;
      const parts = i18nKey.split('.');
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      touched++;
    }
    // Bridge keys — Pre/Text/Post under the body namespace
    if (bodyNs && linkBridges.length > 0) {
      if (typeof data[bodyNs] !== 'object' || data[bodyNs] == null) data[bodyNs] = {};
      for (const b of linkBridges) {
        const localeProse = b.prose?.[loc] || b.prose?.en;
        if (!localeProse) continue;
        data[bodyNs][`${b.bridgeKey}Pre`] = localeProse.pre || '';
        data[bodyNs][`${b.bridgeKey}Text`] = localeProse.anchor || '';
        data[bodyNs][`${b.bridgeKey}Post`] = localeProse.post || '';
        touched += 3;
      }
    }
    if (touched === 0) continue;
    await putFile(gh, owner, repo, path, branch, JSON.stringify(data, null, 2) + '\n', sha,
      `i18n(${loc}): auto-rewrite ${page} (${touched} keys)`);
  }

  // 2. JSX surgery for link bridges — insert new <p> elements after the
  // chosen insertAfterKey's existing <p>. Handles single + double quotes and
  // arbitrary whitespace.
  if (linkBridges.length > 0) {
    const jsxPath = JSX_FILES[page];
    if (!jsxPath) {
      console.warn(`[auto-rewrite] no JSX_FILES mapping for ${page} — skipping bridge insertion`);
      return;
    }
    const jsxFile = await getFile(gh, owner, repo, jsxPath, branch);
    let updatedJsx = jsxFile.content;
    let inserted = 0;
    const skipped = [];
    for (const b of linkBridges) {
      // Strip the namespace prefix from insertAfterKey if present (Claude
      // uses fully-qualified keys like "podgoricaAirportBody.bodyIntro1")
      const fqKey = b.insertAfterKey;
      const escapedKey = escapeRegex(fqKey);
      // Match <p>{t('FQ_KEY')}</p> with optional indentation, accept
      // single or double quotes around the key.
      const insertAfterRe = new RegExp(
        `(<p>\\s*\\{\\s*t\\(\\s*['"\`]${escapedKey}['"\`]\\s*\\)\\s*\\}\\s*<\\/p>)`,
      );
      const newP = `      <p>{t('${bodyNs}.${b.bridgeKey}Pre')}<a href={localePath('${b.targetPath}')}>{t('${bodyNs}.${b.bridgeKey}Text')}</a>{t('${bodyNs}.${b.bridgeKey}Post')}</p>`;
      if (insertAfterRe.test(updatedJsx)) {
        updatedJsx = updatedJsx.replace(insertAfterRe, `$1\n${newP}`);
        inserted++;
      } else {
        skipped.push({ bridgeKey: b.bridgeKey, reason: `couldn't find <p>{t('${fqKey}')}</p>` });
      }
    }
    if (inserted > 0) {
      await putFile(gh, owner, repo, jsxPath, branch, updatedJsx, jsxFile.sha,
        `feat: add ${inserted} contextual link bridges in ${page}`);
    }
    if (skipped.length > 0) {
      console.warn(`[auto-rewrite] ${page}: skipped ${skipped.length} bridges:`, skipped);
    }
  }
}

// Step 1.5 (optional): take EN rewrites and translate to other 6 locales.
// Run only when user has reviewed EN and wants to commit the localised version.
//
// `linkBridges` (with anchorMatrix per bridge target) — when provided, the
// translator also produces per-locale pre/post for each bridge, with the
// per-locale anchor text fixed (looked up from the matrix).
export async function translateEnRewrites({ page, enRewrites, linkBridges = [], targetAnchorMatrices = {} }) {
  // enRewrites shape: { i18nKey: { en: "..." }, ... }
  const enOnly = {};
  for (const [k, v] of Object.entries(enRewrites)) {
    if (v?.en) enOnly[k] = v.en;
  }

  // Resolve per-locale anchor text for each bridge using the same fallback
  // chain the UI uses (longtail → exact → partial → contextual).
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
  const LOCS = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];
  const bridgeAnchorsByLocale = linkBridges.map(b => {
    const matrix = targetAnchorMatrices[b.targetPath] || {};
    const out = {};
    for (const loc of LOCS) {
      const variants = matrix[loc] || [];
      let v = variants.find(x => x.label === b.anchorLabel);
      if (!v) {
        for (const fb of FALLBACK_BY_LABEL[b.anchorLabel] || []) {
          v = variants.find(x => x.label === fb);
          if (v) break;
        }
      }
      out[loc] = v?.text || b.anchor;
    }
    return out;
  });

  const { translations, bridgeTranslations, usage, authMode, fallback, fallbackReason } =
    await translateRewrites({
      page, enRewrites: enOnly,
      linkBridges: linkBridges.map(b => ({ targetPath: b.targetPath, pre: b.pre, anchor: b.anchor, post: b.post })),
      bridgeAnchorsByLocale,
    });

  // Merge section rewrites: keep EN, add other locales
  const merged = {};
  for (const [k, v] of Object.entries(enRewrites)) {
    merged[k] = { ...v, ...(translations[k] || {}) };
  }

  // Merge bridges: each bridge gets per-locale prose with the locale-fixed anchor
  const localizedBridges = linkBridges.map((b, i) => {
    const t = bridgeTranslations.find(bt => bt.index === i) || {};
    const prose = { en: { pre: b.pre, anchor: b.anchor, post: b.post } };
    for (const loc of ['de', 'fr', 'it', 'me', 'pl', 'ru']) {
      const lp = t[loc];
      prose[loc] = lp || {
        pre: b.pre,
        anchor: bridgeAnchorsByLocale[i][loc],
        post: b.post,
      };
      // Force per-locale anchor in case translator drifted
      prose[loc].anchor = bridgeAnchorsByLocale[i][loc];
    }
    return { ...b, prose };
  });

  return { rewrites: merged, linkBridges: localizedBridges, usage, authMode, fallback, fallbackReason };
}

// Step 2: Apply previously-generated rewrites by committing + opening a PR.
// Only updates locales present in the rewrites payload — EN-only payloads
// produce a single en.json commit; full payloads update all 7.
export async function applyAutoRewrite({ siteId, page, rewrites, topQueries = [], authMode = 'oauth', usage }) {
  const repoCfg = SITE_REPOS[siteId];
  if (!repoCfg) throw new Error(`No repo configured for siteId ${siteId}`);
  const cfg = PAGE_CONFIGS[page];
  if (!cfg) throw new Error(`No page config registered for ${page}.`);
  if (!rewrites || typeof rewrites !== 'object') throw new Error('rewrites object required');

  const { owner, repo, defaultBranch } = repoCfg;
  const gh = octokit();
  const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const branch = `seo/auto-rewrite-${slug(page)}`;

  const { data: refData } = await gh.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
  const baseSha = refData.object.sha;
  try { await gh.git.deleteRef({ owner, repo, ref: `heads/${branch}` }); } catch { /* didn't exist */ }
  await gh.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });

  const summary = [];
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    let touched = 0;
    for (const [i18nKey, perLocale] of Object.entries(rewrites)) {
      // Only update if THIS locale was generated. EN-only payloads skip de/fr/etc.
      const value = perLocale[loc];
      if (!value) continue;
      const parts = i18nKey.split('.');
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      touched++;
    }
    if (touched === 0) continue;
    const updated = JSON.stringify(data, null, 2) + '\n';
    await putFile(gh, owner, repo, path, branch, updated, sha,
      `i18n(${loc}): auto-rewrite ${page} (${touched} sections)`);
    summary.push({ locale: loc, touched });
  }

  const prBody = [
    `Auto-rewrite by carcam Internal Links agent.`,
    ``,
    `**Page:** \`${page}\``,
    `**Auth mode:** ${authMode} ${authMode === 'oauth' ? '(Pro/Max subscription quota — no API tokens billed)' : '(API tokens billed)'}`,
    `**Sections rewritten:** ${Object.keys(rewrites).length}`,
    usage ? `**Tokens used:** ${usage.input_tokens || '?'} input + ${usage.output_tokens || '?'} output` : '',
    ``,
    `## Top GSC queries that informed the rewrite`,
    topQueries.length === 0
      ? '- (no recent GSC data; agent worked from current content + brand guide)'
      : topQueries.map(q => `- "${q.query}" — ${q.impressions} imp, pos ${q.position?.toFixed?.(1) ?? '?'}`).join('\n'),
    ``,
    `## Per-locale changes`,
    summary.map(s => `- **${s.locale.toUpperCase()}**: ${s.touched} sections updated`).join('\n'),
    ``,
    `**Review carefully** — auto-generated. The user already previewed the EN diff in carcam before clicking Open PR. Spot-check non-EN locales for natural reading. Edit on this branch before merging if needed.`,
  ].filter(Boolean).join('\n');

  const pr = await gh.pulls.create({
    owner, repo, head: branch, base: defaultBranch,
    title: `SEO: auto-rewrite ${page}`,
    body: prBody,
  });

  // Auto-merge
  const { merged, mergeError } = await squashMergeAndCleanup({
    gh, owner, repo,
    pullNumber: pr.data.number,
    branch,
    title: `SEO: auto-rewrite ${page}`,
  });

  if (merged) {
    await logImplementations(siteId, {
      page,
      kind: 'auto-rewrite',
      i18nKeys: Object.keys(rewrites),
      sectionCount: Object.keys(rewrites).length,
      prNumber: pr.data.number,
      prUrl: pr.data.html_url,
      merged: true,
      mergedAt: new Date().toISOString(),
    });
  }

  return {
    prUrl: pr.data.html_url,
    branch,
    prNumber: pr.data.number,
    sectionCount: Object.keys(rewrites).length,
    merged,
    mergeError,
  };
}

// Backwards-compat one-shot (kept for callers that don't preview)
export async function autoRewritePage(args) {
  const generated = await generateAutoRewrite(args);
  const applied = await applyAutoRewrite({
    ...args,
    rewrites: generated.rewrites,
    topQueries: generated.topQueries,
    authMode: generated.authMode,
    usage: generated.usage,
  });
  return { ...generated, ...applied };
}

export { PAGE_CONFIGS };
