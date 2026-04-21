'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { MousePointer, Eye, MapPin, Globe, Search, TrendingUp, TrendingDown, ExternalLink, Loader2 } from 'lucide-react';
import ChartWrapper from '@/components/ChartWrapper';
import KPICard from '@/components/KPICard';
import { useSite, SITES as ALL_SITES } from '@/context/SiteContext';
import { getCountryInfo } from '@/lib/countries';

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

export default function PortfolioPage() {
  const { setActiveSite } = useSite();
  const router = useRouter();
  const [siteDataMap, setSiteDataMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(ALL_SITES.map(async s => {
        try {
          const res = await fetch(`/api/site-data?site=${s.id}`);
          if (!res.ok) return [s.id, null];
          const { data } = await res.json();
          return [s.id, data];
        } catch (e) {
          return [s.id, null];
        }
      }));
      const map = {};
      entries.forEach(([id, val]) => { if (val) map[id] = val; });
      setSiteDataMap(map);
      setLoading(false);
    })();
  }, []);

  // Aggregate across all sites
  const portfolio = useMemo(() => {
    const allKeywords = [];
    const dailyTotals = {}; // date -> { clicks, impressions }
    const deviceTotals = {}; // device -> { clicks, impressions }
    const countryTotals = {}; // country -> { clicks, impressions }
    const perSite = [];

    Object.entries(siteDataMap).forEach(([siteId, data]) => {
      const siteConfig = ALL_SITES.find(s => s.id === siteId);
      const kws = Object.values(data.siteKeywords || {}).flat();
      const clicks = kws.reduce((s, k) => s + (k.clicks || 0), 0);
      const impressions = kws.reduce((s, k) => s + (k.impressions || 0), 0);
      const avgPos = kws.length > 0 ? kws.reduce((s, k) => s + (k.position || 0), 0) / kws.length : 0;

      perSite.push({
        id: siteId,
        domain: siteConfig?.domain,
        label: siteConfig?.label,
        keywords: kws.length,
        clicks,
        impressions,
        avgPosition: avgPos,
      });

      allKeywords.push(...kws.map(k => ({ ...k, siteId, domain: siteConfig?.domain })));

      (data.dailySnapshots || []).filter(d => d.is28d).forEach(d => {
        if (!dailyTotals[d.date]) dailyTotals[d.date] = { date: d.date, clicks: 0, impressions: 0 };
        dailyTotals[d.date].clicks += d.clicks || 0;
        dailyTotals[d.date].impressions += d.impressions || 0;
      });

      (data.devices || []).forEach(dv => {
        if (!deviceTotals[dv.device]) deviceTotals[dv.device] = { device: dv.device, clicks: 0, impressions: 0 };
        deviceTotals[dv.device].clicks += dv.clicks || 0;
        deviceTotals[dv.device].impressions += dv.impressions || 0;
      });

      (data.countries || []).forEach(c => {
        if (!countryTotals[c.country]) countryTotals[c.country] = { country: c.country, clicks: 0, impressions: 0 };
        countryTotals[c.country].clicks += c.clicks || 0;
        countryTotals[c.country].impressions += c.impressions || 0;
      });
    });

    const totalClicks = allKeywords.reduce((s, k) => s + (k.clicks || 0), 0);
    const totalImpressions = allKeywords.reduce((s, k) => s + (k.impressions || 0), 0);
    const avgPosition = allKeywords.length > 0 ? allKeywords.reduce((s, k) => s + (k.position || 0), 0) / allKeywords.length : 0;
    const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    const topKeywords = [...allKeywords]
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 10);

    const dailyArr = Object.values(dailyTotals).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalClicks, totalImpressions, avgPosition, avgCTR,
      totalKeywords: allKeywords.length,
      activeSitesCount: perSite.filter(s => s.keywords > 0).length,
      perSite: perSite.sort((a, b) => b.impressions - a.impressions),
      dailyTrends: dailyArr,
      devices: Object.values(deviceTotals),
      countries: Object.values(countryTotals).sort((a, b) => b.impressions - a.impressions),
      topKeywords,
    };
  }, [siteDataMap]);

  const openSite = (siteId) => {
    const siteConfig = ALL_SITES.find(s => s.id === siteId);
    if (siteConfig) {
      setActiveSite(siteConfig);
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  const { totalClicks, totalImpressions, avgPosition, avgCTR, totalKeywords, activeSitesCount, perSite, dailyTrends, devices, countries, topKeywords } = portfolio;
  const deviceClicksTotal = devices.reduce((s, d) => s + d.clicks, 0);
  const useImpressionsForDevice = deviceClicksTotal === 0;
  const deviceMetric = useImpressionsForDevice ? 'impressions' : 'clicks';
  const countryClicksTotal = countries.reduce((s, c) => s + c.clicks, 0);
  const useImpressionsForCountry = countryClicksTotal === 0;
  const countryMetric = useImpressionsForCountry ? 'impressions' : 'clicks';
  const maxCountry = countries[0]?.[countryMetric] || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Combined performance across all {ALL_SITES.length} car hire sites · {activeSitesCount} active with GSC data</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard title="Total Clicks" value={totalClicks.toLocaleString()} icon={MousePointer} color="green" tooltip="Sum across all sites" />
        <KPICard title="Impressions" value={totalImpressions.toLocaleString()} icon={Eye} color="blue" tooltip="Sum across all sites" />
        <KPICard title="Avg Position" value={avgPosition > 0 ? avgPosition.toFixed(1) : '—'} icon={MapPin} color="amber" tooltip="Averaged across all keywords" />
        <KPICard title="Avg CTR" value={`${(avgCTR * 100).toFixed(2)}%`} icon={MousePointer} color="purple" tooltip="Portfolio CTR" />
        <KPICard title="Keywords" value={totalKeywords.toLocaleString()} icon={Search} color="blue" tooltip="Total keywords tracked across sites" />
        <KPICard title="Active Sites" value={`${activeSitesCount}/${ALL_SITES.length}`} icon={Globe} color="purple" tooltip="Sites with GSC data" />
      </div>

      {/* Daily trend */}
      {dailyTrends.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Daily Impressions & Clicks (portfolio)</h3>
          <p className="text-xs text-zinc-600 mb-4">Left: impressions (blue) · Right: clicks (green)</p>
          <ChartWrapper>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTrends}>
                <defs>
                  <linearGradient id="pImpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pClickGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: '#71717a', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#4ade80', fontSize: 11 }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" fill="url(#pImpGrad)" name="Impressions" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="clicks" stroke="#22c55e" fill="url(#pClickGrad)" name="Clicks" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>
      )}

      {/* Per-site breakdown */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-semibold text-white">Per-site breakdown</h3>
          <p className="text-[10px] text-zinc-600 mt-0.5">Click a row to switch to that site&apos;s Overview</p>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-[#0f1117] text-zinc-500">
            <tr>
              <th className="text-left px-5 py-2 font-medium">Site</th>
              <th className="text-right px-5 py-2 font-medium">Keywords</th>
              <th className="text-right px-5 py-2 font-medium">Clicks</th>
              <th className="text-right px-5 py-2 font-medium">Impressions</th>
              <th className="text-right px-5 py-2 font-medium">Avg Position</th>
            </tr>
          </thead>
          <tbody>
            {perSite.map(s => (
              <tr key={s.id} onClick={() => openSite(s.id)} className="border-t border-[#2a2d3a]/50 hover:bg-white/[0.02] cursor-pointer">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{s.label}</span>
                    <span className="text-zinc-600 text-[10px]">{s.domain}</span>
                    <ExternalLink size={10} className="text-zinc-700 group-hover:text-blue-400" />
                  </div>
                </td>
                <td className="text-right px-5 py-2.5 text-zinc-300">{s.keywords.toLocaleString()}</td>
                <td className="text-right px-5 py-2.5 text-zinc-300">{s.clicks.toLocaleString()}</td>
                <td className="text-right px-5 py-2.5 text-zinc-300">{s.impressions.toLocaleString()}</td>
                <td className="text-right px-5 py-2.5 text-zinc-300">{s.avgPosition > 0 ? s.avgPosition.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Devices & Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {devices.length > 0 && (
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Traffic by Device</h3>
            <p className="text-[10px] text-zinc-600 mb-3">{useImpressionsForDevice ? 'Showing impressions' : 'Showing clicks'}</p>
            <ChartWrapper>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={devices.map(d => ({ name: d.device, value: d[deviceMetric] }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#22c55e" />
                    <Cell fill="#a855f7" />
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartWrapper>
            <div className="flex justify-center gap-4 mt-2">
              {devices.map((d, i) => (
                <span key={d.device} className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-purple-500'}`} />
                  {d.device}: {d[deviceMetric]?.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {countries.length > 0 && (
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Top Countries</h3>
            <p className="text-[10px] text-zinc-600 mb-3">{useImpressionsForCountry ? 'By impressions' : 'By clicks'}</p>
            <div className="space-y-2">
              {countries.slice(0, 10).map(c => {
                const info = getCountryInfo(c.country);
                return (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-sm w-6">{info?.flag || ''}</span>
                    <span className="text-xs text-zinc-300 w-24 truncate">{info?.name || c.country}</span>
                    <div className="flex-1 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c[countryMetric] / maxCountry) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-20 text-right">{c[countryMetric]?.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top keywords across portfolio */}
      {topKeywords.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Top Keywords by Impressions (portfolio)</h3>
          <div className="space-y-1.5">
            {topKeywords.map((kw, i) => (
              <div key={`${kw.siteId}-${kw.keyword}-${i}`} className="flex items-center gap-3 py-1.5 border-b border-[#2a2d3a]/30 last:border-0">
                <span className="text-[10px] text-zinc-600 w-6">#{i + 1}</span>
                <span className="text-xs text-zinc-300 flex-1 truncate">{kw.keyword}</span>
                <span className="text-[10px] text-zinc-600 w-32 truncate">{kw.domain}</span>
                <span className="text-[10px] text-zinc-500 w-20 text-right">{kw.impressions?.toLocaleString()} imp</span>
                <span className="text-[10px] text-zinc-500 w-16 text-right">#{kw.position?.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
