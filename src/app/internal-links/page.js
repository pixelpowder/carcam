'use client';

// Stripped-back Internal Links view: a Timeline of every change that has
// landed on the site, plus the ability to add manual notes per page.
// Everything else (orphan-fix list, opportunities table, queue, drafts,
// auto-rewrite, MetaEdit, FullPageDiff, ship button) was archived to
// page.archived.jsx.txt — recoverable via git history.
//
// Reads:
//   GET /api/internal-links/log?siteId=...           (every entry, newest first)
// Writes:
//   POST /api/internal-links/log    { siteId }       (sync from GitHub PRs)
//   POST /api/internal-links/log/note                (add manual note)
//   PUT  /api/internal-links/log/note                (edit manual note)
//   DELETE /api/internal-links/log/note?siteId=&id=  (delete manual note)

import { useState, useEffect, useMemo } from 'react';
import { useSite } from '@/context/SiteContext';
import {
  Loader2, GitPullRequest, Plus, Save, Trash2, ExternalLink,
  RefreshCw, Pencil, Check, X, Inbox, Link2,
} from 'lucide-react';
import { OrphanList, suggestionDoneTags } from './_components';

export default function InternalLinksPage() {
  const { activeSite } = useSite();
  const siteId = activeSite?.id;
  const siteOrigin = activeSite?.gscUrl;
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle' });
  const [filter, setFilter] = useState('all'); // all | prs | notes
  const [search, setSearch] = useState('');
  // Recommendations: latest analysis snapshot (orphan-fix list) + rank tracker
  // data so we can render position trends per orphan target. Both fetched
  // read-only — no analysis re-runs from this view.
  const [snapshot, setSnapshot] = useState(null);
  const [rankData, setRankData] = useState(null);
  const [showRecs, setShowRecs] = useState(true);
  // Open + recently-merged PRs for the site repo. Surfaced at the top so user
  // always knows what's in flight and can click straight through to merge.
  const [prs, setPrs] = useState({ open: [], recentMerged: [] });

  const refresh = async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/internal-links/log?siteId=${siteId}`);
      const j = await res.json();
      if (j.success) setEntries(j.entries || []);
    } catch {}
    setLoading(false);
  };

  // Pull the latest stored snapshot (orphan-fix recommendations) for the site.
  // Doesn't trigger a re-analysis — that's a separate operation handled
  // elsewhere. Just reads what's already on disk/blob.
  const refreshRecs = async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/internal-links?siteId=${siteId}`);
      const j = await res.json();
      if (j.success) setSnapshot(j.snapshot || null);
    } catch {}
  };

  // Rank tracker keyword history (separate route). Used by OrphanRowExpanded
  // to draw sparklines next to each top GSC query.
  const refreshRanks = async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/rank-tracking?siteId=${siteId}`);
      const j = await res.json();
      if (j.success) setRankData(j);
    } catch {}
  };

  const refreshPrs = async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/internal-links/prs?siteId=${siteId}`);
      const j = await res.json();
      if (j.success) setPrs({ open: j.open || [], recentMerged: j.recentMerged || [] });
    } catch {}
  };

  useEffect(() => {
    refresh();
    refreshRecs();
    refreshRanks();
    refreshPrs();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [siteId]);

  const syncFromGitHub = async () => {
    if (!siteId) return;
    setSyncStatus({ status: 'running' });
    try {
      const res = await fetch('/api/internal-links/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      const j = await res.json();
      if (j.success) {
        setSyncStatus({ status: 'done', added: j.added ?? 0, total: j.total ?? 0 });
        await refresh();
      } else {
        setSyncStatus({ status: 'error', error: j.error || 'sync failed' });
      }
    } catch (e) {
      setSyncStatus({ status: 'error', error: e.message });
    }
  };

  // Group: page → newest entries first.
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byPage = new Map();
    for (const e of entries) {
      if (filter === 'prs' && e.kind === 'manual-note') continue;
      if (filter === 'notes' && e.kind !== 'manual-note') continue;
      if (q) {
        const hay = `${e.page} ${e.note || ''} ${e.contentType || ''} ${(e.i18nKeys || []).join(' ')} ${e.prNumber || ''}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (!byPage.has(e.page)) byPage.set(e.page, []);
      byPage.get(e.page).push(e);
    }
    // Sort pages by their most recent change date desc.
    const arr = [...byPage.entries()].map(([page, list]) => ({
      page,
      list,
      latest: list[0]?.loggedAt || list[0]?.mergedAt || list[0]?.changeDate || '',
    }));
    arr.sort((a, b) => b.latest.localeCompare(a.latest));
    return arr;
  }, [entries, filter, search]);

  const totalChanges = entries.length;
  const totalPages = grouped.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Internal Links · Timeline</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Read-only log of every SEO change merged to <code className="text-blue-400">{activeSite?.gscUrl || siteId}</code>,
            plus any manual notes you add.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={!siteId || loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1d27] hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 rounded text-xs disabled:opacity-50"
            title="Refresh from local store"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={syncFromGitHub}
            disabled={!siteId || syncStatus.status === 'running'}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded text-xs disabled:opacity-50"
            title="Pull recent merged PRs from GitHub and add any missing entries"
          >
            {syncStatus.status === 'running'
              ? <><Loader2 size={12} className="animate-spin" /> Syncing…</>
              : <><GitPullRequest size={12} /> Sync from GitHub</>}
          </button>
        </div>
      </div>

      {/* In-flight PRs — direct link to GitHub merge UI for each */}
      {siteId && (prs.open.length > 0 || prs.recentMerged.length > 0) && (
        <div className="border border-amber-500/30 bg-amber-500/[0.04] rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-amber-500/[0.08] flex items-center gap-2 border-b border-amber-500/20">
            <GitPullRequest size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              {prs.open.length} open PR{prs.open.length === 1 ? '' : 's'}
              {prs.recentMerged.length > 0 && (
                <span className="text-zinc-500 font-normal ml-2">
                  · {prs.recentMerged.length} recently merged
                </span>
              )}
            </span>
            <button
              onClick={refreshPrs}
              className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-200 px-2 py-0.5"
              title="Refresh from GitHub">
              refresh
            </button>
          </div>
          <div className="divide-y divide-amber-500/10">
            {prs.open.map(pr => (
              <a key={pr.number}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 flex items-center gap-2 text-xs hover:bg-amber-500/[0.04] transition-colors">
                <span className="text-[10px] font-mono text-amber-400 w-12 flex-shrink-0">#{pr.number}</span>
                {pr.draft && <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-zinc-500/15 text-zinc-400">draft</span>}
                <span className="text-zinc-200 flex-1 truncate" title={pr.title}>{pr.title}</span>
                <code className="text-[10px] text-zinc-500 hidden md:block">{pr.branch}</code>
                <span className="text-[10px] text-zinc-600">{(pr.updatedAt || '').slice(0, 10)}</span>
                <span className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-[11px] ml-2 flex-shrink-0">
                  open / merge <ExternalLink size={10} />
                </span>
              </a>
            ))}
            {prs.recentMerged.map(pr => (
              <a key={pr.number}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 flex items-center gap-2 text-xs hover:bg-emerald-500/[0.03] transition-colors opacity-70">
                <span className="text-[10px] font-mono text-emerald-400 w-12 flex-shrink-0">#{pr.number}</span>
                <span className="text-[9px] uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400">merged</span>
                <span className="text-zinc-300 flex-1 truncate" title={pr.title}>{pr.title}</span>
                <span className="text-[10px] text-zinc-600">{(pr.mergedAt || '').slice(0, 10)}</span>
                <span className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] ml-2 flex-shrink-0">
                  view <ExternalLink size={10} />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {syncStatus.status === 'done' && (
        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded p-2">
          Sync complete · {syncStatus.added} new entries from {syncStatus.total} merged PRs
        </div>
      )}
      {syncStatus.status === 'error' && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded p-2">
          Sync failed · {syncStatus.error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex bg-[#0f1117] border border-[#2a2d3a] rounded overflow-hidden">
          {['all', 'prs', 'notes'].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 transition-colors ${filter === f ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {f === 'all' ? 'All' : f === 'prs' ? 'PRs only' : 'Notes only'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by page, note, key…"
          className="flex-1 px-3 py-1 bg-[#0f1117] border border-[#2a2d3a] rounded text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500/40"
        />
        <span className="text-[10px] text-zinc-600">
          {totalChanges} change{totalChanges === 1 ? '' : 's'} across {totalPages} page{totalPages === 1 ? '' : 's'}
        </span>
      </div>

      {/* Recommendations — orphan-fix list with anchor variants. Read-only;
          shows what inbound links the analysis suggests adding so you can
          plan the next PR. Collapsible because it can get long. */}
      {siteId && snapshot?.orphanFixList?.length > 0 && (
        <div className="border border-[#2a2d3a] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRecs(s => !s)}
            className="w-full px-3 py-2.5 bg-[#1a1d27] hover:bg-white/[0.02] flex items-center gap-2 text-left">
            <Link2 size={14} className="text-purple-400" />
            <span className="text-xs font-medium text-zinc-200">
              Recommendations
            </span>
            <span className="text-[10px] text-zinc-500">
              {snapshot.orphanFixList.length} orphan target{snapshot.orphanFixList.length === 1 ? '' : 's'} ·{' '}
              {snapshot.orphanFixList.reduce((s, t) => s + (t.candidateSources?.length || 0), 0)} suggested inbound link{snapshot.orphanFixList.reduce((s, t) => s + (t.candidateSources?.length || 0), 0) === 1 ? '' : 's'}
            </span>
            <span className="ml-auto text-[10px] text-zinc-600">
              {showRecs ? 'hide' : 'show'}
            </span>
          </button>
          {showRecs && (
            <div className="p-3 bg-[#0c0e14] space-y-3">
              <p className="text-[11px] text-zinc-500">
                Pages with traffic but few inbound links, ranked by impact. Each row expands to
                show the suggested source pages, anchor text per locale, and rank history.
                These are <span className="text-zinc-300">read-only suggestions</span> — implement
                them by editing source files directly and opening a PR (see PR #6 for the workflow).
              </p>
              <OrphanList
                items={snapshot.orphanFixList}
                diffs={snapshot.diffs || {}}
                siteOrigin={siteOrigin}
                rankData={rankData}
                doneEntries={entries}
                onMarkDone={async (candidate, target) => {
                  // Persist as a manual note in the implementation log so it
                  // appears in the timeline AND can be matched back to this
                  // recommendation row via tags.
                  try {
                    const res = await fetch('/api/internal-links/log/note', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        siteId,
                        page: target,
                        note: `Inbound link from ${candidate.sourcePage} added with anchor "${candidate.anchor}"`,
                        tags: suggestionDoneTags(target, candidate.sourcePage),
                      }),
                    });
                    const j = await res.json();
                    if (!res.ok || !j.success) {
                      console.error('[mark-done] POST failed:', res.status, j);
                      alert(`Couldn't mark done: ${j.error || res.statusText || 'unknown error'}`);
                      return;
                    }
                  } catch (e) {
                    console.error('[mark-done] fetch threw:', e);
                    alert(`Couldn't mark done: ${e.message}`);
                    return;
                  }
                  await refresh();
                }}
                onUnmarkDone={async (entry) => {
                  if (!entry?.id) return;
                  try {
                    const res = await fetch(`/api/internal-links/log/note?siteId=${siteId}&id=${entry.id}`, { method: 'DELETE' });
                    const j = await res.json();
                    if (!res.ok || !j.success) {
                      console.error('[unmark-done] DELETE failed:', res.status, j);
                      alert(`Couldn't undo: ${j.error || res.statusText || 'unknown error'}`);
                      return;
                    }
                  } catch (e) {
                    console.error('[unmark-done] fetch threw:', e);
                    alert(`Couldn't undo: ${e.message}`);
                    return;
                  }
                  await refresh();
                }}
              />
            </div>
          )}
        </div>
      )}

      {!siteId && (
        <div className="text-center py-12 text-sm text-zinc-500 border border-dashed border-[#2a2d3a] rounded-lg">
          Pick a site to see its timeline.
        </div>
      )}
      {siteId && !loading && grouped.length === 0 && (
        <div className="text-center py-12 text-sm text-zinc-500 border border-dashed border-[#2a2d3a] rounded-lg">
          No timeline entries yet · click <span className="text-blue-400">Sync from GitHub</span> to backfill from PR history,
          or add a manual note on a page below.
        </div>
      )}

      <div className="space-y-3">
        {grouped.map(({ page, list }) => (
          <PageBlock key={page} page={page} entries={list} siteId={siteId} onChange={refresh} />
        ))}
      </div>
    </div>
  );
}

function PageBlock({ page, entries, siteId, onChange }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="border border-[#2a2d3a] rounded-lg overflow-hidden bg-[#0f1117]">
      <div className="px-3 py-2 bg-[#1a1d27] flex items-center gap-2 border-b border-[#2a2d3a]">
        <code className="text-sm text-blue-400">{page}</code>
        <span className="text-[10px] text-zinc-600">{entries.length} change{entries.length === 1 ? '' : 's'}</span>
        <button onClick={() => setAdding(true)}
          className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
          title="Add a manual note for this page">
          <Plus size={10} /> Note
        </button>
      </div>
      <div className="divide-y divide-[#2a2d3a]">
        {adding && (
          <NoteEditor
            siteId={siteId}
            page={page}
            onCancel={() => setAdding(false)}
            onSaved={() => { setAdding(false); onChange?.(); }}
          />
        )}
        {entries.map((e, i) => (
          <EntryRow key={e.id || `${e.prNumber}-${i}`} entry={e} siteId={siteId} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function EntryRow({ entry: e, siteId, onChange }) {
  const [editing, setEditing] = useState(false);
  if (editing && e.kind === 'manual-note') {
    return (
      <NoteEditor
        siteId={siteId}
        page={e.page}
        existing={e}
        onCancel={() => setEditing(false)}
        onSaved={() => { setEditing(false); onChange?.(); }}
      />
    );
  }

  // PR entries (auto-logged from a merged shipping PR)
  if (e.prNumber) {
    return (
      <div className="px-3 py-2 flex items-center gap-2 text-xs">
        <DateBadge date={e.mergedAt || e.loggedAt} />
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
          {e.kind || 'pr'}
        </span>
        {e.contentType && <code className="text-emerald-400">{e.contentType}</code>}
        {e.sourcePage && <span className="text-zinc-500">← <code className="text-blue-400">{e.sourcePage}</code></span>}
        {(e.i18nKeys?.length > 0) && (
          <span className="text-[10px] text-zinc-500" title={e.i18nKeys.join(', ')}>
            {e.i18nKeys.length} key{e.i18nKeys.length === 1 ? '' : 's'}
          </span>
        )}
        <a href={e.prUrl || '#'} target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-zinc-500 hover:text-blue-400 transition-colors">
          PR #{e.prNumber} <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  // Manual note
  return (
    <div className="px-3 py-2 flex items-start gap-2 text-xs group">
      <DateBadge date={e.changeDate || e.loggedAt} />
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex-shrink-0">
        note
      </span>
      <span className="flex-1 text-zinc-300 whitespace-pre-wrap leading-snug">{e.note}</span>
      {(e.tags?.length > 0) && (
        <div className="flex gap-1 flex-shrink-0">
          {e.tags.map(t => (
            <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-[#1a1d27] text-zinc-500">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => setEditing(true)} className="p-1 text-zinc-500 hover:text-zinc-200" title="Edit">
          <Pencil size={10} />
        </button>
        <button
          onClick={async () => {
            if (!confirm('Delete this note?')) return;
            await fetch(`/api/internal-links/log/note?siteId=${siteId}&id=${e.id}`, { method: 'DELETE' });
            onChange?.();
          }}
          className="p-1 text-zinc-500 hover:text-rose-400" title="Delete">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

function NoteEditor({ siteId, page, existing = null, onCancel, onSaved }) {
  const [note, setNote] = useState(existing?.note || '');
  const [changeDate, setChangeDate] = useState(existing?.changeDate || new Date().toISOString().slice(0, 10));
  const [tagsInput, setTagsInput] = useState((existing?.tags || []).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    if (!note.trim()) { setError('Note is required'); return; }
    setBusy(true);
    setError(null);
    try {
      const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
      const body = { siteId, page, note: note.trim(), changeDate, tags };
      const url = '/api/internal-links/log/note';
      const method = existing ? 'PUT' : 'POST';
      const payload = existing ? { ...body, id: existing.id } : body;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'save failed');
      onSaved?.();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="px-3 py-2 bg-emerald-500/[0.03] border-l-2 border-l-emerald-500/40">
      <div className="flex items-center gap-2 mb-2">
        <Inbox size={12} className="text-emerald-400" />
        <span className="text-[10px] uppercase tracking-wider text-emerald-400">
          {existing ? 'Edit note' : 'Add note'} for <code className="text-emerald-300">{page}</code>
        </span>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
        autoFocus
        placeholder="Describe the change you made…"
        className="w-full text-xs bg-[#0f1117] border border-[#2a2d3a] rounded p-2 text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/40"
      />
      <div className="flex items-center gap-2 mt-2 text-xs">
        <label className="text-zinc-500 text-[10px]">Date</label>
        <input
          type="date"
          value={changeDate}
          onChange={e => setChangeDate(e.target.value)}
          className="bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1 text-zinc-300 text-[11px] outline-none focus:border-emerald-500/40"
        />
        <input
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          placeholder="tags (comma-separated)"
          className="flex-1 bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1 text-zinc-300 text-[11px] placeholder-zinc-600 outline-none focus:border-emerald-500/40"
        />
        {error && <span className="text-rose-400 text-[10px]">{error}</span>}
        <button onClick={save} disabled={busy}
          className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-[11px] transition-colors disabled:opacity-50">
          {busy ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
          Save
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1 px-2 py-1 text-zinc-500 hover:text-zinc-200 rounded text-[11px]">
          <X size={10} /> Cancel
        </button>
      </div>
    </div>
  );
}

function DateBadge({ date }) {
  if (!date) return <span className="text-[10px] text-zinc-600 w-[70px]">—</span>;
  // Accept ISO timestamp or YYYY-MM-DD
  const day = date.length >= 10 ? date.slice(0, 10) : date;
  return <span className="text-[10px] text-zinc-500 w-[70px] flex-shrink-0 font-mono">{day}</span>;
}
