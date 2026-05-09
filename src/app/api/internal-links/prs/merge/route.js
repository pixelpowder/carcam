// Merge a PR by number (squash by default) directly from the Internal Links
// tool, so the user doesn't have to bounce to GitHub once they've reviewed
// the Vercel preview. Optionally deletes the branch after merge.

import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire' },
};

export async function POST(req) {
  try {
    const { siteId, prNumber, method = 'squash', deleteBranch = true } = await req.json();
    if (!siteId || !prNumber) {
      return NextResponse.json({ error: 'siteId + prNumber required' }, { status: 400 });
    }
    const cfg = SITE_REPOS[siteId];
    if (!cfg) return NextResponse.json({ error: `No repo for ${siteId}` }, { status: 400 });
    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN not set' }, { status: 500 });

    const gh = new Octokit({ auth: token });

    // Fetch PR to get title (we'll use it as commit title) + branch name (for cleanup)
    const { data: pr } = await gh.pulls.get({
      owner: cfg.owner, repo: cfg.repo, pull_number: prNumber,
    });
    if (pr.merged) return NextResponse.json({ success: true, alreadyMerged: true, prUrl: pr.html_url });
    if (pr.state === 'closed') return NextResponse.json({ error: 'PR is closed (not merged)' }, { status: 400 });
    if (!pr.mergeable) return NextResponse.json({ error: `PR not mergeable (mergeable_state=${pr.mergeable_state})` }, { status: 400 });

    const { data: result } = await gh.pulls.merge({
      owner: cfg.owner, repo: cfg.repo, pull_number: prNumber,
      merge_method: method, // 'squash' | 'merge' | 'rebase'
      commit_title: `${pr.title} (#${prNumber})`,
    });

    let branchDeleted = false;
    if (deleteBranch && pr.head?.ref) {
      try {
        await gh.git.deleteRef({ owner: cfg.owner, repo: cfg.repo, ref: `heads/${pr.head.ref}` });
        branchDeleted = true;
      } catch (e) {
        console.warn('[merge] deleteRef failed:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      merged: result.merged,
      sha: result.sha,
      prUrl: pr.html_url,
      branchDeleted,
    });
  } catch (e) {
    console.error('[merge] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
