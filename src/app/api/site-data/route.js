import { NextResponse } from 'next/server';
import { head } from '@vercel/blob';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'site param required' }, { status: 400 });
    }

    // For private blobs, use head() to get a signed download URL
    const key = `carcam/${siteId}.json`;
    let downloadUrl;
    try {
      const meta = await head(key);
      downloadUrl = meta.downloadUrl || meta.url;
    } catch (e) {
      return NextResponse.json({ success: false, error: 'No data yet' }, { status: 404 });
    }

    const res = await fetch(downloadUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Blob fetch failed: ${res.status}` }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
