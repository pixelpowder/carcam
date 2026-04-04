import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const BLOB_KEY = 'carcam-data.json';

// GET — read shared data
export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) {
      return NextResponse.json({ success: true, data: null });
    }
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — save shared data
export async function POST(request) {
  try {
    const body = await request.json();
    const blob = await put(BLOB_KEY, JSON.stringify(body), {
      access: 'public',
      addRandomSuffix: false, allowOverwrite: true,
    });
    return NextResponse.json({ success: true, url: blob.url });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
