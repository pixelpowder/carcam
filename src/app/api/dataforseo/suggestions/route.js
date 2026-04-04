import { NextResponse } from 'next/server';
import { getKeywordSuggestions } from '@/lib/dataforseo';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    if (!keyword) return NextResponse.json({ success: false, error: 'keyword required' }, { status: 400 });
    const data = await getKeywordSuggestions(keyword);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
