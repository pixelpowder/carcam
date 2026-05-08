// Staging queue — accumulates SEO actions across multiple Implement clicks
// so they can ship as ONE PR / ONE Vercel deploy.
//
// Flow:
//   stageAction(siteId, action)  → adds to queue (no GitHub push)
//   listQueue(siteId)            → for UI display
//   removeFromQueue(id)          → drop a single staged item
//   clearQueue(siteId)           → reset
//   shipQueue(siteId)            → one branch + apply all + PR + merge
//
// Storage: internal-links/staging/{siteId}.json (Vercel Blob in prod, fs locally)

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const STAGING_DIR = resolve(process.cwd(), 'data/staging');
const ON_VERCEL = !!process.env.VERCEL;
const FS_WRITABLE = !ON_VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

function fsPath(siteId) {
  if (FS_WRITABLE) try { mkdirSync(STAGING_DIR, { recursive: true }); } catch {}
  return join(STAGING_DIR, `${siteId}.json`);
}
const blobKey = (siteId) => `internal-links/staging/${siteId}.json`;

async function load(siteId) {
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
    } catch (e) { console.error('[staging] load fail:', e.message); return []; }
  }
  try {
    const path = fsPath(siteId);
    if (!existsSync(path)) return [];
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch { return []; }
}

async function save(siteId, items) {
  const payload = JSON.stringify(items, null, 2);
  if (ON_VERCEL) {
    try {
      const { put } = await import('@vercel/blob');
      await put(blobKey(siteId), payload, {
        access: 'private', contentType: 'application/json',
        addRandomSuffix: false, allowOverwrite: true,
      });
    } catch (e) { console.error('[staging] save fail:', e.message); }
    return;
  }
  if (!FS_WRITABLE) return;
  try { writeFileSync(fsPath(siteId), payload, 'utf8'); } catch (e) { console.error('[staging] fs save fail:', e.message); }
}

export async function stageAction(siteId, action) {
  const items = await load(siteId);
  const enriched = { id: randomUUID(), stagedAt: new Date().toISOString(), ...action };
  items.push(enriched);
  await save(siteId, items);
  return enriched;
}

export async function listQueue(siteId) {
  return await load(siteId);
}

export async function removeFromQueue(siteId, id) {
  const items = await load(siteId);
  const next = items.filter(i => i.id !== id);
  await save(siteId, next);
  return next;
}

export async function clearQueue(siteId) {
  await save(siteId, []);
}
