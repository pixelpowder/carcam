import { NextResponse } from 'next/server';
import { autoRewritePage, PAGE_CONFIGS } from '@/lib/autoRewriteAgent';

export const maxDuration = 90; // LLM call + Octokit ops

// GET — return whether auto-rewrite is supported for this page
export async function GET(req) {
  const url = new URL(req.url);
  const page = url.searchParams.get('page');
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });
  return NextResponse.json({
    success: true,
    supported: !!PAGE_CONFIGS[page],
  });
}

// POST — run the auto-rewrite agent and open a PR
export async function POST(req) {
  try {
    const { siteId, page, brandGuide } = await req.json();
    if (!siteId || !page) {
      return NextResponse.json({ error: 'siteId, page required' }, { status: 400 });
    }
    const result = await autoRewritePage({ siteId, page, brandGuide });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[auto-rewrite] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
