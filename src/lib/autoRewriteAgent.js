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
import { knowledgeForPrompt } from './serviceKnowledge.js';
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
// Scope: meta-tag keys (title, subtitle, seoDesc) + the body namespace's h1.
// Body paragraph rewriting is disabled — editorial content stays in human
// hands. Only meta tags + the rendered headline are auto-rewritten.
function buildSectionsFromEn(enJson, cfg) {
  const sections = [];
  // Meta-level keys
  const metaNs = enJson[cfg.metaNamespace] || {};
  for (const k of cfg.metaKeys) {
    if (typeof metaNs[k] === 'string') {
      sections.push({ key: `${cfg.metaNamespace}.${k}`, kind: k, current: metaNs[k] });
    }
  }
  // Body-level: ONLY h1 (the rendered headline). Skip all other body keys
  // (paragraphs, section titles, etc.) — those are editorial content not
  // suitable for automated rewriting.
  const bodyNs = enJson[cfg.bodyNamespace] || {};
  if (typeof bodyNs.h1 === 'string') {
    sections.push({ key: `${cfg.bodyNamespace}.h1`, kind: 'h1', current: bodyNs.h1 });
  }
  return sections;
}

// Ask Claude to generate EN-only rewrites for all sections, plus 2-3
// "link bridge" paragraphs that insert OUTBOUND links to related priority
// pages at natural points in the body. Bridges are emitted as Pre/anchor/Post
// triplets that get JSX-surgery'd into the source page on apply.
async function generateEnRewrites({ page, sections, topQueries, brandGuide }) {
  const system = `You are an SEO copy editor for a Montenegro car-rental site. Rewrite page meta tags (title, subtitle, seoDesc) and the h1 headline ONLY. Body content is OUT OF SCOPE — even if you see body keys you should not rewrite them.

Constraints:

1. Lead with the GSC-validated top query for the page (when natural and grammatical)
2. Tasteful keyword density — relevant terms should appear naturally where they fit, not stuffed
3. Strict character limits:
   - title: ≤ 60 characters
   - subtitle: ≤ 70 characters
   - seoDesc (meta description): 140-160 characters
   - h1: short and direct, ≤ 70 characters, no marketing fluff
4. PRESERVE proper-noun facts from the original: airport codes (TGD, TIV, DBV), city/region names. You may rephrase how the page is positioned, but don't drop a code or invent a new place name.
5. NEVER FABRICATE FACTS. No price claims, no daily rates, no EUR amounts, no comparisons ("cheapest", "most popular"), no invented numbers. Anything not in the original or the SERVICE FACTS below is UNKNOWN, leave it out. SERVICE FACTS fields marked "TODO" are unverified, don't use them.
6. NEVER use em dashes (—). Use periods, commas, semicolons, or "and" instead.
7. NEVER use marketing/CTA language: "browse", "book now", "convenient", "popular", "best", "easy", "stress-free", "many visitors". Reader is intelligent — drop the salesy adjectives.

SERVICE FACTS (verified data about the rental service — paraphrase only when relevant; never shoehorn):
${knowledgeForPrompt()}

Output strict JSON only. No prose, no markdown, no explanation.`;

  const userPrompt = `Rewrite the following meta + h1 sections for ${page}, English only.

GSC top queries (high to low impressions):
${topQueries.map(q => `- "${q.query}" (${q.impressions} imp, pos ${q.position?.toFixed?.(1) ?? '?'})`).join('\n')}

Brand voice notes:
${brandGuide}

Sections to rewrite (JSON):
${JSON.stringify(sections.map(s => ({ key: s.key, kind: s.kind, currentEn: s.current })), null, 2)}

Output JSON shape:
{
  "rewrites": {
    "<i18nKey>": { "en": "..." },
    ...
  }
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

  // Post-validation: scan each rewritten section for forced-language patterns
  // + check that named facts from original survive. Aggregated quality flags.
  const FORCED_PATTERNS = [
    { re: /\bif you need to\b/i, label: 'forced qualifier ("if you need to")' },
    { re: /\bfor a different\b/i, label: 'forced qualifier ("for a different")' },
    { re: /\bmany (visitors|travellers|drivers|people)\b/i, label: 'unverifiable claim ("many visitors/travellers")' },
    { re: /\b(convenient|popular|easy|quick|seamless|smooth|stress-free)\b/i, label: 'marketing adjective' },
    { re: /\b(best|cheapest|lowest|widest|biggest)\b/i, label: 'superlative claim' },
    { re: /\b(browse|book|explore|see) our\b/i, label: 'CTA verb ("browse/book/explore/see our")' },
    { re: /\b(offers? (?:convenient|the best|great))\b/i, label: 'marketing phrase' },
    { re: /\bwith\s+(?:unlimited mileage|insurance options|free cancellation)\b/i, label: 'inline benefit listing' },
  ];
  const NAMED_FACT_PATTERNS = [
    /\b[A-Z]{3}\b/g,                                                // airport codes
    /\b\d+(?:,\d{3})*\s*(?:km|kilometres|miles|residents|m|metres|years?|h\s*\d+\s*min)\b/gi,
    /\b\d{1,3}(?:,\d{3})+\b/g,                                      // 170,000-style numbers
  ];
  const sectionFlagsByKey = {};
  for (const s of sections) {
    const newEn = parsed.rewrites[s.key]?.en || '';
    if (!newEn) continue;
    const origLow = (s.current || '');
    const flags = [];
    // Forced patterns — only flag if NOT in original
    for (const { re, label } of FORCED_PATTERNS) {
      if (re.test(newEn) && !re.test(origLow)) flags.push(label);
    }
    // Fact preservation — pull facts from original, check they survive
    const seenFacts = new Set();
    for (const re of NAMED_FACT_PATTERNS) {
      const matches = origLow.match(re) || [];
      for (const m of matches) seenFacts.add(m);
    }
    const droppedFacts = [];
    for (const fact of seenFacts) {
      const isCode = /^[A-Z]{3}$/.test(fact);
      const lookupRe = isCode
        ? new RegExp(`\\b${fact}\\b`)
        : new RegExp(`\\b${fact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (!lookupRe.test(newEn)) droppedFacts.push(fact);
    }
    if (droppedFacts.length > 0) flags.push(`dropped facts: ${droppedFacts.join(', ')}`);
    if (flags.length > 0) sectionFlagsByKey[s.key] = flags;
  }

  return { rewrites: parsed.rewrites, qualityFlagsByKey: sectionFlagsByKey, usage, authMode, fallback, fallbackReason };
}

// Translate previously-generated EN rewrites into the other 6 locales.
// Mechanical step — separate so iteration on EN doesn't keep eating locale tokens.
// If linkBridges are present, pre/post are translated too; anchor texts are
// passed in per-locale (from anchorMatrix lookup) and Claude must use them as-is.
async function translateRewrites({ page, enRewrites }) {
  const system = `You are a localisation translator for a Montenegro car-rental site.
Translate the given English content (page meta tags + h1) into 6 locales: de, fr, it, me, pl, ru.

Each locale uses its native rental term:
- de: Mietwagen
- fr: location de voiture
- it: noleggio auto
- me: rent a car (or 'iznajmljivanje auta' depending on flow)
- pl: wypożyczalnia samochodów / wynajem samochodów
- ru: аренда авто / прокат авто

Match the source character count within ±20%. Keep factual values (distances, codes, times) identical. Output strict JSON only.`;

  const userPrompt = `Translate these EN meta + h1 sections to 6 locales for ${page}.

EN content (JSON):
${JSON.stringify(enRewrites, null, 2)}

Output JSON shape:
{
  "translations": {
    "<i18nKey>": {
      "de": "...", "fr": "...", "it": "...", "me": "...", "pl": "...", "ru": "..."
    },
    ...
  }
}`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 6000,
  });

  let cleaned = text.trim().replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.translations || typeof parsed.translations !== 'object') {
    throw new Error('Translator response missing `translations` object');
  }
  return {
    translations: parsed.translations,
    usage, authMode, fallback, fallbackReason,
  };
}

// Step 1: Generate rewrites (no PR yet). Scope is meta tags + h1 only —
// body paragraph rewriting is disabled; editorial content stays human.
// Returns the proposed content alongside current values so the UI can show
// a side-by-side diff for review before the user commits to shipping.
export async function generateAutoRewrite({ siteId, page, brandGuide }) {
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
  const { rewrites, qualityFlagsByKey, usage, authMode, fallback, fallbackReason } = await generateEnRewrites({
    page, sections, topQueries,
    brandGuide: brandGuide || defaultBrandGuide,
  });

  const outline = sections.map(s => ({
    key: s.key,
    kind: s.kind,
    label: s.kind,
    currentEn: s.current,
    proposedEn: rewrites[s.key]?.en || null,
    hasRewrite: !!rewrites[s.key],
  }));

  return {
    rewrites,
    outline,
    topQueries,
    sectionCount: Object.keys(rewrites).length,
    qualityFlagsByKey: qualityFlagsByKey || {},
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

// Map a page path to the JSX file that renders it. Used for the
// optional jsxLinks surgery — replaces a paragraph's single i18n key
// reference with the multi-part Pre/anchor/Post pattern so the link is
// rendered as a clickable <a>.
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

// Apply auto-rewrite changes to an existing branch (used by ship-queue).
//
// `rewrites`  — { i18nKey: { en, de, fr, it, me, pl, ru } } per-locale prose
// `jsxLinks`  — optional array of { hostKey, target, anchor, anchorMatrix? }
//               When provided, performs JSX surgery on each hostKey:
//                 - Splits each locale's prose into Pre/Text/Post around the
//                   anchor text (locale-specific anchor from anchorMatrix if
//                   given, else falls back to the EN anchor).
//                 - Writes Pre/Text/Post i18n keys.
//                 - Edits the page's JSX: <p>{t('hostKey')}</p> becomes the
//                   multi-part <p>{t('hostKeyPre')}<a>{t('hostKeyText')}</a>{t('hostKeyPost')}</p>
export async function applyAutoRewriteToBranch({ gh, owner, repo, branch, page, rewrites, jsxLinks = [] }) {
  const cfg = PAGE_CONFIGS[page];

  // Build a fast lookup: hostKey -> jsxLink (so we can split when writing i18n)
  const linksByHost = new Map();
  for (const link of (jsxLinks || [])) linksByHost.set(link.hostKey, link);

  // 1. Update i18n JSONs across all 7 locales
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    let touched = 0;

    for (const [i18nKey, perLocale] of Object.entries(rewrites)) {
      const value = perLocale[loc];
      if (typeof value !== 'string') continue;

      const link = linksByHost.get(i18nKey);
      const parts = i18nKey.split('.');
      const lastPart = parts[parts.length - 1];
      let cur = data;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }

      if (link) {
        // Split into Pre/Text/Post around the anchor for this locale
        const localeAnchor = link.anchorMatrix?.[loc] || link.anchor;
        const idx = value.indexOf(localeAnchor);
        if (idx >= 0) {
          cur[`${lastPart}Pre`] = value.slice(0, idx);
          cur[`${lastPart}Text`] = localeAnchor;
          cur[`${lastPart}Post`] = value.slice(idx + localeAnchor.length);
          touched += 3;
        } else {
          // Anchor not found in locale prose — fall back to EN anchor inline,
          // write the full prose as the host key (no split). User can fix
          // manually after if needed.
          cur[lastPart] = value;
          touched++;
        }
      } else {
        cur[lastPart] = value;
        touched++;
      }
    }
    if (touched === 0) continue;
    await putFile(gh, owner, repo, path, branch, JSON.stringify(data, null, 2) + '\n', sha,
      `i18n(${loc}): auto-rewrite ${page} (${touched} keys)`);
  }

  // 2. JSX surgery for each jsxLink — convert single-key <p> to multi-part
  if (jsxLinks.length > 0) {
    const jsxPath = JSX_FILES[page];
    if (!jsxPath) {
      console.warn(`[auto-rewrite] no JSX_FILES mapping for ${page}, skipping JSX surgery`);
      return;
    }
    const jsxFile = await getFile(gh, owner, repo, jsxPath, branch);
    let updatedJsx = jsxFile.content;
    let surgeried = 0;
    const skipped = [];
    for (const link of jsxLinks) {
      const fqKey = link.hostKey;
      const lastPart = fqKey.split('.').pop();
      const namespace = fqKey.split('.').slice(0, -1).join('.');
      const escapedKey = escapeRegex(fqKey);
      const re = new RegExp(
        `<p>\\s*\\{\\s*t\\(\\s*['"\`]${escapedKey}['"\`]\\s*\\)\\s*\\}\\s*<\\/p>`,
      );
      const replacement = `<p>{t('${namespace}.${lastPart}Pre')}<a href={localePath('${link.target}')}>{t('${namespace}.${lastPart}Text')}</a>{t('${namespace}.${lastPart}Post')}</p>`;
      if (re.test(updatedJsx)) {
        updatedJsx = updatedJsx.replace(re, replacement);
        surgeried++;
      } else {
        skipped.push({ hostKey: fqKey, reason: `couldn't find <p>{t('${fqKey}')}</p>` });
      }
    }
    if (surgeried > 0) {
      await putFile(gh, owner, repo, jsxPath, branch, updatedJsx, jsxFile.sha,
        `feat: weave ${surgeried} inbound link${surgeried === 1 ? '' : 's'} into ${page}`);
    }
    if (skipped.length > 0) {
      console.warn(`[auto-rewrite] ${page}: skipped ${skipped.length} jsxLinks:`, skipped);
    }
  }
}

// Step 1.5 (optional): take EN rewrites and translate to other 6 locales.
export async function translateEnRewrites({ page, enRewrites }) {
  const enOnly = {};
  for (const [k, v] of Object.entries(enRewrites)) {
    if (v?.en) enOnly[k] = v.en;
  }

  const { translations, usage, authMode, fallback, fallbackReason } =
    await translateRewrites({ page, enRewrites: enOnly });

  const merged = {};
  for (const [k, v] of Object.entries(enRewrites)) {
    merged[k] = { ...v, ...(translations[k] || {}) };
  }
  return { rewrites: merged, usage, authMode, fallback, fallbackReason };
}

// Step 2: Apply previously-generated rewrites by committing + opening a PR.
// Only updates locales present in the rewrites payload — EN-only payloads
// produce a single en.json commit; full payloads update all 7.
export async function applyAutoRewrite({ siteId, page, rewrites, topQueries = [], authMode = 'apiKey', usage }) {
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
    `**Auth mode:** ${authMode} (per-token billing via Anthropic API key)`,
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
