import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSearchAnalytics } from '@/lib/gsc';

const SITE_URLS = {
  montenegrocarhire: 'https://www.montenegrocarhire.com/',
  tivatcarhire: 'https://www.tivatcarhire.com/',
  budvacarhire: 'https://www.budvacarhire.com/',
  hercegnovicarhire: 'https://www.hercegnovicarhire.com/',
  ulcinjcarhire: 'https://www.ulcinjcarhire.com/',
  kotorcarhire: 'https://www.kotorcarhire.com/',
  podgoricacarhire: 'https://www.podgoricacarhire.com/',
  northernirelandcarhire: 'https://www.northernirelandcarhire.com/',
  kotorcarrental: 'https://www.kotorcarrental.com/',
};

const blobKey = (siteId) => `rank-tracking/${siteId}.json`;

async function readBlob(siteId) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  // Use list with prefix to find the blob URL, then fetch with auth
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: blobKey(siteId) });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

// GET — read rank tracking data for the active site
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view'); // changes | summary | null (full)
  const siteId = searchParams.get('site') || 'montenegrocarhire';

  try {
    const data = await readBlob(siteId);
    if (!data) {
      return NextResponse.json({ success: true, data: null, message: 'No rank tracking data. Run backfill first.' });
    }

    if (view === 'changes') return NextResponse.json({ success: true, data: data.changes });
    if (view === 'summary') return NextResponse.json({ success: true, data: data.summary });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — update rank tracking for the active site (called by cron or manually)
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site') || 'montenegrocarhire';
    const siteUrl = SITE_URLS[siteId];
    if (!siteUrl) {
      return NextResponse.json({ success: false, error: `Unknown site: ${siteId}` }, { status: 400 });
    }

    // Accept ?days=N to control the lookback window. Default 5 for the
    // nightly incremental update; the Backfill button passes ?days=90 to
    // seed three months of history on first run.
    const requestedDays = parseInt(searchParams.get('days'), 10);
    const lookbackDays = Number.isFinite(requestedDays) && requestedDays > 0
      ? Math.min(requestedDays, 90)
      : 5;

    // Load existing data for this site
    let existing = { dates: [], keywords: {}, changes: {}, summary: {} };
    const loaded = await readBlob(siteId);
    if (loaded) existing = loaded;

    // GSC's searchAnalytics/query caps at 25000 rows per call. A busy site
    // can blow through that in a 90-day window with the query x date pair,
    // so we chunk into 30-day requests and concatenate. Each chunk ends at
    // the day after the next chunk starts so no day is double-counted.
    const formatDate = (d) => d.toISOString().split('T')[0];
    const allRows = [];
    const chunkSize = 30;
    let chunkEnd = new Date();
    chunkEnd.setDate(chunkEnd.getDate() - 2); // GSC delay
    let remaining = lookbackDays;
    while (remaining > 0) {
      const take = Math.min(chunkSize, remaining);
      const chunkStart = new Date(chunkEnd);
      chunkStart.setDate(chunkStart.getDate() - (take - 1));
      const rows = await getSearchAnalytics({
        siteUrl,
        startDate: formatDate(chunkStart),
        endDate: formatDate(chunkEnd),
        dimensions: ['query', 'date'],
        rowLimit: 25000,
      });
      if (rows?.length) allRows.push(...rows);
      // Step the window back by `take` days for the next chunk
      chunkEnd.setDate(chunkEnd.getDate() - take);
      remaining -= take;
    }

    if (!allRows.length) {
      return NextResponse.json({ success: true, message: 'No new data from GSC', updated: false });
    }
    const rows = allRows;

    const newData = {};
    rows.forEach(row => {
      const [keyword, date] = row.keys;
      if (!newData[date]) newData[date] = {};
      newData[date][keyword] = {
        position: row.position,
        clicks: row.clicks,
        impressions: row.impressions,
      };
    });

    const dates = [...(existing.dates || [])];
    const keywords = { ...(existing.keywords || {}) };

    const newDates = Object.keys(newData).sort();
    for (const date of newDates) {
      if (!dates.includes(date)) {
        dates.push(date);
        dates.sort();
      }
      const dateIdx = dates.indexOf(date);

      for (const [kw, metrics] of Object.entries(newData[date])) {
        if (!keywords[kw]) {
          keywords[kw] = { positions: [], clicks: [], impressions: [] };
        }
        while (keywords[kw].positions.length < dateIdx) {
          keywords[kw].positions.push(null);
          keywords[kw].clicks.push(0);
          keywords[kw].impressions.push(0);
        }
        keywords[kw].positions[dateIdx] = metrics.position;
        keywords[kw].clicks[dateIdx] = metrics.clicks;
        keywords[kw].impressions[dateIdx] = metrics.impressions;
      }
    }

    const maxDays = 90;
    if (dates.length > maxDays) {
      const trimCount = dates.length - maxDays;
      dates.splice(0, trimCount);
      for (const kw of Object.keys(keywords)) {
        keywords[kw].positions.splice(0, trimCount);
        keywords[kw].clicks.splice(0, trimCount);
        keywords[kw].impressions.splice(0, trimCount);
      }
    }

    for (const [kw, data] of Object.entries(keywords)) {
      const positions = data.positions.filter(p => p !== null);
      if (positions.length === 0) continue;
      data.latestPosition = positions[positions.length - 1];
      data.bestPosition = Math.min(...positions);
      data.worstPosition = Math.max(...positions);
      const last7 = positions.slice(-7);
      const prev7 = positions.slice(-14, -7);
      data.avgPosition7d = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : null;
      data.avgPosition30d = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
      data.posChange7d = (data.avgPosition7d && prev7.length > 0)
        ? data.avgPosition7d - (prev7.reduce((a, b) => a + b, 0) / prev7.length)
        : 0;
    }

    const movers = [];
    const losers = [];
    const kwList = Object.entries(keywords);
    for (const [kw, data] of kwList) {
      if (data.posChange7d && data.posChange7d < -3) {
        movers.push({ keyword: kw, delta: data.posChange7d, position: data.latestPosition });
      }
      if (data.posChange7d && data.posChange7d > 3) {
        losers.push({ keyword: kw, delta: data.posChange7d, position: data.latestPosition });
      }
    }
    movers.sort((a, b) => a.delta - b.delta);
    losers.sort((a, b) => b.delta - a.delta);

    const allPositions = kwList.map(([, d]) => d.latestPosition).filter(Boolean);
    const summary = {
      totalTracked: kwList.length,
      top3Count: allPositions.filter(p => p <= 3).length,
      top10Count: allPositions.filter(p => p <= 10).length,
      top30Count: allPositions.filter(p => p <= 30).length,
      avgPosition: allPositions.length > 0 ? Math.round((allPositions.reduce((a, b) => a + b, 0) / allPositions.length) * 10) / 10 : 0,
    };

    // Mark this blob as "backfilled" the first time it sees a >= 30 day
    // request so the dashboard's auto-load logic can tell the difference
    // between a sparse 5-day-incremental blob and a properly-seeded one.
    // Preserve any existing backfilledAt so we don't reset it on cron runs.
    const isBackfill = lookbackDays >= 30;
    const backfilledAt = isBackfill
      ? new Date().toISOString()
      : (existing.backfilledAt || null);

    const result = {
      siteId,
      updatedAt: new Date().toISOString(),
      backfilledAt,
      dateRange: { start: dates[0], end: dates[dates.length - 1] },
      dates,
      keywords,
      changes: { movers: movers.slice(0, 20), losers: losers.slice(0, 20) },
      summary,
    };

    await put(blobKey(siteId), JSON.stringify(result), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      siteId,
      updated: true,
      lookbackDays,
      datesAdded: newDates.length,
      keywordsTracked: kwList.length,
      movers: movers.length,
      losers: losers.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 90-day backfills chunk into 3 sequential GSC calls; bump the function
// timeout from the Vercel 10s default so the backfill doesn't get cut off
// mid-chunk on slower GSC responses.
export const maxDuration = 300;
