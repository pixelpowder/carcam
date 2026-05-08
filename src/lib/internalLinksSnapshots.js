// Snapshot persistence for the Internal Links analysis.
// Storage backend is dual:
//   - Local dev (no VERCEL env): writes JSON files under data/snapshots/{siteId}/
//   - Vercel deploy: writes/reads Vercel Blob keyed `internal-links/{siteId}/{date}.json`
//
// All exported functions are async — callers must `await` them.

import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SNAPSHOTS_DIR = resolve(process.cwd(), 'data/snapshots');
const ON_VERCEL = !!process.env.VERCEL;
const FS_WRITABLE = !ON_VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

function blobKey(siteId, date) {
  return `internal-links/${siteId}/${date}.json`;
}
function blobPrefix(siteId) {
  return `internal-links/${siteId}/`;
}

// ---------- LOCAL FS (dev) ----------

function fsSiteDir(siteId) {
  const dir = join(SNAPSHOTS_DIR, siteId);
  try { mkdirSync(dir, { recursive: true }); }
  catch { /* Read-only fs — caller treats as empty */ }
  return dir;
}

function fsSave(siteId, payload) {
  const date = new Date().toISOString().split('T')[0];
  const file = join(fsSiteDir(siteId), `${date}.json`);
  try {
    writeFileSync(file, JSON.stringify({ date, ...payload }, null, 2), 'utf8');
    return { date, file };
  } catch { return null; }
}

function fsList(siteId) {
  try {
    const dir = fsSiteDir(siteId);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''))
      .sort();
  } catch { return []; }
}

function fsLoad(siteId, date) {
  try {
    const file = join(fsSiteDir(siteId), `${date}.json`);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch { return null; }
}

// ---------- VERCEL BLOB (production) ----------

async function blobSave(siteId, payload) {
  try {
    const { put } = await import('@vercel/blob');
    const date = new Date().toISOString().split('T')[0];
    const key = blobKey(siteId, date);
    // Store is private on this project — matches rank-tracking blob convention.
    await put(key, JSON.stringify({ date, ...payload }, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { date, file: key };
  } catch (e) {
    console.error('[snapshots] blob save failed:', e.message);
    return null;
  }
}

async function blobList(siteId) {
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: blobPrefix(siteId) });
    return blobs
      .map(b => b.pathname.replace(blobPrefix(siteId), '').replace(/\.json$/, ''))
      .filter(Boolean)
      .sort();
  } catch (e) {
    console.error('[snapshots] blob list failed:', e.message);
    return [];
  }
}

async function blobLoad(siteId, date) {
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: blobKey(siteId, date) });
    if (!blobs.length) return null;
    // Private store — pass the read-write token as a Bearer header.
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobs[0].url, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('[snapshots] blob load failed:', e.message);
    return null;
  }
}

// ---------- PUBLIC API (async) ----------

export async function saveSnapshot(siteId, payload) {
  if (ON_VERCEL) return await blobSave(siteId, payload);
  if (!FS_WRITABLE) return null;
  return fsSave(siteId, payload);
}

export async function listSnapshots(siteId) {
  if (ON_VERCEL) return await blobList(siteId);
  return fsList(siteId);
}

export async function loadSnapshot(siteId, date) {
  if (ON_VERCEL) return await blobLoad(siteId, date);
  return fsLoad(siteId, date);
}

export async function loadLatestSnapshot(siteId) {
  const dates = await listSnapshots(siteId);
  if (!dates.length) return null;
  return await loadSnapshot(siteId, dates[dates.length - 1]);
}

// Compare current opportunities against a baseline snapshot.
// Returns per-page deltas keyed by page path.
export function diffAgainst(currentOpportunities, baselineOpportunities) {
  const baseline = new Map(baselineOpportunities.map(o => [o.page, o]));
  const diffs = {};
  for (const cur of currentOpportunities) {
    const base = baseline.get(cur.page);
    if (!base) {
      diffs[cur.page] = { isNew: true };
      continue;
    }
    diffs[cur.page] = {
      impressionsDelta: (cur.impressions || 0) - (base.impressions || 0),
      clicksDelta: (cur.clicks || 0) - (base.clicks || 0),
      positionDelta: base.topQueryPosition && cur.topQueryPosition
        ? cur.topQueryPosition - base.topQueryPosition
        : null,
      inboundLinksDelta: (cur.inboundLinks || 0) - (base.inboundLinks || 0),
      baselineDate: base.__snapshotDate,
      baselineTopQuery: base.topQuery,
      baselinePosition: base.topQueryPosition,
    };
  }
  return diffs;
}
