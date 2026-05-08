// Backend agent that applies a content rewrite (e.g., meta description,
// subtitle, title) by updating the relevant i18n key across all 7 locale
// JSONs and opening a PR for review.
//
// Zero runtime API tokens — uses pre-written content from contentRewrites.js.

import { Octokit } from '@octokit/rest';
import { REWRITES, LOCALES, getRewrite } from './contentRewrites.js';
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

async function getFile(gh, owner, repo, path, ref) {
  const { data } = await gh.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== 'file') throw new Error(`${path} is not a file`);
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') };
}

async function putFile(gh, owner, repo, path, branch, content, sha, message) {
  await gh.repos.createOrUpdateFileContents({
    owner, repo, path, branch, message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha,
  });
}

// Set a nested key like "podgorica-airport.seoDesc" on an object
function setKey(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] == null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
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

// Resolves the rewrites + content for the given parameters. Used both for
// direct execution and for staged execution (against an external branch).
function resolveRewrites(page, contentType, overrides = {}) {
  const types = Array.isArray(contentType) ? contentType : [contentType];
  return types.map(t => {
    const r = getRewrite(page, t);
    if (!r) throw new Error(`No rewrite registered for ${page} / ${t}`);
    const editedEn = overrides[t];
    const content = editedEn != null ? { ...r.content, en: editedEn } : r.content;
    return { type: t, ...r, content };
  });
}

// Apply content-rewrite changes to an EXISTING branch (used by ship-queue).
// No PR, no merge, no log — caller handles the lifecycle.
export async function applyContentRewriteToBranch({ gh, owner, repo, branch, page, contentType, overrides = {} }) {
  const rewrites = resolveRewrites(page, contentType, overrides);
  const types = rewrites.map(r => r.type);
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    for (const r of rewrites) {
      const after = r.content[loc] || r.content.en;
      setKey(data, r.i18nKey, after);
    }
    const updated = JSON.stringify(data, null, 2) + '\n';
    const msg = types.length === 1
      ? `i18n(${loc}): rewrite ${rewrites[0].i18nKey} for ${page}`
      : `i18n(${loc}): rewrite ${types.length} sections for ${page}`;
    await putFile(gh, owner, repo, path, branch, updated, sha, msg);
  }
  return { rewrites, types };
}

// `contentType` can be a single string OR an array — when multiple, we
// commit all rewrites in one PR (one branch, one merge, one Vercel deploy).
//
// `overrides` is { [contentType]: editedEnString }. When present for a
// contentType, the EN value is replaced with the user's edit; other locales
// still come from the registry.
export async function implementContentRewrite({ siteId, page, contentType, overrides = {} }) {
  const repoCfg = SITE_REPOS[siteId];
  if (!repoCfg) throw new Error(`No repo configured for siteId ${siteId}`);

  const rewrites = resolveRewrites(page, contentType, overrides);
  const types = rewrites.map(r => r.type);

  const { owner, repo, defaultBranch } = repoCfg;
  const gh = octokit();
  const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const branch = types.length === 1
    ? `seo/rewrite-${slug(page)}-${types[0]}`
    : `seo/rewrite-${slug(page)}-batch-${types.length}`;

  const { data: refData } = await gh.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
  const baseSha = refData.object.sha;
  try { await gh.git.deleteRef({ owner, repo, ref: `heads/${branch}` }); } catch { /* didn't exist */ }
  await gh.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: baseSha });

  // Per-locale: apply ALL selected rewrites in a single file commit
  const beforeAfter = {}; // { locale: [{ key, before, after }, ...] }
  for (const loc of LOCALES) {
    const path = `src/i18n/locales/${loc}.json`;
    const { sha, content } = await getFile(gh, owner, repo, path, branch);
    const data = JSON.parse(content);
    const localeBA = [];
    for (const r of rewrites) {
      const before = getKey(data, r.i18nKey);
      const after = r.content[loc] || r.content.en;
      setKey(data, r.i18nKey, after);
      localeBA.push({ key: r.i18nKey, before, after });
    }
    beforeAfter[loc] = localeBA;
    const updated = JSON.stringify(data, null, 2) + '\n';
    const msg = types.length === 1
      ? `i18n(${loc}): rewrite ${rewrites[0].i18nKey} for ${page}`
      : `i18n(${loc}): rewrite ${types.length} sections for ${page}`;
    await putFile(gh, owner, repo, path, branch, updated, sha, msg);
  }

  const prTitle = types.length === 1
    ? `SEO: rewrite ${types[0]} for ${page}`
    : `SEO: rewrite ${types.length} sections for ${page} (${types.join(', ')})`;
  const prBody = [
    `Auto-generated by carcam Internal Links agent.`,
    ``,
    `**Page:** \`${page}\``,
    `**Content types:** ${types.join(', ')}`,
    ``,
    `## Before / after (EN)`,
    ``,
    ...rewrites.map(r => `**${r.type}** \`${r.i18nKey}\`\n- before: ${JSON.stringify(beforeAfter.en.find(b => b.key === r.i18nKey)?.before)}\n- after: ${JSON.stringify(beforeAfter.en.find(b => b.key === r.i18nKey)?.after)}\n`),
    `Review prose for natural reading + length. Edit on this branch before merging if needed.`,
  ].join('\n');

  const pr = await gh.pulls.create({
    owner, repo, head: branch, base: defaultBranch,
    title: prTitle, body: prBody,
  });

  const { merged, mergeError } = await squashMergeAndCleanup({
    gh, owner, repo,
    pullNumber: pr.data.number,
    branch,
    title: prTitle,
  });

  // Persist to log so UI can show "last changed" badges per section
  if (merged) {
    await logImplementations(siteId, types.map(t => ({
      page,
      kind: 'rewrite',
      contentType: t,
      i18nKeys: [rewrites.find(r => r.type === t)?.i18nKey].filter(Boolean),
      prNumber: pr.data.number,
      prUrl: pr.data.html_url,
      merged: true,
      mergedAt: new Date().toISOString(),
    })));
  }

  return { prUrl: pr.data.html_url, branch, prNumber: pr.data.number, beforeAfter, merged, mergeError, contentTypes: types };
}
