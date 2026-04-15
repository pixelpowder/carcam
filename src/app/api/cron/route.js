import { NextResponse } from 'next/server';
import { getSearchAnalyticsByQuery, getSearchAnalyticsByPage, getSearchAnalyticsByDate, getSearchAnalyticsByDevice, getSearchAnalyticsByCountry } from '@/lib/gsc';
import { put } from '@vercel/blob';

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
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28);
    const fmt = (d) => d.toISOString().split('T')[0];

    const results = {};
    for (const site of SITES) {
      const data = await fetchSiteData(site, fmt(startDate), fmt(endDate));
      if (data.error) {
        results[site.id] = { status: 'error', error: data.error };
        continue;
      }
      try {
        await put(`carcam/${site.id}.json`, JSON.stringify(data), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
        });
        results[site.id] = { status: 'ok', keywords: data.keywordCount };
      } catch (e) {
        results[site.id] = { status: 'blob-error', error: e.message };
      }
    }

    return NextResponse.json({ success: true, date: fmt(endDate), results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
