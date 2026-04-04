'use client';
import { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { getCountryInfo } from '@/lib/countries';
import { LinkedKeyword } from '@/components/LinkedItems';
import CSSBarChart from '@/components/CSSBarChart';
import { Globe, ChevronDown, ChevronUp, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false });

export default function RegionalPage() {
  const { analytics } = useData();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('kotor-regional');
      if (cached) {
        const { data: d, ts } = JSON.parse(cached);
        if (d?.length && Date.now() - ts < 86400000) {
          setData(d);
          const mne = d.find(c => c.country === 'mne' || c.country === 'MNE');
          if (mne) { setSelectedCountry(mne); setExpanded(mne.country); }
          return;
        }
      }
    } catch (e) {}

    setLoading(true);
    fetch('/api/gsc/regional')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setData(d.data);
          // Auto-select Montenegro
          const mne = d.data.find(c => c.country === 'mne' || c.country === 'MNE');
          if (mne) { setSelectedCountry(mne); setExpanded(mne.country); }
          try { localStorage.setItem('kotor-regional', JSON.stringify({ data: d.data, ts: Date.now() })); } catch (e) {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!analytics) return <EmptyState />;

  const chartData = data.slice(0, 10).map(c => {
    const info = getCountryInfo(c.country);
    return { name: `${info.flag} ${info.name}`, impressions: c.totalImps, clicks: c.totalClicks };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Regional Analysis</h1>
        <p className="text-sm text-zinc-500 mt-1">Which countries search for what — understand your audience by region</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-sm text-zinc-400">Fetching regional data from GSC...</span>
        </div>
      )}

      {/* Map + Country Detail side by side */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          <div className="lg:col-span-3 [&>div]:h-full">
            <WorldMap countries={data} onCountryClick={(code) => {
              const country = data.find(c => c.country?.toLowerCase() === code);
              if (country) { setSelectedCountry(country); setExpanded(country.country); }
            }} />
          </div>
          <div className="lg:col-span-2 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 relative overflow-hidden">
            {/* Grid background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative z-10">
            {selectedCountry ? (() => {
              const info = getCountryInfo(selectedCountry.country);
              const ctr = selectedCountry.totalImps > 0 ? (selectedCountry.totalClicks / selectedCountry.totalImps * 100).toFixed(1) : '0';
              return (
                <>
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#2a2d3a]">
                    <span className="text-3xl">{info.flag}</span>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white">{info.name}</h3>
                      <p className="text-xs text-zinc-500">{(selectedCountry.keywords || []).length} keywords tracked</p>
                    </div>
                  </div>
                  {/* Mini KPIs */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-[#0f1117] rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-blue-400">{selectedCountry.totalImps}</p>
                      <p className="text-[9px] text-zinc-600 uppercase">Impressions</p>
                    </div>
                    <div className="bg-[#0f1117] rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-green-400">{selectedCountry.totalClicks}</p>
                      <p className="text-[9px] text-zinc-600 uppercase">Clicks</p>
                    </div>
                    <div className="bg-[#0f1117] rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-amber-400">{ctr}%</p>
                      <p className="text-[9px] text-zinc-600 uppercase">CTR</p>
                    </div>
                  </div>
                  <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Top Keywords</h4>
                  <div className="space-y-0.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                    {(selectedCountry.keywords || []).map((k, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-white/[0.02] transition-all">
                        <LinkedKeyword keyword={k.keyword}><span className="text-zinc-300 truncate">{k.keyword}</span></LinkedKeyword>
                        <div className="flex gap-3 flex-shrink-0">
                          <span className="text-zinc-600">{k.impressions} imps</span>
                          <span className={`font-medium ${k.position <= 10 ? 'text-green-400' : k.position <= 30 ? 'text-amber-400' : 'text-zinc-600'}`}>#{Math.round(k.position)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })() : (
              <div className="flex items-center justify-center h-full text-sm text-zinc-600">
                Click a country on the map to see its keyword data
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Top Countries Chart */}
      {chartData.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Countries by Impressions</h3>
          <CSSBarChart data={chartData} valueKey="impressions" labelKey="name" color="#3b82f6" />
        </div>
      )}

      {/* Country breakdown with top keywords */}
      <div className="space-y-2">
        {data.map((c, i) => {
          const info = getCountryInfo(c.country);
          return (
            <div key={c.country} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === c.country ? null : c.country)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.flag}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{info.name}</p>
                    <p className="text-xs text-zinc-500">{c.totalImps} impressions · {c.totalClicks} clicks · {c.keywords.length} keywords</p>
                  </div>
                </div>
                {expanded === c.country ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
              </button>

              {expanded === c.country && (
                <div className="border-t border-[#2a2d3a] p-4">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Top Keywords from {info.name}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-zinc-500 text-xs border-b border-[#2a2d3a]">
                          <th className="text-left py-2 pr-4">Keyword</th>
                          <th className="text-right py-2 px-2">Clicks</th>
                          <th className="text-right py-2 px-2">Impressions</th>
                          <th className="text-right py-2 px-2">CTR</th>
                          <th className="text-right py-2 pl-2">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.keywords.map((k, j) => (
                          <tr key={j} className="border-b border-[#2a2d3a]/50">
                            <td className="py-2 pr-4"><LinkedKeyword keyword={k.keyword}><span className="text-zinc-300">{k.keyword}</span></LinkedKeyword></td>
                            <td className="text-right py-2 px-2 text-zinc-400">{k.clicks}</td>
                            <td className="text-right py-2 px-2 text-zinc-400">{k.impressions}</td>
                            <td className="text-right py-2 px-2 text-zinc-400">{(k.ctr * 100).toFixed(1)}%</td>
                            <td className="text-right py-2 pl-2 text-zinc-400">{k.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
