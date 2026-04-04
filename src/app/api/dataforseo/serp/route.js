import { NextResponse } from 'next/server';
import { getRankingsForKeywords } from '@/lib/dataforseo';

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, domain = 'montenegrocarhire.com' } = body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ success: false, error: 'keywords array required' }, { status: 400 });
    }
    if (keywords.length > 20) {
      return NextResponse.json({ success: false, error: 'max 20 keywords per request' }, { status: 400 });
    }
    const results = await getRankingsForKeywords(keywords, domain);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
