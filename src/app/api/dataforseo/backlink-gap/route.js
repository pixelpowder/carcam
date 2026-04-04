import { NextResponse } from 'next/server';
import { getBacklinkGap } from '@/lib/dataforseo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitors = searchParams.get('competitors');
    if (!competitors) return NextResponse.json({ success: false, error: 'competitors required (comma-separated)' }, { status: 400 });
    const domain = searchParams.get('domain') || 'montenegrocarhire.com';
    const competitorList = competitors.split(',').map(d => d.trim()).filter(Boolean);
    if (competitorList.length === 0) return NextResponse.json({ success: false, error: 'At least one competitor required' }, { status: 400 });
    const data = await getBacklinkGap(domain, competitorList);
    return NextResponse.json({ success: true, data, count: data.length, domain, competitors: competitorList });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
