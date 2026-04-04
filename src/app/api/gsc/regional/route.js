import { NextResponse } from 'next/server';
import { getSearchAnalytics } from '@/lib/gsc';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const days = parseInt(searchParams.get('days')) || 28;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d) => d.toISOString().split('T')[0];

    if (country) {
      // Get top keywords for a specific country
      const data = await getSearchAnalytics({
        startDate: fmt(startDate), endDate: fmt(endDate),
        dimensions: ['query'],
        rowLimit: 100,
        dimensionFilterGroups: [{
          filters: [{ dimension: 'country', operator: 'equals', expression: country }],
        }],
      });
      return NextResponse.json({
        success: true,
        data: data.map(r => ({
          keyword: r.keys[0], clicks: r.clicks, impressions: r.impressions,
          ctr: r.ctr, position: r.position,
        })),
      });
    }

    // Get country + query combined data
    const data = await getSearchAnalytics({
      startDate: fmt(startDate), endDate: fmt(endDate),
      dimensions: ['country', 'query'],
      rowLimit: 500,
    });

    // Group by country
    const byCountry = {};
    data.forEach(r => {
      const c = r.keys[0];
      if (!byCountry[c]) byCountry[c] = { country: c, keywords: [], totalClicks: 0, totalImps: 0 };
      byCountry[c].keywords.push({
        keyword: r.keys[1], clicks: r.clicks, impressions: r.impressions,
        ctr: r.ctr, position: r.position,
      });
      byCountry[c].totalClicks += r.clicks;
      byCountry[c].totalImps += r.impressions;
    });

    const result = Object.values(byCountry)
      .map(c => ({ ...c, keywords: c.keywords.sort((a, b) => b.impressions - a.impressions).slice(0, 10) }))
      .sort((a, b) => b.totalImps - a.totalImps)
      .slice(0, 15);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
