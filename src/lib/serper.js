// Serper.dev — Google SERP API. Pay-as-you-go (~$0.001 per query),
// no monthly minimum. Cheaper alternative to DataForSEO for SERP-only flows.
// Sign up at https://serper.dev to get an API key, set SERPER_API_KEY in .env.local.

const ENDPOINT = 'https://google.serper.dev/search';

// Returns an array of organic results in a shape compatible with what the
// link-opportunities route was producing from DataForSEO:
// [{ url, domain, title, description, rank_absolute }]
export async function serperSearch(query, { depth = 100, location = 'United States', gl = 'us', hl = 'en' } = {}) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY not set in .env.local — sign up at https://serper.dev to get one');
  }

  // Serper returns ~10 organic results per page. To get more, we paginate.
  // depth=100 = 10 pages. Each call is ~$0.001.
  const pages = Math.min(Math.ceil(depth / 10), 10);
  const all = [];
  for (let page = 1; page <= pages; page++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, location, gl, hl, page, num: 10 }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Serper ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const organic = data.organic || [];
    if (organic.length === 0) break; // no more results
    for (const item of organic) {
      const url = item.link || '';
      let domain = '';
      try { domain = new URL(url).hostname; } catch { domain = ''; }
      all.push({
        url,
        domain,
        title: item.title || '',
        description: item.snippet || '',
        rank_absolute: item.position || all.length + 1,
      });
    }
  }
  return all;
}

// Run several queries in parallel. Mirrors the DataForSEO multi-task pattern.
export async function serperBatch(queries, opts = {}) {
  const results = await Promise.allSettled(queries.map(q => serperSearch(q, opts)));
  return results.map((r, i) => ({
    keyword: queries[i],
    items: r.status === 'fulfilled' ? r.value : [],
    error: r.status === 'rejected' ? r.reason.message : null,
  }));
}
