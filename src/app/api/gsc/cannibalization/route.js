import { NextResponse } from 'next/server';
import { getSearchAnalyticsByQueryAndPage } from '@/lib/gsc';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days')) || 28;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d) => d.toISOString().split('T')[0];

    const data = await getSearchAnalyticsByQueryAndPage({ startDate: fmt(startDate), endDate: fmt(endDate) });

    // Group by keyword, find keywords with 2+ pages
    const byKeyword = {};
    data.forEach(row => {
      const keyword = row.keys[0];
      const page = row.keys[1];
      if (!byKeyword[keyword]) byKeyword[keyword] = [];
      byKeyword[keyword].push({
        page,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      });
    });

    const cannibalized = Object.entries(byKeyword)
      .filter(([, pages]) => pages.length >= 2)
      .map(([keyword, pages]) => ({
        keyword,
        pageCount: pages.length,
        pages: pages.sort((a, b) => a.position - b.position),
        totalImpressions: pages.reduce((s, p) => s + p.impressions, 0),
        severity: pages.length >= 3 ? 'high' : pages.some(p => p.position <= 10) ? 'medium' : 'low',
      }))
      .sort((a, b) => b.totalImpressions - a.totalImpressions);

    return NextResponse.json({ success: true, data: cannibalized, total: cannibalized.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
