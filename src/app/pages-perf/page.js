'use client';
import ChartWrapper from "@/components/ChartWrapper";
import { useState, useMemo, useEffect } from 'react';

import { useData } from '@/context/DataContext';
import { useSite } from '@/context/SiteContext';
import EmptyState from '@/components/EmptyState';
import { LinkedKeyword } from '@/components/LinkedItems';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import CSSBarChart, { CSSBarChartVertical } from '@/components/CSSBarChart';
import { Search, ChevronLeft, ChevronRight, FileText, Globe, Eye, MousePointer, MapPin, FolderOpen, List } from 'lucide-react';
import KPICard from '@/components/KPICard';

const PAGE_SIZE = 20;

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

function classifyPage(url) {
  if (url.includes('/listing-category/')) return 'Category';
  if (url.includes('/listing/')) return 'Listing';
  return 'Site Page';
}

function shortenUrl(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export default function PagesPage() {
  const { analytics, rawData } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('impressions');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [selectedPage, setSelectedPage] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setSearch(q);
  }, []);

  const { activeSite } = useSite();

  // Get the latest page snapshot data (from 28d KD Pages)
  const allPages = useMemo(() => {
    if (!rawData?.dailyPageSnapshots) return [];
    const kdPages = rawData.dailyPageSnapshots.filter(p => p.is28d && p.site === activeSite.id);
    // Get the latest date
    const dates = [...new Set(kdPages.map(p => p.date))].sort();
    const latestDate = dates[dates.length - 1];
    if (!latestDate) return [];
    return kdPages
      .filter(p => p.date === latestDate)
      .map(p => ({
        ...p,
        type: classifyPage(p.page),
        shortUrl: shortenUrl(p.page),
      }));
  }, [rawData]);

  const filtered = useMemo(() => {
    let items = [...allPages];
    if (search) items = items.filter(p => p.page.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') items = items.filter(p => p.type === typeFilter);
    items.sort((a, b) => {
      const av = a[sortBy] || 0, bv = b[sortBy] || 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return items;
  }, [allPages, search, typeFilter, sortBy, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Type distribution
  const typeCounts = useMemo(() => {
    const counts = { Listing: 0, Category: 0, 'Site Page': 0 };
    allPages.forEach(p => counts[p.type] = (counts[p.type] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allPages]);

  // Top 10 pages by impressions for chart
  const topPages = useMemo(() => {
    return [...allPages]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(p => {
        const url = p.shortUrl || p.page || 'unknown';
        return { name: url.length > 45 ? '...' + url.slice(-43) : url, impressions: p.impressions, clicks: p.clicks };
      });
  }, [allPages]);

  // Page history
  const pageHistory = useMemo(() => {
    if (!selectedPage || !rawData?.dailyPageSnapshots) return [];
    return rawData.dailyPageSnapshots
      .filter(p => p.page === selectedPage && p.is28d && p.site === activeSite.id)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(p => ({ date: p.date.slice(5), position: p.position, impressions: p.impressions, clicks: p.clicks }));
  }, [selectedPage, rawData]);

  // Keywords ranking for selected page — fetch from GSC API
  const [pageKeywords, setPageKeywords] = useState([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  useEffect(() => {
    if (!selectedPage) { setPageKeywords([]); return; }
    setKeywordsLoading(true);
    fetch(`/api/gsc/page-keywords?page=${encodeURIComponent(selectedPage)}&days=28`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length) {
          setPageKeywords(data.data);
        } else {
          setPageKeywords([]);
        }
      })
      .catch(() => setPageKeywords([]))
      .finally(() => setKeywordsLoading(false));
  }, [selectedPage]);

  if (!analytics) return <EmptyState />;

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Page Performance</h1>
        <p className="text-sm text-zinc-500 mt-1">{allPages.length} pages tracked in latest snapshot</p>
      </div>

      {/* KPI Overview */}
      {(() => {
        const total = allPages.length;
        const totalImps = allPages.reduce((s, p) => s + (p.impressions || 0), 0);
        const totalClicks = allPages.reduce((s, p) => s + (p.clicks || 0), 0);
        const avgPos = total > 0 ? (allPages.reduce((s, p) => s + (p.position || 0), 0) / total).toFixed(1) : 0;
        const cats = allPages.filter(p => p.type === 'Category').length;
        const listings = allPages.filter(p => p.type === 'Listing').length;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard title="Pages" value={total} icon={FileText} color="blue" />
            <KPICard title="Impressions" value={totalImps.toLocaleString()} icon={Eye} color="blue" />
            <KPICard title="Clicks" value={totalClicks.toLocaleString()} icon={MousePointer} color="green" />
            <KPICard title="Avg Position" value={avgPos} icon={MapPin} color="amber" />
            <KPICard title="Categories" value={cats} icon={FolderOpen} color="purple" />
            <KPICard title="Listings" value={listings} icon={List} color="green" />
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages chart */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top 10 Pages by Impressions</h3>
          <CSSBarChart data={topPages} valueKey="impressions" labelKey="name" color="#3b82f6" />
        </div>

        {/* Page trend or type distribution */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          {selectedPage && pageHistory.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-4">Trend: {shortenUrl(selectedPage)}</h3>
              <ChartWrapper><ResponsiveContainer width="100%" height={250}>
                <LineChart data={pageHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} />
                  <YAxis reversed tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="position" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Position" />
                </LineChart>
              </ResponsiveContainer></ChartWrapper>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-white mb-4">Pages by Type</h3>
              <CSSBarChartVertical data={typeCounts} valueKey="count" labelKey="name" color="#a855f7" />
            </>
          )}
        </div>
      </div>

      {/* Keywords for selected page */}
      {selectedPage && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Keywords ranking for: {shortenUrl(selectedPage)}</h3>
            <button onClick={() => setSelectedPage(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Clear</button>
          </div>
          {keywordsLoading ? (
            <div className="flex items-center py-6 justify-center">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-zinc-500">Fetching keywords from GSC...</span>
            </div>
          ) : pageKeywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-[#2a2d3a]">
                    <th className="text-left py-2 pr-4">Keyword</th>
                    <th className="text-right py-2 px-2">Clicks</th>
                    <th className="text-right py-2 px-2">Impressions</th>
                    <th className="text-right py-2 px-2">CTR</th>
                    <th className="text-right py-2 pl-2">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {pageKeywords.map((k, i) => (
                    <tr key={i} className="border-b border-[#2a2d3a]/50">
                      <td className="py-2 pr-4 text-zinc-300">{k.keyword}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{k.clicks}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{k.impressions}</td>
                      <td className="text-right py-2 px-2 text-zinc-400">{(k.ctr * 100).toFixed(1)}%</td>
                      <td className="text-right py-2 pl-2 text-zinc-400">{k.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 text-center py-4">No keyword data found for this page</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-sm text-zinc-400 outline-none"
        >
          <option value="all">All Types</option>
          <option value="Listing">Listings</option>
          <option value="Category">Categories</option>
          <option value="Site Page">Site Pages</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-[#2a2d3a]">
                <th className="text-left py-3 px-4">Page</th>
                <th className="text-left py-3 px-2">Type</th>
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
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p, i) => (
                <tr
                  key={i}
                  className={`border-b border-[#2a2d3a]/50 cursor-pointer transition-all ${selectedPage === p.page ? 'bg-blue-500/5' : 'hover:bg-white/[0.02]'}`}
                  onClick={() => setSelectedPage(p.page)}
                >
                  <td className="py-2.5 px-4 text-white font-medium max-w-[300px] truncate">{p.shortUrl}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      p.type === 'Listing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      p.type === 'Category' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                    }`}>{p.type}</span>
                  </td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{p.clicks}</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{p.impressions}</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{(p.ctr * 100).toFixed(1)}%</td>
                  <td className="text-right py-2.5 px-3 text-zinc-400">{p.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
          <p className="text-xs text-zinc-500">{filtered.length} pages</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span className="text-xs text-zinc-400">{page + 1} / {pageCount || 1}</span>
            <button onClick={() => setPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
