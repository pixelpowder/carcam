import { NextResponse } from 'next/server';
import { stageAction, listQueue, removeFromQueue, clearQueue } from '@/lib/stagingQueue';

export const maxDuration = 30;

// GET — list current queue for a site
export async function GET(req) {
  const url = new URL(req.url);
  const siteId = url.searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  const items = await listQueue(siteId);
  return NextResponse.json({ success: true, items });
}

// POST — queue mutations. Operation in body (op).
// Default op = 'add' (back-compat: omit op + provide action).
//
// Body shapes:
//   { siteId, action, currentItems }                — add an action to queue
//   { siteId, op: 'remove', id, currentItems }      — remove one item by id
//   { siteId, op: 'clear' }                         — wipe the queue
//
// `currentItems` is the client's authoritative view — server uses it as
// the source of truth (no load() from blob), avoiding eventual-consistency
// where a stale list/fetch can revert recently-saved state.
export async function POST(req) {
  try {
    const body = await req.json();
    const { siteId, op, action, id, currentItems } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    // 'remove' op
    if (op === 'remove') {
      if (!id) return NextResponse.json({ error: 'id required for remove' }, { status: 400 });
      const items = await removeFromQueue(siteId, id, currentItems);
      return NextResponse.json({ success: true, items });
    }
    // 'clear' op
    if (op === 'clear') {
      await clearQueue(siteId);
      return NextResponse.json({ success: true, items: [] });
    }
    // Default: add (existing behaviour)
    if (!action || !action.kind) {
      return NextResponse.json({ error: 'action.kind required for add' }, { status: 400 });
    }
    const { item, items } = await stageAction(siteId, action, currentItems);
    return NextResponse.json({ success: true, item, items });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// DELETE — remove an item by id, or clear the whole queue with ?all=1
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const id = url.searchParams.get('id');
    const all = url.searchParams.get('all');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (all) {
      await clearQueue(siteId);
      return NextResponse.json({ success: true, items: [] });
    }
    if (!id) return NextResponse.json({ error: 'id or all required' }, { status: 400 });
    // Same as POST: skip the load() by accepting the client's currentItems
    // state. Avoids Vercel Blob staleness reverting the queue display.
    const currentItemsParam = url.searchParams.get('currentItems');
    let currentItems = null;
    if (currentItemsParam) {
      try { currentItems = JSON.parse(currentItemsParam); } catch {}
    }
    const items = await removeFromQueue(siteId, id, currentItems);
    return NextResponse.json({ success: true, items });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
