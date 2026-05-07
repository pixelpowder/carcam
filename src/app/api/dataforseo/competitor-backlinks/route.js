import { NextResponse } from 'next/server';
import { apifyBacklinkLookup } from '@/lib/apify';

// Direct DataForSEO call so we can surface task-level status codes (insufficient
// credits, invalid auth, etc.) — the lib helper swallows them.
async function fetchReferringDomains(domain, limit) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    return { error: 'DataForSEO credentials not configured', items: [] };
  }
  const auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
  const res = await fetch('https://api.dataforseo.com/v3/backlinks/referring_domains/live', {
    method: 'POST',
    headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ target: domain, limit, order_by: ['rank,desc'] }]),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { error: `HTTP ${res.status}: ${text.slice(0, 300)}`, items: [] };
  }
  const data = await res.json().catch(() => null);
  const task = data?.tasks?.[0];
  if (!task) return { error: 'No task in response', items: [] };
  if (task.status_code !== 20000) {
    return {
      error: `DataForSEO ${task.status_code}: ${task.status_message || 'unknown'}`,
      items: [],
    };
  }
  const result = task.result?.[0];
  const items = result?.items || [];
  return {
    error: null,
    items: items.map(item => ({
      domain: item.domain || '',
      rank: item.rank || 0,
      backlinks: item.backlinks || 0,
      firstSeen: item.first_seen || '',
    })),
    rawCount: items.length,
    totalAvailable: result?.total_count || 0,
  };
}

// Mine a competitor's referring domains as outreach prospects. Returns the same
// shape as /api/dataforseo/link-opportunities so the Find Opportunities UI can
// render the rows identically (Analyse / Draft Email / Not suitable buttons).

const ALWAYS_EXCLUDED = new Set([
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
  'pinterest.com', 'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com',
  'tripadvisor.com', 'tripadvisor.co.uk', 'tripadvisor.de', 'tripadvisor.fr',
  'tripadvisor.it', 'tripadvisor.es', 'tripadvisor.com.au', 'tripadvisor.ca',
  'tripadvisor.in', 'tripadvisor.ie', 'tripadvisor.co.nz', 'tripadvisor.ru',
]);
const ALWAYS_EXCLUDED_PATTERNS = [/(^|\.)tripadvisor\./i];

const COMPETITOR_DOMAINS = new Set([
  'rentalcars.com', 'discovercars.com', 'cartrawler.com', 'kayak.com', 'skyscanner.net',
  'expedia.com', 'booking.com', 'trip.com', 'holidayautos.com', 'economybookings.com',
  'autoeurope.com', 'autoeurope.co.uk', 'rentingcarz.com', 'easyterra.com', 'orbitz.com',
  'travelocity.com', 'priceline.com', 'momondo.com', 'hotwire.com',
  'enjoytravel.com', 'bookingauto.com', 'autobooking.com', 'carbooking.com',
  'carflexi.com', 'autoslash.com', 'carngo.com', 'kemwel.com',
  'hertz.com', 'avis.com', 'budget.com', 'sixt.com', 'enterprise.com', 'europcar.com',
  'alamo.com', 'dollar.com', 'thrifty.com', 'national.com', 'firefly-car-hire.com',
  'goldcar.es', 'centauro.net', 'interrent.com', 'flizzr.com', 'keddy.com',
  'usave.com', 'abbycar.com', 'fleet.ie', 'topcar.es',
  'easirent.com', 'greenmotion.com', 'rhinocarhire.com', 'carjet.com', 'surpricecarrentals.com',
  'ace-rent-a-car.com', 'paylesscar.com', 'foxrentacar.com', 'silvercar.com',
  'localrent.com',
]);

const COMPETITOR_BRAND_PREFIXES = [
  'hertz', 'avis', 'budget', 'sixt', 'enterprise', 'europcar', 'alamo',
  'dollar', 'thrifty', 'national', 'firefly', 'goldcar', 'centauro',
  'interrent', 'flizzr', 'keddy', 'usave', 'abbycar', 'topcar',
];
const COMPETITOR_BRAND_RE = new RegExp(`^(${COMPETITOR_BRAND_PREFIXES.join('|')})\\.[a-z.]+$`, 'i');

const COMPETITOR_DOMAIN_RE = new RegExp([
  'rent-?a-?car', 'rent-?car', 'car-?hire', 'car-?rental', 'rent-?cars?',
  'auto-?rent', 'automieten', 'mietwagen', 'noleggio-?auto',
  'alquiler-?coches', 'alquilercoches', 'location-?voiture', 'locationvoiture',
  'leiebil', 'biluthyrning', 'aluguer-?carros', 'aluguel-?carros',
  'booking-?auto', 'booking-?cars?', 'cars?-?booking', 'auto-?booking',
  '[a-z]{4,}-?cars?\\.', '[a-z]{4,}-?auto\\.', '[a-z]{4,}-?autos\\.',
].join('|'), 'i');

function isCompetitor(cleanDomain) {
  if (COMPETITOR_DOMAINS.has(cleanDomain)) return true;
  if (COMPETITOR_BRAND_RE.test(cleanDomain)) return true;
  if (COMPETITOR_DOMAIN_RE.test(cleanDomain)) return true;
  return false;
}

// PITCH_SITES — your own properties, never useful as prospects.
const SELF_DOMAINS = new Set([
  'montenegrocarhire.com', 'tivatcarhire.com', 'budvacarhire.com',
  'hercegnovicarhire.com', 'ulcinjcarhire.com', 'kotorcarhire.com',
  'podgoricacarhire.com', 'northernirelandcarhire.com', 'kotorcarrental.com',
  'kotordirectory.com', 'pixelpowder.com',
]);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceDomain = searchParams.get('domain');
    if (!sourceDomain) {
      return NextResponse.json({ success: false, error: 'domain query param required' }, { status: 400 });
    }
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 1000);
    const includeCompetitors = searchParams.get('includeCompetitors') === '1';

    // Prefer Apify if configured (no DataForSEO $100/month minimum). Falls back
    // to DataForSEO Backlinks API otherwise. Pass ?source=dataforseo to force.
    const forcedSource = searchParams.get('source');
    const useApify = forcedSource === 'apify'
      || (!forcedSource && process.env.APIFY_TOKEN && process.env.APIFY_BACKLINK_ACTOR);

    let referring = [];
    let provider = 'dataforseo';
    let rawCount = 0;
    let totalAvailable = 0;
    if (useApify) {
      provider = 'apify';
      try {
        const items = await apifyBacklinkLookup(sourceDomain, { limit });
        // Apify actors typically return per-link rows; collapse to per-domain
        const byDomain = new Map();
        for (const it of items) {
          if (!it.domain) continue;
          const existing = byDomain.get(it.domain);
          if (existing) {
            existing.backlinks += it.backlinks || 1;
            existing.rank = Math.max(existing.rank, it.rank || 0);
          } else {
            byDomain.set(it.domain, { ...it });
          }
        }
        referring = Array.from(byDomain.values());
        rawCount = referring.length;
        totalAvailable = items.length;
      } catch (e) {
        return NextResponse.json({
          success: false,
          provider: 'apify',
          error: e.message,
          hint: e.message.includes('APIFY_TOKEN')
            ? 'Add APIFY_TOKEN to .env.local (get one at console.apify.com).'
            : e.message.includes('APIFY_BACKLINK_ACTOR')
            ? 'Set APIFY_BACKLINK_ACTOR to the actor ID you want to use (e.g. dtrungtin/ahrefs-backlinks-scraper).'
            : null,
        }, { status: 500 });
      }
    } else {
      const result = await fetchReferringDomains(sourceDomain, limit);
      if (result.error) {
        return NextResponse.json({
          success: false,
          provider: 'dataforseo',
          error: result.error,
          hint: result.error.includes('40400') || result.error.toLowerCase().includes('credit')
            ? 'Out of DataForSEO Backlinks credits — set up Apify (set APIFY_TOKEN + APIFY_BACKLINK_ACTOR) to bypass the $100/month minimum.'
            : result.error.includes('40100') || result.error.toLowerCase().includes('auth')
            ? 'Auth failed — verify DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in .env.local.'
            : null,
        }, { status: 500 });
      }
      referring = result.items;
      rawCount = result.rawCount;
      totalAvailable = result.totalAvailable;
    }

    const opportunities = [];
    let filteredCompetitorCount = 0;
    let filteredSelfCount = 0;
    for (const item of referring) {
      const domain = (item.domain || '').toLowerCase();
      if (!domain) continue;
      const cleanDomain = domain.replace(/^www\./, '');
      if (ALWAYS_EXCLUDED.has(cleanDomain)) continue;
      if (ALWAYS_EXCLUDED_PATTERNS.some(re => re.test(cleanDomain))) continue;
      if (SELF_DOMAINS.has(cleanDomain)) { filteredSelfCount++; continue; }
      if (!includeCompetitors && isCompetitor(cleanDomain)) { filteredCompetitorCount++; continue; }
      opportunities.push({
        // No specific URL from referring-domains endpoint — link to the homepage.
        url: `https://${cleanDomain}/`,
        domain: cleanDomain,
        title: cleanDomain,
        description: `Links to ${sourceDomain} · DR-rank ${item.rank} · ${item.backlinks?.toLocaleString() || 0} backlinks · first seen ${item.firstSeen?.slice(0, 10) || 'unknown'}`,
        position: opportunities.length + 1,
        searchType: 'backlink',
        searchLabel: 'Backlink',
        searchQuery: `Backlinks of ${sourceDomain}`,
        // Backlink-specific extras the UI may want to show
        rank: item.rank,
        backlinks: item.backlinks,
        firstSeen: item.firstSeen,
      });
    }

    // Sort by rank descending — highest-authority referring domains first
    opportunities.sort((a, b) => (b.rank || 0) - (a.rank || 0));

    return NextResponse.json({
      success: true,
      keyword: `Backlinks of ${sourceDomain}`,
      source: sourceDomain,
      provider,
      mode: 'backlinks',
      count: opportunities.length,
      rawCount,
      totalAvailable,
      filteredCompetitors: filteredCompetitorCount,
      filteredSelf: filteredSelfCount,
      data: opportunities,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
