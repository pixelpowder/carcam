const BASE_URL = 'https://api.dataforseo.com/v3';

function getAuth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error('DataForSEO credentials not configured');
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

async function dfsRequest(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getRankingsForKeywords(keywords, domain, locationCode = 2499, languageCode = 'en') {
  // SERP regular search for each keyword
  const tasks = keywords.map(kw => ({
    keyword: kw,
    location_code: locationCode, // 2499 = Montenegro
    language_code: languageCode,
    device: 'desktop',
    os: 'windows',
    depth: 100,
  }));

  const data = await dfsRequest('/serp/google/organic/live/advanced', tasks);

  const results = [];
  if (data.tasks) {
    for (const task of data.tasks) {
      if (task.result) {
        for (const result of task.result) {
          const keyword = result.keyword;
          const items = result.items || [];
          const match = items.find(item =>
            item.type === 'organic' && item.url && item.url.includes(domain)
          );
          // Detect SERP features
          const serpFeatures = [...new Set(items.map(item => item.type).filter(t => t && t !== 'organic'))];
          const inFeaturedSnippet = items.some(item =>
            item.type === 'featured_snippet' && item.url && item.url.includes(domain)
          );
          const inLocalPack = items.some(item =>
            item.type === 'local_pack' && JSON.stringify(item).includes(domain)
          );
          results.push({
            keyword,
            position: match ? match.rank_absolute : null,
            url: match ? match.url : null,
            title: match ? match.title : null,
            totalResults: result.se_results_count,
            found: !!match,
            serpFeatures,
            inFeaturedSnippet,
            inLocalPack,
          });
        }
      }
    }
  }
  return results;
}

export async function getKeywordData(keywords, locationCode = 2499, languageCode = 'en') {
  // Keyword search volume and difficulty
  const tasks = [{
    keywords,
    location_code: locationCode,
    language_code: languageCode,
  }];

  const data = await dfsRequest('/keywords_data/google_ads/search_volume/live', tasks);

  const results = [];
  if (data.tasks) {
    for (const task of data.tasks) {
      if (task.result) {
        for (const item of task.result) {
          results.push({
            keyword: item.keyword,
            searchVolume: item.search_volume,
            competition: item.competition,
            competitionIndex: item.competition_index,
            cpc: item.cpc,
            monthlySearches: item.monthly_searches,
          });
        }
      }
    }
  }
  return results;
}

export async function getDomainRankings(domain, locationCode = 2499, languageCode = 'en') {
  // Get all ranked keywords for a domain
  const tasks = [{
    target: domain,
    location_code: locationCode,
    language_code: languageCode,
    limit: 500,
    order_by: ['keyword_data.keyword_info.search_volume,desc'],
  }];

  const data = await dfsRequest('/dataforseo_labs/google/ranked_keywords/live', tasks);

  const results = [];
  if (data.tasks) {
    for (const task of data.tasks) {
      if (task.result) {
        for (const result of task.result) {
          const items = result.items || [];
          for (const item of items) {
            results.push({
              keyword: item.keyword_data?.keyword || '',
              position: item.ranked_serp_element?.serp_item?.rank_absolute || null,
              url: item.ranked_serp_element?.serp_item?.url || '',
              searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
              cpc: item.keyword_data?.keyword_info?.cpc || 0,
              competition: item.keyword_data?.keyword_info?.competition || 0,
              difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty || 0,
            });
          }
        }
      }
    }
  }
  return results;
}

export async function getBacklinksSummary(domain) {
  const data = await dfsRequest('/backlinks/summary/live', [{ target: domain, internal_list_limit: 0 }]);
  const r = data.tasks?.[0]?.result?.[0] || {};
  const attrs = r.referring_links_attributes || {};
  const types = r.referring_links_types || {};
  return {
    totalBacklinks: r.total_backlinks || 0,
    referringDomains: r.referring_domains || 0,
    referringIps: r.referring_ips || 0,
    rank: r.rank || 0,
    brokenBacklinks: r.broken_backlinks || 0,
    // Link attributes (dofollow/nofollow breakdown)
    dofollow: attrs.dofollow || 0,
    nofollow: attrs.nofollow || 0,
    sponsored: attrs.sponsored || 0,
    ugc: attrs.ugc || 0,
    // Link types (anchor/image/redirect)
    anchorLinks: types.anchor || 0,
    imageLinks: types.image || 0,
    redirectLinks: types.redirect || 0,
  };
}

export async function getBacklinksHistory(domain) {
  const data = await dfsRequest('/backlinks/history/live', [{ target: domain }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    date: item.date?.split(' ')[0] || '',
    backlinks: item.backlinks || 0,
    referringDomains: item.referring_domains || 0,
    newBacklinks: item.new_backlinks || 0,
    lostBacklinks: item.lost_backlinks || 0,
    newDomains: item.new_referring_domains || 0,
    lostDomains: item.lost_referring_domains || 0,
  }));
}

export async function getBacklinks(domain, limit = 50) {
  const data = await dfsRequest('/backlinks/backlinks/live', [{
    target: domain,
    limit,
    order_by: ['rank,desc'],
    filters: ['dofollow', '=', true],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    sourceUrl: item.url_from || '',
    sourceDomain: item.domain_from || '',
    targetUrl: item.url_to || '',
    anchor: item.anchor || '',
    rank: item.rank || 0,
    isDofollow: item.dofollow || false,
    firstSeen: item.first_seen || '',
    lastSeen: item.last_seen || '',
  }));
}

export async function getReferringDomains(domain, limit = 50) {
  const data = await dfsRequest('/backlinks/referring_domains/live', [{
    target: domain,
    limit,
    order_by: ['rank,desc'],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    domain: item.domain || '',
    rank: item.rank || 0,
    backlinks: item.backlinks || 0,
    firstSeen: item.first_seen || '',
  }));
}

export async function getDomainIntersection(domain1, domain2, locationCode = 2840, languageCode = 'en') {
  const data = await dfsRequest('/dataforseo_labs/google/domain_intersection/live', [{
    target1: domain1,
    target2: domain2,
    location_code: locationCode,
    language_code: languageCode,
    limit: 200,
    order_by: ['keyword_data.keyword_info.search_volume,desc'],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    keyword: item.keyword_data?.keyword || '',
    searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
    position1: item.intersection_result?.[domain1]?.ranked_serp_element?.serp_item?.rank_absolute || null,
    position2: item.intersection_result?.[domain2]?.ranked_serp_element?.serp_item?.rank_absolute || null,
    url1: item.intersection_result?.[domain1]?.ranked_serp_element?.serp_item?.url || '',
    url2: item.intersection_result?.[domain2]?.ranked_serp_element?.serp_item?.url || '',
  }));
}

export async function getKeywordSuggestions(keyword, locationCode = 2840, languageCode = 'en') {
  const data = await dfsRequest('/dataforseo_labs/google/keyword_suggestions/live', [{
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    limit: 50,
    order_by: ['keyword_info.search_volume,desc'],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    keyword: item.keyword || '',
    searchVolume: item.keyword_info?.search_volume || 0,
    cpc: item.keyword_info?.cpc || 0,
    competition: item.keyword_info?.competition || 0,
    difficulty: item.keyword_properties?.keyword_difficulty || 0,
    searchIntent: item.search_intent_info?.main_intent || '',
  }));
}

export async function getHistoricalSearchVolume(keywords, locationCode = 2840, languageCode = 'en') {
  const data = await dfsRequest('/dataforseo_labs/google/historical_search_volume/live', [{
    keywords,
    location_code: locationCode,
    language_code: languageCode,
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    keyword: item.keyword || '',
    searchVolume: item.keyword_info?.search_volume || 0,
    monthlySearches: item.keyword_info?.monthly_searches || [],
  }));
}

export async function getCompetitors(domain, locationCode = 2840, languageCode = 'en') {
  const tasks = [{
    target: domain,
    location_code: locationCode,
    language_code: languageCode,
    limit: 20,
  }];

  const data = await dfsRequest('/dataforseo_labs/google/competitors_domain/live', tasks);

  const results = [];
  if (data.tasks) {
    for (const task of data.tasks) {
      if (task.result) {
        for (const result of task.result) {
          const items = result.items || [];
          for (const item of items) {
            results.push({
              domain: item.domain || '',
              avgPosition: item.avg_position || 0,
              intersections: item.se_keywords || 0,
              etv: item.estimated_paid_traffic_cost || 0,
            });
          }
        }
      }
    }
  }
  return results;
}

// Related keywords — semantic expansion from SERP relationships
export async function getRelatedKeywords(keyword, locationCode = 2499, languageCode = 'en') {
  const data = await dfsRequest('/dataforseo_labs/google/related_keywords/live', [{
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    depth: 2,
    include_seed_keyword: false,
    include_serp_info: true,
    limit: 100,
    order_by: ['keyword_data.keyword_info.search_volume,desc'],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    keyword: item.keyword_data?.keyword || '',
    searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
    cpc: item.keyword_data?.keyword_info?.cpc || 0,
    competition: item.keyword_data?.keyword_info?.competition || 0,
    difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty || 0,
    searchIntent: item.keyword_data?.search_intent_info?.main_intent || '',
  }));
}

// Keyword ideas — broadest discovery, accepts array of seeds
export async function getKeywordIdeas(keywords, locationCode = 2499, languageCode = 'en') {
  const data = await dfsRequest('/dataforseo_labs/google/keyword_ideas/live', [{
    keywords: Array.isArray(keywords) ? keywords : [keywords],
    location_code: locationCode,
    language_code: languageCode,
    include_serp_info: true,
    limit: 200,
    order_by: ['keyword_info.search_volume,desc'],
  }]);
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map(item => ({
    keyword: item.keyword || '',
    searchVolume: item.keyword_info?.search_volume || 0,
    cpc: item.keyword_info?.cpc || 0,
    competition: item.keyword_info?.competition || 0,
    difficulty: item.keyword_properties?.keyword_difficulty || 0,
    searchIntent: item.search_intent_info?.main_intent || '',
  }));
}

// Bulk keyword difficulty — score up to 1000 keywords
export async function getBulkKeywordDifficulty(keywords, locationCode = 2499, languageCode = 'en') {
  const data = await dfsRequest('/dataforseo_labs/google/bulk_keyword_difficulty/live', [{
    keywords,
    location_code: locationCode,
    language_code: languageCode,
  }]);
  const items = data.tasks?.[0]?.result || [];
  return items.map(item => ({
    keyword: item.keyword || '',
    difficulty: item.keyword_difficulty || 0,
  }));
}

// Backlink gap — domains linking to competitors but not to you
export async function getBacklinkGap(yourDomain, competitorDomains, limit = 100) {
  // Get referring domains for each competitor, then find ones not linking to you
  const [yourDomains, ...competitorResults] = await Promise.all([
    getReferringDomains(yourDomain, 500),
    ...competitorDomains.map(d => getReferringDomains(d, 300)),
  ]);

  const yourDomainSet = new Set(yourDomains.map(d => d.domain.toLowerCase()));

  // Find domains linking to competitors but not to you
  const gap = {};
  competitorDomains.forEach((comp, i) => {
    (competitorResults[i] || []).forEach(ref => {
      const domain = ref.domain.toLowerCase();
      if (!yourDomainSet.has(domain)) {
        if (!gap[domain]) {
          gap[domain] = { domain: ref.domain, rank: ref.rank, linksTo: [], backlinks: ref.backlinks };
        }
        gap[domain].linksTo.push(comp);
        gap[domain].rank = Math.max(gap[domain].rank, ref.rank);
      }
    });
  });

  // Sort by rank (authority) and how many competitors they link to
  return Object.values(gap)
    .sort((a, b) => b.linksTo.length - a.linksTo.length || b.rank - a.rank)
    .slice(0, limit);
}

// Content parsing — extract structured text from a URL
export async function parsePageContent(url) {
  const data = await dfsRequest('/on_page/content_parsing/live', [{ url }]);
  const result = data.tasks?.[0]?.result?.[0]?.items?.[0];
  if (!result) return null;
  return {
    url,
    pageContent: result.page_content,
    wordCount: result.page_content?.plain_text_word_count || 0,
  };
}
