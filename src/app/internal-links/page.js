'use client';
import { useState, useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { Loader2, Link2, ChevronDown, ChevronRight, AlertCircle, ExternalLink, Save, ArrowDown, ArrowUp, Minus } from 'lucide-react';

export default function InternalLinksPage() {
  const { activeSite } = useSite();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('orphans');
  const [snapshotDate, setSnapshotDate] = useState(null); // ISO date if showing cached data

  // On site change (and on mount), auto-load latest snapshot
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setSnapshotDate(null);
    setError(null);
    fetch(`/api/internal-links?siteId=${activeSite.id}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json.success || !json.snapshot) return;
        const snap = json.snapshot;
        setData({
          opportunities: snap.opportunities || [],
          orphanFixList: snap.orphanFixList || [],
          diffs: {},
          meta: { savedSnapshot: snap.date, snapshots: json.snapshots || [] },
        });
        setSnapshotDate(snap.date);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeSite.id]);

  const runAnalysis = async ({ saveBaseline = false } = {}) => {
    setLoading(true);
    setError(null);
    setSnapshotDate(null);
    if (!saveBaseline) setData(null);
    try {
      const res = await fetch('/api/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: activeSite.id,
          gscUrl: activeSite.gscUrl,
          siteRoot: activeSite.siteRoot,
          ga4PropertyId: activeSite.ga4PropertyId,
          days: 180,
          saveBaseline,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'analysis failed');
      setData(json);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="text-blue-400" size={22} />
            <h1 className="text-2xl font-bold text-white">Internal Links</h1>
          </div>
          <p className="text-sm text-zinc-400">
            Joins GSC + GA4 + codebase crawl into an actionable internal-linking plan for {activeSite.label}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runAnalysis()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {loading ? 'Analyzing…' : 'Run analysis'}
          </button>
          <button
            onClick={() => runAnalysis({ saveBaseline: true })}
            disabled={loading || !data}
            title="Save current results as the baseline for future delta comparisons"
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 hover:bg-emerald-500/10 disabled:opacity-40 text-emerald-400 text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={16} />
            Save baseline
          </button>
        </div>
      </div>

      {/* Config status */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ConfigCard label="GSC" status={!!activeSite.gscUrl} value={activeSite.gscUrl || 'not configured'} />
        <ConfigCard label="GA4" status={!!activeSite.ga4PropertyId} value={activeSite.ga4PropertyId || 'not configured'} />
        <ConfigCard label="Codebase" status={!!activeSite.siteRoot} value={activeSite.siteRoot || 'not configured'} />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!data && !loading && (
        <div className="text-center py-16 border border-dashed border-[#2a2d3a] rounded-xl">
          <Link2 className="mx-auto text-zinc-600 mb-3" size={40} />
          <p className="text-sm text-zinc-400">Run analysis to see internal-linking opportunities</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <Stat label="Pages with traffic" value={data.opportunities?.length || 0} />
            <Stat label="Priority targets" value={data.orphanFixList?.length || 0} />
            <Stat label="Link instances" value={data.meta?.totalLinkInstances || 0} />
            <Stat label="GA4" value={data.meta?.ga4Configured ? 'On' : 'Off'} muted={!data.meta?.ga4Configured} />
            <Stat label="Baseline" value={data.meta?.baselineDate || (data.meta?.savedSnapshot ?? '—')} muted={!data.meta?.baselineDate && !data.meta?.savedSnapshot} />
          </div>
          {snapshotDate && (
            <div className="text-xs text-zinc-400 mb-3 flex items-center gap-2">
              <Save size={12} className="text-zinc-500" />
              Showing cached snapshot from <span className="text-blue-400">{snapshotDate}</span>. Click {'"Run analysis"'} for fresh data.
            </div>
          )}
          {data.meta?.savedSnapshot && !snapshotDate && !data.meta?.baselineDate && (
            <div className="text-xs text-emerald-400 mb-3 flex items-center gap-2">
              <Save size={12} /> Saved baseline for {data.meta.savedSnapshot}. Future runs will show position deltas vs this date.
            </div>
          )}
          {data.meta?.baselineDate && (
            <div className="text-xs text-zinc-400 mb-3">
              Comparing against baseline from <span className="text-blue-400">{data.meta.baselineDate}</span> · {data.meta.snapshots?.length || 0} snapshot(s) saved
            </div>
          )}

          <div className="flex gap-1 border-b border-[#2a2d3a] mb-4">
            <Tab active={tab === 'orphans'} onClick={() => setTab('orphans')} label="Orphan fix list" count={data.orphanFixList?.length || 0} />
            <Tab active={tab === 'opportunities'} onClick={() => setTab('opportunities')} label="All pages" count={data.opportunities?.length || 0} />
          </div>

          {tab === 'orphans' && <OrphanList items={data.orphanFixList || []} diffs={data.diffs || {}} expanded={expanded} setExpanded={setExpanded} />}
          {tab === 'opportunities' && <OpportunitiesTable items={data.opportunities || []} diffs={data.diffs || {}} />}
        </>
      )}
    </div>
  );
}

function ConfigCard({ label, status, value }) {
  return (
    <div className={`px-3 py-2 rounded-lg border ${status ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-800/30'}`}>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xs mt-0.5 truncate ${status ? 'text-emerald-400' : 'text-zinc-500'}`}>{value}</p>
    </div>
  );
}

function Stat({ label, value, muted }) {
  return (
    <div className="border border-[#2a2d3a] rounded-lg p-3 bg-[#1a1d27]">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-semibold mt-0.5 ${muted ? 'text-zinc-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Tab({ active, onClick, label, count }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-2 text-sm transition-colors whitespace-nowrap border-b-2 ${active ? 'border-blue-400 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}>
      {label} <span className="text-zinc-500">({count})</span>
    </button>
  );
}

function PositionDelta({ delta }) {
  if (delta == null) return <span className="text-zinc-600">—</span>;
  if (Math.abs(delta) < 0.5) return <span className="text-zinc-500 inline-flex items-center gap-1"><Minus size={11} />0</span>;
  // delta < 0 means position improved (lower number = better rank)
  const improved = delta < 0;
  const Icon = improved ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 ${improved ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon size={11} />
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

function OrphanList({ items, diffs, expanded, setExpanded }) {
  if (!items.length) return <Empty label="No orphan targets — all pages with traffic have inbound links" />;
  return (
    <div className="space-y-2">
      {items.map((t, i) => {
        const isOpen = expanded === t.page;
        const diff = diffs[t.page];
        return (
          <div key={t.page} className={`border rounded-lg overflow-hidden ${isOpen ? 'border-blue-500/30' : 'border-[#2a2d3a]'}`}>
            <button onClick={() => setExpanded(isOpen ? null : t.page)}
              className="w-full p-3 flex items-center gap-3 bg-[#1a1d27] hover:bg-white/[0.02] text-left">
              <span className="text-xs text-zinc-500 w-6">#{i + 1}</span>
              {isOpen ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
              <code className="flex-1 text-sm text-blue-400">{t.page}</code>
              <Pill label="imp" value={t.impressions} />
              <Pill label="inbound" value={t.inboundLinks} warn={t.inboundLinks <= 1} />
              {t.ga4Sessions !== undefined && <Pill label="ga4" value={t.ga4Sessions} />}
              {diff?.positionDelta != null && (
                <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1117]" title={`vs baseline ${diff.baselineDate}: ${diff.baselinePosition?.toFixed(1)} → ${t.topQueryPosition?.toFixed(1)}`}>
                  <span className="text-zinc-500">Δ</span><PositionDelta delta={diff.positionDelta} />
                </span>
              )}
              <span className="text-xs text-zinc-500">score</span>
              <span className="text-sm font-semibold text-white w-10 text-right">{t.score}</span>
            </button>
            {isOpen && (
              <div className="p-4 bg-[#0f1117] border-t border-[#2a2d3a] space-y-3">
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-500">Top query:</span> {`"${t.topQuery}"`} · {t.topQueryImpressions} imp · pos {t.topQueryPosition?.toFixed?.(1) ?? t.topQueryPosition}
                </div>
                {t.recommendation && <div className="text-xs text-amber-400"><span className="text-zinc-500">Recommendation:</span> {t.recommendation}</div>}
                <div>
                  <p className="text-xs font-medium text-zinc-300 mb-2">Suggested source pages</p>
                  <div className="space-y-1">
                    {t.candidateSources?.map(c => (
                      <div key={c.sourcePage} className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1d27] rounded text-xs">
                        <code className="text-blue-400">{c.sourcePage}</code>
                        <span className="text-zinc-600">→</span>
                        <span className="text-zinc-400">anchor:</span>
                        <code className="text-emerald-400">{`"${c.anchor}"`}</code>
                        <span className="ml-auto text-zinc-500">relevance {c.relevance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OpportunitiesTable({ items, diffs }) {
  return (
    <div className="border border-[#2a2d3a] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#1a1d27] border-b border-[#2a2d3a]">
          <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
            <th className="p-2.5">Page</th>
            <th className="p-2.5 text-right">Imp</th>
            <th className="p-2.5 text-right">Clicks</th>
            <th className="p-2.5 text-right">GA4</th>
            <th className="p-2.5 text-right">Inbound</th>
            <th className="p-2.5 text-right">Outbound</th>
            <th className="p-2.5">Top query</th>
            <th className="p-2.5 text-right">Pos</th>
            <th className="p-2.5 text-right">ΔPos</th>
            <th className="p-2.5 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {items.map(o => {
            const diff = diffs[o.page];
            return (
              <tr key={o.page} className="border-t border-[#2a2d3a] hover:bg-white/[0.02]">
                <td className="p-2.5"><code className="text-blue-400 text-xs">{o.page}</code></td>
                <td className="p-2.5 text-right text-zinc-300">{o.impressions}</td>
                <td className="p-2.5 text-right text-zinc-300">{o.clicks}</td>
                <td className="p-2.5 text-right text-zinc-400">{o.ga4Sessions ?? '—'}</td>
                <td className={`p-2.5 text-right ${o.inboundLinks <= 1 ? 'text-amber-400' : 'text-zinc-300'}`}>{o.inboundLinks}</td>
                <td className="p-2.5 text-right text-zinc-400">{o.outboundLinks ?? '—'}</td>
                <td className="p-2.5 text-xs text-zinc-400 max-w-[240px] truncate" title={o.topQuery}>{o.topQuery || '—'}</td>
                <td className="p-2.5 text-right text-zinc-400">{o.topQueryPosition ? o.topQueryPosition.toFixed(1) : '—'}</td>
                <td className="p-2.5 text-right text-xs"><PositionDelta delta={diff?.positionDelta} /></td>
                <td className="p-2.5 text-right font-semibold text-white">{o.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ label, value, warn }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${warn ? 'bg-amber-500/10 text-amber-400' : 'bg-[#0f1117] text-zinc-400'}`}>
      <span className="text-zinc-500 mr-1">{label}</span>{value}
    </span>
  );
}

function Empty({ label }) {
  return <div className="text-center py-12 text-sm text-zinc-500 border border-dashed border-[#2a2d3a] rounded-xl">{label}</div>;
}
