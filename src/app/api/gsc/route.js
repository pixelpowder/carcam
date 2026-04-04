import { NextResponse } from 'next/server';
import { getSearchAnalyticsByQuery, getSearchAnalyticsByPage, getSearchAnalyticsByDate } from '@/lib/gsc';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'queries';
    const days = parseInt(searchParams.get('days')) || 28;
    const site = searchParams.get('site'); // Optional: override site URL

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const fmt = (d) => d.toISOString().split('T')[0];
    const params = { startDate: fmt(startDate), endDate: fmt(endDate), ...(site && { siteUrl: site }) };

    let data;
    if (type === 'pages') {
      data = await getSearchAnalyticsByPage(params);
    } else if (type === 'dates') {
      data = await getSearchAnalyticsByDate(params);
    } else {
      data = await getSearchAnalyticsByQuery(params);
    }

    return NextResponse.json({ success: true, data, startDate: fmt(startDate), endDate: fmt(endDate) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
