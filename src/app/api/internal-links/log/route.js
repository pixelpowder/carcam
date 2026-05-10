import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getLogForPage, getLatestPerSection, backfillLogFromGitHub, getAllEntries } from '@/lib/implementationLog';
import { REWRITES } from '@/lib/contentRewrites';

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', defaultBranch: 'master' },
};

// Force dynamic + no-store so a freshly added manual note (POST /note) is
// always visible on the next GET refresh. Without this, Vercel/browser
// cache the GET response and the "mark done" toggle appears to do nothing.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const page = url.searchParams.get('page');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (page) {
      const entries = await getLogForPage(siteId, page);
      const latestPerSection = {};
      const map = await getLatestPerSection(siteId, page);
      for (const [k, v] of map.entries()) latestPerSection[k] = v;
      return NextResponse.json({ success: true, entries, latestPerSection }, { headers: NO_CACHE });
    }
    // No page filter — return every entry (used by Timeline view).
    const entries = await getAllEntries(siteId);
    return NextResponse.json({ success: true, entries }, { headers: NO_CACHE });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST — backfill log from GitHub PR history. Run once after deploying log feature.
export async function POST(req) {
  try {
    const { siteId } = await req.json();
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const repoCfg = SITE_REPOS[siteId];
    if (!repoCfg) return NextResponse.json({ error: `No repo configured for ${siteId}` }, { status: 400 });
    const result = await backfillLogFromGitHub(siteId, {
      Octokit, repoCfg, contentRewritesMap: REWRITES,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[log/backfill] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
