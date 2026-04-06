'use client';
import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useSite } from '@/context/SiteContext';
import EmptyState from '@/components/EmptyState';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Search, Loader2, Sparkles, Link2, HelpCircle, TrendingUp, ChevronDown, ChevronUp, ExternalLink, FileEdit } from 'lucide-react';

const INTENT_BADGE = {
  informational: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  commercial: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  transactional: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  navigational: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

const SOURCE_BADGE = {
  suggestions: { label: 'Suggestion', color: 'text-blue-400' },
  related: { label: 'Related', color: 'text-purple-400' },
  ideas: { label: 'Idea', color: 'text-amber-400' },
};

function DifficultyBar({ value }) {
  const color = value <= 30 ? 'bg-green-500' : value <= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-16 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function KeywordResearchPage() {
  const { analytics } = useData();
  const { activeSite } = useSite();
  const [seedKeyword, setSeedKeyword] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('volume');
  const [expanded, setExpanded] = useState(null);
  const [contentScore, setContentScore] = useState(null);
  const [scoringKeyword, setScoringKeyword] = useState(null);
  const [editPage, setEditPage] = useState(null);

  // Load cached last query on startup
  useEffect(() => {
    try {
      const cached = localStorage.getItem('kotor-kw-research');
      if (cached) {
        const { seed, results: r, ts } = JSON.parse(cached);
        if (r && Date.now() - ts < 86400000 * 7) {
          setSeedKeyword(seed || '');
          setResults(r);
        }
      }
    } catch (e) {}
  }, []);

  const runResearch = async () => {
    if (!seedKeyword.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/keyword-recommendations?keyword=${encodeURIComponent(seedKeyword.trim())}`);
      const data = await res.json();
      if (data.success) {
        setResults(data);
        try { localStorage.setItem('kotor-kw-research', JSON.stringify({ seed: seedKeyword.trim(), results: data, ts: Date.now() })); } catch (e) {}
      } else {
        setError(data.error || 'Failed to fetch recommendations');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const runContentScore = async (keyword) => {
    setScoringKeyword(keyword);
    setContentScore(null);
    try {
      const res = await fetch('/api/content-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, pageUrl: activeSite.gscUrl.replace(/\/$/, '') }),
      });
      const data = await res.json();
      if (data.success) setContentScore(data);
      else setContentScore({ error: data.error });
    } catch (e) {
      setContentScore({ error: e.message });
    }
    setScoringKeyword(null);
  };

  const filtered = useMemo(() => {
    if (!results?.data) return [];
    let items = [...results.data];
    if (filter === 'suggestions') items = items.filter(k => k.source === 'suggestions');
    if (filter === 'related') items = items.filter(k => k.source === 'related');
    if (filter === 'ideas') items = items.filter(k => k.source === 'ideas');
    if (filter === 'easy') items = items.filter(k => (k.difficulty || 0) <= 30);
    if (filter === 'questions') items = items.filter(k => /^(how|what|where|why|when|which|is|can|do)\b/i.test(k.keyword));

    if (sortBy === 'volume') items.sort((a, b) => b.searchVolume - a.searchVolume);
    if (sortBy === 'difficulty') items.sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
    if (sortBy === 'opportunity') items.sort((a, b) => {
      const scoreA = (a.searchVolume || 0) * (1 - (a.difficulty || 50) / 100);
      const scoreB = (b.searchVolume || 0) * (1 - (b.difficulty || 50) / 100);
      return scoreB - scoreA;
    });

    return items;
  }, [results, filter, sortBy]);

  // Keyword research has its own data source — don't block on analytics

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Keyword Research</h1>
        <p className="text-sm text-zinc-500 mt-1">Discover longtail keywords, related terms, and content opportunities</p>
      </div>

      {/* Hero banner — before results */}
      {!results && !loading && (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Discover Keyword Opportunities</h2>
              <p className="text-sm text-zinc-400 mt-1">Enter a seed keyword to find longtails, related terms, and content gaps via DataForSEO.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { icon: Sparkles, label: 'Keyword Suggestions', color: 'blue' },
              { icon: Link2, label: 'Related Keywords', color: 'purple' },
              { icon: TrendingUp, label: 'Content Scoring', color: 'green' },
            ].map((f, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 bg-${f.color}-500/10 border border-${f.color}-500/20 rounded-lg`}>
                <f.icon size={12} className={`text-${f.color}-400`} />
                <span className={`text-xs text-${f.color}-400`}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={seedKeyword}
            onChange={e => setSeedKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runResearch()}
            placeholder="Enter a seed keyword (e.g. kotor boat tour)..."
            className="w-full pl-9 pr-4 py-3 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
          />
        </div>
        <button
          onClick={runResearch}
          disabled={loading || !seedKeyword.trim()}
          className="flex items-center gap-2 px-6 py-3 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Researching...' : 'Research'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-xs text-red-400">{error}</div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-16">
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-zinc-400">Analyzing &quot;{seedKeyword}&quot; across DataForSEO...</p>
          <p className="text-xs text-zinc-600 mt-1">Fetching suggestions, related terms, and keyword ideas</p>
        </div>
      )}

      {results && !loading && (
        <>
          {results.dataSource && results.dataSource !== 'Montenegro' && (
            <div className="px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px] text-amber-400">
              Data source: {results.dataSource} — Montenegro data unavailable for this keyword
            </div>
          )}
          {/* Summary */}
          {(() => {
            const avgVol = results.data.length > 0 ? Math.round(results.data.reduce((s, k) => s + (k.searchVolume || 0), 0) / results.data.length) : 0;
            const avgDiff = results.data.length > 0 ? Math.round(results.data.reduce((s, k) => s + (k.difficulty || 0), 0) / results.data.length) : 0;
            const easyCount = results.data.filter(k => (k.difficulty || 0) <= 30).length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center"><Search size={14} className="text-zinc-400" /></div>
                    <p className="text-[9px] text-zinc-500 uppercase">Total</p>
                  </div>
                  <p className="text-2xl font-bold text-white"><AnimatedNumber value={results.total} /></p>
                </div>
                <div className="bg-[#1a1d27] border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Sparkles size={14} className="text-blue-400" /></div>
                    <p className="text-[9px] text-zinc-500 uppercase">Suggestions</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400"><AnimatedNumber value={results.suggestions} /></p>
                </div>
                <div className="bg-[#1a1d27] border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center"><Link2 size={14} className="text-purple-400" /></div>
                    <p className="text-[9px] text-zinc-500 uppercase">Related</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-400"><AnimatedNumber value={results.related} /></p>
                </div>
                <div className="bg-[#1a1d27] border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><HelpCircle size={14} className="text-amber-400" /></div>
                    <p className="text-[9px] text-zinc-500 uppercase">Ideas</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-400"><AnimatedNumber value={results.ideas} /></p>
                </div>
                <div className="bg-[#1a1d27] border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp size={14} className="text-green-400" /></div>
                    <p className="text-[9px] text-zinc-500 uppercase">Easy Wins</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{easyCount}</p>
                  <p className="text-[10px] text-zinc-600">KD &lt; 30</p>
                </div>
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[9px] text-zinc-500 uppercase">Avg Difficulty</p>
                  </div>
                  <p className={`text-2xl font-bold ${avgDiff <= 30 ? 'text-green-400' : avgDiff <= 60 ? 'text-amber-400' : 'text-red-400'}`}>{avgDiff}</p>
                  <div className="w-full h-1.5 bg-[#2a2d3a] rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${avgDiff <= 30 ? 'bg-green-500' : avgDiff <= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${avgDiff}%` }} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-zinc-400 outline-none">
              <option value="all">All ({results.total})</option>
              <option value="suggestions">Suggestions ({results.suggestions})</option>
              <option value="related">Related ({results.related})</option>
              <option value="ideas">Ideas ({results.ideas})</option>
              <option value="easy">Easy (KD &lt; 30)</option>
              <option value="questions">Questions</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-zinc-400 outline-none">
              <option value="volume">Sort: Volume</option>
              <option value="difficulty">Sort: Easiest</option>
              <option value="opportunity">Sort: Opportunity</option>
            </select>
          </div>

          {/* Results */}
          <div className="space-y-1.5">
            {filtered.slice(0, 50).map((kw, i) => {
              const src = SOURCE_BADGE[kw.source] || SOURCE_BADGE.ideas;
              const intent = INTENT_BADGE[kw.searchIntent] || {};
              const isExpanded = expanded === i;

              return (
                <div key={i} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : i)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium">{kw.keyword}</p>
                      <p className="text-[10px] text-zinc-500">
                        <span className={`mr-1 ${src.color}`}>{src.label}</span>
                        {kw.searchIntent && (
                          <span className={`px-1 py-0.5 rounded text-[9px] mr-1 border ${intent.bg || ''} ${intent.text || ''} ${intent.border || ''}`}>{kw.searchIntent}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-[10px]">
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">{(kw.searchVolume || 0).toLocaleString()}</p>
                        <p className="text-zinc-600">vol/mo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-zinc-400">{kw.difficulty || '-'}</p>
                        <DifficultyBar value={kw.difficulty || 0} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-green-400">${(kw.cpc || 0).toFixed(2)}</p>
                        <p className="text-zinc-600">CPC</p>
                      </div>
                      {isExpanded ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#2a2d3a] p-4 space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => runContentScore(kw.keyword)}
                          disabled={!!scoringKeyword}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 disabled:opacity-50"
                        >
                          {scoringKeyword === kw.keyword ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                          Content Score
                        </button>
                        <button
                          onClick={() => setSeedKeyword(kw.keyword)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20"
                        >
                          <Search size={12} /> Research This
                        </button>
                      </div>

                      {/* Content Score Results */}
                      {contentScore && !contentScore.error && expanded === i && (
                        <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase">Content Score vs Top {contentScore.competitorCount} Competitors</span>
                            <span className={`text-xl font-bold ${contentScore.totalScore >= 70 ? 'text-green-400' : contentScore.totalScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{contentScore.totalScore}/100</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2 text-center">
                            {Object.entries(contentScore.subscores).map(([key, val]) => (
                              <div key={key}>
                                <p className={`text-sm font-bold ${val >= 70 ? 'text-green-400' : val >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{val}</p>
                                <p className="text-[8px] text-zinc-600 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            Word count: {contentScore.wordCount.ours} (competitors avg {contentScore.wordCount.competitorAvg})
                          </div>
                          {contentScore.missingTerms?.length > 0 && (
                            <div>
                              <p className="text-[9px] text-zinc-500 uppercase mb-1">Missing Terms</p>
                              <div className="flex flex-wrap gap-1">
                                {contentScore.missingTerms.slice(0, 15).map((t, j) => (
                                  <span key={j} className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">{t.term}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {contentScore.missingEntities?.length > 0 && (
                            <div>
                              <p className="text-[9px] text-zinc-500 uppercase mb-1">Missing Entities</p>
                              <div className="flex flex-wrap gap-1">
                                {contentScore.missingEntities.slice(0, 10).map((e, j) => (
                                  <span key={j} className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">{e.entity}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {contentScore?.error && expanded === i && (
                        <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded p-2">{contentScore.error}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Quick Edit Panel — removed for car hire version */}
    </div>
  );
}
