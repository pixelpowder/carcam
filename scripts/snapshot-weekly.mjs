// Weekly snapshot job — runs the full Internal Links analysis for MCH
// and saves the result to carcam/data/snapshots/{siteId}/{ISO-date}.json.
// Designed to be invoked by Windows Task Scheduler. No carcam dev server required.
//
// Manual run:  node scripts/snapshot-weekly.mjs
// Output appended to: carcam/data/snapshots/_log.txt

import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';
import {
  crawlLinkGraph, aggregateGsc, buildOpportunities, mergeGa4, buildOrphanFixList,
} from '../src/lib/internalLinksAnalysis.js';
import { saveSnapshot } from '../src/lib/internalLinksSnapshots.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOG_DIR = resolve(ROOT, 'data/snapshots');
mkdirSync(LOG_DIR, { recursive: true });

// IMPORTANT: process.cwd() must be carcam/ when saveSnapshot runs (the snapshots
// lib resolves paths relative to cwd). Force it.
process.chdir(ROOT);

const KEYFILE = 'C:/Users/Pixelpowder/Downloads/kotor-seo-dashboard-e82ee19ee0d1.json';
const SITES = [
  {
    id: 'montenegrocarhire',
    label: 'Montenegro Car Hire',
    gscUrl: 'https://www.montenegrocarhire.com/',
    siteRoot: 'C:/Users/Pixelpowder/montenegro-car-hire-next',
    ga4PropertyId: '535173561',
  },
];

const sa = JSON.parse(readFileSync(KEYFILE, 'utf8'));

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(resolve(LOG_DIR, '_log.txt'), line);
}

async function getToken(scope) {
  const auth = new GoogleAuth({
    credentials: { client_email: sa.client_email, private_key: sa.private_key },
    scopes: [scope],
  });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function gscPaged(siteUrl, dimensions, days = 180) {
  const tok = await getToken('https://www.googleapis.com/auth/webmasters.readonly');
  const end = new Date(); end.setDate(end.getDate() - 3);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const fmt = d => d.toISOString().split('T')[0];
  const all = [];
  let startRow = 0;
  while (true) {
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions, rowLimit: 25000, startRow }),
    });
    if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`);
    const d = await res.json();
    const rows = d.rows || [];
    all.push(...rows);
    if (rows.length < 25000 || startRow > 200000) break;
    startRow += 25000;
  }
  return all;
}

async function ga4Pages(propertyId) {
  if (!propertyId) return [];
  const tok = await getToken('https://www.googleapis.com/auth/analytics.readonly');
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'engagedSessions' }, { name: 'userEngagementDuration' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 1000,
    }),
  });
  if (!res.ok) {
    log(`  GA4 unavailable: ${res.status}`);
    return [];
  }
  const d = await res.json();
  return (d.rows || []).map(r => ({
    path: r.dimensionValues[0].value,
    sessions: parseInt(r.metricValues[0].value) || 0,
    views: parseInt(r.metricValues[1].value) || 0,
    engagedSessions: parseInt(r.metricValues[2].value) || 0,
    engagementSec: parseInt(r.metricValues[3].value) || 0,
  }));
}

async function snapshotSite(site) {
  log(`Site: ${site.label}`);
  const linkGraph = site.siteRoot ? crawlLinkGraph(site.siteRoot) : { graph: [], inboundCounts: {}, edges: new Set() };
  log(`  link graph: ${linkGraph.graph.length} instances, ${Object.keys(linkGraph.inboundCounts).length} targets`);

  const [pages, queryPages] = await Promise.all([
    gscPaged(site.gscUrl, ['page']),
    gscPaged(site.gscUrl, ['query', 'page']),
  ]);
  log(`  GSC: ${pages.length} pages, ${queryPages.length} (query, page) rows`);

  const aggregated = aggregateGsc({ pages, queryPages }, site.gscUrl);
  let opportunities = buildOpportunities(aggregated, linkGraph.inboundCounts);

  const ga4 = await ga4Pages(site.ga4PropertyId);
  if (ga4.length) {
    opportunities = mergeGa4(opportunities, ga4, site.gscUrl);
    log(`  GA4: ${ga4.length} pages layered`);
  }
  opportunities.sort((a, b) => b.score - a.score);

  const orphanFixList = site.siteRoot ? buildOrphanFixList(opportunities, linkGraph.edges, site.siteRoot) : [];
  const saved = await saveSnapshot(site.id, { opportunities, orphanFixList });
  log(`  saved snapshot ${saved.date} → ${saved.file}`);
  return saved;
}

(async () => {
  log(`=== weekly snapshot run (${SITES.length} site${SITES.length === 1 ? '' : 's'}) ===`);
  for (const site of SITES) {
    try { await snapshotSite(site); }
    catch (e) { log(`  ERROR: ${e.message}`); }
  }
  log('done\n');
})();
