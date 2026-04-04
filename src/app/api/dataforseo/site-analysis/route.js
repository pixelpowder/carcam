import { NextResponse } from 'next/server';
import { getDomainRankings, getBacklinksSummary, getDomainIntersection } from '@/lib/dataforseo';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ success: false, error: 'domain required' }, { status: 400 });

  // Normalise — strip protocol/www if pasted as a URL
  const cleanDomain = domain
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .trim();

  try {
    // Run all three in parallel — if one fails, still return partial data
    const [rankings, backlinks, gap] = await Promise.allSettled([
      getDomainRankings(cleanDomain, 2499, 'en'),
      getBacklinksSummary(cleanDomain),
      getDomainIntersection('montenegrocarhire.com', cleanDomain, 2499, 'en'),
    ]);

    // If Montenegro (2499) returns nothing, retry globally — small/non-Montenegrin sites won't be in that index
    let rankingsData = rankings.status === 'fulfilled' ? rankings.value : [];
    if (rankingsData.length === 0) {
      try { rankingsData = await getDomainRankings(cleanDomain, 2840, 'en'); } catch (e) {}
    }
    const backlinksData = backlinks.status === 'fulfilled' ? backlinks.value : null;
    const gapData       = gap.status === 'fulfilled' ? gap.value : [];

    // Compute estimated traffic (sum position-weighted volumes)
    const estTraffic = rankingsData.reduce((sum, kw) => {
      const ctr = kw.position <= 1 ? 0.28 : kw.position <= 3 ? 0.15 : kw.position <= 10 ? 0.05 : 0.01;
      return sum + Math.round((kw.searchVolume || 0) * ctr);
    }, 0);

    // Top pages — group by URL
    const pageMap = {};
    rankingsData.forEach(kw => {
      if (!kw.url) return;
      const urlKey = kw.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!pageMap[urlKey]) pageMap[urlKey] = { url: kw.url, keywords: 0, topVolume: 0, bestPos: 999 };
      pageMap[urlKey].keywords++;
      pageMap[urlKey].topVolume += kw.searchVolume || 0;
      if ((kw.position || 999) < pageMap[urlKey].bestPos) pageMap[urlKey].bestPos = kw.position;
    });
    const topPages = Object.values(pageMap)
      .sort((a, b) => b.keywords - a.keywords)
      .slice(0, 20);

    // Keywords they have that we don't (we have no position or position > 50)
    const opportunities = gapData
      .filter(k => (!k.position1 || k.position1 > 50) && k.position2 && k.position2 <= 20)
      .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0))
      .slice(0, 50);

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      summary: {
        totalKeywords: rankingsData.length,
        top10Keywords: rankingsData.filter(k => k.position && k.position <= 10).length,
        estTraffic,
        referringDomains: backlinksData?.referringDomains || 0,
        totalBacklinks: backlinksData?.totalBacklinks || 0,
        dofollow: backlinksData?.dofollow || 0,
        sharedKeywords: gapData.length,
        opportunities: opportunities.length,
      },
      topKeywords: rankingsData.slice(0, 100),
      topPages,
      gapKeywords: gapData.slice(0, 100),
      opportunities,
      backlinks: backlinksData,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
