// Lists open PRs (and the most recent merged ones) for a site's GitHub repo,
// so the Internal Links tool can render a "what's in flight" panel with
// direct merge URLs.

import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// Force dynamic — we read request.url for siteId, no point in trying to
// statically render this at build time.
export const dynamic = 'force-dynamic';

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire' },
};

export async function GET(req) {
  try {
    const siteId = new URL(req.url).searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const cfg = SITE_REPOS[siteId];
    if (!cfg) return NextResponse.json({ success: true, open: [], recentMerged: [] });

    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) return NextResponse.json({ success: false, error: 'GITHUB_TOKEN not set' }, { status: 500 });

    const gh = new Octokit({ auth: token });

    // Open PRs (newest first)
    const { data: open } = await gh.pulls.list({
      owner: cfg.owner, repo: cfg.repo, state: 'open', per_page: 30, sort: 'created', direction: 'desc',
    });

    // Recently closed (we'll keep only merged ones from the closed bucket)
    const { data: closed } = await gh.pulls.list({
      owner: cfg.owner, repo: cfg.repo, state: 'closed', per_page: 10, sort: 'updated', direction: 'desc',
    });

    const shape = (pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      branch: pr.head?.ref,
      base: pr.base?.ref,
      draft: !!pr.draft,
      mergedAt: pr.merged_at,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      author: pr.user?.login,
    });

    return NextResponse.json({
      success: true,
      open: open.map(shape),
      recentMerged: closed.filter(p => p.merged_at).slice(0, 5).map(shape),
    });
  } catch (e) {
    console.error('[prs] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
