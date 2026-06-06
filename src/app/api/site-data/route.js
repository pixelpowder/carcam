import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site');
    if (!siteId) {
      return NextResponse.json({ success: false, error: 'site param required' }, { status: 400 });
    }

    // List BOTH legacy (carcam/{site}.json) and current (carcam/{site}-*.json)
    // blob layouts. The cron now writes with addRandomSuffix:true so each
    // write produces a distinct URL — defeats CDN caching that was pinning
    // the dashboard to stale data. Sort by uploadedAt desc and take newest.
    const key = `carcam/${siteId}`;
    const { blobs } = await list({ prefix: key });
    if (!blobs.length) {
      return NextResponse.json({ success: false, error: 'No blob found', key }, { status: 404 });
    }
    const blob = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    // Keep the uploadedAt cache-buster as a belt-and-braces on top of the
    // unique URL the cron now produces.
    const bust = blob.uploadedAt ? new Date(blob.uploadedAt).getTime() : Date.now();
    const blobUrl = `${blob.url}${blob.url.includes('?') ? '&' : '?'}v=${bust}`;

    // Fetch the private blob with auth token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobUrl, {
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
