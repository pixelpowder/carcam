import { NextResponse } from 'next/server';
import { getOverviewMetrics, getTopPages, getTrafficSources, getDailyTraffic } from '@/lib/ga4';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const days = parseInt(searchParams.get('days')) || 28;

    let data;
    if (type === 'pages') data = await getTopPages(days);
    else if (type === 'sources') data = await getTrafficSources(days);
    else if (type === 'daily') data = await getDailyTraffic(days);
    else data = await getOverviewMetrics(days);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
