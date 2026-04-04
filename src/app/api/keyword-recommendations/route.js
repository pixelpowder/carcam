import { NextResponse } from 'next/server';
import { getKeywordSuggestions, getRelatedKeywords, getKeywordIdeas } from '@/lib/dataforseo';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const type = searchParams.get('type') || 'all'; // all | suggestions | related | ideas
  const location = parseInt(searchParams.get('location') || '2499'); // Montenegro

  if (!keyword) {
    return NextResponse.json({ success: false, error: 'Keyword is required' }, { status: 400 });
  }

  try {
    const results = {};

    // Try Montenegro first, fall back to global (USA) if no results
    const locations = [location, 2840];

    for (const loc of locations) {
      if (type === 'all' || type === 'suggestions') {
        if (!results.suggestions?.length) {
          results.suggestions = await getKeywordSuggestions(keyword, loc).catch(() => []);
        }
      }
      if (type === 'all' || type === 'related') {
        if (!results.related?.length) {
          results.related = await getRelatedKeywords(keyword, loc).catch(() => []);
        }
      }
      if (type === 'all' || type === 'ideas') {
        if (!results.ideas?.length) {
          results.ideas = await getKeywordIdeas(keyword, loc).catch(() => []);
        }
      }
      // If we got results from Montenegro, no need to try US
      if ((results.suggestions?.length || 0) + (results.related?.length || 0) + (results.ideas?.length || 0) > 0) break;
    }

    // Deduplicate across all sources
    const seen = new Set();
    const all = [];
    ['suggestions', 'related', 'ideas'].forEach(source => {
      (results[source] || []).forEach(kw => {
        if (!seen.has(kw.keyword)) {
          seen.add(kw.keyword);
          all.push({ ...kw, source });
        }
      });
    });

    // Sort by search volume
    all.sort((a, b) => b.searchVolume - a.searchVolume);

    // Track which location provided data
    const dataSource = all.length > 0 && location === 2499 ? 'Montenegro' : all.length > 0 ? 'Global (US fallback)' : 'None';

    return NextResponse.json({
      success: true,
      seed: keyword,
      total: all.length,
      suggestions: results.suggestions?.length || 0,
      related: results.related?.length || 0,
      ideas: results.ideas?.length || 0,
      dataSource,
      data: all,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
