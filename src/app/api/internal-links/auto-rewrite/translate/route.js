import { NextResponse } from 'next/server';
import { translateEnRewrites } from '@/lib/autoRewriteAgent';

export const maxDuration = 90;

// POST — translate previously-generated EN rewrites into the other 6 locales.
// Body: { page, rewrites, linkBridges?, targetAnchorMatrices? }
//   rewrites = { i18nKey: { en: "..." }, ... }
//   linkBridges = optional array of { insertAfterKey, targetPath, anchor, anchorLabel, pre, post, bridgeKey }
//   targetAnchorMatrices = { '/path': { en: [...], de: [...], ... } } — used to resolve per-locale anchors
// Returns merged { rewrites, linkBridges (with prose:{en,...,ru}) }
export async function POST(req) {
  try {
    const { page, rewrites, linkBridges = [], targetAnchorMatrices = {} } = await req.json();
    if (!page || !rewrites) {
      return NextResponse.json({ error: 'page, rewrites required' }, { status: 400 });
    }
    const result = await translateEnRewrites({
      page, enRewrites: rewrites, linkBridges, targetAnchorMatrices,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[auto-rewrite/translate] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
