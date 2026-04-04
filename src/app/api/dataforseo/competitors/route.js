import { NextResponse } from 'next/server';
import { getCompetitors } from '@/lib/dataforseo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain') || 'montenegrocarhire.com';
    const results = await getCompetitors(domain);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
