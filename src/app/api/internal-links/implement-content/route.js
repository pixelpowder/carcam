import { NextResponse } from 'next/server';
import { implementContentRewrite } from '@/lib/implementContentRewrite';
import { getRewritePlan, REWRITES, PAGE_OUTLINES } from '@/lib/contentRewrites';

export const maxDuration = 60;

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', branch: 'master' },
};

// Fetch en.json from GitHub for a site (re-used pattern from main route)
async function fetchEnJson(siteId) {
  const cfg = SITE_REPOS[siteId];
  if (!cfg) return null;
  try {
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/src/i18n/locales/en.json?ref=${cfg.branch}`;
    const token = process.env.GITHUB_TOKEN?.trim();
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        ...(token ? { Authorization: `token ${token}` } : {}),
        Accept: 'application/vnd.github.raw',
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function getKey(obj, dottedKey) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// GET — return what content rewrites are available for a page,
// PLUS the current EN value at each i18n key (for before/after preview)
export async function GET(req) {
  const url = new URL(req.url);
  const page = url.searchParams.get('page');
  const siteId = url.searchParams.get('siteId');
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });
  const plan = getRewritePlan(page);
  if (!plan.available) return NextResponse.json({ success: true, plan });

  // Fetch current values from en.json so the UI can show before/after
  let en = null;
  if (siteId) en = await fetchEnJson(siteId);

  // Build a reverse map: i18nKey → { contentType, proposedEn } so we can
  // mark which outline sections have rewrites
  const rewritesByKey = {};
  const entry = REWRITES[page] || {};
  for (const [contentType, def] of Object.entries(entry)) {
    if (!def.i18nKey) continue;
    rewritesByKey[def.i18nKey] = {
      contentType,
      proposedEn: def.content?.en,
    };
  }

  // Full page outline (if defined) — current + proposed per section
  const outline = (PAGE_OUTLINES[page] || []).map(o => {
    const rewrite = rewritesByKey[o.key];
    return {
      ...o,
      currentEn: en ? getKey(en, o.key) : null,
      proposedEn: rewrite?.proposedEn || null,
      contentType: rewrite?.contentType || null,
      hasRewrite: !!rewrite,
    };
  });

  const enriched = {
    ...plan,
    contentTypes: plan.contentTypes.map(ct => ({
      ...ct,
      currentEn: en ? getKey(en, ct.i18nKey) : null,
    })),
    pageOutline: outline,
  };
  return NextResponse.json({ success: true, plan: enriched });
}

// POST — apply a content rewrite and open a PR
export async function POST(req) {
  try {
    const { siteId, page, contentType = 'metaDescription', overrides = {} } = await req.json();
    if (!siteId || !page) {
      return NextResponse.json({ error: 'siteId, page required' }, { status: 400 });
    }
    const result = await implementContentRewrite({ siteId, page, contentType, overrides });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[implement-content] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
