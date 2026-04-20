import { NextResponse } from 'next/server';

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

async function dfsRequest(endpoint, body) {
  const auth = Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');
  const res = await fetch(`https://api.dataforseo.com/v3${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
  return res.json();
}

// Link building search modifiers
const MODIFIERS = [
  { label: 'Resource Pages', suffix: 'useful links resources', type: 'resource' },
  { label: 'Guest Posts', suffix: 'write for us guest post', type: 'guest-post' },
  { label: 'Submit Site', suffix: 'submit your site add link suggest', type: 'submit' },
  { label: 'Best Roundups', suffix: 'best top recommended', type: 'roundup' },
  { label: 'Travel Guides', suffix: 'travel guide tips blog', type: 'guide' },
];

// Domains always excluded (big platforms that aren't link opportunities)
const ALWAYS_EXCLUDED = new Set([
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
  'pinterest.com', 'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com',
]);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    if (!keyword) return NextResponse.json({ success: false, error: 'keyword required' }, { status: 400 });
    const modifierType = searchParams.get('type'); // optional: filter to one modifier type
    const excludeParam = searchParams.get('exclude'); // optional: comma-separated domains to exclude
    const extraExcludes = excludeParam ? new Set(excludeParam.split(',').map(d => d.trim().replace('www.', ''))) : new Set();

    if (!LOGIN || !PASSWORD) return NextResponse.json({ success: false, error: 'DataForSEO credentials not configured' }, { status: 500 });

    const modifiers = modifierType
      ? MODIFIERS.filter(m => m.type === modifierType)
      : MODIFIERS;

    // Build SERP tasks — one per modifier
    const tasks = modifiers.map(m => ({
      keyword: `${keyword} ${m.suffix}`,
      location_code: 2840, // Global — link opportunities are worldwide
      language_code: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 20,
    }));

    const data = await dfsRequest('/serp/google/organic/live/advanced', tasks);

    const opportunities = [];
    const seenUrls = new Set();

    if (data.tasks) {
      data.tasks.forEach((task, idx) => {
        const modifier = modifiers[idx];
        const items = task.result?.[0]?.items || [];

        items.forEach(item => {
          if (item.type !== 'organic') return;
          const url = item.url || '';
          const domain = item.domain || '';

          // Skip excluded domains and duplicates
          const cleanDomain = domain.replace('www.', '');
          if (ALWAYS_EXCLUDED.has(cleanDomain) || extraExcludes.has(cleanDomain)) return;
          if (seenUrls.has(url)) return;
          seenUrls.add(url);

          opportunities.push({
            url,
            domain,
            title: item.title || '',
            description: item.description || '',
            position: item.rank_absolute || 0,
            searchType: modifier.type,
            searchLabel: modifier.label,
            searchQuery: `${keyword} ${modifier.suffix}`,
          });
        });
      });
    }

    return NextResponse.json({
      success: true,
      keyword,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
