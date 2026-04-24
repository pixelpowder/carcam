'use client';
import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useSite } from '@/context/SiteContext';
import EmptyState from '@/components/EmptyState';
import AnimatedNumber from '@/components/AnimatedNumber';
import { TrendingUp, TrendingDown, RefreshCw, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LinkedRankTracker } from '@/components/LinkedItems';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#f97316'];

export default function RankTrackerPage() {
  const { analytics } = useData();
  const { activeSite } = useSite();
  const [focusKw, setFocusKw] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [chartKeywords, setChartKeywords] = useState([]);

  // Read ?kw= param client-side only (avoids useSearchParams SSR issue)
  useEffect(() => {
    const kw = new URLSearchParams(window.location.search).get('kw');
    if (kw) { setFocusKw(kw); setExpanded(kw); }
  }, []);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/rank-tracking?site=${activeSite.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setData(d.data);
          // If a specific keyword was linked to, isolate it in the chart
          const kw = new URLSearchParams(window.location.search).get('kw');
          if (kw && d.data.keywords?.[kw]) {
            setChartKeywords([kw]);
          } else {
            // Pick 5 keywords with the most data points (densest history) and best position as tiebreaker
            const top = Object.entries(d.data.keywords || {})
              .filter(([, v]) => v.latestPosition)
              .map(([kw, v]) => ({ kw, v, points: (v.positions || []).filter(p => p != null).length }))
              .sort((a, b) => b.points - a.points || a.v.latestPosition - b.v.latestPosition)
              .slice(0, 5)
              .map(o => o.kw);
            setChartKeywords(top);
          }
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [activeSite.id]);

  const [updateError, setUpdateError] = useState(null);
  const runUpdate = async () => {
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/rank-tracking?site=${activeSite.id}`, { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        if (d.updated === false) {
          setUpdateError('No new data from GSC — data may be delayed 2-3 days');
        } else {
          const reload = await fetch(`/api/rank-tracking?site=${activeSite.id}`).then(r => r.json());
          if (reload.success && reload.data) {
            setData(reload.data);
            const top = Object.entries(reload.data.keywords || {})
              .filter(([, v]) => v.latestPosition)
              .sort((a, b) => a[1].latestPosition - b[1].latestPosition)
              .slice(0, 5)
              .map(([kw]) => kw);
            setChartKeywords(top);
          }
        }
      } else {
        setUpdateError(d.error || 'Failed to fetch rank data');
      }
    } catch (e) {
      setUpdateError(e.message);
    }
    setUpdating(false);
  };

  const showAll = () => {
    if (!data) return;
    const top = Object.entries(data.keywords || {})
      .filter(([, v]) => v.latestPosition)
      .map(([kw, v]) => ({ kw, v, points: (v.positions || []).filter(p => p != null).length }))
      .sort((a, b) => b.points - a.points || a.v.latestPosition - b.v.latestPosition)
      .slice(0, 5)
      .map(o => o.kw);
    setChartKeywords(top);
    setFocusKw(null);
  };

  const keywords = useMemo(() => {
    if (!data?.keywords) return [];
    return Object.entries(data.keywords)
      .map(([keyword, d]) => ({ keyword, ...d }))
      .filter(k => k.latestPosition)
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
      <div className="flex flex-col items-center py-16">
        <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Loading rank tracking data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Rank Tracker</h1>
          <p className="text-sm text-zinc-500 mt-1">Track keyword positions over time</p>
        </div>
        <div className="flex flex-col items-center py-16">
          <TrendingUp size={48} className="text-zinc-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Tracking Data Yet</h3>
          <p className="text-sm text-zinc-500 mt-1 mb-4">Click below to seed 90 days of historical position data from GSC.</p>
          <button onClick={runUpdate} disabled={updating}
            className="flex items-center gap-2 px-6 py-3 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-50">
            {updating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {updating ? 'Fetching...' : 'Initialize Rank Tracking'}
          </button>
          {updateError && (
            <p className="text-xs text-red-400 mt-3 max-w-md text-center">{updateError}</p>
          )}
        </div>
      </div>
    );
  }

  const movers = data.changes?.movers || [];
  const losers = data.changes?.losers || [];
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rank Tracker</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {data.dateRange?.start} to {data.dateRange?.end} · Updated {new Date(data.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <button onClick={runUpdate} disabled={updating}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-50">
          {updating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {updating ? 'Updating...' : 'Update'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white"><AnimatedNumber value={summary.avgPosition || 0} decimals={1} /></p>
          <p className="text-[9px] text-zinc-500 uppercase">Avg Position</p>
        </div>
      </div>

      {/* Historical Position Chart */}
      {data.dates?.length > 0 && chartKeywords.length > 0 && (
        <div id="position-chart" className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Position History</h3>
              {focusKw && chartKeywords.length === 1 && (
                <p className="text-[10px] text-blue-400 mt-0.5">
                  Showing: &quot;{focusKw}&quot; —{' '}
                  <button onClick={showAll} className="underline hover:text-blue-300">show top 5</button>
                </p>
              )}
            </div>
            <p className="text-[10px] text-zinc-600">{data.dates.length} days · Click keywords below to toggle</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dates.map((date, idx) => {
                const point = { date: date.slice(5) };
                chartKeywords.forEach(kw => {
                  const kwData = data.keywords[kw];
                  if (kwData?.positions?.[idx] != null) point[kw] = kwData.positions[idx];
                });
                return point;
              })}>
                <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(data.dates.length / 8))} />
                <YAxis reversed domain={['auto', 'auto']} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(val, name) => [`#${val.toFixed(1)}`, name]}
                />
                {chartKeywords.map((kw, i) => (
                  <Line key={kw} type="monotone" dataKey={kw} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }} activeDot={{ r: 5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(data.keywords || {})
              .filter(([, v]) => v.latestPosition)
              .sort((a, b) => a[1].latestPosition - b[1].latestPosition)
              .slice(0, 20)
              .map(([kw], i) => {
                const active = chartKeywords.includes(kw);
                const colorIdx = active ? chartKeywords.indexOf(kw) : 0;
                const hasData = data.keywords[kw]?.positions?.some(p => p != null);
                return (
                  <button key={kw}
                    onClick={() => setChartKeywords(prev =>
                      prev.includes(kw) ? prev.filter(k => k !== kw) : prev.length < 8 ? [...prev, kw] : prev
                    )}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-all ${
                      active
                        ? 'text-white border-current'
                        : 'text-zinc-600 border-[#2a2d3a] hover:text-zinc-400'
                    } ${active && !hasData ? 'opacity-40' : ''}`}
                    style={active ? { color: CHART_COLORS[colorIdx % CHART_COLORS.length], borderColor: CHART_COLORS[colorIdx % CHART_COLORS.length] } : undefined}
                    title={!hasData ? 'No position data in this period' : ''}
                  >
                    {kw.length > 25 ? kw.slice(0, 23) + '..' : kw}
                  </button>
                );
              })}
          </div>
        </div>
      )}

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search keywords..."
            className="w-full pl-9 pr-4 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-zinc-400 outline-none">
          <option value="all">All ({Object.keys(data.keywords || {}).length})</option>
          <option value="top3">Top 3 ({summary.top3Count})</option>
          <option value="top10">Top 10 ({summary.top10Count})</option>
          <option value="top30">Top 30 ({summary.top30Count})</option>
          <option value="improving">Improving</option>
          <option value="declining">Declining</option>
        </select>
      </div>

      {/* Keyword List */}
      <div className="space-y-1.5">
        {keywords.slice(0, 50).map((kw, i) => {
          const isExpanded = expanded === kw.keyword;
          const change = kw.posChange7d || 0;

          return (
            <div key={kw.keyword} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
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
                          <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
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
                        <Area type="monotone" dataKey="position" stroke="#3b82f6" fill={`url(#grad-${i})`} strokeWidth={2} dot={false} />
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
      </div>
    </div>
  );
}
