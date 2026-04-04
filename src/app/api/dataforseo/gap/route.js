import { NextResponse } from 'next/server';
import { getDomainIntersection } from '@/lib/dataforseo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain1 = searchParams.get('domain1') || 'montenegrocarhire.com';
    const domain2 = searchParams.get('domain2');
    if (!domain2) return NextResponse.json({ success: false, error: 'domain2 required' }, { status: 400 });
    const data = await getDomainIntersection(domain1, domain2);
    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
