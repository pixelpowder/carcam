import { NextResponse } from 'next/server';
import { implementContentRewrite } from '@/lib/implementContentRewrite';
import { getRewritePlan } from '@/lib/contentRewrites';

export const maxDuration = 60;

// GET — return what content rewrites are available for a page
// (used by UI to decide whether to show the Implement button)
export async function GET(req) {
  const url = new URL(req.url);
  const page = url.searchParams.get('page');
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });
  return NextResponse.json({ success: true, plan: getRewritePlan(page) });
}

// POST — apply a content rewrite and open a PR
export async function POST(req) {
  try {
    const { siteId, page, contentType = 'metaDescription' } = await req.json();
    if (!siteId || !page) {
      return NextResponse.json({ error: 'siteId, page required' }, { status: 400 });
    }
    const result = await implementContentRewrite({ siteId, page, contentType });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[implement-content] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
