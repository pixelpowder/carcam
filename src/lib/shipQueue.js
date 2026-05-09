// Ship the staged queue: one branch, all actions applied, one PR, auto-merged.
// All changes land in a single Vercel deploy.

import { Octokit } from '@octokit/rest';
import { applyContentRewriteToBranch } from './implementContentRewrite.js';
import { applyOrphanFixToBranch } from './implementOrphanFix.js';
import { applyAutoRewriteToBranch } from './autoRewriteAgent.js';
import { listQueue, clearQueue } from './stagingQueue.js';
import { squashMergeAndCleanup } from './githubMerge.js';
import { logImplementations } from './implementationLog.js';

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', defaultBranch: 'master' },
};

function octokit() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_TOKEN env var not set');
  return new Octokit({ auth: token });
}

export async function shipQueue(siteId) {
  const items = await listQueue(siteId);
  if (items.length === 0) return { error: 'queue is empty', shipped: 0 };
  const repoCfg = SITE_REPOS[siteId];
  if (!repoCfg) throw new Error(`No repo configured for siteId ${siteId}`);
  const { owner, repo, defaultBranch } = repoCfg;
  const gh = octokit();

  // Branch name — encodes timestamp so subsequent ships are uniquely named
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const branch = `seo/ship-${stamp}`;
  const { data: refData } = await gh.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
  const baseSha = refData.object.sha;
  await gh.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });

  const applied = [];
  const failed = [];
  for (const item of items) {
    try {
      if (item.kind === 'content-rewrite') {
        await applyContentRewriteToBranch({
          gh, owner, repo, branch,
          page: item.page,
          contentType: item.contentType,
          overrides: item.overrides || {},
        });
        applied.push(item);
      } else if (item.kind === 'orphan-fix') {
        await applyOrphanFixToBranch({
          gh, owner, repo, branch,
          targetPath: item.target,
          sourcePage: item.sourcePage,
          anchorVariant: item.anchorVariant,
          anchorMatrix: item.anchorMatrix,
        });
        applied.push(item);
      } else if (item.kind === 'auto-rewrite') {
        await applyAutoRewriteToBranch({
          gh, owner, repo, branch,
          page: item.page,
          rewrites: item.rewrites,
          jsxLinks: item.jsxLinks || [],
        });
        applied.push(item);
      } else {
        failed.push({ ...item, error: `unknown kind: ${item.kind}` });
      }
    } catch (e) {
      failed.push({ ...item, error: e.message });
    }
  }

  if (applied.length === 0) {
    // Clean up the empty branch so we don't leave dead refs around
    try { await gh.git.deleteRef({ owner, repo, ref: `heads/${branch}` }); } catch {}
    return { shipped: 0, failed, error: 'no items applied' };
  }

  // Open PR
  const pages = [...new Set(applied.map(a => a.page || a.target).filter(Boolean))];
  const prTitle = `SEO ship: ${applied.length} change${applied.length === 1 ? '' : 's'} across ${pages.length} page${pages.length === 1 ? '' : 's'}`;
  const prBody = [
    `Auto-shipped by carcam staging queue.`,
    ``,
    `**Items applied:** ${applied.length}`,
    `**Pages touched:** ${pages.join(', ')}`,
    failed.length > 0 ? `**Items skipped:** ${failed.length} (${failed.map(f => f.error).join('; ')})` : '',
    ``,
    `## Items`,
    ...applied.map(a => {
      if (a.kind === 'content-rewrite') {
        const types = Array.isArray(a.contentType) ? a.contentType.join(', ') : a.contentType;
        return `- **${a.kind}** \`${a.page}\` — ${types}`;
      }
      if (a.kind === 'orphan-fix') {
        return `- **${a.kind}** \`${a.sourcePage}\` → \`${a.target}\``;
      }
      if (a.kind === 'auto-rewrite') {
        return `- **${a.kind}** \`${a.page}\` (${Object.keys(a.rewrites || {}).length} meta+h1 keys)`;
      }
      return `- ${a.kind}`;
    }),
  ].filter(Boolean).join('\n');

  const pr = await gh.pulls.create({
    owner, repo, head: branch, base: defaultBranch, title: prTitle, body: prBody,
  });

  const { merged, mergeError } = await squashMergeAndCleanup({
    gh, owner, repo, pullNumber: pr.data.number, branch, title: prTitle,
  });

  // Log every applied item
  if (merged) {
    await logImplementations(siteId, applied.map(a => {
      const base = {
        prNumber: pr.data.number,
        prUrl: pr.data.html_url,
        merged: true,
        mergedAt: new Date().toISOString(),
      };
      if (a.kind === 'content-rewrite') {
        const types = Array.isArray(a.contentType) ? a.contentType : [a.contentType];
        return { ...base, page: a.page, kind: 'rewrite', contentType: types[0], i18nKeys: types };
      }
      if (a.kind === 'orphan-fix') {
        return { ...base, page: a.sourcePage, kind: 'orphan-fix', sourcePage: a.sourcePage, target: a.target };
      }
      if (a.kind === 'auto-rewrite') {
        return { ...base, page: a.page, kind: 'auto-rewrite', i18nKeys: Object.keys(a.rewrites || {}) };
      }
      return base;
    }));
  }

  // Clear the queue regardless of merge — items are committed to the branch either way.
  if (merged) await clearQueue(siteId);

  return {
    shipped: applied.length,
    failed,
    prUrl: pr.data.html_url,
    prNumber: pr.data.number,
    merged,
    mergeError,
    branch,
  };
}
