'use client';
import ChartWrapper from "@/components/ChartWrapper";
import { useState, useRef, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import KPICard from '@/components/KPICard';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import CSSBarChart from '@/components/CSSBarChart';
import { MousePointer, Eye, MapPin, TrendingUp, TrendingDown, Search, Globe, Target } from 'lucide-react';
import Link from 'next/link';
import DateRangeFilter, { filterByDateRange } from '@/components/DateRangeFilter';
import Tooltip from '@/components/Tooltip';
import Annotations from '@/components/Annotations';
import ExportButton from '@/components/ExportButton';
import { LinkedKeyword } from '@/components/LinkedItems';
import { getCountryInfo } from '@/lib/countries';
import { addBollingerBands } from '@/lib/stats';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const show = payload.filter(p => p.name === 'Impressions' || p.name === 'Clicks');
  return (
    <div className="custom-tooltip" style={{ padding: '4px 8px', fontSize: '10px' }}>
      <p className="text-[9px] text-zinc-500">{label}</p>
      {show.map((p, i) => (
        <p key={i} className="text-[10px]" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const { rawData, analytics } = useData();
  const [dateFilter, setDateFilter] = useState(null);

  if (!analytics || !rawData) return <EmptyState />;

  const kpi = analytics.kpis || {};
  const pc = analytics.periodComparison || {};
  const dayCount = dateFilter?.days || 28;
  const dateRange = dateFilter?.range || '';

  const filteredTrends = dateFilter
    ? filterByDateRange(rawData?.dailySnapshots || [], dateFilter)
    : (rawData?.dailySnapshots || []);

  const lastUpdated = rawData?.dailySnapshots?.[rawData.dailySnapshots.length - 1]?.date;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Overview</h1>
            <p className="text-sm text-zinc-500 mt-1">Search performance at a glance {lastUpdated && <span className="text-zinc-600">· Updated {new Date(lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}</p>
          </div>
          <ExportButton />
        </div>
        <DateRangeFilter dailySnapshots={rawData?.dailySnapshots} onChange={setDateFilter} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total Clicks" value={kpi.totalClicks?.toLocaleString() || 0} icon={MousePointer} color="green" trend={pc?.clicksDelta} tooltip={`Total clicks (${dayCount} days)`} />
        <KPICard title="Impressions" value={kpi.totalImpressions?.toLocaleString() || 0} icon={Eye} color="blue" trend={pc?.impressionsDelta} tooltip={`Total impressions (${dayCount} days)`} />
        <KPICard title="Avg Position" value={kpi.avgPosition?.toFixed(1) || 0} icon={MapPin} color="amber" trend={pc ? -pc.positionDelta : undefined} tooltip="Average ranking position (lower is better)" />
        <KPICard title="Avg CTR" value={`${((kpi.avgCTR || 0) * 100).toFixed(1)}%`} icon={MousePointer} color="purple" tooltip="Average click-through rate" />
        <KPICard title="Keywords" value={kpi.keywordCount || 0} icon={Search} color="blue" tooltip="Keywords your site appears for in Google" />
        <KPICard title="Visibility" value={`${(kpi.visibilityScore || 0).toFixed(1)}%`} icon={Globe} color="purple" tooltip="Search visibility score" />
      </div>

      {/* Daily Trends */}
      {filteredTrends.length > 0 && (() => {
        const trendData = addBollingerBands(filteredTrends, 'impressions', 7, 2);
        return (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Daily Impressions & Clicks ({dayCount} days)</h3>
          <p className="text-xs text-zinc-600 mb-4">Left: impressions (blue) · Right: clicks (green)</p>
          <ChartWrapper><ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fill: '#71717a', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#4ade80', fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" fill="url(#impGrad)" name="Impressions" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="clicks" stroke="#22c55e" fill="url(#clickGrad)" name="Clicks" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer></ChartWrapper>
          <Annotations chartDates={trendData.map(t => t.date)} />
        </div>
        );
      })()}

      {/* Device & Country Split */}
      {(rawData?.devices?.length > 0 || rawData?.countries?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rawData.devices?.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Traffic by Device</h3>
              <ChartWrapper><ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={rawData.devices.map(d => ({ name: d.device, value: d.clicks }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#a855f7" />
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer></ChartWrapper>
              <div className="flex justify-center gap-4 mt-2">
                {rawData.devices.map((d, i) => (
                  <span key={d.device} className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'}`} />
                    {d.device}: {d.clicks}
                  </span>
                ))}
              </div>
            </div>
          )}

          {rawData.countries?.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top Countries</h3>
              <div className="space-y-2">
                {rawData.countries.slice(0, 10).map(c => {
                  const info = getCountryInfo(c.country);
                  const maxClicks = rawData.countries[0]?.clicks || 1;
                  return (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="text-sm w-6">{info?.flag || ''}</span>
                      <span className="text-xs text-zinc-300 w-24 truncate">{info?.name || c.country}</span>
                      <div className="flex-1 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.clicks / maxClicks) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-500 w-16 text-right">{c.clicks} clicks</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keyword Highlights */}
      {analytics.movers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.movers.gainers?.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-green-400" /> Top Gainers</h3>
              <div className="space-y-1.5">
                {analytics.movers.gainers.slice(0, 8).map(kw => (
                  <div key={kw.keyword} className="flex items-center justify-between py-1">
                    <LinkedKeyword keyword={kw.keyword} className="text-xs text-zinc-300 truncate" />
                    <span className="text-[10px] text-green-400 flex-shrink-0">+{kw.change.toFixed(1)} pos</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analytics.movers.losers?.length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingDown size={14} className="text-red-400" /> Top Losers</h3>
              <div className="space-y-1.5">
                {analytics.movers.losers.slice(0, 8).map(kw => (
                  <div key={kw.keyword} className="flex items-center justify-between py-1">
                    <LinkedKeyword keyword={kw.keyword} className="text-xs text-zinc-300 truncate" />
                    <span className="text-[10px] text-red-400 flex-shrink-0">{kw.change.toFixed(1)} pos</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
