import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';
import { getSearchAnalytics } from '@/lib/gsc';

const BLOB_KEY = 'rank-tracking/latest.json';
const SITE_URL = process.env.GSC_SITE_URL || 'https://www.kotordirectory.com/';

// GET — read rank tracking data
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view'); // changes | summary | null (full)

  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (blobs.length === 0) {
      return NextResponse.json({ success: true, data: null, message: 'No rank tracking data. Run backfill first.' });
    }
    const res = await fetch(blobs[0].url);
    const data = await res.json();

    if (view === 'changes') return NextResponse.json({ success: true, data: data.changes });
    if (view === 'summary') return NextResponse.json({ success: true, data: data.summary });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — update rank tracking (called by cron or manually)
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  // Allow from cron or direct call
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Load existing data
    let existing = { dates: [], keywords: {}, changes: {}, summary: {} };
    try {
      const { blobs } = await list({ prefix: BLOB_KEY });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url);
        existing = await res.json();
      }
    } catch (e) {}

    // Fetch last 5 days of per-keyword daily data from GSC
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2); // GSC data is 2-3 days delayed
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 5);

    const formatDate = (d) => d.toISOString().split('T')[0];
    const rows = await getSearchAnalytics({
      siteUrl: SITE_URL,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      dimensions: ['query', 'date'],
      rowLimit: 25000,
    });

    if (!rows?.length) {
      return NextResponse.json({ success: true, message: 'No new data from GSC', updated: false });
    }

    // Parse rows into date->keyword->metrics
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

    // Merge into existing data
    const dates = [...(existing.dates || [])];
    const keywords = { ...(existing.keywords || {}) };

    // Add new dates
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
        // Pad arrays if needed
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

    // Trim to 90-day window
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

    // Compute stats for each keyword
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

    // Compute changes
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
    movers.sort((a, b) => a.delta - b.delta); // Most improved first
    losers.sort((a, b) => b.delta - a.delta); // Most declined first

    // Summary
    const allPositions = kwList.map(([, d]) => d.latestPosition).filter(Boolean);
    const summary = {
      totalTracked: kwList.length,
      top3Count: allPositions.filter(p => p <= 3).length,
      top10Count: allPositions.filter(p => p <= 10).length,
      top30Count: allPositions.filter(p => p <= 30).length,
      avgPosition: allPositions.length > 0 ? Math.round((allPositions.reduce((a, b) => a + b, 0) / allPositions.length) * 10) / 10 : 0,
    };

    const result = {
      updatedAt: new Date().toISOString(),
      dateRange: { start: dates[0], end: dates[dates.length - 1] },
      dates,
      keywords,
      changes: { movers: movers.slice(0, 20), losers: losers.slice(0, 20) },
      summary,
    };

    // Save to Blob
    await put(BLOB_KEY, JSON.stringify(result), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      updated: true,
      datesAdded: newDates.length,
      keywordsTracked: kwList.length,
      movers: movers.length,
      losers: losers.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
