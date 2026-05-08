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
// Entry shape:
//   { page, kind: 'rewrite'|'orphan-fix'|'auto-rewrite',
//     contentType?, sourcePage?, i18nKeys?: [...],
//     prNumber, prUrl, merged, mergedAt }
export async function logImplementations(siteId, entries) {
  if (!Array.isArray(entries)) entries = [entries];
  if (entries.length === 0) return;
  const all = await loadAll(siteId);
  const stamped = entries.map(e => ({ ...e, loggedAt: new Date().toISOString() }));
  all.push(...stamped);
  await saveAll(siteId, all);
}

// Return all log entries for a specific page, sorted newest-first.
export async function getLogForPage(siteId, page) {
  const all = await loadAll(siteId);
  return all
    .filter(e => e.page === page)
    .sort((a, b) => (b.loggedAt || '').localeCompare(a.loggedAt || ''));
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
