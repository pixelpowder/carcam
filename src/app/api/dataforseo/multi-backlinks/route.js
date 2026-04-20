import { NextResponse } from 'next/server';
import { getBacklinksSummary } from '@/lib/dataforseo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainsParam = searchParams.get('domains');
    if (!domainsParam) return NextResponse.json({ success: false, error: 'domains required (comma-separated)' }, { status: 400 });

    const domains = domainsParam.split(',').map(d => d.trim()).filter(Boolean);
    if (domains.length === 0) return NextResponse.json({ success: false, error: 'At least one domain required' }, { status: 400 });

    const results = await Promise.all(
      domains.map(async (domain) => {
        try {
          const summary = await getBacklinksSummary(domain);
          return { domain, success: true, ...summary };
        } catch (err) {
          return { domain, success: false, error: err.message };
        }
      })
    );

    const data = {};
    results.forEach(r => { data[r.domain] = r; });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
