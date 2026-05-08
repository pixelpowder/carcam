import { NextResponse } from 'next/server';
import { applyAutoRewrite } from '@/lib/autoRewriteAgent';

export const maxDuration = 60;

// POST — commit the previously-generated rewrites and open a PR.
// Body: { siteId, page, rewrites, topQueries?, authMode?, usage? }
export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.siteId || !body.page || !body.rewrites) {
      return NextResponse.json({ error: 'siteId, page, rewrites required' }, { status: 400 });
    }
    const result = await applyAutoRewrite(body);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[auto-rewrite] apply failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
