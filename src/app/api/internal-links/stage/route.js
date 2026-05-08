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

// POST — add an action to the queue.
// Body: { siteId, action } where action is one of:
//   { kind: 'content-rewrite', page, contentType, overrides }
//   { kind: 'orphan-fix', target, sourcePage, anchorVariant, anchorMatrix }
//   { kind: 'auto-rewrite', page, rewrites, topQueries, authMode, usage }
export async function POST(req) {
  try {
    const { siteId, action } = await req.json();
    if (!siteId || !action || !action.kind) {
      return NextResponse.json({ error: 'siteId + action.kind required' }, { status: 400 });
    }
    const item = await stageAction(siteId, action);
    const items = await listQueue(siteId);
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
    const items = await removeFromQueue(siteId, id);
    return NextResponse.json({ success: true, items });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
