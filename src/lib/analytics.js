const EXPECTED_CTR = [0, 0.317, 0.247, 0.187, 0.136, 0.095, 0.062, 0.042, 0.031, 0.028, 0.025];
const BRAND_TERMS = ['carhire', 'kotor directory', 'kotor dir', 'hercegnovidirectory', 'herceg novi directory'];

function getExpectedCTR(position) {
  const pos = Math.round(position);
  if (pos <= 0) return 0;
  if (pos <= 10) return EXPECTED_CTR[pos];
  return 0.01;
}

function computeVisibilityScore(keywords) {
  if (keywords.length === 0) return 0;
  const totalExpectedCTR = keywords.reduce((sum, k) => sum + getExpectedCTR(k.position), 0);
  return (totalExpectedCTR / keywords.length) * 100;
}

function computeBrandSplit(keywords) {
  const brand = { clicks: 0, impressions: 0, keywords: 0 };
  const nonBrand = { clicks: 0, impressions: 0, keywords: 0 };
  keywords.forEach(k => {
    const kw = k.keyword.toLowerCase();
    const isBrand = BRAND_TERMS.some(t => kw.includes(t));
    const target = isBrand ? brand : nonBrand;
    target.clicks += k.clicks;
    target.impressions += k.impressions;
    target.keywords++;
  });
  return { brand, nonBrand };
}

function computePeriodComparison(dailyTrends) {
  if (dailyTrends.length < 4) return null;
  const mid = Math.floor(dailyTrends.length / 2);
  const prev = dailyTrends.slice(0, mid);
  const curr = dailyTrends.slice(mid);
  const sum = (arr, key) => arr.reduce((s, d) => s + (d[key] || 0), 0);
  const avg = (arr, key) => arr.length > 0 ? sum(arr, key) / arr.length : 0;

  const prevClicks = sum(prev, 'clicks'), currClicks = sum(curr, 'clicks');
  const prevImps = sum(prev, 'impressions'), currImps = sum(curr, 'impressions');
  const prevPos = avg(prev, 'avgPosition'), currPos = avg(curr, 'avgPosition');

  return {
    clicksDelta: prevClicks > 0 ? ((currClicks - prevClicks) / prevClicks) * 100 : 0,
    impressionsDelta: prevImps > 0 ? ((currImps - prevImps) / prevImps) * 100 : 0,
    positionDelta: prevPos - currPos,
    clicksCurr: currClicks,
    clicksPrev: prevClicks,
    impressionsCurr: currImps,
    impressionsPrev: prevImps,
  };
}

function computeShareOfVoice(keywords, clusters) {
  // SoV per cluster: sum of expected CTR for keywords we rank for / total possible
  const sovByCluster = {};
  const uniqueClusters = [...new Set(clusters.map(c => c.cluster))];

  uniqueClusters.forEach(name => {
    const clusterKws = keywords.filter(k => k.cluster && k.cluster.toLowerCase() === name.toLowerCase());
    if (clusterKws.length === 0) { sovByCluster[name] = 0; return; }
    const totalExpectedCTR = clusterKws.reduce((sum, k) => sum + getExpectedCTR(k.position), 0);
    const maxPossibleCTR = clusterKws.length * EXPECTED_CTR[1]; // If all were position 1
    sovByCluster[name] = maxPossibleCTR > 0 ? (totalExpectedCTR / maxPossibleCTR) * 100 : 0;
  });

  // Overall SoV
  const allWithCluster = keywords.filter(k => k.cluster);
  const totalExpected = allWithCluster.reduce((sum, k) => sum + getExpectedCTR(k.position), 0);
  const maxPossible = allWithCluster.length * EXPECTED_CTR[1];
  const overall = maxPossible > 0 ? (totalExpected / maxPossible) * 100 : 0;

  return { overall, byCluster: sovByCluster };
}

function computeTrafficForecast(keywords) {
  // For each keyword, estimate monthly clicks at current position vs if improved
  return keywords
    .filter(k => k.impressions >= 5 && k.position > 3 && k.position <= 30)
    .map(k => {
      const currentCTR = getExpectedCTR(k.position);
      const targetCTR = getExpectedCTR(3); // target position 3
      const monthlyImps = k.impressions * 4; // rough monthly estimate from weekly
      const currentClicks = monthlyImps * currentCTR;
      const potentialClicks = monthlyImps * targetCTR;
      const uplift = potentialClicks - currentClicks;
      return {
        keyword: k.keyword,
        cluster: k.cluster,
        position: k.position,
        impressions: k.impressions,
        currentMonthlyClicks: Math.round(currentClicks),
        potentialMonthlyClicks: Math.round(potentialClicks),
        uplift: Math.round(uplift),
        targetPosition: 3,
      };
    })
    .filter(k => k.uplift > 0)
    .sort((a, b) => b.uplift - a.uplift);
}

export function computeAnalytics(data) {
  if (!data) return null;

  const kd = data.siteKeywords?.carhire || [];
  const allSiteKeywords = Object.values(data.siteKeywords || {}).flat();

  // KPI totals
  const totalClicks = kd.reduce((s, k) => s + k.clicks, 0);
  const totalImpressions = kd.reduce((s, k) => s + k.impressions, 0);
  const avgPosition = kd.length > 0 ? kd.reduce((s, k) => s + k.position, 0) / kd.length : 0;
  const avgCTR = kd.length > 0 ? kd.reduce((s, k) => s + k.ctr, 0) / kd.length : 0;

  // Visibility score
  const visibilityScore = computeVisibilityScore(kd);

  // Brand vs non-brand
  const brandSplit = computeBrandSplit(kd);

  // Position distribution
  const positionBuckets = { top3: 0, top10: 0, top20: 0, beyond20: 0 };
  kd.forEach(k => {
    if (k.position <= 3) positionBuckets.top3++;
    else if (k.position <= 10) positionBuckets.top10++;
    else if (k.position <= 20) positionBuckets.top20++;
    else positionBuckets.beyond20++;
  });

  // Status distribution
  const statusCounts = {};
  kd.forEach(k => {
    const s = k.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // Cluster performance
  const clusterMap = {};
  const uniqueClusters = [...new Set(data.clusters.map(c => c.cluster))];
  uniqueClusters.forEach(name => {
    const listings = data.clusters.filter(c => c.cluster === name);
    const keywords = kd.filter(k => k.cluster && k.cluster.toLowerCase() === name.toLowerCase());
    const networkKw = data.network.filter(n => n.cluster && n.cluster.toLowerCase() === name.toLowerCase());
    const backlinked = listings.filter(l => l.hasBacklink).length;

    clusterMap[name] = {
      name,
      listings,
      listingCount: listings.length,
      backlinkedCount: backlinked,
      keywords,
      keywordCount: keywords.length,
      totalClicks: keywords.reduce((s, k) => s + k.clicks, 0),
      totalImpressions: keywords.reduce((s, k) => s + k.impressions, 0),
      avgPosition: keywords.length > 0 ? keywords.reduce((s, k) => s + k.position, 0) / keywords.length : 999,
      avgCTR: keywords.length > 0 ? keywords.reduce((s, k) => s + k.ctr, 0) / keywords.length : 0,
      networkPositions: networkKw,
      healthScore: computeClusterHealth(keywords, listings),
    };
  });

  // Daily trends (28d sheets only for consistency)
  const dailyTrends = computeDailyTrends(data.dailySnapshots.filter(d => d.is28d && d.site === 'carhire'));
  const dailyPageTrends = computePageTrends(data.dailyPageSnapshots.filter(d => d.is28d && d.site === 'carhire'));

  // HN metrics
  const hnSnapshots = data.dailySnapshots.filter(d => d.site === 'hercegnovidirectory');
  const hnPageSnapshots = data.dailyPageSnapshots.filter(d => d.site === 'hercegnovidirectory');

  // Top movers (compare earliest to latest daily snapshot)
  const movers = computeMovers(data.dailySnapshots.filter(d => d.is28d && d.site === 'carhire'), kd);

  // Network overview
  const networkBySite = {};
  data.network.forEach(n => {
    if (!networkBySite[n.site]) networkBySite[n.site] = { site: n.site, count: 0, avgPosition: 0, keywords: [] };
    networkBySite[n.site].count++;
    networkBySite[n.site].keywords.push(n);
  });
  Object.values(networkBySite).forEach(s => {
    s.avgPosition = s.keywords.length > 0 ? s.keywords.reduce((sum, k) => sum + k.position, 0) / s.keywords.length : 0;
  });

  // Category audit stats
  const catStats = {
    total: data.categories.length,
    metaGood: data.categories.filter(c => (c.metaStatus || '').toUpperCase() === 'GOOD').length,
    metaMissing: data.categories.filter(c => (c.metaStatus || '').toUpperCase() !== 'GOOD').length,
    onPagePresent: data.categories.filter(c => c.onPageDesc && c.onPageDesc.includes('Present')).length,
    onPageMissing: data.categories.filter(c => c.onPageDesc && c.onPageDesc.includes('MISSING')).length,
  };

  // Period comparison
  const periodComparison = computePeriodComparison(dailyTrends);

  // Share of Voice
  const shareOfVoice = computeShareOfVoice(kd, data.clusters);

  // Traffic forecast
  const trafficForecast = computeTrafficForecast(kd);

  return {
    kpi: { totalClicks, totalImpressions, avgPosition, avgCTR, keywordCount: kd.length, clusterCount: uniqueClusters.length, visibilityScore },
    positionBuckets,
    statusCounts,
    clusters: clusterMap,
    dailyTrends,
    dailyPageTrends,
    movers,
    networkBySite,
    catStats,
    hnSnapshots,
    hnPageSnapshots,
    brandSplit,
    periodComparison,
    shareOfVoice,
    trafficForecast,
  };
}

function computeClusterHealth(keywords, listings) {
  if (keywords.length === 0) return 0;
  const avgPos = keywords.reduce((s, k) => s + k.position, 0) / keywords.length;
  const avgCTR = keywords.reduce((s, k) => s + k.ctr, 0) / keywords.length;
  const totalImps = keywords.reduce((s, k) => s + k.impressions, 0);
  const backlinks = listings.filter(l => l.hasBacklink).length;

  let score = 0;
  if (avgPos <= 5) score += 40;
  else if (avgPos <= 10) score += 30;
  else if (avgPos <= 20) score += 20;
  else if (avgPos <= 50) score += 10;

  if (avgCTR > 0.1) score += 20;
  else if (avgCTR > 0.05) score += 15;
  else if (avgCTR > 0.02) score += 10;
  else score += 5;

  if (totalImps > 100) score += 20;
  else if (totalImps > 50) score += 15;
  else if (totalImps > 20) score += 10;
  else score += 5;

  score += Math.min(backlinks * 5, 20);

  return Math.min(score, 100);
}

function computeDailyTrends(snapshots) {
  const byDate = {};
  snapshots.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = { date: s.date, clicks: 0, impressions: 0, keywords: 0, positionSum: 0 };
    byDate[s.date].clicks += s.clicks;
    byDate[s.date].impressions += s.impressions;
    byDate[s.date].keywords++;
    byDate[s.date].positionSum += s.position;
  });
  return Object.values(byDate)
    .map(d => ({ ...d, avgPosition: d.keywords > 0 ? d.positionSum / d.keywords : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computePageTrends(snapshots) {
  const byPage = {};
  snapshots.forEach(s => {
    if (!byPage[s.page]) byPage[s.page] = [];
    byPage[s.page].push(s);
  });
  return byPage;
}

function computeMovers(snapshots, keywords = []) {
  // Try daily snapshot comparison first
  const nonTotal = snapshots.filter(s => s.keyword !== '_daily_total');
  const dates = [...new Set(nonTotal.map(s => s.date))].sort();

  if (dates.length >= 2) {
    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    const earlyMap = {};
    const lateMap = {};
    nonTotal.forEach(s => {
      if (s.date === earliest) earlyMap[s.keyword] = s;
      if (s.date === latest) lateMap[s.keyword] = s;
    });
    const deltas = [];
    for (const kw of Object.keys(lateMap)) {
      if (earlyMap[kw]) {
        deltas.push({
          keyword: kw, oldPosition: earlyMap[kw].position, newPosition: lateMap[kw].position,
          change: earlyMap[kw].position - lateMap[kw].position,
          impressions: lateMap[kw].impressions, clicks: lateMap[kw].clicks,
          status: lateMap[kw].status || '',
        });
      }
    }
    deltas.sort((a, b) => b.change - a.change);
    return {
      gainers: deltas.filter(d => d.change > 0).slice(0, 10),
      losers: deltas.filter(d => d.change < 0).sort((a, b) => a.change - b.change).slice(0, 10),
    };
  }

  // Fallback: generate "highlights" from keyword data
  // Best performers: high impressions, good position
  const highlights = keywords
    .filter(k => k.impressions >= 3 && k.position <= 20)
    .sort((a, b) => (a.position / Math.max(a.impressions, 1)) - (b.position / Math.max(b.impressions, 1)))
    .slice(0, 10)
    .map(k => ({
      keyword: k.keyword, oldPosition: null, newPosition: k.position,
      change: null, impressions: k.impressions, clicks: k.clicks,
      status: k.status, cluster: k.cluster,
    }));

  // At risk: high impressions but poor position
  const atRisk = keywords
    .filter(k => k.impressions >= 5 && k.position > 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map(k => ({
      keyword: k.keyword, oldPosition: null, newPosition: k.position,
      change: null, impressions: k.impressions, clicks: k.clicks,
      status: k.status, cluster: k.cluster,
    }));

  return { gainers: highlights, losers: atRisk, isFallback: true };
}
