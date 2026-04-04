'use client';
import ChartWrapper from "@/components/ChartWrapper";
import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import KPICard from '@/components/KPICard';
import Tooltip from '@/components/Tooltip';
import { Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CSSBarChartVertical } from '@/components/CSSBarChart';
import { Smartphone, Monitor, Tablet, TrendingUp, Eye, MousePointer, MapPin } from 'lucide-react';
import PageSpeedCard from '@/components/PageSpeedCard';

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

const DEVICE_COLORS = { MOBILE: '#3b82f6', Mobile: '#3b82f6', DESKTOP: '#22c55e', Desktop: '#22c55e', TABLET: '#f59e0b', Tablet: '#f59e0b' };
const DEVICE_ICONS = { MOBILE: Smartphone, Mobile: Smartphone, DESKTOP: Monitor, Desktop: Monitor, TABLET: Tablet, Tablet: Tablet };

export default function MobilePage() {
  const { analytics, rawData } = useData();
  const [mobileKeywords, setMobileKeywords] = useState([]);
  const [desktopKeywords, setDesktopKeywords] = useState([]);
  const [loading, setLoading] = useState(false);

  const devices = rawData?.devices || [];

  // Fetch mobile vs desktop keyword data
  useEffect(() => {
    try {
      const cached = localStorage.getItem('kotor-mobile-data');
      if (cached) {
        const { mobile, desktop, ts } = JSON.parse(cached);
        if (Date.now() - ts < 86400000 && mobile?.length) {
          setMobileKeywords(mobile);
          setDesktopKeywords(desktop);
          return;
        }
      }
    } catch (e) {}

    setLoading(true);
    Promise.all([
      fetch('/api/gsc/mobile-keywords?device=MOBILE').then(r => r.json()),
      fetch('/api/gsc/mobile-keywords?device=DESKTOP').then(r => r.json()),
    ])
      .then(([m, d]) => {
        if (m.success) setMobileKeywords(m.data || []);
        if (d.success) setDesktopKeywords(d.data || []);
        try {
          localStorage.setItem('kotor-mobile-data', JSON.stringify({
            mobile: m.data || [], desktop: d.data || [], ts: Date.now(),
          }));
        } catch (e) {}
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Compare mobile vs desktop for same keywords
  const comparison = useMemo(() => {
    if (!mobileKeywords.length || !desktopKeywords.length) return [];
    const desktopMap = {};
    desktopKeywords.forEach(k => { desktopMap[k.keyword] = k; });

    return mobileKeywords
      .filter(mk => desktopMap[mk.keyword])
      .map(mk => {
        const dk = desktopMap[mk.keyword];
        return {
          keyword: mk.keyword,
          mobilePos: mk.position,
          desktopPos: dk.position,
          diff: dk.position - mk.position,
          mobileImps: mk.impressions,
          desktopImps: dk.impressions,
          mobileCtr: mk.ctr,
          desktopCtr: dk.ctr,
        };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [mobileKeywords, desktopKeywords]);

  // Mobile-only keywords (rank on mobile but not desktop)
  const mobileOnly = useMemo(() => {
    const desktopSet = new Set(desktopKeywords.map(k => k.keyword));
    return mobileKeywords.filter(k => !desktopSet.has(k.keyword)).sort((a, b) => b.impressions - a.impressions);
  }, [mobileKeywords, desktopKeywords]);

  if (!analytics) return <EmptyState />;

  const mobileDevice = devices.find(d => d.device === 'MOBILE' || d.device === 'Mobile');
  const desktopDevice = devices.find(d => d.device === 'DESKTOP' || d.device === 'Desktop');
  const tabletDevice = devices.find(d => d.device === 'TABLET' || d.device === 'Tablet');

  const totalClicks = devices.reduce((s, d) => s + d.clicks, 0);
  const mobilePct = totalClicks > 0 && mobileDevice ? Math.round(mobileDevice.clicks / totalClicks * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mobile Performance</h1>
        <p className="text-sm text-zinc-500 mt-1">Mobile vs Desktop analysis — critical for tourist search traffic</p>
      </div>

      {/* Device KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Mobile Traffic" value={`${mobilePct}%`} subtitle={`${mobileDevice?.clicks || 0} clicks`} icon={Smartphone} color="blue" tooltip="Percentage of clicks from mobile devices" />
        <KPICard title="Mobile Imps" value={(mobileDevice?.impressions || 0).toLocaleString()} icon={Eye} color="blue" tooltip="Mobile search impressions" />
        <KPICard title="Mobile Avg Pos" value={(mobileDevice?.position || 0).toFixed(1)} icon={MapPin} color="amber" tooltip="Average mobile ranking position" />
        <KPICard title="Mobile CTR" value={`${((mobileDevice?.ctr || 0) * 100).toFixed(1)}%`} icon={MousePointer} color="purple" tooltip="Mobile click-through rate" />
      </div>

      {/* Device Split Chart */}
      {devices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-4">Clicks by Device</h3>
            <ChartWrapper><ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={devices.map(d => ({ name: d.device, value: d.clicks }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {devices.map((d, i) => <Cell key={i} fill={DEVICE_COLORS[d.device] || '#71717a'} />)}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer></ChartWrapper>
            <div className="flex justify-center gap-4 mt-2">
              {devices.map(d => {
                const Icon = DEVICE_ICONS[d.device] || Smartphone;
                return (
                  <div key={d.device} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Icon size={12} style={{ color: DEVICE_COLORS[d.device] }} />
                    {d.device}: {d.clicks} clicks
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-4">Position by Device</h3>
            <div className="flex-1 flex items-center">
              <CSSBarChartVertical data={devices.map(d => ({ name: d.device, position: parseFloat(d.position.toFixed(1)) }))} valueKey="position" labelKey="name" color={(d) => DEVICE_COLORS[d.name] || '#71717a'} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile vs Desktop Position Comparison */}
      {comparison.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Mobile vs Desktop Position Differences</h3>
          <p className="text-xs text-zinc-500 mb-4">Keywords where mobile and desktop rankings differ significantly</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-[#2a2d3a]">
                  <th className="text-left py-2 pr-4">Keyword</th>
                  <th className="text-right py-2 px-2">Mobile Pos</th>
                  <th className="text-right py-2 px-2">Desktop Pos</th>
                  <th className="text-right py-2 px-2">Difference</th>
                  <th className="text-right py-2 pl-2">Mobile Imps</th>
                </tr>
              </thead>
              <tbody>
                {comparison.slice(0, 20).map((k, i) => (
                  <tr key={i} className="border-b border-[#2a2d3a]/50">
                    <td className="py-2 pr-4 text-zinc-300">{k.keyword}</td>
                    <td className="text-right py-2 px-2 text-zinc-400">{k.mobilePos.toFixed(1)}</td>
                    <td className="text-right py-2 px-2 text-zinc-400">{k.desktopPos.toFixed(1)}</td>
                    <td className="text-right py-2 px-2">
                      <span className={`font-medium ${k.diff > 0 ? 'text-green-400' : k.diff < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {k.diff > 0 ? `+${k.diff.toFixed(1)}` : k.diff.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-right py-2 pl-2 text-zinc-500">{k.mobileImps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile-only keywords */}
      {mobileOnly.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-2">Mobile-Only Keywords</h3>
          <p className="text-xs text-zinc-500 mb-4">Keywords that only appear in mobile search results</p>
          <div className="flex flex-wrap gap-2">
            {mobileOnly.slice(0, 20).map((k, i) => (
              <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg px-2 py-1">
                {k.keyword} <span className="text-blue-300">pos {k.position.toFixed(0)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-zinc-500">Fetching mobile vs desktop data...</span>
        </div>
      )}

      {/* Core Web Vitals */}
      <PageSpeedCard />
    </div>
  );
}
