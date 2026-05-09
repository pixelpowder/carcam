import { NextResponse } from 'next/server';
import { generateSectionRewrite } from '@/lib/sectionRewrite';

export const maxDuration = 60;

// POST — generate a section rewrite for a (source → target) edge.
// Body: { siteId, sourcePage, targetPath, anchorVariant: { label, text }, targetTopQuery? }
// Returns the EN-only rewrite plan for review. Translate via /translate sub-route.
export async function POST(req) {
  try {
    const { siteId, sourcePage, targetPath, anchorVariant, anchorPool, targetTopQuery, forceHostKey } = await req.json();
    if (!siteId || !sourcePage || !targetPath || !anchorVariant?.text) {
      return NextResponse.json({ error: 'siteId, sourcePage, targetPath, anchorVariant.text required' }, { status: 400 });
    }
    const result = await generateSectionRewrite({
      siteId, sourcePage, targetPath, anchorVariant, anchorPool, targetTopQuery, forceHostKey,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[section-rewrite] generate failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
