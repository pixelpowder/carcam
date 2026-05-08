// Internal Links Analysis — server-side pipeline.
// Joins GSC + GA4 + filesystem crawl of the active site into:
//   - opportunities[]     (every page with traffic data + inbound link count + score)
//   - orphanFixList[]     (priority targets with suggested source pages and anchors)
//
// Used by /api/internal-links/route.js. Filesystem reads only work in local dev.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { generateAnchorVariants, pickVariantForEdge, assignVariantsToEdges } from './anchorVariants.js';

const LOCALES = ['de', 'fr', 'it', 'me', 'pl', 'ru'];
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'a', 'an', 'in', 'on', 'of', 'to', 'is', 'at']);
const COMMON_VOCAB = new Set(['car', 'cars', 'rental', 'rentals', 'hire', 'hires', 'rent', 'renting', 'auto', 'autos', 'vehicle', 'vehicles', 'mietwagen', 'noleggio', 'autonoleggio', 'location', 'voiture', 'voitures']);

// ---------- Filesystem crawl ----------

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.claude' || name === '.git') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(name)) files.push(full);
  }
  return files;
}

function extractInternalLinks(content) {
  const links = new Set();
  for (const m of content.matchAll(/localePath\(\s*['"`](\/[^'"`)]+)['"`]\s*\)/g)) links.add(m[1]);
  for (const m of content.matchAll(/href\s*=\s*["'](\/[^"'#]*?)["']/g)) {
    if (!m[1].startsWith('//')) links.add(m[1]);
  }
  return [...links];
}

// Extract (target, anchorText) pairs by parsing the actual <a> element text.
// Handles three common patterns:
//   <a href={localePath('/x')}>{t('key')}</a>       — i18n-keyed
//   <a href="/x">Text</a>                           — literal
//   <a href={localePath('/x')}>literal text</a>     — literal inside JSX expr href
function extractAnchorPairs(content, enFlat) {
  const pairs = [];
  // i18n-keyed
  for (const m of content.matchAll(/<a\s+href=\{?\s*localePath\(\s*['"](\/[^'"]+)['"]\s*\)\s*\}?\s*>\s*\{?\s*t\(\s*['"]([^'"]+)['"]\s*\)\s*\}?\s*<\/a>/g)) {
    const target = m[1];
    const text = enFlat[m[2]];
    if (text) pairs.push({ target, text: text.trim() });
  }
  // literal inside <a href="/x">
  for (const m of content.matchAll(/<a\s+href=["'](\/[^"'#]*?)["']\s*>([^<{}]+?)<\/a>/g)) {
    const target = m[1];
    const text = m[2].trim();
    if (text) pairs.push({ target, text });
  }
  return pairs;
}

// Flatten a JSON object — same as in buildOrphanFixList. Local helper because
// extractAnchorPairs needs it during crawl, before buildOrphanFixList runs.
function flattenJson(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (Array.isArray(v)) v.forEach((item, i) => {
      if (typeof item === 'string') out[`${key}[${i}]`] = item;
      else if (item && typeof item === 'object') flattenJson(item, `${key}[${i}]`, out);
    });
    else if (v && typeof v === 'object') flattenJson(v, key, out);
  }
  return out;
}

// Map common page-component filenames → canonical URL paths
const COMPONENT_TO_PATH = {
  'Kotor.jsx': '/kotor', 'Budva.jsx': '/budva', 'Tivat.jsx': '/tivat', 'Podgorica.jsx': '/podgorica',
  'Bar.jsx': '/bar', 'Ulcinj.jsx': '/ulcinj', 'Niksic.jsx': '/niksic', 'HercegNovi.jsx': '/herceg-novi',
  'Perast.jsx': '/perast', 'Montenegro.jsx': '/montenegro',
  'PodgoricaAirport.jsx': '/podgorica-airport', 'TivatAirport.jsx': '/tivat-airport', 'DubrovnikAirport.jsx': '/dubrovnik-airport',
  'BorderCrossing.jsx': '/border-crossing-guide', 'DrivingGuide.jsx': '/montenegro-driving-guide',
  'FleetIndex.jsx': '/cars', 'CarDetail.jsx': '/cars/[slug]', 'NotFound.jsx': '/404',
  'MontenegroRoadTrip10Days.jsx': '/blog/montenegro-road-trip-10-days',
  'MontenegroWineRoad.jsx': '/blog/montenegro-wine-road',
  'MontenegroBeachesByCar.jsx': '/blog/montenegro-beaches-by-car',
  'MontenegroCampingCar.jsx': '/blog/montenegro-camping-car',
  'MontenegroMonasteriesCircuit.jsx': '/blog/montenegro-monasteries-circuit',
  'MontenegroMountainPasses.jsx': '/blog/montenegro-mountain-passes',
  'MontenegroNationalParks.jsx': '/blog/montenegro-national-parks',
  'MontenegroAutumnColours.jsx': '/blog/montenegro-autumn-colours',
  'TaraRiverCanyonDrive.jsx': '/blog/tara-river-canyon-drive',
};

function sourceFor(filePath, siteRoot) {
  const rel = relative(siteRoot, filePath).replace(/\\/g, '/');
  const base = rel.split('/').pop();
  if (COMPONENT_TO_PATH[base]) return { type: 'page', path: COMPONENT_TO_PATH[base], file: rel };
  const m = rel.match(/^src\/app\/\[lang\]\/(.*?)\/?page\.jsx$/);
  if (m) return { type: 'page', path: '/' + m[1].replace(/\/?$/, '').replace(/\/page$/, ''), file: rel };
  if (rel === 'src/app/[lang]/page.jsx') return { type: 'page', path: '/', file: rel };
  return null;
}

function normalizeTarget(p) {
  let t = p.split('#')[0].split('?')[0];
  if (t.length > 1 && t.endsWith('/')) t = t.slice(0, -1);
  return t;
}

export function crawlLinkGraph(siteRoot) {
  const empty = { graph: [], inboundCounts: {}, outboundCounts: {}, edges: new Set(), anchorTextCounts: {} };
  if (!siteRoot) return empty;
  let files = [];
  let enFlat = {};
  try {
    const srcDir = join(siteRoot, 'src');
    if (!existsSync(srcDir)) return empty;
    files = walk(srcDir);
    const enPath = join(siteRoot, 'src/i18n/locales/en.json');
    if (existsSync(enPath)) enFlat = flattenJson(JSON.parse(readFileSync(enPath, 'utf8')));
  } catch {
    return empty;
  }
  const graph = [];
  const inboundCounts = {};
  const outboundCounts = {};
  const edges = new Set();
  // Sitewide anchor overuse map — keyed by `${anchorText}::${target}` → count.
  // Built from the existing codebase; new suggestions check this map and
  // skip variants whose (text, target) tuple is already over-represented.
  const anchorTextCounts = {};
  for (const f of files) {
    const src = sourceFor(f, siteRoot);
    if (!src) continue;
    const content = readFileSync(f, 'utf8');
    const links = extractInternalLinks(content).map(normalizeTarget);
    const uniqueTargets = new Set(links.filter(t => t !== src.path));
    for (const target of uniqueTargets) {
      graph.push({ source: src.path, target, sourceFile: src.file });
      inboundCounts[target] = (inboundCounts[target] || 0) + 1;
      outboundCounts[src.path] = (outboundCounts[src.path] || 0) + 1;
      edges.add(`${src.path}->${target}`);
    }
    // Anchor text capture (best-effort — covers ~85% of patterns)
    const pairs = extractAnchorPairs(content, enFlat);
    for (const p of pairs) {
      const key = `${p.text.toLowerCase()}::${normalizeTarget(p.target)}`;
      anchorTextCounts[key] = (anchorTextCounts[key] || 0) + 1;
    }
  }
  return { graph, inboundCounts, outboundCounts, edges, anchorTextCounts };
}

// ---------- GSC aggregation ----------

function canonicalGscPage(pageUrl, siteOrigin) {
  let p = pageUrl.replace(siteOrigin.replace(/\/$/, ''), '');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  for (const loc of LOCALES) {
    if (p === `/${loc}`) return { canonical: '/', locale: loc };
    if (p.startsWith(`/${loc}/`)) return { canonical: p.slice(loc.length + 1) || '/', locale: loc };
  }
  return { canonical: p || '/', locale: 'en' };
}

export function aggregateGsc({ pages, queryPages }, siteOrigin) {
  const byCanonical = new Map();
  for (const p of pages) {
    const { canonical: c } = canonicalGscPage(p.keys[0], siteOrigin);
    if (!byCanonical.has(c)) byCanonical.set(c, { totalImpressions: 0, totalClicks: 0 });
    const e = byCanonical.get(c);
    e.totalImpressions += p.impressions;
    e.totalClicks += p.clicks;
  }
  const queryByCanonical = new Map();
  for (const r of queryPages) {
    const { canonical: c, locale } = canonicalGscPage(r.keys[1], siteOrigin);
    if (!queryByCanonical.has(c)) queryByCanonical.set(c, []);
    queryByCanonical.get(c).push({ query: r.keys[0], locale, impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, position: r.position });
  }
  return { byCanonical, queryByCanonical };
}

function topQueryFor(rows) {
  const filtered = rows.filter(r => r.impressions >= 3);
  if (!filtered.length) return null;
  filtered.sort((a, b) => {
    const aS = a.position >= 4 && a.position <= 20 ? 1 : 0;
    const bS = b.position >= 4 && b.position <= 20 ? 1 : 0;
    if (aS !== bS) return bS - aS;
    return b.impressions - a.impressions;
  });
  return filtered[0];
}

// ---------- GA4 merge ----------

export function mergeGa4(opportunities, ga4Pages, siteOrigin) {
  const byCanon = new Map();
  for (const r of ga4Pages) {
    if (!r.path?.startsWith('/')) continue;
    let p = r.path.replace(/\/$/, '') || '/';
    for (const loc of LOCALES) {
      if (p === `/${loc}`) { p = '/'; break; }
      if (p.startsWith(`/${loc}/`)) { p = p.slice(loc.length + 1) || '/'; break; }
    }
    const cur = byCanon.get(p) || { sessions: 0, views: 0, engagedSessions: 0, engagementSec: 0 };
    cur.sessions += r.sessions || 0;
    cur.views += r.views || 0;
    cur.engagedSessions += r.engagedSessions || 0;
    cur.engagementSec += r.engagementSec || 0;
    byCanon.set(p, cur);
  }
  for (const o of opportunities) {
    const ga4 = byCanon.get(o.page) || { sessions: 0, views: 0, engagedSessions: 0, engagementSec: 0 };
    o.ga4Sessions = ga4.sessions;
    o.ga4Views = ga4.views;
    o.ga4EngagementRate = ga4.sessions > 0 ? ga4.engagedSessions / ga4.sessions : 0;
    o.ga4SecPerSession = ga4.sessions > 0 ? Math.round(ga4.engagementSec / ga4.sessions) : 0;
    if (o.ga4SecPerSession > 120) o.score += 15;
    else if (o.ga4SecPerSession > 60) o.score += 8;
    if (o.ga4Sessions >= 5) o.score += 5;
  }
  return opportunities;
}

// ---------- Build opportunities list ----------

export function buildOpportunities({ byCanonical, queryByCanonical }, inboundCounts, outboundCounts = {}) {
  const out = [];
  for (const [page, agg] of byCanonical) {
    const queries = queryByCanonical.get(page) || [];
    const tq = topQueryFor(queries);
    const inboundLinks = inboundCounts[page] || 0;
    const outboundLinks = outboundCounts[page] || 0;
    const top3 = queries.filter(q => q.impressions >= 3).sort((a, b) => b.impressions - a.impressions).slice(0, 3);
    const tqStriking = tq && tq.position >= 4 && tq.position <= 15;
    const tqNear = tq && tq.position > 15 && tq.position <= 30;

    let score = 0;
    if (tqStriking) score += 50;
    else if (tqNear) score += 20;
    score += Math.min(agg.totalImpressions / 5, 50);
    if (inboundLinks <= 1) score += 15;
    if (agg.totalClicks === 0 && agg.totalImpressions > 30) score += 10;

    const recParts = [];
    if (tqStriking && inboundLinks <= 2) recParts.push(`add internal links with anchor "${tq.query}"`);
    if (inboundLinks === 0) recParts.push('orphan page — link from related blog/destination pages');
    else if (inboundLinks === 1) recParts.push('only 1 inbound link — add 2-3 more');
    if (agg.totalClicks === 0 && agg.totalImpressions > 30) recParts.push('rewrite meta description');

    out.push({
      page,
      impressions: agg.totalImpressions,
      clicks: agg.totalClicks,
      topQuery: tq?.query || '',
      topQueryImpressions: tq?.impressions || 0,
      topQueryPosition: tq?.position || 0,
      strikingDistance: tqStriking ? 'YES' : (tqNear ? 'near' : ''),
      top3Queries: top3,
      inboundLinks,
      outboundLinks,
      score: Math.round(score),
      recommendation: recParts.join('; '),
      diagnosis: generateDiagnosis({ impressions: agg.totalImpressions, clicks: agg.totalClicks, tq, tqStriking, tqNear, inboundLinks }),
      actions: generateActions({ page, impressions: agg.totalImpressions, clicks: agg.totalClicks, tq, tqStriking, tqNear, inboundLinks }),
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

// ---------- Per-page diagnosis + recommended actions ----------
//
// For each page we generate a one-line diagnosis ("what's the situation")
// and a list of concrete actions ("what to do about it"). Used in the
// expanded row panel of the All Pages table.

function generateDiagnosis({ impressions, clicks, tq, tqStriking, tqNear, inboundLinks }) {
  if (!impressions || impressions === 0) return 'No GSC traffic — page may not be indexed or has no relevant queries yet.';
  if (impressions > 100 && clicks === 0) return `${impressions} impressions but no clicks — title/meta description isn't winning the click.`;
  if (tqStriking && inboundLinks <= 4) return `Striking distance keyword "${tq.query}" at position ${tq.position.toFixed(1)} — small content + link push could win page 1.`;
  if (tq?.position && tq.position > 50) return `Top query "${tq.query}" ranks position ${tq.position.toFixed(0)} — content isn't matching searcher intent. Rewrite needed, not just links.`;
  if (tqNear) return `Top query "${tq.query}" at position ${tq.position.toFixed(1)} — near striking distance. Content polish + 2-3 internal links could move it.`;
  if (inboundLinks <= 1) return `Only ${inboundLinks} contextual inbound link — orphan candidate. Adding internal links is the cheapest lever.`;
  if (clicks > 0 && tq?.position < 10) return `Already on page 1 for "${tq.query}" with ${clicks} clicks — protect this ranking, don't disrupt content.`;
  return 'Standard performer — no urgent action.';
}

function generateActions({ page, impressions, clicks, tq, tqStriking, tqNear, inboundLinks }) {
  const actions = [];
  if (!impressions) {
    actions.push({ priority: 'high', action: 'Verify the page is in your sitemap.xml and submit to GSC for indexing.' });
    actions.push({ priority: 'med', action: 'Check robots.txt and noindex tags — page might be blocked from search.' });
    return actions;
  }
  // CTR problem: high imp, no clicks
  if (impressions > 50 && clicks === 0) {
    actions.push({ priority: 'high', action: `Rewrite the meta description to lead with "${tq?.query || 'the top keyword'}" and a clear value proposition.` });
    actions.push({ priority: 'high', action: 'Audit the title tag — is it truncated in SERPs? Make sure the keyword appears in the first 50 characters.' });
  }
  // Striking distance: small push wins
  if (tqStriking) {
    actions.push({ priority: 'high', action: `Add 2-3 contextual inbound links to this page using anchor variants of "${tq.query}".` });
    actions.push({ priority: 'med', action: 'Add an FAQ section or H2 covering the search intent for the top query.' });
    actions.push({ priority: 'med', action: 'Mention the keyword once in the first paragraph and once in an H2.' });
  }
  // Near striking distance
  else if (tqNear) {
    actions.push({ priority: 'high', action: `Refresh content to better match "${tq.query}" intent — add specifics, prices, recent dates.` });
    actions.push({ priority: 'med', action: 'Add 2-3 contextual inbound links with anchor variants.' });
  }
  // Position > 30: content needs rewriting
  else if (tq?.position && tq.position > 30) {
    actions.push({ priority: 'high', action: `Audit content vs the top SERP results for "${tq.query}" — page is too far back for links alone to fix. Rewrite for intent match.` });
    actions.push({ priority: 'med', action: 'Check page depth, H1 alignment, and internal linking from related pages.' });
  }
  // Orphan
  if (inboundLinks <= 1) {
    actions.push({ priority: 'high', action: `Add ${3 - inboundLinks} contextual internal links from related blog/destination pages — see Orphan fix list tab for source suggestions.` });
  }
  if (actions.length === 0) {
    actions.push({ priority: 'low', action: 'Page is performing — leave it alone unless you spot a regression in ΔPos.' });
  }
  return actions;
}

// ---------- Candidate sources & orphan fix list ----------

const PAGE_TO_NAMESPACE = {
  '/': ['hero', 'home', 'destinations', 'destCards', 'featureCards', 'howItWorks', 'fleet', 'trust', 'stats'],
  '/about': ['about', 'aboutBody'], '/kotor': ['kotor', 'kotorBody'], '/budva': ['budva', 'budvaBody'],
  '/tivat': ['tivat', 'tivatBody'], '/podgorica': ['podgorica', 'podgoricaBody'],
  '/podgorica-airport': ['podgorica-airport', 'podgoricaAirportBody'],
  '/tivat-airport': ['tivat-airport', 'tivatAirportBody'],
  '/dubrovnik-airport': ['dubrovnik-airport', 'dubrovnikAirportBody'],
  '/perast': ['perast', 'perastBody'], '/herceg-novi': ['herceg-novi', 'hercegNoviBody'],
  '/ulcinj': ['ulcinj', 'ulcinjBody'], '/bar': ['bar', 'barBody'], '/niksic': ['niksic', 'niksicBody'],
  '/montenegro': ['montenegro', 'montenegroBody'],
  '/border-crossing-guide': ['border-crossing', 'borderCrossingBody'],
  '/montenegro-driving-guide': ['drivingGuide', 'drivingGuideBody'],
  '/blog': ['blogIndex', 'blogHome'],
  '/blog/montenegro-camping-car': ['blogCamping'],
  '/blog/montenegro-beaches-by-car': ['blogBeaches'],
  '/blog/montenegro-wine-road': ['blogWine'],
  '/blog/montenegro-monasteries-circuit': ['blogMonasteries'],
  '/blog/montenegro-mountain-passes': ['blogPasses'],
  '/blog/montenegro-national-parks': ['blogParks'],
  '/blog/montenegro-autumn-colours': ['blogAutumn'],
  '/blog/montenegro-road-trip-10-days': ['blogRoadtrip'],
  '/blog/tara-river-canyon-drive': ['blogTara'],
  '/cars': ['fleet', 'cars', 'fleetIndex'],
};

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (Array.isArray(v)) v.forEach((item, i) => {
      if (typeof item === 'string') out[`${key}[${i}]`] = item;
      else if (item && typeof item === 'object') flatten(item, `${key}[${i}]`, out);
    });
    else if (v && typeof v === 'object') flatten(v, key, out);
  }
  return out;
}

function relevance(sourcePage, target) {
  const isBlog = (p) => p.startsWith('/blog/');
  const isLocation = (p) => /^\/(kotor|budva|tivat|podgorica|perast|bar|niksic|herceg-novi|ulcinj|montenegro)$/.test(p);
  const isAirport = (p) => /-airport$/.test(p);
  const isGuide = (p) => /(driving-guide|border-crossing-guide)/.test(p);
  if (isBlog(sourcePage) && (isLocation(target) || isAirport(target))) return 10;
  if (isLocation(sourcePage) && isAirport(target)) return 9;
  if (isAirport(sourcePage) && isLocation(target)) return 8;
  if (isGuide(sourcePage) && (isLocation(target) || isAirport(target))) return 7;
  if (isLocation(sourcePage) && isBlog(target)) return 7;
  if (isBlog(sourcePage) && isBlog(target)) return 6;
  if (isLocation(sourcePage) && isLocation(target)) return 5;
  if (isAirport(sourcePage) && isBlog(target)) return 5;
  if (sourcePage === '/') return 2;
  if (sourcePage === '/about') return 1;
  return 0;
}

function buildMatcher(query) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w));
  if (!words.length) return null;
  return { phrase: query.toLowerCase(), words };
}

function matchScore(text, matcher) {
  const t = text.toLowerCase();
  if (t.includes(matcher.phrase)) return 'phrase';
  const distinctive = matcher.words.filter(w => !COMMON_VOCAB.has(w));
  if (!distinctive.length) return null;
  return distinctive.every(w => t.includes(w)) ? 'semantic' : null;
}

// `navTargets` is a Set of target paths whose existing inbound links are
// dominantly sitewide nav/footer (>50% of pages). For those targets we skip
// the "already linked" edge check so contextual recommendations aren't
// blocked by the nav link.
export function buildOrphanFixList(opportunities, edges, siteRoot, anchorTextCounts = {}, navTargets = new Set()) {
  if (!siteRoot) return [];
  let en;
  try {
    const enPath = join(siteRoot, 'src/i18n/locales/en.json');
    if (!existsSync(enPath)) return [];
    en = JSON.parse(readFileSync(enPath, 'utf8'));
  } catch { return []; }
  const flat = flatten(en);

  const pageTexts = new Map();
  for (const [page, namespaces] of Object.entries(PAGE_TO_NAMESPACE)) {
    const parts = [];
    for (const ns of namespaces) {
      for (const [k, v] of Object.entries(flat)) {
        if (k === ns || k.startsWith(ns + '.') || k.startsWith(ns + '[')) parts.push(v);
      }
    }
    pageTexts.set(page, parts.join(' \n '));
  }

  // Filter targets:
  //   - non-nav targets: include if inbound <= 4 (truly under-linked contextually)
  //   - nav-saturated targets: include if impressions >= 30 (high-traffic pages
  //     still benefit from contextual links even when nav-saturated; the nav
  //     gives crawl coverage, contextual gives ranking signal)
  //   - all: require >= 5 impressions and a topQuery
  const orphanTargets = opportunities
    .filter(o => {
      if (!o.topQuery || o.impressions < 5) return false;
      if (navTargets.has(o.page)) return o.impressions >= 30;
      return o.inboundLinks <= 4;
    })
    .map(o => ({ ...o, navSaturated: navTargets.has(o.page) }))
    .sort((a, b) => b.score - a.score);

  const result = [];
  for (const target of orphanTargets) {
    const matcher = buildMatcher(target.topQuery);
    if (!matcher) continue;
    const isNavSaturated = navTargets.has(target.page);
    const candidates = [];
    for (const [sourcePage, text] of pageTexts) {
      if (sourcePage === target.page) continue;
      // For nav-saturated targets, skip the "already linked" check — the
      // existing edge is the sitewide nav link, not a contextual one. A
      // contextual blog link is still additive even if nav already links.
      if (!isNavSaturated && edges.has(`${sourcePage}->${target.page}`)) continue;
      if (!text) continue;
      if (!matchScore(text, matcher)) continue;
      const rel = relevance(sourcePage, target.page);
      if (rel === 0) continue;
      candidates.push({ sourcePage, relevance: rel });
    }
    candidates.sort((a, b) => b.relevance - a.relevance);
    if (candidates.length === 0) continue;

    // Round-robin assign distinct anchor variants across the top candidates.
    // gscQueries — pull all this target's queries with imp ≥ 3 for longtails.
    const top = candidates.slice(0, 5);
    const gscQueries = (target.top3Queries || []).map(q => ({ query: q.query, impressions: q.impressions }));
    // We assign in EN by default — anchor text shown in the orphan-fix list.
    // Other locales' anchors are looked up from anchorMatrix when implementing.
    const { assignments, filteredCount } = assignVariantsToEdges(
      target.page, 'en', target.topQuery, gscQueries,
      top.map(c => c.sourcePage),
      anchorTextCounts || {}
    );
    const enrichedCandidates = top.map(c => {
      const v = assignments[c.sourcePage] || { text: target.topQuery, label: 'exact', term: 'primary' };
      return { ...c, anchor: v.text, anchorLabel: v.label };
    });

    // Full 7-locale matrix attached per target so the UI's locale tabs work.
    const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];
    const anchorMatrix = {};
    for (const loc of LOCALES) {
      anchorMatrix[loc] = generateAnchorVariants(target.page, loc, target.topQuery, gscQueries);
    }
    result.push({
      ...target,
      candidateSources: enrichedCandidates,
      anchorMatrix,
    });
  }
  return result;
}
