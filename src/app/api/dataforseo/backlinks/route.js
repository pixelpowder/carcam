import { NextResponse } from 'next/server';
import { getBacklinksSummary, getBacklinks, getReferringDomains, getBacklinksHistory } from '@/lib/dataforseo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || 'montenegrocarhire.com';
    const type = searchParams.get('type') || 'summary';

    if (type === 'links') {
      const data = await getBacklinks(domain, 100);
      return NextResponse.json({ success: true, data });
    }
    if (type === 'referring') {
      const data = await getReferringDomains(domain, 100);
      return NextResponse.json({ success: true, data });
    }
    if (type === 'history') {
      const data = await getBacklinksHistory(domain);
      return NextResponse.json({ success: true, data });
    }
    const data = await getBacklinksSummary(domain);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
