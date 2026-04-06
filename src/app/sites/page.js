'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ExternalLink, RefreshCw, CheckCircle2, XCircle, Loader2, Clock, Check, Database } from 'lucide-react';
import { useSite, SITES as ALL_SITES } from '@/context/SiteContext';

export default function SitesPage() {
  const { activeSite, setActiveSite } = useSite();
  const router = useRouter();
  const [sites, setSites] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sites/status');
      const data = await res.json();
      setSites(data.sites);
      setCheckedAt(data.checkedAt);
    } catch (e) {
      console.error('Failed to fetch site status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Check which sites have cached GSC data
  const [gscStatus, setGscStatus] = useState({});
  useEffect(() => {
    const status = {};
    ALL_SITES.forEach(s => {
      try {
        const cached = localStorage.getItem(`carcam-data-${s.id}`);
        const updated = localStorage.getItem(`carcam-updated-${s.id}`);
        if (cached) {
          const data = JSON.parse(cached);
          const kwCount = Object.values(data.siteKeywords || {}).flat().length;
          status[s.id] = { hasData: kwCount > 0, keywords: kwCount, lastUpdated: updated };
        }
      } catch (e) {}
    });
    setGscStatus(status);
  }, []);

  const upCount = sites?.filter(s => s.status === 'up').length || 0;
  const totalCount = sites?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe size={24} className="text-blue-400" />
            Sites
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {sites ? `${upCount}/${totalCount} sites online` : 'Checking status...'}
            {checkedAt && (
              <span className="text-zinc-600"> · Checked {new Date(checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 border border-[#2a2d3a] rounded-lg hover:text-zinc-200 hover:border-zinc-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status summary bar */}
      {sites && (
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-[#2a2d3a]">
          {sites.map(site => (
            <div
              key={site.id}
              className="flex-1 transition-all duration-500"
              style={{ backgroundColor: site.status === 'up' ? '#22c55e' : '#ef4444' }}
              title={`${site.name}: ${site.status}`}
            />
          ))}
        </div>
      )}

      {/* Sites grid */}
      {!sites && loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites?.map(site => {
            const siteConfig = ALL_SITES.find(s => s.id === site.id || s.domain === site.domain);
            const isActive = siteConfig && activeSite.id === siteConfig.id;
            return (
            <div
              key={site.id}
              onClick={() => {
                if (siteConfig) {
                  setActiveSite(siteConfig);
                  router.push('/');
                }
              }}
              className={`bg-[#1a1d27] border rounded-xl p-5 transition-colors cursor-pointer group ${
                isActive ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-[#2a2d3a] hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: site.status === 'up' ? '#22c55e' : '#ef4444' }}
                  />
                  <h3 className="text-sm font-semibold text-white">{site.name}</h3>
                  {isActive && <Check size={12} className="text-blue-400" />}
                </div>
                <a
                  href={`https://${site.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-zinc-600 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              <p className="text-xs text-zinc-500 font-mono mb-3">{site.domain}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {site.status === 'up' ? (
                    <CheckCircle2 size={12} className="text-green-400" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                  <span className={`text-[10px] font-medium ${site.status === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {site.status === 'up' ? `${site.statusCode} OK` : site.error ? 'Unreachable' : `${site.statusCode} Error`}
                  </span>
                </div>
                {site.responseTime > 0 && (
                  <div className="flex items-center gap-1 text-zinc-600">
                    <Clock size={10} />
                    <span className="text-[10px]">{site.responseTime}ms</span>
                  </div>
                )}
              </div>

              {/* GSC data status */}
              {siteConfig && (() => {
                const gsc = gscStatus[siteConfig.id];
                return (
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2a2d3a]">
                    <div className="flex items-center gap-1.5">
                      <Database size={10} className={gsc?.hasData ? 'text-green-400' : 'text-zinc-600'} />
                      <span className={`text-[10px] ${gsc?.hasData ? 'text-green-400' : 'text-zinc-600'}`}>
                        {gsc?.hasData ? `${gsc.keywords} keywords` : 'No GSC data'}
                      </span>
                    </div>
                    {gsc?.lastUpdated && (
                      <span className="text-[9px] text-zinc-600">
                        {new Date(gsc.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Theme color accent bar */}
              <div className="mt-2 h-0.5 rounded-full opacity-30" style={{ backgroundColor: site.color }} />
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
