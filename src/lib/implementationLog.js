// Persistent log of every successful implement action across all flows
// (orphan-fix link insertion, pre-written content rewrite, auto-rewrite).
//
// Stored as a single append-only JSON array per site:
//   internal-links/log/{siteId}.json
//
// Used to show "last changed" badges on sections in the Full-page diff
// so the user knows which content has already been touched and when.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LOG_DIR = resolve(process.cwd(), 'data/log');
const ON_VERCEL = !!process.env.VERCEL;
const FS_WRITABLE = !ON_VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

function fsLogPath(siteId) {
  if (FS_WRITABLE) {
    try { mkdirSync(LOG_DIR, { recursive: true }); } catch {}
  }
  return join(LOG_DIR, `${siteId}.json`);
}

const blobKey = (siteId) => `internal-links/log/${siteId}.json`;

async function loadAll(siteId) {
  if (ON_VERCEL) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: blobKey(siteId) });
      if (!blobs.length) return [];
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const res = await fetch(blobs[0].url, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error('[implementationLog] blob load failed:', e.message);
      return [];
    }
  }
  // Local fs
  try {
    const path = fsLogPath(siteId);
    if (!existsSync(path)) return [];
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch { return []; }
}

async function saveAll(siteId, entries) {
  const payload = JSON.stringify(entries, null, 2);
  if (ON_VERCEL) {
    try {
      const { put } = await import('@vercel/blob');
      await put(blobKey(siteId), payload, {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (e) {
      console.error('[implementationLog] blob save failed:', e.message);
    }
    return;
  }
  if (!FS_WRITABLE) return;
  try {
    writeFileSync(fsLogPath(siteId), payload, 'utf8');
  } catch (e) {
    console.error('[implementationLog] fs save failed:', e.message);
  }
}

// Append one or more log entries.
// Entry shape (auto-logged from a shipped PR):
//   { page, kind: 'rewrite'|'orphan-fix'|'auto-rewrite',
//     contentType?, sourcePage?, i18nKeys?: [...],
//     prNumber, prUrl, merged, mergedAt, loggedAt }
//
// Manual annotation shape (user-added):
//   { id, page, kind: 'manual-note',
//     note: 'string',                — what the user did
//     changeDate?: 'YYYY-MM-DD',     — when the change was made (defaults to today)
//     tags?: ['rewrite', 'links'],   — categorisation
//     loggedAt: 'ISO timestamp' }
export async function logImplementations(siteId, entries) {
  if (!Array.isArray(entries)) entries = [entries];
  if (entries.length === 0) return;
  const all = await loadAll(siteId);
  const stamped = entries.map(e => ({ ...e, loggedAt: new Date().toISOString() }));
  all.push(...stamped);
  await saveAll(siteId, all);
}

// Add a manual annotation for a page change. Returns the saved entry.
// `note` is required, `changeDate` defaults to today (YYYY-MM-DD).
export async function addManualNote(siteId, { page, note, changeDate, tags = [] }) {
  if (!page) throw new Error('page required');
  if (!note?.trim()) throw new Error('note required');
  const entry = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    page,
    kind: 'manual-note',
    note: note.trim(),
    changeDate: changeDate || new Date().toISOString().slice(0, 10),
    tags: Array.isArray(tags) ? tags : [],
    loggedAt: new Date().toISOString(),
  };
  const all = await loadAll(siteId);
  all.push(entry);
  await saveAll(siteId, all);
  return entry;
}

// Update an existing manual note. id required. Returns the updated entry.
export async function updateManualNote(siteId, id, patch) {
  const all = await loadAll(siteId);
  const idx = all.findIndex(e => e.id === id && e.kind === 'manual-note');
  if (idx < 0) throw new Error(`note ${id} not found`);
  const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  // Don't allow changing kind / id / page silently
  updated.id = all[idx].id;
  updated.kind = 'manual-note';
  updated.page = all[idx].page;
  all[idx] = updated;
  await saveAll(siteId, all);
  return updated;
}

// Delete a manual note by id. Auto-logged PR entries cannot be deleted.
export async function deleteManualNote(siteId, id) {
  const all = await loadAll(siteId);
  const next = all.filter(e => !(e.id === id && e.kind === 'manual-note'));
  if (next.length === all.length) throw new Error(`note ${id} not found`);
  await saveAll(siteId, next);
  return { id, deleted: true };
}

// Return all log entries for a specific page, sorted newest-first.
export async function getLogForPage(siteId, page) {
  const all = await loadAll(siteId);
  return all
    .filter(e => e.page === page)
    .sort((a, b) => (b.loggedAt || '').localeCompare(a.loggedAt || ''));
}

// Return EVERY log entry for the site, sorted newest-first. Used by the
// stripped-back Timeline view that renders all changes across all pages.
export async function getAllEntries(siteId) {
  const all = await loadAll(siteId);
  return [...all].sort((a, b) => (b.loggedAt || '').localeCompare(a.loggedAt || ''));
}

// Return the most recent log entry per (page, contentType OR i18nKey) tuple.
// Used by the UI to show "last changed" badges. Returns a Map keyed by:
//   contentType (for rewrites)
//   i18nKey (for direct key edits, when contentType isn't known)
export async function getLatestPerSection(siteId, page) {
  const entries = await getLogForPage(siteId, page);
  const byKey = new Map();
  for (const e of entries) {
    // Track by contentType (rewrite kind)
    if (e.contentType && !byKey.has(`type:${e.contentType}`)) {
      byKey.set(`type:${e.contentType}`, e);
    }
    // Also track by i18nKey list (granular)
    for (const k of e.i18nKeys || []) {
      if (!byKey.has(`key:${k}`)) byKey.set(`key:${k}`, e);
    }
  }
  return byKey;
}

// Backfill the log from GitHub's merged-PR history. Run once after the log
// feature is deployed to capture older SEO: PRs that predate the logging.
// Idempotent — won't create duplicate entries (de-duped by prNumber).
export async function backfillLogFromGitHub(siteId, { Octokit, repoCfg, sourceFilesMap, contentRewritesMap }) {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_TOKEN required for backfill');
  const gh = new Octokit({ auth: token });
  const { owner, repo } = repoCfg;

  // Collect all merged PRs with SEO: prefix (paginated)
  const prs = [];
  let page = 1;
  while (true) {
    const { data } = await gh.pulls.list({ owner, repo, state: 'closed', per_page: 100, page });
    if (!data.length) break;
    for (const pr of data) {
      if (!pr.merged_at) continue;
      if (!/^SEO:/.test(pr.title)) continue;
      prs.push(pr);
    }
    if (data.length < 100) break;
    page++;
    if (page > 10) break; // safety
  }

  // Existing log entries (skip any prNumber we already have)
  const existing = await loadAll(siteId);
  const existingPrNumbers = new Set(existing.map(e => e.prNumber).filter(Boolean));

  // Build entries from each PR title
  const newEntries = [];
  for (const pr of prs) {
    if (existingPrNumbers.has(pr.number)) continue;

    let entry = null;
    let m;
    // "SEO: rewrite TYPE for PATH"
    m = pr.title.match(/^SEO: rewrite (\S+) for (\/\S+)$/);
    if (m) {
      const [, contentType, p] = m;
      const def = contentRewritesMap?.[p]?.[contentType];
      entry = {
        page: p, kind: 'rewrite', contentType,
        i18nKeys: def?.i18nKey ? [def.i18nKey] : [],
        prNumber: pr.number, prUrl: pr.html_url,
        merged: true, mergedAt: pr.merged_at,
      };
    }
    // "SEO: rewrite N sections for PATH (a, b, c)"
    if (!entry && (m = pr.title.match(/^SEO: rewrite \d+ sections for (\/\S+) \(([^)]+)\)$/))) {
      const [, p, list] = m;
      const types = list.split(',').map(s => s.trim()).filter(Boolean);
      // Multiple entries — one per contentType
      for (const t of types) {
        const def = contentRewritesMap?.[p]?.[t];
        newEntries.push({
          page: p, kind: 'rewrite', contentType: t,
          i18nKeys: def?.i18nKey ? [def.i18nKey] : [],
          prNumber: pr.number, prUrl: pr.html_url,
          merged: true, mergedAt: pr.merged_at,
        });
      }
      continue;
    }
    // "SEO: add inbound link from SRC to TGT"
    if (!entry && (m = pr.title.match(/^SEO: add inbound link from (\/\S+) to (\/\S+)$/))) {
      const [, src, tgt] = m;
      entry = {
        page: src, kind: 'orphan-fix',
        sourcePage: src, target: tgt,
        prNumber: pr.number, prUrl: pr.html_url,
        merged: true, mergedAt: pr.merged_at,
      };
    }
    // "SEO: auto-rewrite PATH"
    if (!entry && (m = pr.title.match(/^SEO: auto-rewrite (\/\S+)$/))) {
      const [, p] = m;
      entry = {
        page: p, kind: 'auto-rewrite',
        prNumber: pr.number, prUrl: pr.html_url,
        merged: true, mergedAt: pr.merged_at,
      };
    }
    if (entry) {
      entry.loggedAt = new Date().toISOString();
      newEntries.push(entry);
    }
  }

  if (newEntries.length === 0) return { added: 0, total: existing.length };
  const merged = [...existing, ...newEntries];
  await saveAll(siteId, merged);
  return { added: newEntries.length, total: merged.length };
}
