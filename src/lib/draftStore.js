// Manual-rewrite draft store. Holds per-page proposed rewrites that an
// external author (typically Claude in chat) has pushed for the user to
// review inside the tool. Different from the staging queue — drafts are
// PROPOSALS awaiting user approval; staged items are APPROVED awaiting ship.
//
// Storage: internal-links/drafts/{siteId}.json
// Shape: { '/page-path': { rewrites: { 'i18n.key': 'proposed EN text' },
//                          proposedBy, proposedAt, note }, ... }

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DRAFTS_DIR = resolve(process.cwd(), 'data/drafts');
const ON_VERCEL = !!process.env.VERCEL;
const FS_WRITABLE = !ON_VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

function fsPath(siteId) {
  if (FS_WRITABLE) try { mkdirSync(DRAFTS_DIR, { recursive: true }); } catch {}
  return join(DRAFTS_DIR, `${siteId}.json`);
}
const blobKey = (siteId) => `internal-links/drafts/${siteId}.json`;

async function load(siteId) {
  if (ON_VERCEL) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: blobKey(siteId) });
      if (!blobs.length) return {};
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const res = await fetch(blobs[0].url, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return {};
      return await res.json();
    } catch (e) { console.error('[drafts] load fail:', e.message); return {}; }
  }
  try {
    const path = fsPath(siteId);
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch { return {}; }
}

async function save(siteId, drafts) {
  const payload = JSON.stringify(drafts, null, 2);
  if (ON_VERCEL) {
    try {
      const { put } = await import('@vercel/blob');
      await put(blobKey(siteId), payload, {
        access: 'private', contentType: 'application/json',
        addRandomSuffix: false, allowOverwrite: true,
      });
    } catch (e) { console.error('[drafts] save fail:', e.message); }
    return;
  }
  if (!FS_WRITABLE) return;
  try { writeFileSync(fsPath(siteId), payload, 'utf8'); }
  catch (e) { console.error('[drafts] fs save fail:', e.message); }
}

// Push (or replace) a draft for a page.
// `rewrites` is { 'i18n.key': 'proposed EN text', ... }
// `jsxLinks` (optional) is an array of:
//   { hostKey, target, anchor, anchorMatrix? }
//   - hostKey: i18n key whose rewritten EN text contains the anchor inline
//   - target: link target path (e.g. '/podgorica-airport')
//   - anchor: the EN anchor text (must appear verbatim in the rewrite)
//   - anchorMatrix: optional per-locale anchor texts {en,de,fr,it,me,pl,ru}
//     so JSX surgery can use the right text per locale. If absent, EN anchor
//     is used in all locales (user can manually edit non-EN later).
export async function pushDraft(siteId, { page, rewrites, jsxLinks = [], proposedBy = 'claude', note = '' }) {
  if (!page) throw new Error('page required');
  if (!rewrites || typeof rewrites !== 'object' || Object.keys(rewrites).length === 0) {
    throw new Error('rewrites object with at least one key required');
  }
  // Validate jsxLinks against rewrites
  for (const link of (jsxLinks || [])) {
    if (!link.hostKey) throw new Error('jsxLinks entry missing hostKey');
    if (!link.target) throw new Error('jsxLinks entry missing target');
    if (!link.anchor) throw new Error('jsxLinks entry missing anchor');
    const proseEn = rewrites[link.hostKey];
    if (typeof proseEn !== 'string') {
      throw new Error(`jsxLinks: hostKey ${link.hostKey} has no EN text in rewrites`);
    }
    if (!proseEn.includes(link.anchor)) {
      throw new Error(`jsxLinks: anchor "${link.anchor}" not found in rewrites[${link.hostKey}]`);
    }
  }
  const all = await load(siteId);
  all[page] = {
    rewrites,
    jsxLinks: jsxLinks || [],
    proposedBy,
    proposedAt: new Date().toISOString(),
    note,
  };
  await save(siteId, all);
  return { page, ...all[page] };
}

// Get the draft for a specific page (or null if none).
export async function getDraft(siteId, page) {
  const all = await load(siteId);
  return all[page] || null;
}

// List all pages that have pending drafts (so user can see them in a hub).
export async function listDrafts(siteId) {
  const all = await load(siteId);
  return Object.entries(all).map(([page, draft]) => ({ page, ...draft }));
}

// Clear a draft (call after the user ships or discards it).
export async function clearDraft(siteId, page) {
  const all = await load(siteId);
  delete all[page];
  await save(siteId, all);
}
