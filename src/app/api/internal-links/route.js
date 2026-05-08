import { NextResponse } from 'next/server';
import { getSearchAnalyticsByPage, getSearchAnalyticsByQueryAndPage } from '@/lib/gsc';
import { crawlLinkGraph, aggregateGsc, buildOpportunities, mergeGa4, buildOrphanFixList } from '@/lib/internalLinksAnalysis';
import { crawlLiveSite } from '@/lib/liveSiteCrawler';
import { saveSnapshot, listSnapshots, loadLatestSnapshot, diffAgainst } from '@/lib/internalLinksSnapshots';

// Inline GA4 page-level pull (existing ga4.js doesn't expose page-level engagement metrics)
async function ga4Pages(propertyId, days = 90) {
  if (!propertyId) return [];
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'sessions' }, { name: 'screenPageViews' },
        { name: 'engagedSessions' }, { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 1000,
    }),
  });
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.rows || []).map(r => ({
    path: r.dimensionValues[0].value,
    sessions: parseInt(r.metricValues[0].value) || 0,
    views: parseInt(r.metricValues[1].value) || 0,
    engagedSessions: parseInt(r.metricValues[2].value) || 0,
    engagementSec: parseInt(r.metricValues[3].value) || 0,
  }));
}

// GET — return latest snapshot for the active site (fast, no GSC/GA4 call)
export async function GET(req) {
  try {
    const siteId = new URL(req.url).searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    const latest = await loadLatestSnapshot(siteId);
    if (!latest) return NextResponse.json({ success: true, snapshot: null });
    return NextResponse.json({
      success: true,
      snapshot: latest,
      snapshots: await listSnapshots(siteId),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { siteId, gscUrl, siteRoot, ga4PropertyId, days = 180, saveBaseline = false } = await req.json();
    if (!gscUrl) return NextResponse.json({ error: 'gscUrl required' }, { status: 400 });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const fmt = d => d.toISOString().split('T')[0];

    // 1. GSC pulls
    const [gscPages, gscQueryPages] = await Promise.all([
      getSearchAnalyticsByPage({ siteUrl: gscUrl, startDate: fmt(startDate), endDate: fmt(endDate) }),
      getSearchAnalyticsByQueryAndPage({ siteUrl: gscUrl, startDate: fmt(startDate), endDate: fmt(endDate) }),
    ]);

    // GSC lib returns { keys, clicks, impressions, ctr, position }
    const pages = gscPages.map(p => ({ keys: p.keys, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position }));
    const queryPages = gscQueryPages.map(p => ({ keys: p.keys, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position }));

    // 2. Crawl link graph
    // Strategy: try filesystem first (fast, comprehensive). If that's empty
    // (Vercel deploy or no siteRoot configured), fall back to live-site crawl
    // which works anywhere via sitemap.xml.
    let linkGraph = { graph: [], inboundCounts: {}, outboundCounts: {}, edges: new Set(), anchorTextCounts: {}, source: 'none' };
    if (siteRoot) {
      try { linkGraph = { ...crawlLinkGraph(siteRoot), source: 'fs' }; }
      catch (e) { console.warn('fs crawl failed:', e.message); }
    }
    if (!linkGraph.graph.length && gscUrl) {
      try { linkGraph = await crawlLiveSite(gscUrl); }
      catch (e) { console.warn('live crawl failed:', e.message); }
    }

    // 3. Aggregate + score
    const aggregated = aggregateGsc({ pages, queryPages }, gscUrl);
    let opportunities = buildOpportunities(aggregated, linkGraph.inboundCounts, linkGraph.outboundCounts);

    // 4. Layer GA4
    let ga4Configured = false;
    if (ga4PropertyId) {
      try {
        const ga4Data = await ga4Pages(ga4PropertyId, 90);
        opportunities = mergeGa4(opportunities, ga4Data, gscUrl);
        ga4Configured = true;
      } catch (e) {
        console.warn('GA4 failed:', e.message);
      }
    }
    opportunities.sort((a, b) => b.score - a.score);

    // 5. Orphan fix list
    let orphanFixList = [];
    if (siteRoot) {
      try { orphanFixList = buildOrphanFixList(opportunities, linkGraph.edges, siteRoot, linkGraph.anchorTextCounts); }
      catch (e) { console.warn('orphan list failed:', e.message); }
    }

    // Diff against latest snapshot (if any)
    let baseline = null;
    let diffs = {};
    if (siteId) {
      try {
        baseline = await loadLatestSnapshot(siteId);
        if (baseline) {
          const baseOpps = (baseline.opportunities || []).map(o => ({ ...o, __snapshotDate: baseline.date }));
          diffs = diffAgainst(opportunities, baseOpps);
        }
      } catch (e) { console.warn('snapshot diff failed:', e.message); }
    }

    // Save snapshot if requested
    let savedSnapshot = null;
    if (saveBaseline && siteId) {
      try {
        savedSnapshot = await saveSnapshot(siteId, { opportunities, orphanFixList });
      } catch (e) { console.warn('save snapshot failed:', e.message); }
    }

    return NextResponse.json({
      success: true,
      meta: {
        gscUrl, siteRoot: !!siteRoot, ga4Configured,
        dateRange: { start: fmt(startDate), end: fmt(endDate) },
        totalLinkInstances: linkGraph.graph.length,
        crawlSource: linkGraph.source || 'fs', // 'fs' | 'live' | 'none'
        crawledPages: linkGraph.crawledPages || null,
        baselineDate: baseline?.date || null,
        savedSnapshot: savedSnapshot?.date || null,
        snapshots: siteId ? await listSnapshots(siteId) : [],
      },
      opportunities,
      orphanFixList,
      diffs,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
