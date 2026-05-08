// Live-site crawler — alternative to filesystem crawl.
// Fetches sitemap.xml to discover URLs, then fetches each page's HTML and
// extracts internal links + anchor text. Output shape matches crawlLinkGraph.
//
// Usage: in production / Vercel where the codebase isn't bundled, OR for
// sister sites where we don't have local source code. Slower than the fs
// crawler (one HTTP per page) but works anywhere.
//
// Polite defaults: 5 concurrent requests, 5-second per-request timeout,
// custom User-Agent identifying us as carcam.

const USER_AGENT = 'carcam-internal-links-bot/1.0 (+https://montenegrocarhire.com)';
const MAX_CONCURRENT = 5;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_PAGES = 200; // safety cap

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// Concurrency-limited Promise.all
async function pMap(items, mapper, concurrency = MAX_CONCURRENT) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await mapper(items[idx], idx);
    }
  }));
  return out;
}

// Parse a sitemap.xml — handles both single sitemaps and sitemap indexes.
async function discoverUrlsFromSitemap(siteOrigin) {
  const candidates = [
    `${siteOrigin}/sitemap.xml`,
    `${siteOrigin}/sitemap_index.xml`,
    `${siteOrigin}/sitemap-0.xml`,
  ];
  for (const sitemapUrl of candidates) {
    const xml = await fetchWithTimeout(sitemapUrl);
    if (!xml) continue;
    // Sitemap index: <sitemap><loc>...</loc></sitemap>
    if (/<sitemapindex/i.test(xml)) {
      const subSitemaps = [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/gi)].map(m => m[1]);
      const allUrls = [];
      for (const sub of subSitemaps.slice(0, 10)) {
        const subXml = await fetchWithTimeout(sub);
        if (!subXml) continue;
        const urls = [...subXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map(m => m[1]);
        allUrls.push(...urls);
      }
      return allUrls;
    }
    // Plain sitemap
    const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/gi)].map(m => m[1]);
    if (urls.length) return urls;
  }
  return [];
}

// Extract internal links + anchor text from rendered HTML.
// Returns array of { target, text }.
function extractAnchorsFromHtml(html, siteOrigin) {
  const out = [];
  // Basic <a href="..."> matcher — covers static-rendered Next.js output.
  // Captures the href and inner text. Skips <a> with no href, JS-only, or
  // links to assets/images.
  const re = /<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    let href = m[1].trim();
    let inner = m[2];
    // Resolve relative URLs / strip site origin
    if (href.startsWith(siteOrigin)) href = href.slice(siteOrigin.length) || '/';
    if (!href.startsWith('/')) continue; // external
    if (/^\/(api|_next|images?|img|static|favicon|robots|sitemap)/.test(href)) continue;
    // Strip query + fragment
    href = href.split('#')[0].split('?')[0];
    if (href.length > 1 && href.endsWith('/')) href = href.slice(0, -1);
    // Strip HTML from anchor inner — keep only text content
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text || text.length > 200) continue;
    out.push({ target: href, text });
  }
  return out;
}

// Strip locale prefix from a path (mirrors aggregateGsc canonicalisation)
const LOCALES = ['de', 'fr', 'it', 'me', 'pl', 'ru'];
function canonicalPath(p) {
  let path = p.replace(/\/$/, '') || '/';
  for (const loc of LOCALES) {
    if (path === `/${loc}`) return '/';
    if (path.startsWith(`/${loc}/`)) return path.slice(loc.length + 1) || '/';
  }
  return path;
}

// Source page identifier — for the link graph, we use the canonical path
// of the source page. Multi-locale duplicates collapse: links from /de/kotor
// and /kotor are both attributed to source `/kotor` for sitewide totals.
function sourceFromPageUrl(pageUrl, siteOrigin) {
  let p = pageUrl.replace(siteOrigin, '');
  if (!p.startsWith('/')) p = '/';
  return canonicalPath(p);
}

export async function crawlLiveSite(siteUrl) {
  const siteOrigin = siteUrl.replace(/\/$/, '');
  const empty = { graph: [], inboundCounts: {}, outboundCounts: {}, edges: new Set(), anchorTextCounts: {}, crawledPages: 0, source: 'live' };

  const allUrls = await discoverUrlsFromSitemap(siteOrigin);
  if (!allUrls.length) return empty;

  // Dedupe + cap. Prefer EN URLs (no locale prefix) since they have richer
  // contextual links; we'd canonicalise to the same source path anyway.
  const seen = new Set();
  const enFirst = allUrls.sort((a, b) => {
    const aIsLocale = LOCALES.some(l => a.replace(siteOrigin, '').startsWith(`/${l}/`));
    const bIsLocale = LOCALES.some(l => b.replace(siteOrigin, '').startsWith(`/${l}/`));
    return Number(aIsLocale) - Number(bIsLocale);
  });
  const urls = enFirst.filter(u => {
    const c = sourceFromPageUrl(u, siteOrigin);
    if (seen.has(c)) return false;
    seen.add(c); return true;
  }).slice(0, MAX_PAGES);

  const graph = [];
  const inboundCounts = {};
  const outboundCounts = {};
  const edges = new Set();
  const anchorTextCounts = {};

  await pMap(urls, async (url) => {
    const html = await fetchWithTimeout(url);
    if (!html) return;
    const source = sourceFromPageUrl(url, siteOrigin);
    const anchors = extractAnchorsFromHtml(html, siteOrigin);
    // Dedupe by target within a source — repeat links count once for outbound
    const uniqueTargets = new Set();
    for (const { target, text } of anchors) {
      const canonTarget = canonicalPath(target);
      if (canonTarget === source) continue;
      const edgeKey = `${source}->${canonTarget}`;
      if (!edges.has(edgeKey)) {
        edges.add(edgeKey);
        graph.push({ source, target: canonTarget });
        inboundCounts[canonTarget] = (inboundCounts[canonTarget] || 0) + 1;
        if (!uniqueTargets.has(canonTarget)) {
          outboundCounts[source] = (outboundCounts[source] || 0) + 1;
          uniqueTargets.add(canonTarget);
        }
      }
      // Anchor text count (per text+target tuple)
      const textKey = `${text.toLowerCase()}::${canonTarget}`;
      anchorTextCounts[textKey] = (anchorTextCounts[textKey] || 0) + 1;
    }
  });

  return { graph, inboundCounts, outboundCounts, edges, anchorTextCounts, crawledPages: urls.length, source: 'live' };
}
