// Lists open PRs (and the most recent merged ones) for a site's GitHub repo,
// so the Internal Links tool can render a "what's in flight" panel with
// direct merge URLs.

import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// Force dynamic — we read request.url for siteId, no point in trying to
// statically render this at build time. Also disable any revalidation /
// edge cache so the user always sees fresh data — preview URLs from
// GitHub deployments change as PRs open/close, and a stale response can
// point users at a zombie preview URL belonging to a closed PR.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // For each open PR, list the changed JSX page components and derive the
    // affected page paths. Used by the front-end to route the `preview`
    // button on each source-row to the PR that actually touched that source
    // page (instead of just any PR whose branch mentions the target).
    async function pagesAffected(pr) {
      try {
        const { data: files } = await gh.pulls.listFiles({
          owner: cfg.owner, repo: cfg.repo, pull_number: pr.number, per_page: 100,
        });
        const pages = new Set();
        for (const f of files) {
          const m = f.filename.match(/^src\/components\/pages\/(blog\/)?([A-Z][A-Za-z0-9]+)\.jsx$/);
          if (!m) continue;
          const isBlog = !!m[1];
          // PascalCase → kebab-case (handles letter→digit boundaries too).
          // PascalCase → kebab-case, with dashes at all word boundaries:
          //   letter→letter (case change), letter→digit, digit→letter.
          //   "MontenegroRoadTrip10Days" → "montenegro-road-trip-10-days"
          //   "HercegNovi" → "herceg-novi"
          const slug = m[2]
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/([A-Za-z])(\d)/g, '$1-$2')
            .replace(/(\d)([A-Za-z])/g, '$1-$2')
            .toLowerCase();
          pages.add(isBlog ? `/blog/${slug}` : `/${slug}`);
        }
        return Array.from(pages);
      } catch (e) {
        console.warn('[prs] pagesAffected failed for PR', pr.number, ':', e.message);
        return [];
      }
    }

    // For each open PR, look up the latest Vercel preview deployment URL.
    // GitHub deployments API gives us the most reliable handle: Vercel
    // creates a deployment per push and updates statuses with environment_url
    // pointing at the preview URL.
    async function previewUrlFor(pr) {
      try {
        const { data: deployments } = await gh.repos.listDeployments({
          owner: cfg.owner, repo: cfg.repo, sha: pr.head?.sha, per_page: 5,
        });
        if (!deployments.length) return null;
        // Walk newest-first looking for a successful Vercel deployment with
        // an environment_url. Vercel emits multiple deployments per push
        // (preview + sometimes production-style); we just want the first
        // success with a URL.
        for (const dep of deployments) {
          const { data: statuses } = await gh.repos.listDeploymentStatuses({
            owner: cfg.owner, repo: cfg.repo, deployment_id: dep.id, per_page: 10,
          });
          const ok = statuses.find(s => s.state === 'success' && s.environment_url);
          if (ok) return { url: ok.environment_url, state: 'ready', updatedAt: ok.updated_at };
          // Building / queued — surface that so UI can show a spinner
          const inflight = statuses.find(s => s.state === 'in_progress' || s.state === 'queued' || s.state === 'pending');
          if (inflight) return { url: null, state: 'building', updatedAt: inflight.updated_at };
          const failed = statuses.find(s => s.state === 'failure' || s.state === 'error');
          if (failed) return { url: null, state: 'failed', updatedAt: failed.updated_at };
        }
        return null;
      } catch (e) {
        console.warn('[prs] preview lookup failed for PR', pr.number, ':', e.message);
        return null;
      }
    }

    const openWithPreview = await Promise.all(open.map(async pr => {
      const [preview, pages] = await Promise.all([previewUrlFor(pr), pagesAffected(pr)]);
      return {
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        branch: pr.head?.ref,
        base: pr.base?.ref,
        headSha: pr.head?.sha,
        draft: !!pr.draft,
        mergedAt: pr.merged_at,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        author: pr.user?.login,
        preview,
        pages, // list of page paths whose JSX component this PR modified
      };
    }));

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
      // Server-side build ID. The client compares this to its own
      // NEXT_PUBLIC_BUILD_ID and reloads if they differ — keeps the client
      // bundle in sync with the latest deploy without manual hard-refresh.
      // Hardcoded version stamp — bump whenever a client-side change requires
      // users with open tabs to reload. More reliable than env-var-based
      // detection (Vercel env injection has edge cases). Bumped: smart
      // matcher v3.
      buildId: 'v3-smart-matcher',
      open: openWithPreview,
      recentMerged: closed.filter(p => p.merged_at).slice(0, 5).map(shape),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[prs] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
