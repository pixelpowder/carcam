import { NextResponse } from 'next/server';
import { translateEnRewrites } from '@/lib/autoRewriteAgent';

export const maxDuration = 60;

// POST — translate previously-generated EN rewrites into the other 6 locales.
// Body: { page, rewrites } — rewrites = { i18nKey: { en: "..." }, ... }
// Scope: meta + h1 only (no link bridges, no body content).
export async function POST(req) {
  try {
    const { page, rewrites } = await req.json();
    if (!page || !rewrites) {
      return NextResponse.json({ error: 'page, rewrites required' }, { status: 400 });
    }
    const result = await translateEnRewrites({ page, enRewrites: rewrites });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[auto-rewrite/translate] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
