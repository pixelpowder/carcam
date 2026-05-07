// Pull GA4 data for montenegrocarhire (property 393057273) — 90 days
// 1) List events seen (so we know which ones are conversions)
// 2) Page-level metrics: sessions, pageviews, engagedSessions, conversions, key events

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sa = JSON.parse(readFileSync('C:/Users/Pixelpowder/Downloads/kotor-seo-dashboard-e82ee19ee0d1.json', 'utf8'));
const PROPERTY_ID = '535173561';
const OUT_DIR = 'C:/Users/Pixelpowder/montenegro-car-hire-next/.claude/worktrees/agitated-robinson-bd1b76/data/gsc';
mkdirSync(OUT_DIR, { recursive: true });

const auth = new GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

async function ga4(body) {
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  return res.json();
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, headers, rows) {
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  writeFileSync(resolve(OUT_DIR, file), lines.join('\n'), 'utf8');
}

const dateRange = { startDate: '90daysAgo', endDate: 'today' };

console.log(`GA4 property: ${PROPERTY_ID}, 90 days\n`);

// 1) List events seen, with totals
console.log('1/3 events list');
const eventsReport = await ga4({
  dateRanges: [dateRange],
  dimensions: [{ name: 'eventName' }],
  metrics: [{ name: 'eventCount' }, { name: 'sessions' }],
  limit: 200,
});
const events = (eventsReport.rows || []).map(r => ({
  event: r.dimensionValues[0].value,
  count: parseInt(r.metricValues[0].value),
  sessions: parseInt(r.metricValues[1].value),
}));
events.sort((a, b) => b.count - a.count);
writeCsv('ga4-events.csv', ['event', 'count', 'sessions'], events.map(e => [e.event, e.count, e.sessions]));
console.log(`  ${events.length} unique events`);
console.log(`  top 10:`);
for (const e of events.slice(0, 10)) console.log(`    ${e.event.padEnd(30)} count=${e.count}  sessions=${e.sessions}`);

// 2) Page-level metrics — pagePath + sessions, views, engagement, conversions
console.log('\n2/3 per-page metrics');
const pageReport = await ga4({
  dateRanges: [dateRange],
  dimensions: [{ name: 'pagePath' }],
  metrics: [
    { name: 'sessions' },
    { name: 'screenPageViews' },
    { name: 'engagedSessions' },
    { name: 'userEngagementDuration' },
    { name: 'eventCount' },
    { name: 'conversions' },
    { name: 'totalUsers' },
  ],
  orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  limit: 1000,
});
const pageRows = (pageReport.rows || []).map(r => ({
  page: r.dimensionValues[0].value,
  sessions: parseInt(r.metricValues[0].value),
  views: parseInt(r.metricValues[1].value),
  engagedSessions: parseInt(r.metricValues[2].value),
  engagementSec: parseInt(r.metricValues[3].value),
  events: parseInt(r.metricValues[4].value),
  conversions: parseFloat(r.metricValues[5].value),
  users: parseInt(r.metricValues[6].value),
}));
writeCsv('ga4-pages.csv',
  ['page', 'sessions', 'views', 'engagedSessions', 'engagementSec', 'events', 'conversions', 'users'],
  pageRows.map(r => [r.page, r.sessions, r.views, r.engagedSessions, r.engagementSec, r.events, r.conversions, r.users])
);
console.log(`  ${pageRows.length} pages`);

// 3) Per-page key events — break down by event so we can see book-flow events per page
// First: which events look like booking conversions?
const bookingHints = ['book', 'purchase', 'lead', 'submit', 'click_book', 'contact', 'reserve', 'checkout'];
const candidateConvEvents = events.filter(e =>
  bookingHints.some(h => e.event.toLowerCase().includes(h))
);
console.log('\n  candidate conversion events:');
for (const e of candidateConvEvents.slice(0, 10)) console.log(`    ${e.event.padEnd(30)} count=${e.count}`);

console.log('\n3/3 per-page event breakdown (booking-flow events only)');
if (candidateConvEvents.length > 0) {
  const eventNames = candidateConvEvents.slice(0, 15).map(e => e.event);
  const eventReport = await ga4({
    dateRanges: [dateRange],
    dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: eventNames },
      },
    },
    limit: 5000,
  });
  const eventRows = (eventReport.rows || []).map(r => ({
    page: r.dimensionValues[0].value,
    event: r.dimensionValues[1].value,
    count: parseInt(r.metricValues[0].value),
  }));
  writeCsv('ga4-page-events.csv', ['page', 'event', 'count'], eventRows.map(r => [r.page, r.event, r.count]));
  console.log(`  ${eventRows.length} (page, event) rows`);
} else {
  console.log('  No clear booking-flow events found');
}

writeFileSync(resolve(OUT_DIR, '_ga4-meta.json'), JSON.stringify({
  property: PROPERTY_ID,
  range: '90daysAgo to today',
  exportedAt: new Date().toISOString(),
  candidateConvEvents: candidateConvEvents.map(e => e.event),
}, null, 2));

console.log('\nDone.');
