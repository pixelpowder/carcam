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

    // Get query+date combined — this gives per-keyword daily positions
    const data = await getSearchAnalytics({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['query', 'date'],
      rowLimit: 5000,
    });

    // Group by keyword
    const byKeyword = {};
    data.forEach(r => {
      const kw = r.keys[0];
      const date = r.keys[1];
      if (!byKeyword[kw]) byKeyword[kw] = { keyword: kw, dates: {}, totalImps: 0 };
      byKeyword[kw].dates[date] = { position: r.position, clicks: r.clicks, impressions: r.impressions };
      byKeyword[kw].totalImps += r.impressions;
    });

    // Sort by total impressions, take top 25
    const sorted = Object.values(byKeyword)
      .sort((a, b) => b.totalImps - a.totalImps)
      .slice(0, 25);

    // Get all dates
    const allDates = [...new Set(data.map(r => r.keys[1]))].sort();

    return NextResponse.json({ success: true, data: sorted, dates: allDates });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
