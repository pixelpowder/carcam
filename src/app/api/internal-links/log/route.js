import { NextResponse } from 'next/server';
import { getLogForPage, getLatestPerSection } from '@/lib/implementationLog';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const page = url.searchParams.get('page');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (page) {
      const entries = await getLogForPage(siteId, page);
      // Convert Map to plain object for JSON
      const latestPerSection = {};
      const map = await getLatestPerSection(siteId, page);
      for (const [k, v] of map.entries()) latestPerSection[k] = v;
      return NextResponse.json({ success: true, entries, latestPerSection });
    }
    return NextResponse.json({ success: true, entries: [] });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
