'use client';
import { useState, useEffect, useRef, Fragment } from 'react';
import { useSite } from '@/context/SiteContext';
import { Loader2, Link2, ChevronDown, ChevronRight, AlertCircle, ExternalLink, Save, ArrowDown, ArrowUp, Minus, GitPullRequest, Check, Sparkles, Inbox, Trash2, Rocket, X } from 'lucide-react';

export default function InternalLinksPage() {
  const { activeSite } = useSite();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('opportunities');
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [queue, setQueue] = useState([]);
  const [shipState, setShipState] = useState({ status: 'idle' }); // idle | shipping | done | error
  const [rankData, setRankData] = useState(null);
  // Promise chain ref — used to serialize stageAction/removeQueueItem POSTs.
  // Without this, parallel clicks race on the server-side load→push→save flow
  // and clobber each other (last write wins). Chaining onto this ref means
  // each request waits for the previous to settle before firing.
  const queueOpChainRef = useRef(Promise.resolve());
  // Map of page → draft info. Used to badge rows in All Pages with a
  // "draft pending" indicator so user can see at a glance where Claude
  // (or another author) has pushed proposed changes awaiting review.
  const [draftsByPage, setDraftsByPage] = useState({});

  const refreshDrafts = async () => {
    if (!activeSite.id) return;
    try {
      const res = await fetch(`/api/internal-links/draft?siteId=${activeSite.id}`);
      const j = await res.json();
      if (j.success) {
        const map = {};
        for (const d of (j.drafts || [])) map[d.page] = d;
        setDraftsByPage(map);
      }
    } catch {}
  };

  // Refresh queue
  const refreshQueue = async () => {
    if (!activeSite.id) return;
    try {
      const res = await fetch(`/api/internal-links/stage?siteId=${activeSite.id}`);
      const j = await res.json();
      if (j.success) setQueue(j.items || []);
    } catch {}
  };
  useEffect(() => { refreshQueue(); refreshDrafts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeSite.id]);

  // Fetch the rank-tracking blob once per site — shared across both tabs.
  useEffect(() => {
    if (!activeSite.id) return;
    setRankData(null);
    let cancelled = false;
    fetch(`/api/rank-tracking?site=${activeSite.id}`)
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success && j.data) setRankData(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeSite.id]);

  // Run a queue mutation serially via the promise chain. Each call waits for
  // the previous one to finish — prevents server-side load/save races when
  // the user clicks multiple Queue buttons in rapid succession.
  const runSerially = (fn) => {
    const next = queueOpChainRef.current.then(fn, fn);
    // Swallow errors from the chain itself so one failure doesn't break
    // subsequent ops; the caller still receives its own promise rejection.
    queueOpChainRef.current = next.catch(() => {});
    return next;
  };

  // Use a ref to read the latest queue inside the serial chain — by the time
  // a chained POST runs, `queue` from closure may be stale (the previous
  // POST in the chain has updated state but this closure was captured before).
  const queueRef = useRef([]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const stageAction = (action) => runSerially(async () => {
    const res = await fetch('/api/internal-links/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Send currentItems so the server skips its eventually-consistent load
      // and just appends to our authoritative client state.
      body: JSON.stringify({ siteId: activeSite.id, action, currentItems: queueRef.current }),
    });
    const j = await res.json();
    if (!j.success) throw new Error(j.error || 'stage failed');
    let items = j.items || [];
    if (j.item && !items.find(i => i.id === j.item.id)) items = [...items, j.item];
    setQueue(items);
    queueRef.current = items;
    return j.item;
  });

  const removeQueueItem = (id) => runSerially(async () => {
    // POST with body so we can ship currentItems without URL-length limits.
    // Server uses our authoritative list to overwrite the blob, avoiding
    // Vercel Blob eventual-consistency that was leaving phantom items.
    const res = await fetch('/api/internal-links/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: activeSite.id,
        op: 'remove',
        id,
        currentItems: queueRef.current,
      }),
    });
    const j = await res.json();
    if (!j.success) throw new Error(j.error || 'remove failed');
    setQueue(j.items || []);
    queueRef.current = j.items || [];
  });
  const clearAllQueue = () => runSerially(async () => {
    const res = await fetch('/api/internal-links/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: activeSite.id, op: 'clear' }),
    });
    const j = await res.json();
    if (j.success) {
      setQueue([]);
      queueRef.current = [];
    }
  });
  const ship = async () => {
    setShipState({ status: 'shipping' });
    try {
      const res = await fetch('/api/internal-links/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: activeSite.id }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'ship failed');
      setShipState({ status: 'done', ...j });
      setQueue([]);
    } catch (e) {
      setShipState({ status: 'error', error: e.message });
    }
  };

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

      {(queue.length > 0 || shipState.status !== 'idle') && (
        <div className="border border-amber-500/25 bg-amber-500/[0.04] rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Inbox size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400">Staged queue ({queue.length})</span>
            <span className="text-[10px] text-zinc-500">— each click stages an action; ship all together for one PR / one deploy</span>
            <div className="ml-auto flex items-center gap-2">
              {shipState.status === 'idle' && queue.length > 0 && (
                <>
                  <button onClick={clearAllQueue}
                    className="flex items-center gap-1 px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded text-[11px]">
                    <Trash2 size={11} /> Clear queue
                  </button>
                  <button onClick={ship}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[11px] font-medium transition-colors">
                    <Rocket size={11} /> Ship all ({queue.length})
                  </button>
                </>
              )}
              {shipState.status === 'shipping' && (
                <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <Loader2 size={11} className="animate-spin" /> Shipping {queue.length} change{queue.length === 1 ? '' : 's'}…
                </span>
              )}
              {shipState.status === 'done' && shipState.prUrl && (
                <a href={shipState.prUrl} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${shipState.merged ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400'}`}>
                  <Check size={11} /> Shipped {shipState.shipped} · {shipState.merged ? `Merged #${shipState.prNumber}` : `PR #${shipState.prNumber}`}
                </a>
              )}
              {shipState.status === 'done' && !shipState.prUrl && (
                <span className="text-zinc-400 text-[11px]">{shipState.error || 'Nothing to ship'}</span>
              )}
              {shipState.status === 'error' && (
                <span className="text-rose-400 text-[11px]">
                  <AlertCircle size={11} className="inline" /> {shipState.error?.slice(0, 80) || 'Error'}
                </span>
              )}
              {shipState.status !== 'idle' && (
                <button onClick={() => setShipState({ status: 'idle' })}
                  className="text-zinc-500 hover:text-zinc-300 text-[11px]" title="Dismiss ship result">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          {queue.length > 0 && (
            <div className="space-y-1">
              {queue.map(it => (
                <div key={it.id} className="flex items-center gap-2 px-2 py-1 bg-[#1a1d27] rounded text-[11px]">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">{it.kind}</span>
                  <code className="text-blue-400">{it.page || it.target || it.sourcePage}</code>
                  <span className="text-zinc-500">
                    {it.kind === 'content-rewrite' && (Array.isArray(it.contentType) ? `${it.contentType.length} sections` : it.contentType)}
                    {it.kind === 'orphan-fix' && `← ${it.sourcePage}`}
                    {it.kind === 'auto-rewrite' && `${Object.keys(it.rewrites || {}).length} sections`}
                  </span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{(it.stagedAt || '').slice(11, 19)}</span>
                  <button onClick={() => removeQueueItem(it.id)}
                    className="text-zinc-500 hover:text-rose-400 transition-colors" title="Remove from queue">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
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

          {tab === 'orphans' && <OrphanList items={data.orphanFixList || []} diffs={data.diffs || {}} expanded={expanded} setExpanded={setExpanded} siteOrigin={activeSite.gscUrl} siteId={activeSite.id} rankData={rankData} stageAction={stageAction} queue={queue} removeQueueItem={removeQueueItem} draftsByPage={draftsByPage} refreshDrafts={refreshDrafts} />}
          {tab === 'opportunities' && <OpportunitiesTable items={data.opportunities || []} diffs={data.diffs || {}} siteOrigin={activeSite.gscUrl} siteId={activeSite.id} rankData={rankData} stageAction={stageAction} queue={queue} removeQueueItem={removeQueueItem} draftsByPage={draftsByPage} refreshDrafts={refreshDrafts} />}
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
function FullPageDiff({ outline, rewriteStatus = {}, rewriteResult = {}, implementationLog = {}, onImplement, onImplementBatch, onEdit, siteId }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('diff'); // 'diff' | 'reading'
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
      <div className="w-full p-3 flex items-center gap-3 bg-[#1a1d27]">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-3 hover:bg-white/[0.02] flex-1 text-left">
          {open ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
          <span className="text-xs font-medium text-zinc-300">{view === 'reading' ? 'Full-page reading view' : 'Full-page diff'}</span>
          <span className="text-[10px] text-zinc-500">{outline.length} sections · {changedCount} with rewrites</span>
        </button>
        {open && (
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); setView('diff'); }}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${view === 'diff' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Side-by-side current vs proposed">
              Diff
            </button>
            <button onClick={(e) => { e.stopPropagation(); setView('reading'); }}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${view === 'reading' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Read the proposed page as flowing prose">
              Reading
            </button>
          </div>
        )}
      </div>
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
                <Inbox size={11} /> Queue {selected.size} selected
              </button>
            )}
            {batchStatus === 'running' && (
              <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                <Loader2 size={11} className="animate-spin" /> Adding to queue…
              </span>
            )}
            {batchStatus === 'done' && batchResult?.staged && (
              <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 text-amber-400 rounded text-[11px]">
                <Inbox size={11} /> Queued
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
      {open && view === 'reading' && (
        <div className="border-t border-[#2a2d3a] p-6 max-w-3xl mx-auto bg-[#0c0e14]">
          {outline.map((s, i) => {
            const proposed = s.hasRewrite ? (proposedFor(s) || '') : (s.currentEn || '');
            if (!proposed) return null;
            // Render each section as the closest natural HTML element by kind.
            // Meta keys get small label prefix so the user can spot them but
            // the body still reads as flowing prose.
            const kind = s.kind || '';
            const isHero = /title$/i.test(kind) && !/seo/i.test(kind);
            const isSeo = /seoDesc/i.test(kind);
            const isSubtitle = /subtitle/i.test(kind);
            const isH2 = /^(h2|.*Title)$/i.test(kind) && !isHero;
            const isLi = /^li/i.test(kind) || /\[\d+\]$/.test(s.key);
            const changed = s.hasRewrite;
            const ringCls = changed ? 'border-l-2 border-l-emerald-500/30 pl-3 -ml-3' : '';
            if (isHero) {
              return <h1 key={i} className={`text-2xl font-bold text-white mt-2 mb-3 ${ringCls}`}>{proposed}</h1>;
            }
            if (isSeo) {
              return (
                <p key={i} className={`text-[10px] uppercase tracking-wider text-zinc-600 mb-4 ${ringCls}`}>
                  meta description: <span className="text-zinc-400 normal-case tracking-normal italic">{proposed}</span>
                </p>
              );
            }
            if (isSubtitle) {
              return <p key={i} className={`text-base text-zinc-300 italic mb-4 ${ringCls}`}>{proposed}</p>;
            }
            if (isH2) {
              return <h2 key={i} className={`text-lg font-semibold text-white mt-5 mb-2 ${ringCls}`}>{proposed}</h2>;
            }
            if (isLi) {
              return <li key={i} className={`text-sm text-zinc-300 ml-4 mb-1 ${ringCls}`}>{proposed}</li>;
            }
            return <p key={i} className={`text-sm text-zinc-300 mb-3 leading-relaxed ${ringCls}`}>{proposed}</p>;
          })}
          <p className="text-[10px] text-zinc-600 mt-6 pt-4 border-t border-[#2a2d3a]">
            Reading view shows the proposed page as flowing prose. Sections with rewrites have a green left bar.
            Switch to <span className="text-blue-400">Diff</span> to compare line-by-line and edit.
          </p>
        </div>
      )}
      {open && view === 'diff' && (
        <div className="border-t border-[#2a2d3a] divide-y divide-[#2a2d3a]">
          {outline.map((s, i) => {
            const current = s.currentEn ?? '';
            const proposed = s.hasRewrite ? proposedFor(s) : current;
            const edited = s.hasRewrite && isEdited(s);
            const status = s.hasRewrite && s.contentType ? (rewriteStatus[s.contentType] || 'idle') : null;
            const result = s.hasRewrite && s.contentType ? rewriteResult[s.contentType] : null;
            const lastChange = (s.contentType && implementationLog[`type:${s.contentType}`]) || implementationLog[`key:${s.key}`];
            const isSelectable = s.hasRewrite && s.contentType && onImplementBatch;
            const isChecked = isSelectable && selected.has(s.contentType);
            const handleRowClick = () => isSelectable && toggle(s.contentType);
            return (
              <div
                key={i}
                onClick={isSelectable ? handleRowClick : undefined}
                className={`p-3 transition-colors border-l-4 ${
                  isChecked
                    ? 'bg-blue-500/[0.18] border-l-blue-400 ring-1 ring-inset ring-blue-400/30'
                    : s.hasRewrite
                      ? 'bg-emerald-500/[0.04] border-l-emerald-500/40'
                      : 'bg-[#0f1117] border-l-transparent'
                } ${isSelectable ? 'cursor-pointer hover:bg-blue-500/[0.10]' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
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
                      {s.link && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400" title={`Adds inbound link to ${s.link.target} with anchor "${s.link.anchor}"`}>
                          link → {s.link.target}
                        </span>
                      )}
                      {edited && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">edited</span>
                      )}
                      {lastChange && (
                        <a
                          href={lastChange.prUrl}
                          target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                          title={`Last shipped via PR #${lastChange.prNumber} on ${(lastChange.mergedAt || '').slice(0, 10)}`}
                        >
                          shipped {(lastChange.mergedAt || '').slice(0, 10)} #{lastChange.prNumber}
                        </a>
                      )}
                      <span className="text-[10px] text-zinc-600">{current.length} → {(proposed || '').length} chars</span>
                      {onImplement && s.contentType && (
                        <div className="ml-auto">
                          {/* Hide per-row Implement when any checkbox is selected — forces batch path */}
                          {selected.size > 0 && status === 'idle' && (
                            <span className="text-[10px] text-zinc-500 italic">in batch ({selected.size})</span>
                          )}
                          {status === 'idle' && selected.size === 0 && (
                            <button onClick={(e) => { e.stopPropagation(); onImplement(s.contentType); }} disabled={!siteId}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 text-blue-400 rounded text-[11px] transition-colors"
                              title="Add to queue — ship all together later for one PR/deploy">
                              <Inbox size={11} /> Queue
                            </button>
                          )}
                          {status === 'running' && (
                            <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                              <Loader2 size={11} className="animate-spin" /> Opening PR…
                            </span>
                          )}
                          {status === 'done' && result?.staged && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 text-amber-400 rounded text-[11px]" title="Staged — visible in the queue at top of page">
                              <Inbox size={11} /> Queued
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
                        onClick={(e) => e.stopPropagation()}
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

// Best-effort bucket classifier for an existing inbound anchor text. Mirrors the
// labels used by anchorVariants.js so we can compare current vs proposed.
// Heuristic, not perfect — labels like "branded" depend on the brand string;
// "longtail" requires the page's GSC queries to compare against.
function classifyAnchor(text, { topQuery, gscQueries = [], targetPath } = {}) {
  if (!text) return 'other';
  const t = text.toLowerCase().trim();
  // Naked URL — contains the site domain
  if (/montenegrocarhire\.com/.test(t) || /^https?:\/\//.test(t)) return 'nakedURL';
  // Branded — contains the brand
  if (/montenegro\s+car\s+hire/.test(t)) return 'branded';
  // Weak — generic call-to-action words (EN heuristics; covers majority)
  const WEAK = ['here', 'this guide', 'more details', 'see the page', 'read more', 'click here', 'this page', 'learn more', 'find out more'];
  if (WEAK.some(w => t === w || t === `"${w}"`)) return 'weak';
  // Exact — matches the top GSC query
  if (topQuery && t === topQuery.toLowerCase().trim()) return 'exact';
  // Longtail — matches another high-impression GSC query (not the top one)
  if (gscQueries.some(q => q.query && t === q.query.toLowerCase().trim())) return 'longtail';
  // Has a rental term?
  const hasRentalTerm = /(car rental|car hire|rent(?:al)?\b|hire\b|noleggio|mietwagen|location de voiture|wypożyczalnia|аренда|прокат)/i.test(t);
  if (!hasRentalTerm) return 'generic';
  // Has rental term but not exact-match → partial
  return 'partial';
}

const BUCKET_ORDER = ['exact', 'partial', 'branded', 'generic', 'contextual', 'longtail', 'nakedURL', 'weak', 'other'];
const BUCKET_COLOR = {
  exact: 'text-rose-400',
  partial: 'text-amber-400',
  branded: 'text-blue-400',
  generic: 'text-zinc-400',
  contextual: 'text-purple-400',
  longtail: 'text-emerald-400',
  nakedURL: 'text-cyan-400',
  weak: 'text-zinc-500',
  other: 'text-zinc-500',
};

function AnchorDistribution({ existing = [], proposed = [], topQuery, gscQueries = [], targetPath }) {
  // Tally existing
  const existingTally = {};
  for (const a of existing) {
    const bucket = classifyAnchor(a.text, { topQuery, gscQueries, targetPath });
    existingTally[bucket] = (existingTally[bucket] || 0) + (a.count || 1);
  }
  // Proposed: each item already carries an anchorLabel from the variants engine.
  // Fall back to classification if the label is missing.
  const proposedTally = {};
  for (const p of proposed) {
    const bucket = p.anchorLabel || classifyAnchor(p.anchor, { topQuery, gscQueries, targetPath });
    proposedTally[bucket] = (proposedTally[bucket] || 0) + 1;
  }
  const afterTally = { ...existingTally };
  for (const [k, v] of Object.entries(proposedTally)) afterTally[k] = (afterTally[k] || 0) + v;

  const totalExisting = Object.values(existingTally).reduce((a, b) => a + b, 0);
  const totalAfter = Object.values(afterTally).reduce((a, b) => a + b, 0);
  const allBuckets = BUCKET_ORDER.filter(b => existingTally[b] || proposedTally[b]);

  if (totalExisting === 0 && proposed.length === 0) return null;

  const Row = ({ label, tally, total, accent }) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20">{label}</span>
      <span className="text-[10px] text-zinc-500">({total})</span>
      {allBuckets.map(b => {
        const count = tally[b] || 0;
        if (count === 0) return null;
        return (
          <span key={b} className={`text-[10px] px-1.5 py-0.5 rounded bg-[#1a1d27] ${BUCKET_COLOR[b]} ${accent ? 'ring-1 ring-inset ring-current/20' : ''}`}>
            {b} <span className="text-zinc-300 font-medium">{count}</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="mt-3 pt-3 border-t border-[#2a2d3a] space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-zinc-300">Anchor distribution</p>
        <span className="text-[10px] text-zinc-600">classified by anchor pattern · use to fill gaps, not hit a target</span>
      </div>
      <Row label="Current" tally={existingTally} total={totalExisting} />
      {proposed.length > 0 && (
        <>
          <Row label="Queued (Δ)" tally={proposedTally} total={proposed.length} accent />
          <Row label="After ship" tally={afterTally} total={totalAfter} />
        </>
      )}
      <p className="text-[10px] text-zinc-600 pt-1">
        Buckets are heuristic. Goal is variety — Google&apos;s spam policy targets
        repeated exact-match commercial anchors, not link count. There is no
        published &quot;correct&quot; ratio.
      </p>
    </div>
  );
}

function AnchorMatrix({ matrix, activeLocale: controlledLocale, setActiveLocale: controlledSet }) {
  const [internalLocale, setInternalLocale] = useState('en');
  const activeLocale = controlledLocale ?? internalLocale;
  const setActiveLocale = controlledSet ?? setInternalLocale;
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
        Use different variants across the inbound links so the anchor text is varied.
        Google&apos;s spam policy flags repeated exact-match commercial anchors; mixing
        descriptive variants is consistent with their guidance to keep anchor text
        &quot;descriptive, reasonably concise, and relevant&quot;.
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

// One row in the suggested-source-pages list — informational only.
// Body content rewriting was removed; this just surfaces the (source → target,
// anchor) suggestion so the user knows which inbound links to add manually.
function CandidateSourceRow({ candidate: c, target: t, siteOrigin }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1a1d27] rounded text-xs">
      <PageLink path={c.sourcePage} siteOrigin={siteOrigin} className="text-blue-400 hover:text-blue-300 hover:underline" />
      <span className="text-zinc-600">→</span>
      <span className="text-zinc-400">anchor:</span>
      <code className="text-emerald-400">{`"${c.anchor}"`}</code>
      {c.anchorLabel && <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{c.anchorLabel}</span>}
      <span className="text-zinc-500 ml-auto">relevance {c.relevance}</span>
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

function OrphanRowExpanded({ t, siteOrigin, rankData, stageAction, queue, removeQueueItem }) {
  // Single locale state shared between the candidate suggestions and the
  // anchor-variants matrix below — switching the locale tab updates both.
  const [activeLocale, setActiveLocale] = useState('en');
  return (
    <div className="p-4 bg-[#0f1117] border-t border-[#2a2d3a] space-y-3">
      <div className="text-xs text-zinc-400">
        <span className="text-zinc-500">Top query:</span> {`"${t.topQuery}"`} · {t.topQueryImpressions} imp · pos {t.topQueryPosition?.toFixed?.(1) ?? t.topQueryPosition}
      </div>
      {(t.top3Queries?.length > 0) && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Rank history</span>
          <div className="flex-1 space-y-1.5">
            {rankData ? (
              <>
                {t.top3Queries.map((q, i) => (
                  <RankHistoryRow key={i} query={q.query} keywordData={rankData.keywords?.[q.query]} />
                ))}
                <p className="text-[10px] text-zinc-600">
                  Daily GSC position · last {rankData.dates?.length || 0}d · green = improving, red = dropping.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-zinc-500">Loading…</p>
            )}
          </div>
        </div>
      )}
      {t.recommendation && <div className="text-xs text-amber-400"><span className="text-zinc-500">Recommendation:</span> {t.recommendation}</div>}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-zinc-300">Suggested source pages</p>
          <span className="text-[10px] text-zinc-600">anchors shown in <span className="text-blue-400 uppercase">{activeLocale}</span> — switch via tabs below</span>
        </div>
        <div className="space-y-1">
          {t.candidateSources?.map(c => (
            <CandidateSourceRow
              key={c.sourcePage}
              candidate={c}
              target={t}
              siteOrigin={siteOrigin}
            />
          ))}
        </div>
      </div>
      <AnchorDistribution
        existing={t.inboundAnchors || []}
        proposed={t.candidateSources || []}
        topQuery={t.topQuery}
        gscQueries={t.top3Queries || []}
        targetPath={t.page}
      />
      {t.anchorMatrix && <AnchorMatrix matrix={t.anchorMatrix} activeLocale={activeLocale} setActiveLocale={setActiveLocale} />}
    </div>
  );
}

function OrphanList({ items, diffs, expanded, setExpanded, siteOrigin, siteId, rankData, stageAction, queue, removeQueueItem }) {
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
            {isOpen && <OrphanRowExpanded t={t} siteOrigin={siteOrigin} rankData={rankData} stageAction={stageAction} queue={queue} removeQueueItem={removeQueueItem} />}
          </div>
        );
      })}
    </div>
  );
}

// Sparkline rendering daily position over time. Inverts Y because lower
// position = better rank. Returns null if there's no usable history.
function RankSparkline({ positions = [], dates = [], width = 120, height = 28 }) {
  const valid = positions.map((p, i) => ({ p, i })).filter(x => x.p != null);
  if (valid.length < 2) return null;
  const allP = valid.map(x => x.p);
  const min = Math.min(...allP);
  const max = Math.max(...allP);
  const range = Math.max(max - min, 1);
  const n = positions.length;
  const points = valid.map(x => {
    const xPx = (x.i / Math.max(n - 1, 1)) * (width - 2) + 1;
    // Invert so lower position (better rank) is higher on screen
    const yPx = ((x.p - min) / range) * (height - 4) + 2;
    return [xPx, yPx];
  });
  const path = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
  const last = valid[valid.length - 1];
  const first = valid[0];
  const improving = last.p < first.p; // lower = better
  const stroke = improving ? '#34d399' : last.p > first.p ? '#fb7185' : '#71717a';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={stroke} />
      )}
    </svg>
  );
}

function RankHistoryRow({ query, keywordData }) {
  if (!keywordData) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <code className="text-zinc-300">{query}</code>
        <span className="text-zinc-600">— not in tracker</span>
      </div>
    );
  }
  const positions = keywordData.positions || [];
  const valid = positions.filter(p => p != null);
  const latest = keywordData.latestPosition;
  const best = keywordData.bestPosition;
  const delta7 = keywordData.posChange7d;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <code className="text-zinc-300 truncate flex-shrink-0 max-w-[260px]">{query}</code>
      <RankSparkline positions={positions} />
      <div className="flex items-center gap-2 text-zinc-500 flex-shrink-0">
        <span>now <span className="text-zinc-200">{latest?.toFixed?.(1) ?? '—'}</span></span>
        <span>best <span className="text-emerald-400">{best?.toFixed?.(1) ?? '—'}</span></span>
        <span>{valid.length}d</span>
        {delta7 != null && Math.abs(delta7) >= 0.5 && (
          <span className={delta7 < 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {delta7 < 0 ? <ArrowUp size={10} className="inline" /> : <ArrowDown size={10} className="inline" />}
            {Math.abs(delta7).toFixed(1)} 7d
          </span>
        )}
      </div>
    </div>
  );
}

function OpportunitiesTable({ items, diffs, siteOrigin, siteId, rankData, stageAction, draftsByPage = {}, refreshDrafts }) {
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
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <PageLink path={o.page} siteOrigin={siteOrigin} />
                      {draftsByPage[o.page] && (
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex items-center gap-1"
                          title={`Draft proposed by ${draftsByPage[o.page].proposedBy} on ${(draftsByPage[o.page].proposedAt || '').slice(0, 10)} — ${Object.keys(draftsByPage[o.page].rewrites || {}).length} keys`}
                        >
                          <Inbox size={9} /> draft
                        </span>
                      )}
                    </div>
                  </td>
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
                      <PageActionPanel opp={o} siteOrigin={siteOrigin} siteId={siteId} rankData={rankData} stageAction={stageAction} onDraftChange={refreshDrafts} />
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

function PageActionPanel({ opp, siteOrigin, siteId, rankData, stageAction, onDraftChange }) {
  const top3 = opp.top3Queries || [];
  const [rewritePlan, setRewritePlan] = useState(null);
  const [rewriteStatus, setRewriteStatus] = useState({}); // contentType → 'idle'|'running'|'done'|'error'
  const [rewriteResult, setRewriteResult] = useState({});
  const [autoRewriteSupported, setAutoRewriteSupported] = useState(false);
  const [pageConfig, setPageConfig] = useState(null); // { keys: { title, subtitle, seoDesc, h1 } }
  const [autoRewriteState, setAutoRewriteState] = useState({ status: 'idle' });
  // editedRewrites mirrors FullPageDiff's edits: { contentType: editedEnString }
  // Used when user clicks per-row Implement so we send the edited version.
  const [editedRewrites, setEditedRewrites] = useState({});
  // implementationLog: latestPerSection map keyed by 'type:CT' or 'key:I18N_KEY'
  const [implementationLog, setImplementationLog] = useState({});
  // Full timeline of every change logged for this page (PRs + manual notes)
  const [logEntries, setLogEntries] = useState([]);
  // Draft proposed by an external author (typically Claude in chat). Pre-fills
  // the manual-rewrite preview so user can review without copy-pasting.
  const [draft, setDraft] = useState(null);

  const refreshLog = async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/internal-links/log?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`);
      const j = await res.json();
      if (j.success) {
        setLogEntries(j.entries || []);
        setImplementationLog(j.latestPerSection || {});
      }
    } catch {}
  };

  const refreshDraft = async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/internal-links/draft?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`);
      const j = await res.json();
      if (j.success) setDraft(j.draft);
    } catch {}
    // Refresh parent's draft map so the per-row badge in All Pages updates
    onDraftChange?.();
  };

  // Load draft into the auto-rewrite preview state. The user reviews the
  // draft's content in the FullPageDiff exactly as if Claude had generated it,
  // edits if needed, then runs Translate / Queue / Ship.
  const reviewDraft = async () => {
    if (!draft || !siteId) return;
    setAutoRewriteState({ status: 'fetching' });
    try {
      // Fetch current EN values for the keys in the draft so we can show diff
      const res = await fetch('/api/internal-links/draft/load-current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, page: opp.page, keys: Object.keys(draft.rewrites) }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'failed to load current values');
      const outline = Object.entries(draft.rewrites).map(([key, proposedEn]) => {
        const link = (draft.jsxLinks || []).find(l => l.hostKey === key);
        return {
          key,
          kind: key.split('.').pop(),
          label: key.split('.').pop(),
          currentEn: j.currentValues?.[key] || '',
          proposedEn,
          hasRewrite: true,
          link, // { target, anchor, anchorMatrix? } if this key hosts a link
        };
      });
      const rewrites = {};
      for (const [key, en] of Object.entries(draft.rewrites)) rewrites[key] = { en };
      setAutoRewriteState({
        status: 'preview',
        rewrites,
        jsxLinks: draft.jsxLinks || [],
        outline,
        sectionCount: Object.keys(rewrites).length,
        manualMode: true,
        proposedBy: draft.proposedBy,
        proposedAt: draft.proposedAt,
        note: draft.note,
      });
    } catch (e) {
      setAutoRewriteState({ status: 'error', error: e.message });
    }
  };

  const discardDraft = async () => {
    if (!siteId) return;
    try {
      await fetch(`/api/internal-links/draft?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`, { method: 'DELETE' });
      setDraft(null);
      setAutoRewriteState({ status: 'idle' });
    } catch {}
  };

  // Lazy-load whether content rewrites are available + the current EN value
  useEffect(() => {
    let cancelled = false;
    const url = `/api/internal-links/implement-content?page=${encodeURIComponent(opp.page)}${siteId ? `&siteId=${siteId}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(j => { if (!cancelled) setRewritePlan(j.plan); })
      .catch(() => {});
    fetch(`/api/internal-links/auto-rewrite?page=${encodeURIComponent(opp.page)}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        setAutoRewriteSupported(!!j.supported);
        setPageConfig(j.config || null);
      })
      .catch(() => {});
    if (siteId) {
      // Pull any pending draft proposed by Claude (or another author)
      fetch(`/api/internal-links/draft?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`)
        .then(r => r.json())
        .then(j => { if (!cancelled && j.success) setDraft(j.draft); })
        .catch(() => {});
      fetch(`/api/internal-links/log?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`)
        .then(r => r.json())
        .then(j => {
          if (cancelled || !j.success) return;
          setLogEntries(j.entries || []);
          setImplementationLog(j.latestPerSection || {});
          if (Object.keys(j.latestPerSection || {}).length === 0 && (j.entries || []).length === 0) {
            // Empty for this page — trigger backfill, then re-fetch
            fetch('/api/internal-links/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siteId }),
            })
              .then(r => r.json())
              .then(b => {
                if (cancelled || !b.success || b.added === 0) return;
                return fetch(`/api/internal-links/log?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`)
                  .then(r => r.json())
                  .then(j2 => {
                    if (!cancelled && j2.success) {
                      setLogEntries(j2.entries || []);
                      setImplementationLog(j2.latestPerSection || {});
                    }
                  });
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
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

  // Step 2: user approved EN preview — STAGE (queue for batch ship)
  const runAutoRewriteApply = async () => {
    setAutoRewriteState(s => ({ ...s, status: 'applying' }));
    try {
      await stageAction({
        kind: 'auto-rewrite',
        page: opp.page,
        rewrites: autoRewriteState.rewrites,
        jsxLinks: autoRewriteState.jsxLinks || [],
        topQueries: autoRewriteState.topQueries,
        authMode: autoRewriteState.authMode,
        usage: autoRewriteState.usage,
      });
      // If this came from a draft, clear it now that it's queued
      if (autoRewriteState.manualMode && draft && siteId) {
        try {
          await fetch(`/api/internal-links/draft?siteId=${siteId}&page=${encodeURIComponent(opp.page)}`, { method: 'DELETE' });
          setDraft(null);
        } catch {}
      }
      setAutoRewriteState(s => ({ ...s, status: 'done', staged: true }));
    } catch (e) {
      setAutoRewriteState(s => ({ ...s, status: 'error', error: e.message }));
    }
  };

  // Optional step: translate the generated EN to other 6 locales (sections + bridges)
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
      // Stage instead of executing immediately
      const item = await stageAction({
        kind: 'content-rewrite', page: opp.page, contentType, overrides,
      });
      setRewriteResult(r => ({ ...r, [contentType]: { staged: true, id: item.id } }));
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
      {top3.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Rank history</span>
          <div className="flex-1 space-y-1.5">
            {rankData ? (
              <>
                {top3.map((q, i) => (
                  <RankHistoryRow key={i} query={q.query} keywordData={rankData.keywords?.[q.query]} />
                ))}
                <p className="text-[10px] text-zinc-600">
                  Daily GSC position from rank tracker · last {rankData.dates?.length || 0}d ·
                  green = improving, red = dropping. Open the
                  <a href={`/rank-tracker?kw=${encodeURIComponent(opp.topQuery || '')}`}
                    className="text-blue-400 hover:text-blue-300 ml-1">full rank tracker</a> for the chart.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-zinc-500">Loading…</p>
            )}
          </div>
        </div>
      )}
      {opp.actions?.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Actions</span>
          <ol className="flex-1 space-y-1.5">
            {opp.actions.map((a, i) => (
              <ActionRow
                key={i}
                action={a}
                pageConfig={pageConfig}
                siteId={siteId}
                page={opp.page}
                onDraftSaved={refreshDraft}
                onLogChange={refreshLog}
              />
            ))}
          </ol>
        </div>
      )}
      {pageConfig?.keys && (
        <MetaEditPanel
          pageConfig={pageConfig}
          siteId={siteId}
          page={opp.page}
          onDraftSaved={refreshDraft}
        />
      )}
      {(opp.inboundAnchors?.length > 0 || opp.outboundAnchors?.length > 0) && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-20 pt-0.5">Anchors</span>
          <div className="flex-1 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1">Inbound ({opp.inboundAnchors?.length || 0})</p>
              <div className="space-y-1">
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
              <div className="space-y-1">
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
      {/* Pending draft notice — shown when an external author (typically
          Claude in chat) has pushed a proposed rewrite for this page. */}
      {draft && autoRewriteState.status !== 'preview' && (
        <div className="border border-emerald-500/30 bg-emerald-500/[0.06] rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              Draft ready for review · proposed by {draft.proposedBy} · {(draft.proposedAt || '').slice(0, 10)}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={reviewDraft}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[11px] transition-colors">
                Review draft
              </button>
              <button onClick={discardDraft}
                className="text-zinc-500 hover:text-rose-400 text-[11px] px-2 py-1">
                Discard
              </button>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            {Object.keys(draft.rewrites || {}).length} key{Object.keys(draft.rewrites || {}).length === 1 ? '' : 's'} proposed for rewrite.
            {draft.note && <> {draft.note}</>}
          </p>
        </div>
      )}
      {/* Review-draft preview pane — opens when user clicks "Review draft" or
          (legacy) when auto-rewrite Generate runs. Shows the FullPageDiff with
          editable proposed values + Translate/Queue/Discard controls. */}
      {(autoRewriteState.status === 'preview' || autoRewriteState.status === 'translating' || autoRewriteState.status === 'applying') && (
        <div className="border border-emerald-500/30 bg-emerald-500/[0.04] rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              {autoRewriteState.manualMode ? 'Reviewing draft' : 'Review preview'}
              {autoRewriteState.translated && <span className="text-zinc-500 ml-2">· translated to 7 locales</span>}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {autoRewriteState.status === 'preview' && !autoRewriteState.translated && (
                <button onClick={runAutoRewriteTranslate}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded text-[11px] transition-colors">
                  <Sparkles size={11} /> Translate to 7 locales
                </button>
              )}
              {autoRewriteState.status === 'preview' && (
                <button onClick={runAutoRewriteApply}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-[11px] transition-colors">
                  <Inbox size={11} /> {autoRewriteState.translated ? 'Queue (7 locales)' : 'Queue (EN only)'}
                </button>
              )}
              {autoRewriteState.status === 'preview' && (
                <button onClick={runAutoRewriteCancel}
                  className="flex items-center gap-1 px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded text-[11px]">
                  Close
                </button>
              )}
              {autoRewriteState.status === 'translating' && (
                <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <Loader2 size={11} className="animate-spin" /> Translating to 6 locales…
                </span>
              )}
              {autoRewriteState.status === 'applying' && (
                <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                  <Loader2 size={11} className="animate-spin" /> Queueing…
                </span>
              )}
            </div>
          </div>
          {autoRewriteState.outline?.length > 0 && (
            <FullPageDiff
              outline={autoRewriteState.outline}
              onEdit={(key, value) => {
                setAutoRewriteState(s => {
                  const nextRewrites = { ...s.rewrites };
                  if (nextRewrites[key]) nextRewrites[key] = { ...nextRewrites[key], en: value };
                  const nextOutline = s.outline.map(o =>
                    o.key === key ? { ...o, proposedEn: value } : o
                  );
                  return { ...s, rewrites: nextRewrites, outline: nextOutline };
                });
              }}
            />
          )}
        </div>
      )}
      {/* Done state */}
      {autoRewriteState.status === 'done' && autoRewriteState.staged && (
        <div className="border border-amber-500/30 bg-amber-500/[0.04] rounded-lg p-3 flex items-center gap-2">
          <Inbox size={14} className="text-amber-400" />
          <span className="text-xs text-amber-400">Queued — see staged queue at top of page to ship</span>
          <button onClick={() => setAutoRewriteState({ status: 'idle' })}
            className="ml-auto text-[10px] px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-300">Dismiss</button>
        </div>
      )}
      {autoRewriteState.status === 'error' && (
        <div className="border border-rose-500/30 bg-rose-500/[0.04] rounded-lg p-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-rose-400" />
          <span className="text-xs text-rose-400">{autoRewriteState.error || 'Error'}</span>
          <button onClick={() => setAutoRewriteState({ status: 'idle' })}
            className="ml-auto text-[10px] px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-300">Dismiss</button>
        </div>
      )}
      {/* Hide the legacy hand-curated rewrite diff while the auto-rewrite
          preview is open — they show the same kind of diff and stacking both
          looks like a duplicated panel. The legacy one comes back when the
          user discards the auto-rewrite preview. */}
      {rewritePlan?.pageOutline?.length > 0 && autoRewriteState.status !== 'preview' && (
        <FullPageDiff
          outline={rewritePlan.pageOutline}
          rewriteStatus={rewriteStatus}
          rewriteResult={rewriteResult}
          implementationLog={implementationLog}
          onEdit={(key, value, contentType) => {
            if (contentType) setEditedRewrites(prev => ({ ...prev, [contentType]: value }));
          }}
          onImplement={runRewrite}
          onImplementBatch={async (contentTypes, overrides) => {
            // Stage as a single batch action
            const item = await stageAction({
              kind: 'content-rewrite', page: opp.page, contentType: contentTypes, overrides,
            });
            return { staged: true, id: item.id, prNumber: null, merged: null };
          }}
          siteId={siteId}
        />
      )}
      <ChangesPanel
        siteId={siteId}
        page={opp.page}
        entries={logEntries}
        onChange={refreshLog}
      />
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

// Changes timeline + manual-note adder per page. Shows shipped PRs (auto)
// and user notes (manual) sorted newest-first. The note form lets the user
// mark "I changed X on Y date" with optional tags so they can monitor
// outcomes after their own edits, not just shipped-by-tool changes.
// One row in the per-page Actions list. If the action targets a known
// editable field (meta description, title, h1), shows an "Edit" button
// that expands an inline editor: current value on top, textarea below
// to type the new value, Save → pushes to the per-page draft (so the
// existing Review-draft banner picks it up).
// Direct edit panel for the page's meta tags + h1 — always visible in the
// expanded row when the page is supported. Shows current EN values + an
// editable textarea for each. Each Save button pushes a single-key update
// to the page's draft (merging with whatever's already there). The Draft
// banner picks up the changes and the user can review/translate/ship.
function MetaEditPanel({ pageConfig, siteId, page, onDraftSaved }) {
  const [values, setValues] = useState({}); // { key: { current, edited, saving, saved, error } }
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const keys = pageConfig?.keys
    ? [
        { id: 'title', label: 'Page title (≤ 60 chars)', key: pageConfig.keys.title, max: 60 },
        { id: 'subtitle', label: 'Subtitle (≤ 70 chars)', key: pageConfig.keys.subtitle, max: 70 },
        { id: 'seoDesc', label: 'Meta description (140–160 chars)', key: pageConfig.keys.seoDesc, min: 140, max: 160 },
        { id: 'h1', label: 'H1 (rendered headline)', key: pageConfig.keys.h1, max: 90 },
      ]
    : [];

  useEffect(() => {
    if (!siteId || !pageConfig?.keys || loaded) return;
    let cancelled = false;
    const allKeys = keys.map(k => k.key);
    fetch('/api/internal-links/draft/load-current', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, keys: allKeys }),
    })
      .then(r => r.json())
      .then(j => {
        if (cancelled || !j.success) return;
        const init = {};
        for (const k of keys) {
          const cur = j.currentValues?.[k.key] || '';
          init[k.key] = { current: cur, edited: cur, saving: false, saved: false, error: null };
        }
        setValues(init);
        setLoaded(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, pageConfig?.keys?.title, pageConfig?.keys?.h1, loaded]);

  const setEdited = (key, val) => {
    setValues(v => ({ ...v, [key]: { ...v[key], edited: val, saved: false } }));
  };

  const save = async (key) => {
    const v = values[key];
    if (!v || v.edited === v.current || !v.edited?.trim()) return;
    setValues(prev => ({ ...prev, [key]: { ...prev[key], saving: true, error: null } }));
    try {
      // Merge with existing draft so multiple field edits accumulate
      const dRes = await fetch(`/api/internal-links/draft?siteId=${siteId}&page=${encodeURIComponent(page)}`);
      const dJ = await dRes.json();
      const existing = dJ?.draft?.rewrites || {};
      const rewrites = { ...existing, [key]: v.edited };
      const res = await fetch('/api/internal-links/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, page, rewrites,
          proposedBy: dJ?.draft?.proposedBy || 'manual-meta-edit',
          note: dJ?.draft?.note || 'Direct meta edits',
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'save failed');
      setValues(prev => ({
        ...prev,
        [key]: { ...prev[key], saving: false, saved: true, current: v.edited },
      }));
      onDraftSaved?.();
    } catch (e) {
      setValues(prev => ({ ...prev, [key]: { ...prev[key], saving: false, error: e.message } }));
    }
  };

  if (!pageConfig?.keys) return null;

  // Header is always visible; body collapsible
  const dirtyCount = Object.values(values).filter(v => v.edited !== v.current).length;
  const savedCount = Object.values(values).filter(v => v.saved && v.edited === v.current).length;

  return (
    <div className="border border-blue-500/20 bg-blue-500/[0.04] rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-2 hover:bg-blue-500/[0.06] transition-colors text-left">
        {expanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-blue-400" />}
        <span className="text-xs font-medium text-blue-400">Edit meta tags + H1</span>
        {!loaded && <span className="text-[10px] text-zinc-500">loading…</span>}
        {loaded && dirtyCount > 0 && (
          <span className="text-[10px] text-amber-400">{dirtyCount} unsaved edit{dirtyCount === 1 ? '' : 's'}</span>
        )}
        {loaded && savedCount > 0 && dirtyCount === 0 && (
          <span className="text-[10px] text-emerald-400">{savedCount} saved to draft</span>
        )}
        <span className="text-[10px] text-zinc-500 ml-auto">{keys.length} fields</span>
      </button>
      {expanded && loaded && (
        <div className="border-t border-blue-500/15 p-3 space-y-2">
          <p className="text-[10px] text-zinc-500">Side-by-side current (left) vs proposed (right). Edits save to the page draft, then Review draft above to translate + queue + ship.</p>
          {keys.map(k => {
            const v = values[k.key] || {};
            const len = (v.edited || '').length;
            const overMax = k.max && len > k.max;
            const underMin = k.min && len < k.min;
            const dirty = v.edited !== v.current;
            return (
              <div key={k.id} className="bg-[#0f1117] rounded p-2 space-y-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-zinc-400 font-medium">{k.label}</span>
                  <code className="text-[10px] text-zinc-600">{k.key}</code>
                  <span className="ml-auto text-[10px] text-zinc-500">
                    {len} chars
                    {overMax && <span className="text-rose-400 ml-1">over {k.max}</span>}
                    {underMin && !overMax && <span className="text-amber-400 ml-1">below {k.min}</span>}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-[11px] p-1.5 bg-rose-500/[0.04] border border-rose-500/15 rounded">
                    <p className="text-[9px] uppercase tracking-wider text-rose-400/60 mb-1">Current</p>
                    <p className="text-zinc-400 italic whitespace-pre-wrap">{v.current || <span className="text-zinc-600">— (empty)</span>}</p>
                  </div>
                  <div className="text-[11px] p-1.5 bg-emerald-500/[0.04] border border-emerald-500/15 rounded">
                    <p className="text-[9px] uppercase tracking-wider text-emerald-400/60 mb-1">Proposed (editable)</p>
                    <textarea
                      value={v.edited ?? ''}
                      onChange={(e) => setEdited(k.key, e.target.value)}
                      rows={Math.max(2, Math.min(5, Math.ceil(len / 70)))}
                      className="w-full bg-transparent text-zinc-300 resize-y outline-none focus:bg-[#1a1d27] focus:rounded focus:px-1 focus:py-0.5 transition-all"
                      spellCheck="false"
                      placeholder="Type your new version here…"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 text-[10px]">
                  {v.error && <span className="text-rose-400">{v.error}</span>}
                  {v.saved && !dirty && <span className="text-emerald-400">✓ saved to draft</span>}
                  <button
                    onClick={() => save(k.key)}
                    disabled={v.saving || !dirty || !v.edited?.trim()}
                    className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-400 transition-colors"
                  >
                    {v.saving ? <Loader2 size={10} className="animate-spin inline" /> : (dirty ? 'Save to draft' : 'Saved')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionRow({ action: a, pageConfig, siteId, page, onDraftSaved, onLogChange }) {
  const [open, setOpen] = useState(false);
  const [proposed, setProposed] = useState('');
  const [current, setCurrent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [marking, setMarking] = useState(false);
  const [doneAt, setDoneAt] = useState(null); // local-only flag after marking done this session
  const [error, setError] = useState(null);

  // Map action text → which i18n key to edit. Returns null if the action
  // isn't directly editable (e.g. "Audit page depth" — informational).
  const targetKey = (() => {
    if (!pageConfig?.keys) return null;
    const t = (a.action || '').toLowerCase();
    if (/meta description/.test(t)) return pageConfig.keys.seoDesc;
    if (/title tag|title is/.test(t)) return pageConfig.keys.title;
    if (/\bh1\b|headline/.test(t)) return pageConfig.keys.h1;
    if (/subtitle/.test(t)) return pageConfig.keys.subtitle;
    return null;
  })();

  const openEditor = async () => {
    if (!targetKey) return;
    setOpen(true);
    if (current) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/internal-links/draft/load-current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, keys: [targetKey] }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'failed to load current');
      setCurrent(j.currentValues?.[targetKey] || '');
      setProposed(j.currentValues?.[targetKey] || '');
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const save = async () => {
    if (!proposed.trim() || proposed === current) return;
    setSaving(true);
    setError(null);
    try {
      // Merge with any existing draft for this page so multiple action edits
      // accumulate into one draft instead of overwriting each other.
      const dRes = await fetch(`/api/internal-links/draft?siteId=${siteId}&page=${encodeURIComponent(page)}`);
      const dJ = await dRes.json();
      const existingRewrites = dJ?.draft?.rewrites || {};
      const rewrites = { ...existingRewrites, [targetKey]: proposed };
      const res = await fetch('/api/internal-links/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, page, rewrites,
          proposedBy: 'manual-action-edit',
          note: dJ?.draft?.note || 'Edits via Actions panel',
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'save failed');
      setSaved(true);
      onDraftSaved?.();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const markDone = async () => {
    if (marking) return;
    setMarking(true);
    setError(null);
    try {
      const res = await fetch('/api/internal-links/log/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId, page,
          note: `Done: ${a.action}`,
          tags: ['action-done', a.priority || 'unknown'],
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'mark failed');
      setDoneAt(new Date().toISOString().slice(0, 16).replace('T', ' '));
      onLogChange?.();
    } catch (e) { setError(e.message); }
    setMarking(false);
  };

  return (
    <li className="text-xs">
      <div className={`flex items-start gap-2 ${doneAt ? 'opacity-60' : ''}`}>
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${a.priority === 'high' ? 'bg-amber-500/15 text-amber-400' : a.priority === 'med' ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-700/30 text-zinc-500'}`}>
          {a.priority}
        </span>
        <span className={`flex-1 ${doneAt ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{a.action}</span>
        {doneAt && (
          <span className="text-[10px] text-emerald-400 flex items-center gap-1" title={`Logged at ${doneAt}`}>
            <Check size={10} /> done
          </span>
        )}
        {!doneAt && targetKey && !open && (
          <button onClick={openEditor}
            className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-colors">
            {saved ? 'Saved · Edit again' : 'Edit'}
          </button>
        )}
        {!doneAt && targetKey && open && (
          <button onClick={() => setOpen(false)}
            className="text-[10px] px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-300">
            Close
          </button>
        )}
        {!doneAt && (
          <button onClick={markDone} disabled={marking}
            title="Log this action as completed in the Changes timeline"
            className="text-[10px] px-2 py-0.5 rounded text-zinc-500 hover:text-emerald-400 transition-colors">
            {marking ? <Loader2 size={10} className="animate-spin" /> : 'Mark done'}
          </button>
        )}
      </div>
      {open && targetKey && (
        <div className="ml-12 mt-2 p-2 rounded bg-[#0f1117] border border-[#2a2d3a] space-y-2">
          {loading && <p className="text-[11px] text-zinc-500">Loading current value…</p>}
          {!loading && (
            <>
              <div className="text-[11px]">
                <p className="text-[9px] uppercase tracking-wider text-rose-400/60 mb-1">Current ({targetKey})</p>
                <p className="text-zinc-400 italic">{current || <span className="text-zinc-600">— (empty)</span>}</p>
              </div>
              <div className="text-[11px]">
                <p className="text-[9px] uppercase tracking-wider text-emerald-400/60 mb-1">Proposed (editable)</p>
                <textarea
                  value={proposed}
                  onChange={(e) => { setProposed(e.target.value); setSaved(false); }}
                  rows={Math.max(2, Math.min(6, Math.ceil((proposed?.length || 1) / 70)))}
                  className="w-full bg-[#1a1d27] border border-[#2a2d3a] rounded px-2 py-1 text-zinc-300 outline-none focus:border-blue-500/50"
                  spellCheck="false"
                  placeholder="Type your new version here…"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-zinc-600">
                    {proposed.length} chars
                    {targetKey === pageConfig?.keys?.title && proposed.length > 60 && <span className="text-amber-400 ml-2">over 60-char title limit</span>}
                    {targetKey === pageConfig?.keys?.seoDesc && (proposed.length < 140 || proposed.length > 160) && <span className="text-amber-400 ml-2">outside 140-160 meta description range</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {error && <span className="text-[10px] text-rose-400">{error}</span>}
                    {saved && <span className="text-[10px] text-emerald-400">✓ saved to draft</span>}
                    <button onClick={save} disabled={saving || !proposed.trim() || proposed === current}
                      className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-400 transition-colors">
                      {saving ? <Loader2 size={10} className="animate-spin inline" /> : 'Save to draft'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function ChangesPanel({ siteId, page, entries = [], onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteTags, setNoteTags] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  // Sort entries: by changeDate (manual) or mergedAt (auto), newest first
  const sorted = [...entries].sort((a, b) => {
    const dateA = a.changeDate || (a.mergedAt || '').slice(0, 10) || (a.loggedAt || '').slice(0, 10);
    const dateB = b.changeDate || (b.mergedAt || '').slice(0, 10) || (b.loggedAt || '').slice(0, 10);
    return dateB.localeCompare(dateA);
  });

  const addNote = async (e) => {
    e?.preventDefault?.();
    if (!noteText.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const tags = noteTags.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/internal-links/log/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, page, note: noteText, changeDate: noteDate, tags }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'add failed');
      setNoteText('');
      setNoteTags('');
      setNoteDate(new Date().toISOString().slice(0, 10));
      onChange?.();
    } catch (e) {
      setError(e.message);
    }
    setAdding(false);
  };

  const removeNote = async (id) => {
    try {
      const res = await fetch(`/api/internal-links/log/note?siteId=${siteId}&id=${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) onChange?.();
    } catch {}
  };

  return (
    <div className="border border-[#2a2d3a] rounded-lg p-3 bg-[#0f1117]">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-xs text-zinc-300 hover:text-white text-left">
        {expanded ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
        <span className="font-medium">Changes timeline</span>
        <span className="text-[10px] text-zinc-500">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
        {sorted[0] && (
          <span className="text-[10px] text-zinc-600 ml-auto">
            last: {sorted[0].changeDate || (sorted[0].mergedAt || '').slice(0, 10)}
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Add note form */}
          <form onSubmit={addNote} className="bg-[#1a1d27] rounded p-2.5 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Mark a change you made</p>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. Rewrote intro paragraph, added schedule of opening hours, fixed typo in H2"
              rows={2}
              className="w-full text-[11px] bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1 outline-none focus:border-blue-500/50"
              spellCheck="false"
            />
            <div className="flex items-center gap-2 text-[11px]">
              <label className="flex items-center gap-1 text-zinc-500">
                Date
                <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                  className="bg-[#0f1117] border border-[#2a2d3a] rounded px-1.5 py-0.5 text-zinc-300 outline-none focus:border-blue-500/50" />
              </label>
              <label className="flex items-center gap-1 text-zinc-500 flex-1">
                Tags
                <input type="text" value={noteTags} onChange={e => setNoteTags(e.target.value)}
                  placeholder="rewrite, links (comma-separated)"
                  className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded px-1.5 py-0.5 text-zinc-300 outline-none focus:border-blue-500/50" />
              </label>
              <button type="submit" disabled={adding || !noteText.trim()}
                className="flex items-center gap-1 px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 text-blue-400 rounded transition-colors">
                {adding ? <><Loader2 size={11} className="animate-spin" /> Adding…</> : 'Add note'}
              </button>
            </div>
            {error && <p className="text-[10px] text-rose-400">{error}</p>}
          </form>

          {/* Timeline */}
          {sorted.length === 0 ? (
            <p className="text-[11px] text-zinc-500 italic">No changes recorded yet for this page.</p>
          ) : (
            <div className="space-y-1.5">
              {sorted.map((e, i) => (
                <div key={e.id || i} className="flex items-start gap-2 px-2 py-1.5 bg-[#1a1d27] rounded text-[11px]">
                  <span className="text-[10px] text-zinc-500 w-20 flex-shrink-0">
                    {e.changeDate || (e.mergedAt || '').slice(0, 10) || (e.loggedAt || '').slice(0, 10)}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                    e.kind === 'manual-note' ? 'bg-purple-500/15 text-purple-400'
                    : e.kind === 'auto-rewrite' ? 'bg-blue-500/15 text-blue-400'
                    : e.kind === 'orphan-fix' ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-zinc-700/30 text-zinc-400'
                  }`}>{e.kind === 'manual-note' ? 'note' : e.kind}</span>
                  <div className="flex-1 min-w-0">
                    {e.note && <p className="text-zinc-300">{e.note}</p>}
                    {e.contentType && <code className="text-[10px] text-zinc-500">{e.contentType}</code>}
                    {e.target && <span className="text-zinc-500"> → <code className="text-blue-400">{e.target}</code></span>}
                    {e.tags?.length > 0 && (
                      <span className="ml-2">
                        {e.tags.map(t => <span key={t} className="text-[9px] mr-1 px-1 py-0.5 rounded bg-zinc-700/30 text-zinc-400">{t}</span>)}
                      </span>
                    )}
                  </div>
                  {e.prUrl && (
                    <a href={e.prUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300">PR #{e.prNumber}</a>
                  )}
                  {e.kind === 'manual-note' && (
                    <button onClick={() => removeNote(e.id)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors flex-shrink-0" title="Remove note">
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
