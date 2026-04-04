import { NextResponse } from 'next/server';
import { getSearchAnalytics } from '@/lib/gsc';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 28;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d) => d.toISOString().split('T')[0];

    // Get query+page combined data
    const data = await getSearchAnalytics({
      startDate: fmt(startDate), endDate: fmt(endDate),
      dimensions: ['query', 'page'],
      rowLimit: 5000,
    });

    // Build keyword-to-pages mapping
    const keywordMap = {};
    data.forEach(r => {
      const kw = r.keys[0];
      const page = r.keys[1];
      if (!keywordMap[kw]) keywordMap[kw] = { keyword: kw, pages: [], totalImps: 0, totalClicks: 0 };
      keywordMap[kw].pages.push({
        page, clicks: r.clicks, impressions: r.impressions,
        ctr: r.ctr, position: r.position,
      });
      keywordMap[kw].totalImps += r.impressions;
      keywordMap[kw].totalClicks += r.clicks;
    });

    // Analyze each keyword
    const results = Object.values(keywordMap).map(kw => {
      kw.pages.sort((a, b) => a.position - b.position);
      const bestPage = kw.pages[0];
      const isCannibalized = kw.pages.length >= 2;
      const hasStrongWinner = kw.pages.length >= 2 && kw.pages[0].impressions > kw.pages[1].impressions * 2;

      // Determine recommended primary page
      const primaryPage = bestPage?.page || '';
      const primaryPos = bestPage?.position || 0;

      // Classify page type
      const classifyUrl = (url) => {
        if (url.includes('/listing-category/')) return 'category';
        if (url.includes('/listing/')) return 'listing';
        if (url.includes('/location/')) return 'location';
        return 'page';
      };

      return {
        keyword: kw.keyword,
        totalImps: kw.totalImps,
        totalClicks: kw.totalClicks,
        pageCount: kw.pages.length,
        isCannibalized,
        hasStrongWinner,
        primaryPage,
        primaryPageType: classifyUrl(primaryPage),
        primaryPosition: primaryPos,
        pages: kw.pages.map(p => ({ ...p, type: classifyUrl(p.page), shortUrl: p.page.replace('https://www.kotordirectory.com', '') })),
        severity: isCannibalized ? (hasStrongWinner ? 'low' : kw.pages.length >= 3 ? 'high' : 'medium') : 'none',
        recommendation: !isCannibalized ? 'Single page — no action needed' :
          hasStrongWinner ? `Primary page clear (${classifyUrl(primaryPage)}). Consider noindexing or redirecting weaker pages.` :
          `${kw.pages.length} pages competing. Assign primary page and add canonical/noindex to others.`,
      };
    }).sort((a, b) => b.totalImps - a.totalImps);

    return NextResponse.json({ success: true, data: results, total: results.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
