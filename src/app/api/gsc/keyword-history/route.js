import { NextResponse } from 'next/server';
import { getSearchAnalyticsQueryByDate } from '@/lib/gsc';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    if (!keyword) return NextResponse.json({ success: false, error: 'keyword required' }, { status: 400 });

    const days = parseInt(searchParams.get('days')) || 28;
    const site = searchParams.get('site');
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const fmt = (d) => d.toISOString().split('T')[0];
    const data = await getSearchAnalyticsQueryByDate({
      ...(site && { siteUrl: site }),
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      query: keyword,
    });

    const history = data.map(row => ({
      date: row.keys[1],
      position: row.position,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
