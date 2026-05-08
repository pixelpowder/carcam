import { NextResponse } from 'next/server';
import { shipQueue } from '@/lib/shipQueue';

export const maxDuration = 90;

export async function POST(req) {
  try {
    const { siteId } = await req.json();
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const result = await shipQueue(siteId);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[ship] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
