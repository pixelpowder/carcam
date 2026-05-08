'use client';
import { useState, useEffect, Fragment } from 'react';
import { useSite } from '@/context/SiteContext';
import { Loader2, Link2, ChevronDown, ChevronRight, AlertCircle, ExternalLink, Save, ArrowDown, ArrowUp, Minus, GitPullRequest, Check, Sparkles } from 'lucide-react';

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

// Full-page side-by-side diff. Shows every i18n section in render order so
// you can see proposed rewrites in context with the unchanged surrounding
// content. Sections with rewrites are highlighted; unchanged sections are
// shown side-by-side (proposed = current) so the page reads as a whole.
function FullPageDiff({ outline, rewriteStatus = {}, rewriteResult = {}, onImplement, onImplementBatch, onEdit, siteId }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [batchStatus, setBatchStatus] = useState('idle'); // idle | running | done | error
  const [batchResult, setBatchResult] = useState(null);
  // editedProposals: { i18nKey: editedEnString } — user edits to the proposed EN
  const [editedProposals, setEditedProposals] = useState({});
  const changedCount = outline.filter(o => o.hasRewrite).length;
  const allChangedTypes = outline.filter(o => o.hasRewrite && o.contentType).map(o => o.contentType);

  const proposedFor = (s) => editedProposals[s.key] ?? s.proposedEn;
  const isEdited = (s) => editedProposals[s.key] != null && editedProposals[s.key] !== s.proposedEn;
  const setEdit = (key, value, contentType) => {
    setEditedProposals(prev => ({ ...prev, [key]: value }));
    onEdit?.(key, value, contentType);
  };

  const toggle = (ct) => {
    setSelected(s => {
      const next = new Set(s);
      if (next.has(ct)) next.delete(ct); else next.add(ct);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(allChangedTypes));
  const clearAll = () => setSelected(new Set());

  const runBatch = async () => {
    if (selected.size === 0 || !onImplementBatch) return;
    setBatchStatus('running');
    try {
      // Build overrides map: { contentType: editedEn } for any sections the
      // user edited inline. Backend uses these instead of the registry's EN.
      const overrides = {};
      for (const o of outline) {
        if (!o.contentType || !selected.has(o.contentType)) continue;
        const edited = editedProposals[o.key];
        if (edited != null && edited !== o.proposedEn) overrides[o.contentType] = edited;
      }
      const result = await onImplementBatch([...selected], overrides);
      setBatchResult(result);
      setBatchStatus('done');
      setSelected(new Set());
    } catch (e) {
      setBatchResult({ error: e.message });
      setBatchStatus('error');
    }
  };

  return (
    <div className="border border-[#2a2d3a] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center gap-3 bg-[#1a1d27] hover:bg-white/[0.02] text-left">
        {open ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
        <span className="text-xs font-medium text-zinc-300">Full-page diff</span>
        <span className="text-[10px] text-zinc-500">{outline.length} sections · {changedCount} with rewrites</span>
      </button>
      {open && onImplementBatch && allChangedTypes.length > 1 && (
        <div className="border-t border-[#2a2d3a] bg-[#1a1d27] p-2.5 flex items-center gap-3 text-xs">
          <span className="text-zinc-400">{selected.size} selected</span>
          <button onClick={selectAll} className="text-blue-400 hover:text-blue-300 text-[11px]">Select all changed ({allChangedTypes.length})</button>
          {selected.size > 0 && (
            <button onClick={clearAll} className="text-zinc-500 hover:text-zinc-300 text-[11px]">Clear</button>
          )}
          <div className="ml-auto">
            {batchStatus === 'idle' && selected.size > 0 && (
              <button onClick={runBatch}
                className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[11px] transition-colors">
                <GitPullRequest size={11} /> Implement {selected.size} selected (one PR / one deploy)
              </button>
            )}
            {batchStatus === 'running' && (
              <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                <Loader2 size={11} className="animate-spin" /> Opening batch PR…
              </span>
            )}
            {batchStatus === 'done' && batchResult?.prUrl && (
              <a href={batchResult.prUrl} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${batchResult.merged ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'}`}>
                <Check size={11} /> {batchResult.merged ? `Merged #${batchResult.prNumber}` : `PR #${batchResult.prNumber}`}
              </a>
            )}
            {batchStatus === 'error' && (
              <span className="text-rose-400 text-[11px]" title={batchResult?.error}>
                <AlertCircle size={11} className="inline" /> Error
              </span>
            )}
          </div>
        </div>
      )}
      {open && (
        <div className="border-t border-[#2a2d3a] divide-y divide-[#2a2d3a]">
          {outline.map((s, i) => {
            const current = s.currentEn ?? '';
            const proposed = s.hasRewrite ? proposedFor(s) : current;
            const edited = s.hasRewrite && isEdited(s);
            const status = s.hasRewrite && s.contentType ? (rewriteStatus[s.contentType] || 'idle') : null;
            const result = s.hasRewrite && s.contentType ? rewriteResult[s.contentType] : null;
            return (
              <div key={i} className={`p-3 ${s.hasRewrite ? 'bg-emerald-500/[0.03]' : 'bg-[#0f1117]'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {s.hasRewrite && s.contentType && onImplementBatch && (
                    <input type="checkbox" checked={selected.has(s.contentType)}
                      onChange={() => toggle(s.contentType)}
                      className="cursor-pointer accent-blue-500" />
                  )}
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    s.kind === 'meta' ? 'bg-purple-500/15 text-purple-400'
                    : s.kind === 'h2' ? 'bg-blue-500/15 text-blue-400'
                    : s.kind === 'subtitle' ? 'bg-cyan-500/15 text-cyan-400'
                    : s.kind === 'li' ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-zinc-700/30 text-zinc-400'
                  }`}>{s.kind}</span>
                  <span className="text-[11px] text-zinc-300">{s.label}</span>
                  <code className="text-[10px] text-zinc-600">{s.key}</code>
                  {s.hasRewrite && (
                    <>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">changed</span>
                      {edited && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">edited</span>
                      )}
                      <span className="text-[10px] text-zinc-600">{current.length} → {(proposed || '').length} chars</span>
                      {onImplement && s.contentType && (
                        <div className="ml-auto">
                          {/* Hide per-row Implement when any checkbox is selected — forces batch path */}
                          {selected.size > 0 && status === 'idle' && (
                            <span className="text-[10px] text-zinc-500 italic">in batch ({selected.size})</span>
                          )}
                          {status === 'idle' && selected.size === 0 && (
                            <button onClick={() => onImplement(s.contentType)} disabled={!siteId}
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
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${result.merged ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'}`}
                              title={result.merged ? 'Auto-merged — Vercel deploying now' : `PR open (merge failed: ${result.mergeError || 'unknown'})`}>
                              <Check size={11} /> {result.merged ? `Merged #${result.prNumber}` : `PR #${result.prNumber}`}
                            </a>
                          )}
                          {status === 'error' && (
                            <span className="text-rose-400 text-[11px]" title={result?.error}>
                              <AlertCircle size={11} className="inline" /> Error
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`p-2 rounded ${s.hasRewrite ? 'bg-rose-500/5 border border-rose-500/15' : 'bg-[#1a1d27]'}`}>
                    {s.hasRewrite && <p className="text-[9px] uppercase tracking-wider text-rose-400/80 mb-1">Current</p>}
                    <p className="text-zinc-300 italic">{current ? `"${current}"` : <span className="text-zinc-600">— (not set)</span>}</p>
                  </div>
                  <div className={`p-2 rounded ${s.hasRewrite ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-[#1a1d27]'}`}>
                    {s.hasRewrite && <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1">Proposed (editable)</p>}
                    {s.hasRewrite ? (
                      <textarea
                        value={proposed ?? ''}
                        onChange={(e) => setEdit(s.key, e.target.value, s.contentType)}
                        rows={Math.max(2, Math.min(8, Math.ceil((proposed?.length || 0) / 70)))}
                        className="w-full bg-transparent text-zinc-300 italic resize-y outline-none focus:bg-[#0f1117] focus:not-italic focus:rounded focus:px-1 focus:py-0.5 transition-all"
                        spellCheck="false"
                      />
                    ) : (
                      <p className="text-zinc-300 italic">{proposed ? `"${proposed}"` : <span className="text-zinc-600">— (not set)</span>}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  const [autoRewriteSupported, setAutoRewriteSupported] = useState(false);
  const [autoRewriteState, setAutoRewriteState] = useState({ status: 'idle' });
  // editedRewrites mirrors FullPageDiff's edits: { contentType: editedEnString }
  // Used when user clicks per-row Implement so we send the edited version.
  const [editedRewrites, setEditedRewrites] = useState({});

  // Lazy-load whether content rewrites are available + the current EN value
  useEffect(() => {
    let cancelled = false;
    const url = `/api/internal-links/implement-content?page=${encodeURIComponent(opp.page)}${siteId ? `&siteId=${siteId}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (!cancelled) setRewritePlan(j.plan); })
      .catch(() => {});
    // Also check if the autonomous agent supports this page
    fetch(`/api/internal-links/auto-rewrite?page=${encodeURIComponent(opp.page)}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setAutoRewriteSupported(!!j.supported); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [opp.page, siteId]);

  // Step 1: generate the rewrite (no PR yet — user previews first)
  const runAutoRewriteGenerate = async () => {
    setAutoRewriteState({ status: 'generating' });
    try {
      const res = await fetch('/api/internal-links/auto-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, page: opp.page }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'generate failed');
      setAutoRewriteState({ status: 'preview', ...json });
    } catch (e) {
      setAutoRewriteState({ status: 'error', error: e.message });
    }
  };

  // Step 2: user approved EN preview — apply via PR (EN only by default)
  const runAutoRewriteApply = async () => {
    setAutoRewriteState(s => ({ ...s, status: 'applying' }));
    try {
      const res = await fetch('/api/internal-links/auto-rewrite/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          page: opp.page,
          rewrites: autoRewriteState.rewrites,
          topQueries: autoRewriteState.topQueries,
          authMode: autoRewriteState.authMode,
          usage: autoRewriteState.usage,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'apply failed');
      setAutoRewriteState(s => ({ ...s, status: 'done', prUrl: json.prUrl, prNumber: json.prNumber }));
    } catch (e) {
      setAutoRewriteState(s => ({ ...s, status: 'error', error: e.message }));
    }
  };

  // Optional step: translate the generated EN to other 6 locales
  const runAutoRewriteTranslate = async () => {
    setAutoRewriteState(s => ({ ...s, status: 'translating' }));
    try {
      const res = await fetch('/api/internal-links/auto-rewrite/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: opp.page,
          rewrites: autoRewriteState.rewrites,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'translate failed');
      setAutoRewriteState(s => ({
        ...s,
        status: 'preview',
        rewrites: json.rewrites,
        translated: true,
        translateUsage: json.usage,
        translateAuthMode: json.authMode,
        translateFallback: json.fallback,
      }));
    } catch (e) {
      setAutoRewriteState(s => ({ ...s, status: 'error', error: e.message }));
    }
  };

  const runAutoRewriteCancel = () => setAutoRewriteState({ status: 'idle' });

  const runRewrite = async (contentType) => {
    setRewriteStatus(s => ({ ...s, [contentType]: 'running' }));
    try {
      const overrides = {};
      if (editedRewrites[contentType] != null) overrides[contentType] = editedRewrites[contentType];
      const res = await fetch('/api/internal-links/implement-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, page: opp.page, contentType, overrides }),
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
      {autoRewriteSupported && (
        <div className="border border-purple-500/20 bg-purple-500/[0.04] rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Auto-rewrite (whole page, all 7 locales)</span>
            <div className="ml-auto flex items-center gap-2">
              {autoRewriteState.status === 'idle' && (
                <button onClick={runAutoRewriteGenerate} disabled={!siteId}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-500/15 hover:bg-purple-500/25 disabled:opacity-40 text-purple-400 rounded text-[11px] transition-colors">
                  <Sparkles size={11} /> Generate rewrite
                </button>
              )}
              {autoRewriteState.status === 'generating' && (
                <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <Loader2 size={11} className="animate-spin" /> Generating ({autoRewriteState.tokens || ''} sections)…
                </span>
              )}
              {autoRewriteState.status === 'preview' && (
                <>
                  {!autoRewriteState.translated && (
                    <button onClick={runAutoRewriteTranslate}
                      title="Translate the EN rewrites into the other 6 locales (one extra LLM call)"
                      className="flex items-center gap-1 px-3 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded text-[11px] transition-colors">
                      <Sparkles size={11} /> Translate to other locales
                    </button>
                  )}
                  <button onClick={runAutoRewriteApply}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[11px] transition-colors">
                    <GitPullRequest size={11} /> {autoRewriteState.translated ? 'Open PR (all 7 locales)' : 'Open PR (EN only)'}
                  </button>
                  <button onClick={runAutoRewriteCancel}
                    className="flex items-center gap-1 px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded text-[11px]">
                    Discard
                  </button>
                </>
              )}
              {autoRewriteState.status === 'translating' && (
                <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <Loader2 size={11} className="animate-spin" /> Translating to 6 locales…
                </span>
              )}
              {autoRewriteState.status === 'applying' && (
                <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <Loader2 size={11} className="animate-spin" /> Opening PR…
                </span>
              )}
              {autoRewriteState.status === 'done' && autoRewriteState.prUrl && (
                <a href={autoRewriteState.prUrl} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${autoRewriteState.merged ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'}`}
                  title={autoRewriteState.merged ? 'Auto-merged — Vercel deploying now' : `PR open (merge failed: ${autoRewriteState.mergeError || 'unknown'})`}>
                  <Check size={11} /> {autoRewriteState.merged ? `Merged #${autoRewriteState.prNumber}` : `PR #${autoRewriteState.prNumber}`}
                </a>
              )}
              {autoRewriteState.status === 'error' && (
                <span className="text-rose-400 text-[11px]" title={autoRewriteState.error}>
                  <AlertCircle size={11} className="inline" /> {autoRewriteState.error?.slice(0, 60) || 'Error'}
                </span>
              )}
            </div>
          </div>
          {autoRewriteState.status === 'idle' && (
            <p className="text-[11px] text-zinc-400">
              Agent reads current page content + GSC top queries and generates an EN rewrite for every section. Review the diff, then either open an EN-only PR or click Translate to add the other 6 locales.
            </p>
          )}
          {autoRewriteState.status === 'preview' && (
            <>
              <p className="text-[11px] text-zinc-400">
                Generated {autoRewriteState.sectionCount} section rewrites. Auth mode: <span className={autoRewriteState.authMode === 'oauth' ? 'text-emerald-400' : 'text-amber-400'}>{autoRewriteState.authMode}</span>
                {autoRewriteState.authMode === 'oauth' && ' (Pro/Max quota, no API billed)'}
                {autoRewriteState.authMode === 'apiKey' && ' (API tokens billed)'}
                . Tokens: {autoRewriteState.usage?.input_tokens || '?'} in / {autoRewriteState.usage?.output_tokens || '?'} out.
                Review the EN diff below — non-EN locales mirror the EN structure and will be visible in the PR description for spot-checking.
              </p>
              {autoRewriteState.fallback && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle size={11} /> {autoRewriteState.fallbackReason || 'Fell back to API key after rate limit on OAuth'}.
                </p>
              )}
              {autoRewriteState.outline?.length > 0 && (
                <FullPageDiff
                  outline={autoRewriteState.outline}
                  onEdit={(key, value) => {
                    // Reflect the edit in autoRewriteState.rewrites so Open PR commits it
                    setAutoRewriteState(s => {
                      const nextRewrites = { ...s.rewrites };
                      if (nextRewrites[key]) {
                        nextRewrites[key] = { ...nextRewrites[key], en: value };
                      }
                      // Also update outline so the textarea displays consistently
                      const nextOutline = s.outline.map(o =>
                        o.key === key ? { ...o, proposedEn: value } : o
                      );
                      return { ...s, rewrites: nextRewrites, outline: nextOutline };
                    });
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
      {rewritePlan?.pageOutline?.length > 0 && (
        <FullPageDiff
          outline={rewritePlan.pageOutline}
          rewriteStatus={rewriteStatus}
          rewriteResult={rewriteResult}
          onEdit={(key, value, contentType) => {
            if (contentType) setEditedRewrites(prev => ({ ...prev, [contentType]: value }));
          }}
          onImplement={runRewrite}
          onImplementBatch={async (contentTypes, overrides) => {
            const res = await fetch('/api/internal-links/implement-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteId, page: opp.page, contentType: contentTypes, overrides }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'batch failed');
            return json;
          }}
          siteId={siteId}
        />
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
