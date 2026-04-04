import { NextResponse } from 'next/server';
import { getHistoricalSearchVolume } from '@/lib/dataforseo';

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords } = body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ success: false, error: 'keywords array required' }, { status: 400 });
    }
    const data = await getHistoricalSearchVolume(keywords);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
