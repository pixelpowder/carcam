import { NextResponse } from 'next/server';
import { getSearchAnalyticsByQuery, getSearchAnalyticsByPage, getSearchAnalyticsByDate, getSearchAnalyticsByDevice, getSearchAnalyticsByCountry, getSearchAnalytics } from '@/lib/gsc';
import { put, list } from '@vercel/blob';

async function readRankTrackingBlob(siteId) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const { blobs } = await list({ prefix: `rank-tracking/${siteId}.json` });
    if (!blobs.length) return null;
    const res = await fetch(blobs[0].url, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

async function updateRankTracking(site) {
  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 5);
    const fmt = (d) => d.toISOString().split('T')[0];

    const rows = await getSearchAnalytics({
      siteUrl: site.gscUrl,
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['query', 'date'],
      rowLimit: 25000,
    });

    if (!rows?.length) return { updated: false, keywords: 0 };

    const existing = (await readRankTrackingBlob(site.id)) || { dates: [], keywords: {}, changes: {}, summary: {} };

    const newData = {};
    rows.forEach(row => {
      const [keyword, date] = row.keys;
      if (!newData[date]) newData[date] = {};
      newData[date][keyword] = { position: row.position, clicks: row.clicks, impressions: row.impressions };
    });

    const dates = [...(existing.dates || [])];
    const keywords = { ...(existing.keywords || {}) };
    const newDates = Object.keys(newData).sort();

    for (const date of newDates) {
      if (!dates.includes(date)) { dates.push(date); dates.sort(); }
      const dateIdx = dates.indexOf(date);
      for (const [kw, metrics] of Object.entries(newData[date])) {
        if (!keywords[kw]) keywords[kw] = { positions: [], clicks: [], impressions: [] };
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

    if (dates.length > 90) {
      const trim = dates.length - 90;
      dates.splice(0, trim);
      for (const kw of Object.keys(keywords)) {
        keywords[kw].positions.splice(0, trim);
        keywords[kw].clicks.splice(0, trim);
        keywords[kw].impressions.splice(0, trim);
      }
    }

    for (const data of Object.values(keywords)) {
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
        ? data.avgPosition7d - (prev7.reduce((a, b) => a + b, 0) / prev7.length) : 0;
    }

    const movers = [], losers = [];
    const kwList = Object.entries(keywords);
    for (const [kw, data] of kwList) {
      if (data.posChange7d && data.posChange7d < -3) movers.push({ keyword: kw, delta: data.posChange7d, position: data.latestPosition });
      if (data.posChange7d && data.posChange7d > 3) losers.push({ keyword: kw, delta: data.posChange7d, position: data.latestPosition });
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

    const result = {
      siteId: site.id,
      updatedAt: new Date().toISOString(),
      dateRange: { start: dates[0], end: dates[dates.length - 1] },
      dates, keywords,
      changes: { movers: movers.slice(0, 20), losers: losers.slice(0, 20) },
      summary,
    };

    await put(`rank-tracking/${site.id}.json`, JSON.stringify(result), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true,
    });

    return { updated: true, keywords: kwList.length, datesAdded: newDates.length };
  } catch (e) {
    return { error: e.message };
  }
}

export const maxDuration = 300;

// Keep in sync with SiteContext.js
const SITES = [
  { id: 'montenegrocarhire', gscUrl: 'https://www.montenegrocarhire.com/' },
  { id: 'tivatcarhire', gscUrl: 'https://www.tivatcarhire.com/' },
  { id: 'budvacarhire', gscUrl: 'https://www.budvacarhire.com/' },
  { id: 'hercegnovicarhire', gscUrl: 'https://www.hercegnovicarhire.com/' },
  { id: 'ulcinjcarhire', gscUrl: 'https://www.ulcinjcarhire.com/' },
  { id: 'kotorcarhire', gscUrl: 'https://www.kotorcarhire.com/' },
  { id: 'podgoricacarhire', gscUrl: 'https://www.podgoricacarhire.com/' },
  { id: 'northernirelandcarhire', gscUrl: 'https://www.northernirelandcarhire.com/' },
  { id: 'kotorcarrental', gscUrl: 'https://www.kotorcarrental.com/' },
];

function classifyKeyword(position, impressions, clicks) {
  if (position <= 1.5 && impressions <= 3 && clicks === 0) return 'monitor';
  if (position <= 3 && clicks > 0) return 'winning';
  if (position <= 3 && impressions >= 5) return 'winning';
  if (position <= 10) return 'optimize';
  if (position <= 30 && impressions >= 3) return 'opportunity';
  if (impressions > 0) return 'future';
  return 'monitor';
}

async function fetchSiteData(site, startDate, endDate) {
  try {
    const params = { siteUrl: site.gscUrl, startDate, endDate };
    const [queries, pages, dates, devices, countries] = await Promise.allSettled([
      getSearchAnalyticsByQuery(params),
      getSearchAnalyticsByPage(params),
      getSearchAnalyticsByDate(params),
      getSearchAnalyticsByDevice(params),
      getSearchAnalyticsByCountry(params),
    ]);

    const q = queries.status === 'fulfilled' ? queries.value : [];
    const p = pages.status === 'fulfilled' ? pages.value : [];
    const d = dates.status === 'fulfilled' ? dates.value : [];
    const dv = devices.status === 'fulfilled' ? devices.value : [];
    const c = countries.status === 'fulfilled' ? countries.value : [];

    const liveKeywords = q.map(row => ({
      keyword: row.keys[0], clicks: row.clicks, impressions: row.impressions,
      ctr: row.ctr, position: row.position,
      status: classifyKeyword(row.position, row.impressions, row.clicks),
      cluster: '', action: '',
    }));
    const livePages = p.map(row => ({
      date: new Date().toISOString().split('T')[0], site: site.id, is28d: true,
      page: row.keys[0], clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position,
    }));
    const liveDates = d.map(row => ({
      date: row.keys[0], site: site.id, is28d: true, keyword: '_daily_total',
      clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position,
    }));

    return {
      clusters: [], network: [], categories: [], metaCrawl: [], submitQueue: [],
      siteKeywords: { [site.id]: liveKeywords },
      dailySnapshots: liveDates, dailyPageSnapshots: livePages, sheetNames: ['live'],
      devices: dv.map(r => ({ device: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      countries: c.map(r => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      pulledAt: new Date().toISOString(),
      keywordCount: liveKeywords.length,
    };
  } catch (e) {
    return { error: e.message, siteId: site.id };
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = new URL(request.url).searchParams.get('manual') === 'true';
  if (!isCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28);
    const fmt = (d) => d.toISOString().split('T')[0];

    const results = {};
    for (const site of SITES) {
      const data = await fetchSiteData(site, fmt(startDate), fmt(endDate));
      const siteResult = {};
      if (data.error) {
        siteResult.gsc = { status: 'error', error: data.error };
      } else {
        try {
          await put(`carcam/${site.id}.json`, JSON.stringify(data), {
            access: 'private', addRandomSuffix: false, allowOverwrite: true,
          });
          siteResult.gsc = { status: 'ok', keywords: data.keywordCount };
        } catch (e) {
          siteResult.gsc = { status: 'blob-error', error: e.message };
        }
      }

      // Also update rank tracking for this site
      const rankResult = await updateRankTracking(site);
      siteResult.rankTracking = rankResult;

      results[site.id] = siteResult;
    }

    // Auto-progress link-prospecting pipeline if one is running
    try {
      const { processChunk, loadState } = await import('@/lib/linkbuilding-pipeline');
      const pState = await loadState();
      if (pState?.status === 'running') {
        const updated = await processChunk(pState);
        results.linkProspecting = { status: updated.status, stage: updated.stage };
      }
    } catch (e) {
      results.linkProspecting = { status: 'error', error: e.message };
    }

    // Sync Gmail Sent folder → mark outreach history entries as 'sent'
    // so the Outreach tab reflects mails you actually sent (not just drafted).
    try {
      const origin = new URL(request.url).origin;
      const r = await fetch(`${origin}/api/linkbuilding/gmail-sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET || ''}` },
      });
      const d = await r.json().catch(() => ({}));
      results.gmailSync = d?.success
        ? { status: 'ok', synced: d.synced || d.updated || 0 }
        : { status: 'error', error: d?.error || `HTTP ${r.status}` };
    } catch (e) {
      results.gmailSync = { status: 'error', error: e.message };
    }

    return NextResponse.json({ success: true, date: fmt(endDate), results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
