'use client';
import { useState, useEffect, Fragment } from 'react';
import { useSite } from '@/context/SiteContext';
import { Loader2, Link2, ChevronDown, ChevronRight, AlertCircle, ExternalLink, Save, ArrowDown, ArrowUp, Minus, GitPullRequest, Check } from 'lucide-react';

export default function InternalLinksPage() {
  const { activeSite } = useSite();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('opportunities');
  const [snapshotDate, setSnapshotDate] = useState(null); // ISO date if showing cached data

  // On site change (and on mount), auto-load latest snapshot. If no snapshot
  // exists for this site, auto-trigger Run analysis so first-time users see
  // data without having to click anything.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setSnapshotDate(null);
    setError(null);
    fetch(`/api/internal-links?siteId=${activeSite.id}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.success && json.snapshot) {
          const snap = json.snapshot;
          setData({
            opportunities: snap.opportunities || [],
            orphanFixList: snap.orphanFixList || [],
            diffs: {},
            meta: {
              ...(snap.meta || {}),
              savedSnapshot: snap.date,
              snapshots: json.snapshots || [],
            },
          });
          setSnapshotDate(snap.date);
        }
        // No cached snapshot → leave empty state visible. User clicks
        // "Run analysis" when they want to start. Don't auto-fire API calls
        // when switching between sites — costly and surprising.
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <Tab active={tab === 'opportunities'} onClick={() => setTab('opportunities')} label="All pages" count={data.opportunities?.length || 0} />
            <Tab active={tab === 'orphans'} onClick={() => setTab('orphans')} label="Orphan fix list" count={data.orphanFixList?.length || 0} />
          </div>

          {tab === 'orphans' && <OrphanList items={data.orphanFixList || []} diffs={data.diffs || {}} expanded={expanded} setExpanded={setExpanded} siteOrigin={activeSite.gscUrl} siteId={activeSite.id} />}
          {tab === 'opportunities' && <OpportunitiesTable items={data.opportunities || []} diffs={data.diffs || {}} siteOrigin={activeSite.gscUrl} siteId={activeSite.id} />}
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

function AnchorMatrix({ matrix }) {
  const [activeLocale, setActiveLocale] = useState('en');
  const LOCALES = [
    { id: 'en', label: 'EN' }, { id: 'de', label: 'DE' }, { id: 'fr', label: 'FR' },
    { id: 'it', label: 'IT' }, { id: 'me', label: 'ME' }, { id: 'pl', label: 'PL' },
    { id: 'ru', label: 'RU' },
  ];
  const variants = matrix[activeLocale] || [];
  return (
    <div className="mt-3 pt-3 border-t border-[#2a2d3a]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-300">Anchor variants</p>
        <div className="flex gap-1">
          {LOCALES.map(l => (
            <button key={l.id} onClick={() => setActiveLocale(l.id)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${activeLocale === l.id ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        {variants.map((v, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-16">{v.label}</span>
            <code className="flex-1 text-emerald-400">{`"${v.text}"`}</code>
            <span className="text-[10px] text-zinc-600">{v.term}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 mt-2">
        Use different variants across the inbound links to diversify anchor text. For EN, mix rental + hire ~70/30.
      </p>
    </div>
  );
}

// Render a page path as a link to the live site. siteOrigin is the GSC site
// URL (e.g. "https://www.montenegrocarhire.com/"). Clicking opens the page
// in a new tab so users can quickly inspect content/existing internal links.
function PageLink({ path, siteOrigin, className = 'text-blue-400 hover:text-blue-300 hover:underline text-xs' }) {
  if (!siteOrigin || !path?.startsWith('/')) {
    return <code className={className}>{path}</code>;
  }
  const href = siteOrigin.replace(/\/$/, '') + path;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={`Open ${href} in new tab`}
      // Prevent the click from bubbling to a parent expand-toggle button.
      // Click on the link → opens new tab. Click on surrounding empty
      // row area → still triggers parent expand handler.
      onClick={e => e.stopPropagation()}
    >
      <code>{path}</code>
    </a>
  );
}

// One row in the suggested-source-pages list, with an Implement button that
// opens a PR via the backend agent.
function CandidateSourceRow({ candidate: c, target: t, siteOrigin, siteId }) {
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runImplement = async () => {
    setStatus('running');
    setError(null);
    try {
      const res = await fetch('/api/internal-links/implement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          targetPath: t.page,
          sourcePage: c.sourcePage,
          anchorVariant: { label: c.anchorLabel, text: c.anchor },
          anchorMatrix: t.anchorMatrix,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'implement failed');
      setResult(json);
      setStatus('done');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1d27] rounded text-xs">
      <PageLink path={c.sourcePage} siteOrigin={siteOrigin} className="text-blue-400 hover:text-blue-300 hover:underline" />
      <span className="text-zinc-600">→</span>
      <span className="text-zinc-400">anchor:</span>
      <code className="text-emerald-400">{`"${c.anchor}"`}</code>
      {c.anchorLabel && <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{c.anchorLabel}</span>}
      <span className="text-zinc-500">relevance {c.relevance}</span>
      <div className="ml-auto flex items-center gap-2">
        {status === 'idle' && (
          <button onClick={runImplement} disabled={!siteId}
            className="flex items-center gap-1 px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 text-blue-400 rounded text-[11px] transition-colors"
            title="Open a PR with this link insertion + 7-locale translations">
            <GitPullRequest size={11} /> Implement
          </button>
        )}
        {status === 'running' && (
          <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
            <Loader2 size={11} className="animate-spin" /> Opening PR…
          </span>
        )}
        {status === 'done' && result?.prUrl && (
          <a href={result.prUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded text-[11px] transition-colors"
            title="Open PR in GitHub">
            <Check size={11} /> PR #{result.prNumber}
          </a>
        )}
        {status === 'error' && (
          <span className="text-rose-400 text-[11px]" title={error}>
            <AlertCircle size={11} className="inline" /> Error
          </span>
        )}
      </div>
    </div>
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

function OrphanList({ items, diffs, expanded, setExpanded, siteOrigin, siteId }) {
  // Tag siteId onto each item for child components without prop drilling
  const enriched = items.map(t => ({ ...t, __siteId: siteId }));
  items = enriched;
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
              <span className="flex-1">
                <PageLink path={t.page} siteOrigin={siteOrigin} className="text-sm text-blue-400 hover:text-blue-300 hover:underline" />
              </span>
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
                      <CandidateSourceRow
                        key={c.sourcePage}
                        candidate={c}
                        target={t}
                        siteOrigin={siteOrigin}
                        siteId={t.__siteId}
                      />
                    ))}
                  </div>
                </div>
                {t.anchorMatrix && <AnchorMatrix matrix={t.anchorMatrix} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OpportunitiesTable({ items, diffs, siteOrigin, siteId }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="border border-[#2a2d3a] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#1a1d27] border-b border-[#2a2d3a]">
          <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
            <th className="p-2.5 w-6"></th>
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
            const isOpen = expanded === o.page;
            return (
              <Fragment key={o.page}>
                <tr
                  onClick={() => setExpanded(isOpen ? null : o.page)}
                  className={`border-t border-[#2a2d3a] hover:bg-white/[0.02] cursor-pointer ${isOpen ? 'bg-blue-500/5' : ''}`}
                >
                  <td className="p-2.5 text-zinc-500">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td className="p-2.5"><PageLink path={o.page} siteOrigin={siteOrigin} /></td>
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
                {isOpen && (
                  <tr className="bg-[#0f1117] border-t border-[#2a2d3a]">
                    <td colSpan={11} className="p-4">
                      <PageActionPanel opp={o} siteOrigin={siteOrigin} siteId={siteId} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PageActionPanel({ opp, siteOrigin, siteId }) {
  const top3 = opp.top3Queries || [];
  const [rewritePlan, setRewritePlan] = useState(null);
  const [rewriteStatus, setRewriteStatus] = useState({}); // contentType → 'idle'|'running'|'done'|'error'
  const [rewriteResult, setRewriteResult] = useState({});

  // Lazy-load whether content rewrites are available + the current EN value
  useEffect(() => {
    let cancelled = false;
    const url = `/api/internal-links/implement-content?page=${encodeURIComponent(opp.page)}${siteId ? `&siteId=${siteId}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (!cancelled) setRewritePlan(j.plan); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [opp.page, siteId]);

  const runRewrite = async (contentType) => {
    setRewriteStatus(s => ({ ...s, [contentType]: 'running' }));
    try {
      const res = await fetch('/api/internal-links/implement-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, page: opp.page, contentType }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'rewrite failed');
      setRewriteResult(r => ({ ...r, [contentType]: json }));
      setRewriteStatus(s => ({ ...s, [contentType]: 'done' }));
    } catch (e) {
      setRewriteStatus(s => ({ ...s, [contentType]: 'error' }));
      setRewriteResult(r => ({ ...r, [contentType]: { error: e.message } }));
    }
  };
  return (
    <div className="space-y-4 text-sm">
      {opp.diagnosis && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Diagnosis</span>
          <p className="flex-1 text-zinc-300">{opp.diagnosis}</p>
        </div>
      )}
      {top3.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Top queries</span>
          <div className="flex-1 space-y-1">
            {top3.map((q, i) => (
              <div key={i} className="text-xs text-zinc-400">
                <code className="text-zinc-300">{q.query}</code> — {q.impressions} imp · pos {q.position?.toFixed?.(1) ?? q.position}
                {q.clicks > 0 && <span className="text-emerald-400"> · {q.clicks} clicks</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {opp.actions?.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Actions</span>
          <ol className="flex-1 space-y-1.5">
            {opp.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${a.priority === 'high' ? 'bg-amber-500/15 text-amber-400' : a.priority === 'med' ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-700/30 text-zinc-500'}`}>
                  {a.priority}
                </span>
                <span className="flex-1 text-zinc-300">{a.action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {(opp.inboundAnchors?.length > 0 || opp.outboundAnchors?.length > 0) && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Anchors</span>
          <div className="flex-1 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1">Inbound ({opp.inboundAnchors?.length || 0})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {opp.inboundAnchors?.length === 0 && <p className="text-zinc-600">No inbound contextual anchors detected.</p>}
                {opp.inboundAnchors?.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-1.5 py-1 bg-[#1a1d27] rounded">
                    <code className="text-blue-400 truncate max-w-[140px]" title={a.source}>{a.source}</code>
                    <span className="text-zinc-600">·</span>
                    <code className="text-emerald-400 truncate flex-1" title={a.text}>{`"${a.text}"`}</code>
                    {a.count > 1 && <span className="text-[10px] text-zinc-500">×{a.count}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-blue-400/80 mb-1">Outbound ({opp.outboundAnchors?.length || 0})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {opp.outboundAnchors?.length === 0 && <p className="text-zinc-600">No outbound contextual anchors detected.</p>}
                {opp.outboundAnchors?.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-1.5 py-1 bg-[#1a1d27] rounded">
                    <code className="text-blue-400 truncate max-w-[140px]" title={a.target}>{a.target}</code>
                    <span className="text-zinc-600">·</span>
                    <code className="text-emerald-400 truncate flex-1" title={a.text}>{`"${a.text}"`}</code>
                    {a.count > 1 && <span className="text-[10px] text-zinc-500">×{a.count}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {rewritePlan?.available && rewritePlan.contentTypes?.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Rewrites</span>
          <div className="flex-1 space-y-2">
            {rewritePlan.contentTypes.map(ct => {
              const status = rewriteStatus[ct.type] || 'idle';
              const result = rewriteResult[ct.type];
              return (
                <div key={ct.type} className="bg-[#1a1d27] rounded p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">{ct.type}</span>
                    <code className="text-[10px] text-zinc-500">{ct.i18nKey}</code>
                    {ct.currentEn && (
                      <span className="text-[10px] text-zinc-600">
                        {ct.currentEn.length} → {ct.previewEn.length} chars
                      </span>
                    )}
                    <div className="ml-auto">
                      {status === 'idle' && (
                        <button onClick={() => runRewrite(ct.type)} disabled={!siteId}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 text-blue-400 rounded text-[11px] transition-colors">
                          <GitPullRequest size={11} /> Implement
                        </button>
                      )}
                      {status === 'running' && (
                        <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                          <Loader2 size={11} className="animate-spin" /> Opening PR…
                        </span>
                      )}
                      {status === 'done' && result?.prUrl && (
                        <a href={result.prUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded text-[11px]">
                          <Check size={11} /> PR #{result.prNumber}
                        </a>
                      )}
                      {status === 'error' && (
                        <span className="text-rose-400 text-[11px]" title={result?.error}>
                          <AlertCircle size={11} className="inline" /> {result?.error?.slice(0, 40) || 'Error'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-rose-500/5 border border-rose-500/15 rounded p-2">
                      <p className="text-[9px] uppercase tracking-wider text-rose-400/80 mb-1">Current</p>
                      <p className="text-zinc-300 italic">{ct.currentEn ? `"${ct.currentEn}"` : <span className="text-zinc-600">— (not yet set)</span>}</p>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded p-2">
                      <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1">Proposed</p>
                      <p className="text-zinc-300 italic">{`"${ct.previewEn}"`}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20">Quick links</span>
        <div className="flex-1 flex gap-2 flex-wrap">
          {siteOrigin && (
            <a href={siteOrigin.replace(/\/$/, '') + opp.page} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-[#1a1d27] hover:bg-white/5 rounded text-blue-400 hover:text-blue-300 transition-colors">
              <ExternalLink size={11} /> Open live page
            </a>
          )}
          {opp.topQuery && (
            <a href={`/keyword-research?q=${encodeURIComponent(opp.topQuery)}`}
              className="flex items-center gap-1 px-2 py-1 bg-[#1a1d27] hover:bg-white/5 rounded text-zinc-400 hover:text-zinc-200 transition-colors">
              Keyword research
            </a>
          )}
          {opp.topQuery && (
            <a href={`/rank-tracker?kw=${encodeURIComponent(opp.topQuery)}`}
              className="flex items-center gap-1 px-2 py-1 bg-[#1a1d27] hover:bg-white/5 rounded text-zinc-400 hover:text-zinc-200 transition-colors">
              Rank history
            </a>
          )}
        </div>
      </div>
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
