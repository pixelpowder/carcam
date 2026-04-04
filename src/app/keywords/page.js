'use client';
import { useState, useMemo, useEffect, useRef } from 'react';

import { useData } from '@/context/DataContext';
import useKeywordHistory from '@/hooks/useKeywordHistory';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { LinkedCluster, LinkedPage } from '@/components/LinkedItems';
// KeywordHeatmap and BumpChart removed for car hire version
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, MousePointer, Eye, Award, Target, MapPin } from 'lucide-react';
import KPICard from '@/components/KPICard';

const STATUS_COLORS = { winning: '#22c55e', optimize: '#f59e0b', opportunity: '#3b82f6', future: '#a855f7', unknown: '#71717a' };
const PAGE_SIZE = 25;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

export default function KeywordsPage() {
  const { analytics, rawData } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clusterFilter, setClusterFilter] = useState('all');
  const [sortBy, setSortBy] = useState('impressions');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const autoSelected = useRef(false);
  const [cannibalization, setCannibalization] = useState([]);
  const [cannLoading, setCannLoading] = useState(false);
  const [showCannibalization, setShowCannibalization] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setSearch(q);
  }, []);

  const kd = rawData?.siteKeywords?.kotordirectory || [];
  const dailySnapshots = rawData?.dailySnapshots || [];

  const statuses = useMemo(() => [...new Set(kd.map(k => k.status).filter(Boolean))], [kd]);
  const clusters = useMemo(() => [...new Set(kd.map(k => k.cluster).filter(Boolean))].sort(), [kd]);

  const filtered = useMemo(() => {
    let items = [...kd];
    if (search) items = items.filter(k => k.keyword.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') items = items.filter(k => k.status === statusFilter);
    if (clusterFilter !== 'all') items = items.filter(k => k.cluster === clusterFilter);
    items.sort((a, b) => {
      const av = a[sortBy] || 0, bv = b[sortBy] || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return items;
  }, [kd, search, statusFilter, clusterFilter, sortBy, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const statusData = useMemo(() => {
    const counts = {};
    kd.forEach(k => { const s = k.status || 'unknown'; counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [kd]);

  // Auto-select first keyword for position history
  useEffect(() => {
    if (!autoSelected.current && filtered.length > 0 && !selectedKeyword) {
      setSelectedKeyword(filtered[0].keyword);
      autoSelected.current = true;
    }
  }, [filtered, selectedKeyword]);

  const { keywordHistory, historyLoading } = useKeywordHistory(selectedKeyword);

  if (!analytics) return <EmptyState />;

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Keyword Tracking</h1>
        <p className="text-sm text-zinc-500 mt-1">{kd.length} keywords tracked for kotordirectory.com</p>
      </div>

      {/* KPI Overview */}
      {(() => {
        const total = kd.length;
        const totalClicks = kd.reduce((s, k) => s + (k.clicks || 0), 0);
        const totalImps = kd.reduce((s, k) => s + (k.impressions || 0), 0);
        const top10 = kd.filter(k => k.position <= 10).length;
        const striking = kd.filter(k => k.position > 10 && k.position <= 20).length;
        const avgPos = total > 0 ? (kd.reduce((s, k) => s + (k.position || 0), 0) / total).toFixed(1) : 0;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard title="Keywords" value={total} icon={Search} color="blue" />
            <KPICard title="Clicks" value={totalClicks.toLocaleString()} icon={MousePointer} color="green" />
            <KPICard title="Impressions" value={totalImps.toLocaleString()} icon={Eye} color="blue" />
            <KPICard title="Top 10" value={top10} icon={Award} color="green" subtitle="Page 1" />
            <KPICard title="Striking Dist" value={striking} icon={Target} color="amber" subtitle="Pos 11-20" />
            <KPICard title="Avg Position" value={avgPos} icon={MapPin} color="purple" />
          </div>
        );
      })()}

      {/* Status breakdown - compact */}
      <div className="flex flex-wrap gap-3">
        {statusData.map(d => (
          <div key={d.name} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name] || '#71717a' }} />
            <span className="text-xs text-zinc-300 font-medium">{d.name}</span>
            <span className="text-xs text-zinc-500">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Position Tracker */}
      {/* KeywordHeatmap removed */}

      {/* Quick Stats + Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>

        </div>
        <div>
          {/* Top Opportunities */}
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Top Opportunities</h3>
            <p className="text-[10px] text-zinc-600 mb-2">High impressions, not yet on page 1</p>
            <div className="space-y-2">
              {kd.filter(k => k.position > 10 && k.position <= 30 && k.impressions >= 3)
                .sort((a, b) => b.impressions - a.impressions)
                .slice(0, 5)
                .map((k, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <span className="text-zinc-300 truncate flex-1 mr-2">{k.keyword}</span>
                    <span className="text-amber-400 font-medium flex-shrink-0">#{Math.round(k.position)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bump Chart — Ranking Changes */}
      {/* BumpChart removed */}

      {/* Cannibalization Detection */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Keyword Cannibalization</h3>
          <button
            onClick={() => {
              if (cannibalization.length > 0) { setShowCannibalization(!showCannibalization); return; }
              setCannLoading(true);
              fetch('/api/gsc/cannibalization?days=28')
                .then(r => r.json())
                .then(d => { if (d.success) setCannibalization(d.data || []); setShowCannibalization(true); })
                .catch(() => {})
                .finally(() => setCannLoading(false));
            }}
            disabled={cannLoading}
            className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            {cannLoading ? 'Scanning...' : showCannibalization ? `${cannibalization.length} found` : 'Scan for Cannibalization'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Detect keywords where multiple pages from your site compete against each other in Google.</p>
        {showCannibalization && (
          cannibalization.length > 0 ? (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#1a1d27]">
                  <tr className="text-zinc-500 border-b border-[#2a2d3a]">
                    <th className="text-left py-2 pr-4">Keyword</th>
                    <th className="text-right py-2 px-2">Pages</th>
                    <th className="text-right py-2 px-2">Imps</th>
                    <th className="text-left py-2 px-2">Severity</th>
                    <th className="text-left py-2 pl-2">Competing Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {cannibalization.slice(0, 30).map((c, i) => (
                    <tr key={i} className="border-b border-[#2a2d3a]/50">
                      <td className="py-2 pr-4 text-zinc-300 font-medium">{c.keyword}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{c.pageCount}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{c.totalImpressions}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${
                          c.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          c.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>{c.severity}</span>
                      </td>
                      <td className="py-2 pl-2 text-zinc-500">
                        <div className="flex flex-wrap gap-1">
                          {c.pages.slice(0, 3).map((p, j) => (
                            <span key={j} className="text-[10px] bg-[#0f1117] rounded px-1.5 py-0.5">#{p.position.toFixed(0)} {p.page.replace('https://www.kotordirectory.com', '').slice(0, 25)}{p.page.length > 50 ? '..' : ''}</span>
                          ))}
                          {c.pages.length > 3 && <span className="text-[10px] text-zinc-600">+{c.pages.length - 3} more</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-4">No cannibalization detected</p>
          )
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-zinc-400 outline-none"
        >
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={clusterFilter}
          onChange={e => { setClusterFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-zinc-400 outline-none"
        >
          <option value="all">All Clusters</option>
          {clusters.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table + Position History side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-3 min-w-0 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Keyword Rankings</h3>
          <span className="text-[10px] text-zinc-600">{filtered.length} keywords · Page {page + 1}/{Math.ceil(filtered.length / PAGE_SIZE)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-[#2a2d3a]">
                <th className="text-left py-3 px-4">Keyword</th>
                <th className="text-right py-3 px-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort('clicks')}>
                  Clicks {sortBy === 'clicks' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort('impressions')}>
                  Imps {sortBy === 'impressions' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort('ctr')}>
                  CTR {sortBy === 'ctr' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-3 cursor-pointer hover:text-zinc-300" onClick={() => toggleSort('position')}>
                  Position {sortBy === 'position' && (sortDir === 'desc' ? '↓' : '↑')}
                </th>
                <th className="text-right py-3 px-3">Status</th>
                <th className="text-left py-3 px-3">Cluster</th>
                <th className="text-left py-3 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((k, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#2a2d3a]/50 cursor-pointer transition-all ${selectedKeyword === k.keyword ? 'bg-blue-500/5' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => setSelectedKeyword(k.keyword)}
                >
                  <td className="py-2.5 px-4 text-white font-medium">{k.keyword}</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{k.clicks}</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{k.impressions}</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{(k.ctr * 100).toFixed(1)}%</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{k.position.toFixed(1)}</td>
                  <td className="text-right py-2.5 px-3"><StatusBadge status={k.status} /></td>
                  <td className="py-2.5 px-3 text-zinc-500 text-xs">{k.cluster || '-'}</td>
                  <td className="py-2.5 px-3 text-zinc-500 text-xs max-w-[150px] truncate">{k.action || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
          <p className="text-xs text-zinc-500">{filtered.length} keywords</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-zinc-400">{page + 1} / {pageCount || 1}</span>
            <button onClick={() => setPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Position History Panel — beside table on desktop */}
      <div className="xl:col-span-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">
          {selectedKeyword ? `Position History` : 'Select a keyword'}
        </h3>
        {selectedKeyword && <p className="text-xs text-blue-400 mb-3 truncate">{selectedKeyword}</p>}
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-zinc-500">Fetching...</span>
          </div>
        ) : keywordHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={keywordHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
              <YAxis reversed tick={{ fill: '#71717a', fontSize: 12 }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="position" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Position" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-600">
            {selectedKeyword ? 'No position data available' : 'Click a keyword in the table to see its position history chart here'}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
