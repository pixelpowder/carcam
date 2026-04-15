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
      return NextResponse.json({ success: false, error: 'No blob found', key }, { status: 404 });
    }

    // Fetch the private blob with auth token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobs[0].url, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Blob fetch failed: ${res.status}`, url: blobs[0].url }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
