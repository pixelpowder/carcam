import { NextResponse } from 'next/server';
import {
  addManualNote,
  updateManualNote,
  deleteManualNote,
} from '@/lib/implementationLog';

// Manual annotation endpoint. Lets users mark a page with a change they made
// so they can monitor outcomes over time.
//
// POST: { siteId, page, note, changeDate?, tags? } → adds a note
// PUT:  { siteId, id, ...patch }                    → edits a note
// DELETE: { siteId, id }                             → removes a note

export async function POST(req) {
  try {
    const { siteId, page, note, changeDate, tags } = await req.json();
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const entry = await addManualNote(siteId, { page, note, changeDate, tags });
    return NextResponse.json({ success: true, entry });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

export async function PUT(req) {
  try {
    const { siteId, id, ...patch } = await req.json();
    if (!siteId || !id) return NextResponse.json({ error: 'siteId + id required' }, { status: 400 });
    const entry = await updateManualNote(siteId, id, patch);
    return NextResponse.json({ success: true, entry });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const id = url.searchParams.get('id');
    if (!siteId || !id) return NextResponse.json({ error: 'siteId + id required' }, { status: 400 });
    const result = await deleteManualNote(siteId, id);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}
