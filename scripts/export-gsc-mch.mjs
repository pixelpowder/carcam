// Pull GSC data for montenegrocarhire.com — 180 days, multiple dimensions
// Writes CSVs into the montenegro-car-hire-next worktree's data/gsc/ folder.
// Run from carcam dir: node scripts/export-gsc-mch.mjs

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleAuth } from 'google-auth-library';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sa = JSON.parse(readFileSync('C:/Users/Pixelpowder/Downloads/kotor-seo-dashboard-e82ee19ee0d1.json', 'utf8'));

const SITE = 'https://www.montenegrocarhire.com/';
const OUT_DIR = 'C:/Users/Pixelpowder/montenegro-car-hire-next/.claude/worktrees/agitated-robinson-bd1b76/data/gsc';

mkdirSync(OUT_DIR, { recursive: true });

const auth = new GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

async function gscPaged(body) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const all = [];
  let startRow = 0;
  const PAGE = 25000;
  while (true) {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, rowLimit: PAGE, startRow }),
      }
    );
    if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const rows = data.rows || [];
    all.push(...rows);
    console.log(`  fetched ${rows.length} (total ${all.length}) for ${body.dimensions.join('+')}`);
    if (rows.length < PAGE) break;
    startRow += PAGE;
    if (startRow > 200000) {
      console.log('  hit safety cap at 200k rows');
      break;
    }
  }
  return all;
}

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, headers, rows) {
  const path = resolve(OUT_DIR, file);
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  writeFileSync(path, lines.join('\n'), 'utf8');
  console.log(`  wrote ${rows.length} rows -> ${path}`);
}

// 180 days, ending 3 days ago (GSC delay)
const endDate = new Date();
endDate.setDate(endDate.getDate() - 3);
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 180);
const fmt = (d) => d.toISOString().split('T')[0];
const startStr = fmt(startDate);
const endStr = fmt(endDate);

console.log(`Date range: ${startStr} -> ${endStr}`);
console.log(`Site: ${SITE}\n`);

console.log('1/3 query+page (the big one)');
const queryPage = await gscPaged({ startDate: startStr, endDate: endStr, dimensions: ['query', 'page'] });
writeCsv(
  'query-page.csv',
  ['query', 'page', 'clicks', 'impressions', 'ctr', 'position'],
  queryPage.map(r => [r.keys[0], r.keys[1], r.clicks, r.impressions, r.ctr.toFixed(4), r.position.toFixed(2)])
);

console.log('\n2/3 page only');
const pages = await gscPaged({ startDate: startStr, endDate: endStr, dimensions: ['page'] });
writeCsv(
  'pages.csv',
  ['page', 'clicks', 'impressions', 'ctr', 'position'],
  pages.map(r => [r.keys[0], r.clicks, r.impressions, r.ctr.toFixed(4), r.position.toFixed(2)])
);

console.log('\n3/3 query only');
const queries = await gscPaged({ startDate: startStr, endDate: endStr, dimensions: ['query'] });
writeCsv(
  'queries.csv',
  ['query', 'clicks', 'impressions', 'ctr', 'position'],
  queries.map(r => [r.keys[0], r.clicks, r.impressions, r.ctr.toFixed(4), r.position.toFixed(2)])
);

writeFileSync(
  resolve(OUT_DIR, '_meta.json'),
  JSON.stringify({ site: SITE, startDate: startStr, endDate: endStr, exportedAt: new Date().toISOString() }, null, 2)
);

console.log('\nDone.');
