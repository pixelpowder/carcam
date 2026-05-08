// Snapshot persistence for the Internal Links analysis.
// Stores one JSON file per (site, ISO date) under data/snapshots/{siteId}/.
// Used to measure position improvement after internal-link changes.

import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SNAPSHOTS_DIR = resolve(process.cwd(), 'data/snapshots');
// Vercel's /var/task is read-only; we silently no-op there. Snapshots are
// machine-local until a persistent backend (Vercel Blob, S3, etc.) is wired in.
const FS_WRITABLE = !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME;

function siteDir(siteId) {
  const dir = join(SNAPSHOTS_DIR, siteId);
  if (!FS_WRITABLE) return dir; // caller will check existsSync before using
  try { mkdirSync(dir, { recursive: true }); }
  catch { /* Read-only fs (serverless) — caller treats as empty */ }
  return dir;
}

export function saveSnapshot(siteId, payload) {
  if (!FS_WRITABLE) return null;
  const date = new Date().toISOString().split('T')[0];
  const file = join(siteDir(siteId), `${date}.json`);
  try {
    writeFileSync(file, JSON.stringify({ date, ...payload }, null, 2), 'utf8');
    return { date, file };
  } catch { return null; }
}

export function listSnapshots(siteId) {
  try {
    const dir = siteDir(siteId);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''))
      .sort();
  } catch { return []; }
}

export function loadSnapshot(siteId, date) {
  try {
    const file = join(siteDir(siteId), `${date}.json`);
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch { return null; }
}

export function loadLatestSnapshot(siteId) {
  const dates = listSnapshots(siteId);
  if (!dates.length) return null;
  return loadSnapshot(siteId, dates[dates.length - 1]);
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
      // Position delta: NEGATIVE is good (lower number = better rank)
      // We compare top-query positions (the metric that matters for the orphan fix work)
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
