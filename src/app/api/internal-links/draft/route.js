import { NextResponse } from 'next/server';
import { pushDraft, getDraft, listDrafts, clearDraft } from '@/lib/draftStore';

// GET ?siteId=X&page=/path → single draft for that page
// GET ?siteId=X            → all drafts (for hub view)
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const page = url.searchParams.get('page');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (page) {
      const draft = await getDraft(siteId, page);
      return NextResponse.json({ success: true, draft });
    }
    const drafts = await listDrafts(siteId);
    return NextResponse.json({ success: true, drafts });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST body: { siteId, page, rewrites: {key: 'value'}, proposedBy?, note? }
// Stores or replaces the draft for that page.
export async function POST(req) {
  try {
    const { siteId, page, rewrites, proposedBy, note } = await req.json();
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const draft = await pushDraft(siteId, { page, rewrites, proposedBy, note });
    return NextResponse.json({ success: true, draft });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }
}

// DELETE ?siteId=X&page=/path → clear draft for that page
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const page = url.searchParams.get('page');
    if (!siteId || !page) return NextResponse.json({ error: 'siteId + page required' }, { status: 400 });
    await clearDraft(siteId, page);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
