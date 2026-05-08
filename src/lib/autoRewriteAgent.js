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

// Ask Claude to generate rewrites for all sections in all 7 locales.
// Strict JSON output for parseability.
async function generateRewrites({ page, sections, topQueries, brandGuide }) {
  const system = `You are an SEO content rewriter for a Montenegro car-rental site. Your job is to rewrite page sections so they:
1. Lead with the GSC-validated top query for the page (when natural)
2. Stay locale-natural in all 7 locales (use the canonical rental term per locale: "car rental" / "Mietwagen" / "noleggio auto" / "location de voiture" / "rent a car" / "wypożyczalnia samochodów" / "аренда авто")
3. Stay within character limits (titles ≤ 60, meta descriptions 150-160, paragraphs match input length within ±20%)
4. Keep factual accuracy (distances, route numbers, airport codes, times)
5. Add rental-specific angles where relevant (pickup process, drive times, no shuttle, etc.)

Output strict JSON only. No prose, no markdown, no explanation. Just the JSON object.`;

  const userPrompt = `Rewrite these sections for the page ${page}.

GSC top queries (high to low impressions):
${topQueries.map(q => `- "${q.query}" (${q.impressions} imp, pos ${q.position?.toFixed?.(1) ?? '?'})`).join('\n')}

Brand voice notes:
${brandGuide}

Sections to rewrite (JSON):
${JSON.stringify(sections.map(s => ({ key: s.key, kind: s.kind, currentEn: s.current })), null, 2)}

Output JSON shape:
{
  "rewrites": {
    "<i18nKey>": {
      "en": "...",
      "de": "...",
      "fr": "...",
      "it": "...",
      "me": "...",
      "pl": "...",
      "ru": "..."
    },
    ...
  }
}

Return JSON for all sections above. Every locale field must be filled.`;

  const { text, usage, authMode, fallback, fallbackReason } = await chatOnce({
    system,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 16000,
  });

  // Strip markdown fences if any
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed.rewrites || typeof parsed.rewrites !== 'object') {
    throw new Error('Agent response missing `rewrites` object');
  }
  return { rewrites: parsed.rewrites, usage, authMode, fallback, fallbackReason };
}

// Step 1: Generate rewrites (no PR yet). Returns the proposed content
// alongside current values so the UI can show a side-by-side diff for
// review before the user commits to opening a PR.
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
  const { rewrites, usage, authMode, fallback, fallbackReason } = await generateRewrites({
    page, sections, topQueries,
    brandGuide: brandGuide || defaultBrandGuide,
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

  return {
    rewrites,            // full 7-locale content per i18nKey
    outline,             // array of { key, kind, currentEn, proposedEn, hasRewrite }
    topQueries,
    sectionCount: Object.keys(rewrites).length,
    usage,
    authMode,
    fallback,
    fallbackReason,
  };
}

// Step 2: Apply previously-generated rewrites by committing + opening a PR.
// Caller passes the full `rewrites` object back so the system has no
// server-side state between generate and apply.
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
      const value = perLocale[loc] || perLocale.en;
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

  return {
    prUrl: pr.data.html_url,
    branch,
    prNumber: pr.data.number,
    sectionCount: Object.keys(rewrites).length,
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
