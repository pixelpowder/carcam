import { NextResponse } from 'next/server';
import { getSearchAnalytics } from '@/lib/gsc';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const device = searchParams.get('device') || 'MOBILE';
    const days = parseInt(searchParams.get('days')) || 28;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const fmt = (d) => d.toISOString().split('T')[0];

    const data = await getSearchAnalytics({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['query'],
      rowLimit: 200,
      dimensionFilterGroups: [{
        filters: [{ dimension: 'device', operator: 'equals', expression: device }],
      }],
    });

    const keywords = data.map(row => ({
      keyword: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })).sort((a, b) => b.impressions - a.impressions);

    return NextResponse.json({ success: true, data: keywords });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
