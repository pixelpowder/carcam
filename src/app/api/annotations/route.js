import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const BLOB_KEY = 'annotations.json';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) return NextResponse.json({ success: true, data: [] });
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, text, type = 'general' } = body;
    if (!date || !text) return NextResponse.json({ success: false, error: 'date and text required' }, { status: 400 });

    // Load existing
    let annotations = [];
    try {
      const { blobs } = await list({ prefix: BLOB_KEY });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url);
        annotations = await res.json();
      }
    } catch (e) {}

    annotations.push({ date, text, type, createdAt: new Date().toISOString() });
    annotations.sort((a, b) => a.date.localeCompare(b.date));

    await put(BLOB_KEY, JSON.stringify(annotations), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
    return NextResponse.json({ success: true, data: annotations });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
