import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'site param required' }, { status: 400 });
    }

    const key = `carcam/${siteId}.json`;
    const { blobs } = await list({ prefix: key });
    if (!blobs.length) {
      return NextResponse.json({ success: false, error: 'No data yet' }, { status: 404 });
    }

    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
