// Apify integration for backlink scraping. Requires APIFY_TOKEN in env, plus
// the actor ID to run (configurable so you can swap actors without code changes).
//
// Recommended actors for backlink data (any of these work — pick one and set
// APIFY_BACKLINK_ACTOR to its ID):
//   - epctex/ahrefs-backlink-scraper        (paid, ~$0.50 / domain, deep data)
//   - dtrungtin/ahrefs-backlinks-scraper    (community, scrapes free public tool)
//   - alexey/google-search-scraper          (for "site:" queries / co-mention discovery)
//
// We pass the target domain as input and wait for the run to finish, then read
// the dataset. Different actors return slightly different field names — we
// normalise to {domain, rank, backlinks, firstSeen, sourceUrl} for the carcam UI.

const APIFY_BASE = 'https://api.apify.com/v2';

function getToken() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN not set in .env.local');
  return token;
}

// Run an actor synchronously and return its dataset items. Apify's run-sync
// endpoint blocks until the actor finishes (max 5min hard cap) and returns rows.
export async function runActorSync(actorId, input, { timeout = 280 } = {}) {
  const token = getToken();
  // Replace slash with tilde per Apify's URL spec
  const slug = actorId.replace('/', '~');
  const url = `${APIFY_BASE}/acts/${slug}/run-sync-get-dataset-items?token=${token}&timeout=${timeout}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apify ${actorId} ${res.status}: ${text.slice(0, 300)}`);
  }
  const items = await res.json().catch(() => []);
  return Array.isArray(items) ? items : [];
}

// Backlink / co-mention lookup. We support two actor families because raw-
// backlink scrapers are flaky-ish on Apify Store, and `apify/google-search-scraper`
// is a rock-solid alternative that gives us co-mention pages (which is arguably
// a better outreach signal anyway).
//
// Detection: if the actor ID looks like a Google search scraper, we run a
// `"<domain>" -site:<domain>` query and map the SERP rows. Otherwise we run
// it as a backlink scraper and try to normalise common field names.
export async function apifyBacklinkLookup(domain, { limit = 500 } = {}) {
  const actorId = process.env.APIFY_BACKLINK_ACTOR;
  if (!actorId) throw new Error('APIFY_BACKLINK_ACTOR not set — set it to apify/google-search-scraper (recommended) or another backlink actor in .env.local');

  const isSerpScraper = /google-?search-?scraper|google-?serp|serp-?scraper/i.test(actorId);

  if (isSerpScraper) {
    // Co-mention search: pages that mention the competitor by name. Each result
    // is a publisher who's already chosen to write about a similar site —
    // exactly the outreach surface we want.
    // Capped at 1 query × 3 pages = 30 results to keep the actor under Apify's
    // 5-minute sync timeout. That's plenty for outreach prospecting.
    const items = await runActorSync(actorId, {
      queries: `"${domain}" -site:${domain}`,
      maxPagesPerQuery: 3,
      resultsPerPage: 10,
      countryCode: 'us',
      languageCode: 'en',
      mobileResults: false,
      saveHtml: false,
      saveHtmlToKeyValueStore: false,
      includeUnfilteredResults: false,
    });

    const seen = new Set();
    const rows = [];
    for (const item of items) {
      const organic = item.organicResults || item.results || (Array.isArray(item) ? item : []);
      for (const r of organic) {
        const url = r.url || r.link || '';
        if (!url) continue;
        let host = '';
        try { host = new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { continue; }
        if (!host || host === domain.toLowerCase().replace(/^www\./, '')) continue;
        if (seen.has(host)) continue;
        seen.add(host);
        rows.push({
          domain: host,
          rank: 0, // SERP scrapers don't return DR
          backlinks: 1,
          firstSeen: '',
          sourceUrl: url,
          title: r.title || '',
          snippet: r.description || r.snippet || '',
        });
      }
    }
    return rows.slice(0, limit);
  }

  // Otherwise: assume it's a backlink scraper actor. Try common input shapes.
  const items = await runActorSync(actorId, {
    domain,
    target: domain,
    startUrls: [{ url: `https://${domain}` }],
    maxItems: limit,
    maxResults: limit,
    limit,
  });

  return items.map(item => ({
    domain: (item.referringDomain || item.refDomain || item.source_domain || item.fromDomain || item.sourceDomain || item.domain || '').toLowerCase().replace(/^www\./, ''),
    rank: item.domainRating || item.domainRank || item.dr || item.rank || item.authorityScore || 0,
    backlinks: item.backlinkCount || item.totalBacklinks || item.backlinks || item.refLinkCount || 1,
    firstSeen: item.firstSeen || item.first_seen || item.discovered || item.dateFirstSeen || '',
    sourceUrl: item.sourceUrl || item.referringUrl || item.fromUrl || item.url || '',
  })).filter(r => r.domain && r.domain !== domain.toLowerCase().replace(/^www\./, ''));
}
