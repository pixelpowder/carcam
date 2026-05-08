import { NextResponse } from 'next/server';
import { generateAutoRewrite, applyAutoRewrite, PAGE_CONFIGS } from '@/lib/autoRewriteAgent';
import { loadLatestSnapshot } from '@/lib/internalLinksSnapshots';

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

// Compute related-targets context for a page by looking at the latest snapshot's
// orphan-fix list — those are pages already identified as priority targets with
// fully-built anchor matrices. Pick top 4 OTHER targets sorted by score so
// Claude has options to weave links to.
async function deriveRelatedTargets(siteId, page) {
  try {
    const snap = await loadLatestSnapshot(siteId);
    const pool = (snap?.orphanFixList || []).filter(t => t.page !== page);
    pool.sort((a, b) => (b.score || 0) - (a.score || 0));
    return pool.slice(0, 4).map(t => ({
      targetPath: t.page,
      topQuery: t.topQuery,
      anchorPool: (t.anchorMatrix?.en || []).filter(v => ['exact', 'partial', 'branded', 'contextual', 'longtail'].includes(v.label)).slice(0, 6),
      // Keep the full per-locale matrix so translate step can pick locale anchors
      anchorMatrix: t.anchorMatrix,
    }));
  } catch (e) {
    console.warn('[auto-rewrite] deriveRelatedTargets failed:', e.message);
    return [];
  }
}

// POST — generate proposed rewrites (no PR yet). Returns the diff payload
// the UI uses for full-page review before user commits.
export async function POST(req) {
  try {
    const { siteId, page, brandGuide, includeLinks = true } = await req.json();
    if (!siteId || !page) {
      return NextResponse.json({ error: 'siteId, page required' }, { status: 400 });
    }
    const relatedTargets = includeLinks ? await deriveRelatedTargets(siteId, page) : [];
    const result = await generateAutoRewrite({ siteId, page, brandGuide, relatedTargets });
    // Attach the per-target anchor matrices so the translate call can resolve
    // per-locale anchors deterministically.
    const targetAnchorMatrices = {};
    for (const t of relatedTargets) {
      if (t.anchorMatrix) targetAnchorMatrices[t.targetPath] = t.anchorMatrix;
    }
    return NextResponse.json({ success: true, ...result, targetAnchorMatrices });
  } catch (e) {
    console.error('[auto-rewrite] generate failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
