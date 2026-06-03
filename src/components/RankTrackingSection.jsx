'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSite } from '@/context/SiteContext';
import AnimatedNumber from '@/components/AnimatedNumber';
import { TrendingUp, TrendingDown, RefreshCw, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LinkedRankTracker } from '@/components/LinkedItems';
import KeywordPositionTable, { isJunkKeyword } from '@/components/KeywordPositionTable';

// Merged rank-tracking view: KPIs + Top-20 table + Movers/Losers + the
// full searchable, expandable per-keyword history list. Lives on the
// Overview now; /rank-tracker route just redirects here.
export default function RankTrackingSection() {
  const { activeSite } = useSite();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const listRef = useRef(null);

  // Honour ?kw= deep-link: auto-expand that keyword and scroll into view
  useEffect(() => {
    const kw = new URLSearchParams(window.location.search).get('kw');
    if (kw) setExpanded(kw);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/rank-tracking?site=${activeSite.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d?.data || null); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSite.id]);

  // After data loads and an expanded keyword exists, scroll its row into view
  useEffect(() => {
    if (!data || !expanded) return;
    const el = document.getElementById(`tracked-kw-${encodeURIComponent(expanded)}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [data, expanded]);

  const runUpdate = async () => {
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/rank-tracking?site=${activeSite.id}`, { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        if (d.updated === false) {
          setUpdateError('No new data from GSC, data may be delayed 2-3 days');
        } else {
          const reload = await fetch(`/api/rank-tracking?site=${activeSite.id}`).then(r => r.json());
          if (reload.success && reload.data) setData(reload.data);
        }
      } else {
        setUpdateError(d.error || 'Failed to fetch rank data');
      }
    } catch (e) {
      setUpdateError(e.message);
    }
    setUpdating(false);
  };

  const keywords = useMemo(() => {
    if (!data?.keywords) return [];
    return Object.entries(data.keywords)
      .map(([keyword, d]) => ({ keyword, ...d }))
      .filter(k => k.latestPosition)
      .filter(k => !isJunkKeyword(k.keyword))
      .filter(k => !search || k.keyword.toLowerCase().includes(search.toLowerCase()))
      .filter(k => {
        if (filter === 'top3') return k.latestPosition <= 3;
        if (filter === 'top10') return k.latestPosition <= 10;
        if (filter === 'top30') return k.latestPosition <= 30;
        if (filter === 'improving') return (k.posChange7d || 0) < -1;
        if (filter === 'declining') return (k.posChange7d || 0) > 1;
        return true;
      })
      .sort((a, b) => a.latestPosition - b.latestPosition);
  }, [data, search, filter]);

  if (loading) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          Loading rank tracking...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-8 flex flex-col items-center text-center">
        <TrendingUp size={36} className="text-zinc-600 mb-3" />
        <h3 className="text-base font-semibold text-white">No rank tracking data yet</h3>
        <p className="text-xs text-zinc-500 mt-1 mb-4">Seed 90 days of historical position data from GSC. This runs nightly after the first seed.</p>
        <button onClick={runUpdate} disabled={updating}
          className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-50">
          {updating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {updating ? 'Fetching...' : 'Initialize Rank Tracking'}
        </button>
        {updateError && <p className="text-xs text-red-400 mt-3 max-w-md">{updateError}</p>}
      </div>
    );
  }

  const summary = data.summary || {};
  const movers = (data.changes?.movers || []).filter(m => !isJunkKeyword(m.keyword));
  const losers = (data.changes?.losers || []).filter(l => !isJunkKeyword(l.keyword));

  return (
    <div className="space-y-6">
      {/* Rank KPIs strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white"><AnimatedNumber value={summary.totalTracked || 0} /></p>
          <p className="text-[9px] text-zinc-500 uppercase">Tracked</p>
        </div>
        <div className="bg-[#1a1d27] border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400"><AnimatedNumber value={summary.top3Count || 0} /></p>
          <p className="text-[9px] text-zinc-500 uppercase">Top 3</p>
        </div>
        <div className="bg-[#1a1d27] border border-blue-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400"><AnimatedNumber value={summary.top10Count || 0} /></p>
          <p className="text-[9px] text-zinc-500 uppercase">Top 10</p>
        </div>
        <div className="bg-[#1a1d27] border border-amber-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400"><AnimatedNumber value={summary.top30Count || 0} /></p>
          <p className="text-[9px] text-zinc-500 uppercase">Top 30</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center relative">
          <button onClick={runUpdate} disabled={updating}
            className="absolute top-2 right-2 text-zinc-600 hover:text-blue-400 disabled:opacity-50"
            title="Refresh rank tracking from GSC">
            {updating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
          <p className="text-2xl font-bold text-white"><AnimatedNumber value={summary.avgPosition || 0} decimals={1} /></p>
          <p className="text-[9px] text-zinc-500 uppercase">Avg Position</p>
        </div>
      </div>
      {updateError && <p className="text-xs text-red-400 -mt-3">{updateError}</p>}

      {/* Top 20 table */}
      <KeywordPositionTable data={data} defaultSort="position" linkFullTracker={false} />

      {/* Movers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1a1d27] border border-green-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2"><TrendingUp size={14} /> Top Movers (7d)</h3>
          {movers.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No significant improvements this period</p>
          ) : (
            <div className="space-y-1">
              {movers.slice(0, 8).map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-xs">
                  <span className="text-green-400 font-bold w-12 text-right">{m.delta > 0 ? '+' : ''}{m.delta.toFixed(1)}</span>
                  <LinkedRankTracker keyword={m.keyword} showIcon>
                    <span className="text-white truncate flex-1">{m.keyword}</span>
                  </LinkedRankTracker>
                  <span className="text-zinc-500">#{m.position?.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#1a1d27] border border-red-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2"><TrendingDown size={14} /> Top Losers (7d)</h3>
          {losers.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No significant declines this period</p>
          ) : (
            <div className="space-y-1">
              {losers.slice(0, 8).map((l, i) => (
                <div key={i} className="flex items-center gap-2 py-1 text-xs">
                  <span className="text-red-400 font-bold w-12 text-right">+{l.delta.toFixed(1)}</span>
                  <LinkedRankTracker keyword={l.keyword} showIcon>
                    <span className="text-white truncate flex-1">{l.keyword}</span>
                  </LinkedRankTracker>
                  <span className="text-zinc-500">#{l.position?.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All tracked keywords: search + filter */}
      <div ref={listRef} className="space-y-3" id="tracked-list">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-white">All Tracked Keywords</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search keywords..."
                className="pl-8 pr-3 py-1.5 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white placeholder-zinc-600 outline-none focus:border-blue-500/50 w-56"
              />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="px-2 py-1.5 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-zinc-400 outline-none">
              <option value="all">All ({keywords.length})</option>
              <option value="top3">Top 3 ({summary.top3Count})</option>
              <option value="top10">Top 10 ({summary.top10Count})</option>
              <option value="top30">Top 30 ({summary.top30Count})</option>
              <option value="improving">Improving</option>
              <option value="declining">Declining</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          {keywords.slice(0, 50).map((kw, i) => {
            const isExpanded = expanded === kw.keyword;
            const change = kw.posChange7d || 0;

            return (
              <div
                key={kw.keyword}
                id={`tracked-kw-${encodeURIComponent(kw.keyword)}`}
                className={`bg-[#1a1d27] border rounded-xl overflow-hidden ${isExpanded ? 'border-blue-500/30' : 'border-[#2a2d3a]'}`}
              >
                <button onClick={() => setExpanded(isExpanded ? null : kw.keyword)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.02]">
                  <span className={`text-lg font-bold w-10 text-center ${kw.latestPosition <= 3 ? 'text-green-400' : kw.latestPosition <= 10 ? 'text-blue-400' : kw.latestPosition <= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                    #{kw.latestPosition?.toFixed(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{kw.keyword}</p>
                    <p className="text-[10px] text-zinc-500">
                      Best: #{kw.bestPosition?.toFixed(0)} · 7d avg: #{kw.avgPosition7d?.toFixed(1)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-bold ${change < -1 ? 'text-green-400' : change > 1 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {change < 0 ? '' : '+'}{change.toFixed(1)}
                    </span>
                    {isExpanded ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#2a2d3a] p-4">
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={(data.dates || []).map((date, idx) => ({
                          date: date.slice(5),
                          position: kw.positions?.[idx] ?? null,
                        })).filter(d => d.position !== null)}>
                          <defs>
                            <linearGradient id={`grad-tracked-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis reversed domain={['auto', 'auto']} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                          <Tooltip
                            contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 12 }}
                            labelStyle={{ color: '#a1a1aa' }}
                            formatter={(val) => [`#${val.toFixed(1)}`, 'Position']}
                          />
                          <Area type="monotone" dataKey="position" stroke="#3b82f6" fill={`url(#grad-tracked-${i})`} strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3 text-center text-[10px]">
                      <div>
                        <p className="text-sm font-bold text-green-400">#{kw.bestPosition?.toFixed(0)}</p>
                        <p className="text-zinc-600">Best</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-400">#{kw.worstPosition?.toFixed(0)}</p>
                        <p className="text-zinc-600">Worst</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">#{kw.avgPosition7d?.toFixed(1)}</p>
                        <p className="text-zinc-600">7d Avg</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">#{kw.avgPosition30d?.toFixed(1)}</p>
                        <p className="text-zinc-600">30d Avg</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {keywords.length > 50 && (
            <p className="text-[10px] text-zinc-600 text-center pt-2">
              Showing 50 of {keywords.length}. Use search to narrow.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
