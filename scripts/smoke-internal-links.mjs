// Smoke test for src/lib/internalLinksAnalysis.js — runs the full pipeline
// for Montenegro Car Hire and prints the orphan fix list to stdout.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crawlLinkGraph, aggregateGsc, buildOpportunities, mergeGa4, buildOrphanFixList,
} from '../src/lib/internalLinksAnalysis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync('C:/Users/Pixelpowder/Downloads/kotor-seo-dashboard-e82ee19ee0d1.json', 'utf8'));

const SITE_GSC = 'https://www.montenegrocarhire.com/';
const SITE_ROOT = 'C:/Users/Pixelpowder/montenegro-car-hire-next';
const GA4_PROP = '535173561';

const { GoogleAuth } = await import('google-auth-library');

async function getToken(scope) {
  const auth = new GoogleAuth({
    credentials: { client_email: sa.client_email, private_key: sa.private_key },
    scopes: [scope],
  });
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

async function gscRows(dimensions) {
  const tok = await getToken('https://www.googleapis.com/auth/webmasters.readonly');
  const end = new Date(); end.setDate(end.getDate() - 3);
  const start = new Date(end); start.setDate(start.getDate() - 180);
  const fmt = d => d.toISOString().split('T')[0];
  const all = [];
  let startRow = 0;
  while (true) {
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_GSC)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions, rowLimit: 25000, startRow }),
    });
    if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`);
    const d = await res.json();
    const rows = d.rows || [];
    all.push(...rows);
    if (rows.length < 25000) break;
    startRow += 25000;
  }
  return all;
}

async function ga4Rows() {
  const tok = await getToken('https://www.googleapis.com/auth/analytics.readonly');
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROP}:runReport`, {
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
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return (d.rows || []).map(r => ({
    path: r.dimensionValues[0].value,
    sessions: parseInt(r.metricValues[0].value) || 0,
    views: parseInt(r.metricValues[1].value) || 0,
    engagedSessions: parseInt(r.metricValues[2].value) || 0,
    engagementSec: parseInt(r.metricValues[3].value) || 0,
  }));
}

console.log('Crawling link graph…');
const linkGraph = crawlLinkGraph(SITE_ROOT);
console.log(`  ${linkGraph.graph.length} link instances, ${Object.keys(linkGraph.inboundCounts).length} unique targets\n`);

console.log('Pulling GSC…');
const [pages, queryPages] = await Promise.all([
  gscRows(['page']),
  gscRows(['query', 'page']),
]);
console.log(`  ${pages.length} pages, ${queryPages.length} (query, page) rows\n`);

const aggregated = aggregateGsc({ pages, queryPages }, SITE_GSC);
let opportunities = buildOpportunities(aggregated, linkGraph.inboundCounts);
console.log(`Built ${opportunities.length} opportunities\n`);

console.log('Pulling GA4…');
const ga4 = await ga4Rows();
opportunities = mergeGa4(opportunities, ga4, SITE_GSC);
opportunities.sort((a, b) => b.score - a.score);
console.log(`  layered ${ga4.length} GA4 page rows\n`);

const orphans = buildOrphanFixList(opportunities, linkGraph.edges, SITE_ROOT);
console.log(`Orphan fix list: ${orphans.length} priority targets\n`);

console.log('Top 5:');
for (const o of orphans.slice(0, 5)) {
  console.log(`  [${o.score}] ${o.page} — imp=${o.impressions} inbound=${o.inboundLinks} ga4=${o.ga4Sessions ?? 'n/a'} sec/sess=${o.ga4SecPerSession ?? 0}`);
  console.log(`        topQuery: "${o.topQuery}"`);
  for (const c of o.candidateSources.slice(0, 3)) {
    console.log(`        + link from ${c.sourcePage} (rel=${c.relevance})`);
  }
}

console.log('\nSmoke test passed.');
