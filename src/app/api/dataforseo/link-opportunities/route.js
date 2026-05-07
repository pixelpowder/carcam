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
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = `DataForSEO ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j?.status_message) msg += ` — ${j.status_message}`;
    } catch { if (text) msg += ` — ${text.slice(0, 200)}`; }
    throw new Error(msg);
  }
  return res.json();
}

// Link building search modifiers
const MODIFIERS = [
  // Bare keyword — captures organic publishers ranking for travel queries.
  // Critical for broad keywords like "montenegro itinerary" where the SERP
  // itself is the link-target list. Empty suffix = no modifier appended.
  { label: 'Top SERP', suffix: '', type: 'organic' },
  { label: 'Resource Pages', suffix: 'useful links resources', type: 'resource' },
  { label: 'Guest Posts', suffix: 'write for us guest post', type: 'guest-post' },
  { label: 'Submit Site', suffix: 'submit your site add link suggest', type: 'submit' },
  { label: 'Best Roundups', suffix: 'best top recommended', type: 'roundup' },
  { label: 'Travel Guides', suffix: 'travel guide tips blog', type: 'guide' },
  // Broader publisher/blog/forum surfaces — catch sites that won't match the
  // narrow "write for us" / "useful links" patterns but still take outreach
  { label: 'Tips & Advice', suffix: 'tips advice things to know', type: 'tips' },
  { label: 'Itineraries', suffix: 'itinerary days route', type: 'itinerary' },
  { label: 'Blog Posts', suffix: 'blog post visit experience', type: 'blog' },
];

// Domains always excluded (big platforms that aren't link opportunities)
const ALWAYS_EXCLUDED = new Set([
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
  'pinterest.com', 'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com',
  // TripAdvisor — UGC platform, doesn't accept editorial outreach links
  'tripadvisor.com', 'tripadvisor.co.uk', 'tripadvisor.de', 'tripadvisor.fr',
  'tripadvisor.it', 'tripadvisor.es', 'tripadvisor.com.au', 'tripadvisor.ca',
  'tripadvisor.in', 'tripadvisor.ie', 'tripadvisor.co.nz', 'tripadvisor.ru',
]);
const ALWAYS_EXCLUDED_PATTERNS = [/(^|\.)tripadvisor\./i];

// Car rental competitor brands and aggregators — they won't link to a competitor.
// Excluded by default; pass ?includeCompetitors=1 to override.
const COMPETITOR_DOMAINS = new Set([
  // Global aggregators / OTAs that resell rentals
  'rentalcars.com', 'discovercars.com', 'cartrawler.com', 'kayak.com', 'skyscanner.net',
  'expedia.com', 'booking.com', 'trip.com', 'holidayautos.com', 'economybookings.com',
  'autoeurope.com', 'autoeurope.co.uk', 'rentingcarz.com', 'easyterra.com', 'orbitz.com',
  'travelocity.com', 'priceline.com', 'momondo.com', 'hotwire.com',
  'enjoytravel.com', 'bookingauto.com', 'autobooking.com', 'carbooking.com',
  'carflexi.com', 'autoslash.com', 'carngo.com', 'kemwel.com',
  // Major rental brands (.com)
  'hertz.com', 'avis.com', 'budget.com', 'sixt.com', 'enterprise.com', 'europcar.com',
  'alamo.com', 'dollar.com', 'thrifty.com', 'national.com', 'firefly-car-hire.com',
  'goldcar.es', 'centauro.net', 'interrent.com', 'flizzr.com', 'keddy.com',
  'usave.com', 'abbycar.com', 'fleet.ie', 'topcar.es',
  // Independents / regional competitors that often outrank for car-hire keywords
  'easirent.com', 'greenmotion.com', 'rhinocarhire.com', 'carjet.com', 'surpricecarrentals.com',
  'ace-rent-a-car.com', 'paylesscar.com', 'foxrentacar.com', 'silvercar.com',
  // Their own affiliate partner — not an outreach target
  'localrent.com',
]);

// Major rental-brand prefix patterns — catches every country variant
// (hertz.me, avis.de, sixt.fr, europcar.it, etc.) without enumerating each TLD.
const COMPETITOR_BRAND_PREFIXES = [
  'hertz', 'avis', 'budget', 'sixt', 'enterprise', 'europcar', 'alamo',
  'dollar', 'thrifty', 'national', 'firefly', 'goldcar', 'centauro',
  'interrent', 'flizzr', 'keddy', 'usave', 'abbycar', 'topcar',
];
const COMPETITOR_BRAND_RE = new RegExp(`^(${COMPETITOR_BRAND_PREFIXES.join('|')})\\.[a-z.]+$`, 'i');

// Keyword patterns in the domain itself — catches every "[city]carhire.com" / "rentacar..."
// permutation across English/German/Italian/French/Spanish/Portuguese/Scandi.
// Also matches domains ending in -car / -cars / -auto / -autos when paired with
// rental-suggestive prefixes.
const COMPETITOR_DOMAIN_RE = new RegExp([
  'rent-?a-?car', 'rent-?car', 'car-?hire', 'car-?rental', 'rent-?cars?',
  'auto-?rent', 'automieten', 'mietwagen', 'noleggio-?auto',
  'alquiler-?coches', 'alquilercoches', 'location-?voiture', 'locationvoiture',
  'leiebil', 'biluthyrning', 'aluguer-?carros', 'aluguel-?carros',
  // Generic "booking + auto/car/cars" combos
  'booking-?auto', 'booking-?cars?', 'cars?-?booking', 'auto-?booking',
  // Local "[place]car.[tld]" / "[place]cars.[tld]" patterns common for tiny rental brokers
  '[a-z]{4,}-?cars?\\.', '[a-z]{4,}-?auto\\.', '[a-z]{4,}-?autos\\.',
].join('|'), 'i');

function isCompetitor(cleanDomain) {
  if (COMPETITOR_DOMAINS.has(cleanDomain)) return true;
  if (COMPETITOR_BRAND_RE.test(cleanDomain)) return true;
  if (COMPETITOR_DOMAIN_RE.test(cleanDomain)) return true;
  return false;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    if (!keyword) return NextResponse.json({ success: false, error: 'keyword required' }, { status: 400 });
    const modifierType = searchParams.get('type'); // optional: filter to one modifier type
    const excludeParam = searchParams.get('exclude'); // optional: comma-separated domains to exclude
    const extraExcludes = excludeParam ? new Set(excludeParam.split(',').map(d => d.trim().replace('www.', ''))) : new Set();
    const includeCompetitors = searchParams.get('includeCompetitors') === '1';
    let filteredCompetitorCount = 0;

    if (!LOGIN || !PASSWORD) return NextResponse.json({ success: false, error: 'DataForSEO credentials not configured' }, { status: 500 });

    const modifiers = modifierType
      ? MODIFIERS.filter(m => m.type === modifierType)
      : MODIFIERS;

    // Build SERP tasks — one per modifier
    const tasks = modifiers.map(m => ({
      keyword: m.suffix ? `${keyword} ${m.suffix}` : keyword,
      location_code: 2840, // Global — link opportunities are worldwide
      language_code: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 100,
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
          if (ALWAYS_EXCLUDED_PATTERNS.some(re => re.test(cleanDomain))) return;
          if (!includeCompetitors && isCompetitor(cleanDomain)) { filteredCompetitorCount++; return; }
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
            searchQuery: modifier.suffix ? `${keyword} ${modifier.suffix}` : keyword,
          });
        });
      });
    }

    return NextResponse.json({
      success: true,
      keyword,
      count: opportunities.length,
      filteredCompetitors: filteredCompetitorCount,
      data: opportunities,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
