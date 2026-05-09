'use client';

// Read-only sub-components for the Internal Links page.
// Trimmed versions of what page.archived.jsx.txt had — no stageAction, no
// queue, no drafts, no onJumpToSource. These render orphan-fix
// recommendations + anchor variant matrices for reference only.

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, Minus, ArrowUp, ArrowDown, Check, Loader2, X, ExternalLink } from 'lucide-react';

// Given the list of open PRs (with preview metadata) and a target path,
// return the Vercel preview deploy URL of the most relevant in-flight PR.
// Heuristic: match if the PR's branch or title contains the target's slug.
// Returns null if no preview is ready yet (still building or not found).
export function findPreviewForTarget(openPrs = [], targetPath) {
  if (!targetPath) return null;
  const slug = targetPath.replace(/^\//, '').replace(/\//g, '-'); // /blog/foo → blog-foo
  for (const pr of openPrs) {
    if (pr.preview?.state !== 'ready' || !pr.preview.url) continue;
    const branch = pr.branch || '';
    const title = pr.title || '';
    if (branch.includes(slug) || title.includes(targetPath)) return pr.preview.url;
  }
  return null;
}

// Tag conventions used by the "mark done" toggle on each candidate-source row.
// We persist the done-state as a manual note in the implementation log so it
// shows up in the Timeline AND can be matched back to the recommendation.
//   target:{path}    e.g. target:/podgorica-airport
//   source:{path}    e.g. source:/blog/montenegro-road-trip-10-days
//   kind:inbound-link
export function suggestionDoneTags(target, source) {
  return ['inbound-link', `target:${target}`, `source:${source}`];
}
export function findDoneEntry(entries, target, source) {
  return entries.find(e => {
    if (!Array.isArray(e.tags)) return false;
    return e.tags.includes(`target:${target}`) && e.tags.includes(`source:${source}`);
  });
}

export function Pill({ label, value, warn }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${warn ? 'bg-amber-500/10 text-amber-400' : 'bg-[#0f1117] text-zinc-400'}`}>
      <span className="text-zinc-500 mr-1">{label}</span>{value}
    </span>
  );
}

export function Empty({ label }) {
  return <div className="text-center py-12 text-sm text-zinc-500 border border-dashed border-[#2a2d3a] rounded-xl">{label}</div>;
}

export function PageLink({ path, siteOrigin, className = 'text-blue-400 hover:text-blue-300 hover:underline text-xs' }) {
  if (!siteOrigin || !path?.startsWith('/')) return <code className={className}>{path}</code>;
  const href = siteOrigin.replace(/\/$/, '') + path;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}
      title={`Open ${href} in new tab`} onClick={e => e.stopPropagation()}>
      <code>{path}</code>
    </a>
  );
}

export function PositionDelta({ delta }) {
  if (delta == null) return <span className="text-zinc-600">—</span>;
  if (Math.abs(delta) < 0.5) return <span className="text-zinc-500 inline-flex items-center gap-1"><Minus size={11} />0</span>;
  const improved = delta < 0;
  const Icon = improved ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 ${improved ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon size={11} />{Math.abs(delta).toFixed(1)}
    </span>
  );
}

// Heuristic anchor bucket classifier — mirrors anchorVariants.js labels so we
// can compare current vs proposed inbound anchors per orphan target.
function classifyAnchor(text, { topQuery, gscQueries = [], targetPath } = {}) {
  if (!text) return 'other';
  const t = text.toLowerCase().trim();
  if (/montenegrocarhire\.com/.test(t) || /^https?:\/\//.test(t)) return 'nakedURL';
  if (/montenegro\s+car\s+hire/.test(t)) return 'branded';
  const WEAK = ['here', 'this guide', 'more details', 'see the page', 'read more', 'click here', 'this page', 'learn more', 'find out more'];
  if (WEAK.some(w => t === w || t === `"${w}"`)) return 'weak';
  if (topQuery && t === topQuery.toLowerCase().trim()) return 'exact';
  if (gscQueries.some(q => q.query && t === q.query.toLowerCase().trim())) return 'longtail';
  const hasRentalTerm = /(car rental|car hire|rent(?:al)?\b|hire\b|noleggio|mietwagen|location de voiture|wypożyczalnia|аренда|прокат)/i.test(t);
  if (!hasRentalTerm) return 'generic';
  return 'partial';
}

const BUCKET_ORDER = ['exact', 'partial', 'branded', 'generic', 'contextual', 'longtail', 'nakedURL', 'weak', 'other'];
const BUCKET_COLOR = {
  exact: 'text-rose-400', partial: 'text-amber-400', branded: 'text-blue-400',
  generic: 'text-zinc-400', contextual: 'text-purple-400', longtail: 'text-emerald-400',
  nakedURL: 'text-cyan-400', weak: 'text-zinc-500', other: 'text-zinc-500',
};

export function AnchorDistribution({ existing = [], proposed = [], topQuery, gscQueries = [], targetPath }) {
  const existingTally = {};
  for (const a of existing) {
    const b = classifyAnchor(a.text, { topQuery, gscQueries, targetPath });
    existingTally[b] = (existingTally[b] || 0) + (a.count || 1);
  }
  const proposedTally = {};
  for (const p of proposed) {
    const b = p.anchorLabel || classifyAnchor(p.anchor, { topQuery, gscQueries, targetPath });
    proposedTally[b] = (proposedTally[b] || 0) + 1;
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
        <span className="text-[10px] text-zinc-600">heuristic — vary anchors, no published target ratio</span>
      </div>
      <Row label="Current" tally={existingTally} total={totalExisting} />
      {proposed.length > 0 && (
        <>
          <Row label="Proposed (Δ)" tally={proposedTally} total={proposed.length} accent />
          <Row label="If applied" tally={afterTally} total={totalAfter} />
        </>
      )}
    </div>
  );
}

export function AnchorMatrix({ matrix }) {
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
        Use different variants across the inbound links so the anchor text is varied.
      </p>
    </div>
  );
}

function CandidateSourceRow({ candidate: c, target, siteOrigin, doneEntry, onMarkDone, onUnmarkDone, previewBaseUrl }) {
  const [busy, setBusy] = useState(false);
  const isDone = !!doneEntry;

  const toggle = async (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    console.log('[mark-done] click', { target, source: c.sourcePage, isDone, hasMark: !!onMarkDone, hasUnmark: !!onUnmarkDone });
    if (busy) return;
    setBusy(true);
    try {
      if (isDone) {
        await onUnmarkDone?.(doneEntry);
      } else {
        await onMarkDone?.(c, target);
      }
    } catch (err) {
      console.error('[mark-done] handler threw:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${isDone ? 'bg-emerald-500/[0.06] border border-emerald-500/20' : 'bg-[#1a1d27]'}`}>
      <PageLink path={c.sourcePage} siteOrigin={siteOrigin}
        className={`hover:text-blue-300 hover:underline ${isDone ? 'text-emerald-400/80' : 'text-blue-400'}`} />
      <span className="text-zinc-600">→</span>
      <span className={isDone ? 'text-emerald-400/60' : 'text-zinc-400'}>anchor:</span>
      <code className={isDone ? 'text-emerald-400/70 line-through' : 'text-emerald-400'}>{`"${c.anchor}"`}</code>
      {c.anchorLabel && (
        <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{c.anchorLabel}</span>
      )}
      <span className={`ml-auto ${isDone ? 'text-emerald-400/60' : 'text-zinc-500'}`}>relevance {c.relevance}</span>
      {previewBaseUrl && (
        <a
          href={`${previewBaseUrl.replace(/\/$/, '')}${c.sourcePage}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 transition-colors flex-shrink-0"
          title={`Open ${c.sourcePage} on the in-flight Vercel preview deploy`}
        >
          preview <ExternalLink size={10} />
        </a>
      )}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`group/btn flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors disabled:opacity-50 cursor-pointer ${isDone
          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-rose-500/20 hover:text-rose-400'
          : 'bg-[#0f1117] hover:bg-emerald-500/15 text-zinc-500 hover:text-emerald-400'}`}
        title={isDone
          ? `Marked done ${(doneEntry.changeDate || doneEntry.loggedAt || '').slice(0, 10)} — click to undo`
          : 'Mark this suggestion as implemented'}
      >
        {busy ? (
          <Loader2 size={10} className="animate-spin" />
        ) : isDone ? (
          <>
            {/* Default: ✓ done. On hover: × undo. */}
            <span className="flex items-center gap-1 group-hover/btn:hidden"><Check size={10} /> done</span>
            <span className="hidden group-hover/btn:flex items-center gap-1"><X size={10} /> undo</span>
          </>
        ) : (
          'mark done'
        )}
      </button>
    </div>
  );
}

function RankSparkline({ positions = [], width = 120, height = 28 }) {
  const valid = positions.map((p, i) => ({ p, i })).filter(x => x.p != null);
  if (valid.length < 2) return null;
  const allP = valid.map(x => x.p);
  const min = Math.min(...allP), max = Math.max(...allP);
  const range = Math.max(max - min, 1);
  const n = positions.length;
  const points = valid.map(x => {
    const xPx = (x.i / Math.max(n - 1, 1)) * (width - 2) + 1;
    const yPx = ((x.p - min) / range) * (height - 4) + 2;
    return [xPx, yPx];
  });
  const path = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
  const last = valid[valid.length - 1], first = valid[0];
  const improving = last.p < first.p;
  const stroke = improving ? '#34d399' : last.p > first.p ? '#fb7185' : '#71717a';
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" />
      {points.length > 0 && <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2" fill={stroke} />}
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

function OrphanRowExpanded({ t, siteOrigin, rankData, doneEntries = [], onMarkDone, onUnmarkDone, previewBaseUrl }) {
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
                  Daily GSC position · last {rankData.dates?.length || 0}d.
                </p>
              </>
            ) : <p className="text-[11px] text-zinc-500">Loading…</p>}
          </div>
        </div>
      )}
      {t.recommendation && (
        <div className="text-xs text-amber-400">
          <span className="text-zinc-500">Recommendation:</span> {t.recommendation}
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-zinc-300 mb-2">Suggested source pages</p>
        <div className="space-y-1">
          {t.candidateSources?.map(c => (
            <CandidateSourceRow
              key={c.sourcePage}
              candidate={c}
              target={t.page}
              siteOrigin={siteOrigin}
              doneEntry={findDoneEntry(doneEntries, t.page, c.sourcePage)}
              onMarkDone={onMarkDone}
              onUnmarkDone={onUnmarkDone}
              previewBaseUrl={previewBaseUrl}
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
      {t.anchorMatrix && <AnchorMatrix matrix={t.anchorMatrix} />}
    </div>
  );
}

export function OrphanList({ items, diffs = {}, siteOrigin, rankData, doneEntries = [], onMarkDone, onUnmarkDone, openPrs = [] }) {
  const [expanded, setExpanded] = useState(null);
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
                <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded bg-[#0f1117]"
                  title={`vs baseline ${diff.baselineDate}: ${diff.baselinePosition?.toFixed(1)} → ${t.topQueryPosition?.toFixed(1)}`}>
                  <span className="text-zinc-500">Δ</span><PositionDelta delta={diff.positionDelta} />
                </span>
              )}
              <span className="text-xs text-zinc-500">score</span>
              <span className="text-sm font-semibold text-white w-10 text-right">{t.score}</span>
            </button>
            {isOpen && (
              <OrphanRowExpanded
                t={t}
                siteOrigin={siteOrigin}
                rankData={rankData}
                doneEntries={doneEntries}
                onMarkDone={onMarkDone}
                onUnmarkDone={onUnmarkDone}
                previewBaseUrl={findPreviewForTarget(openPrs, t.page)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// All Pages list — the primary surface. Every page on the site with metrics;
// click a row to expand and see rank history, inbound/outbound anchors, AND
// recommended inbound links (from the orphan-fix analysis) with per-source
// preview deep-links into the in-flight Vercel preview deploy.
//
// Read-only — no stage/queue/draft/ship buttons. Just review + preview.
export function PagesTable({
  pages = [],
  diffs = {},
  orphanFixList = [],
  siteOrigin,
  rankData,
  doneEntries = [],
  onMarkDone,
  onUnmarkDone,
  openPrs = [],
}) {
  const [expanded, setExpanded] = useState(null);
  // Index orphan-fix entries by target path so we can hand each row its
  // matching candidateSources + anchorMatrix without re-scanning the array
  // on every render.
  const orphanByPage = new Map(orphanFixList.map(t => [t.page, t]));
  if (!pages.length) return <Empty label="No pages — run analysis to populate" />;
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
          {pages.map(o => {
            const diff = diffs[o.page];
            const isOpen = expanded === o.page;
            const orphanData = orphanByPage.get(o.page); // null if not an orphan target
            const previewBaseUrl = findPreviewForTarget(openPrs, o.page);
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
                      {orphanData && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                          orphan
                        </span>
                      )}
                      {previewBaseUrl && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                          PR in flight
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
                      <PageDetail
                        opp={o}
                        orphanData={orphanData}
                        siteOrigin={siteOrigin}
                        rankData={rankData}
                        doneEntries={doneEntries}
                        onMarkDone={onMarkDone}
                        onUnmarkDone={onUnmarkDone}
                        previewBaseUrl={previewBaseUrl}
                      />
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

// Expanded detail for one page row in PagesTable. Shows rank history,
// inbound/outbound anchors, and (if this page is an orphan target) the
// recommended inbound links with per-source preview deep-links.
function PageDetail({ opp, orphanData, siteOrigin, rankData, doneEntries, onMarkDone, onUnmarkDone, previewBaseUrl }) {
  return (
    <div className="space-y-4">
      {/* Rank history — sparklines for top 3 GSC queries */}
      {(opp.top3Queries?.length > 0 || opp.topQuery) && (
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-24 pt-0.5">Rank history</span>
          <div className="flex-1 space-y-1.5">
            {rankData ? (
              (opp.top3Queries || (opp.topQuery ? [{ query: opp.topQuery }] : [])).map((q, i) => (
                <RankHistoryRow key={i} query={q.query} keywordData={rankData.keywords?.[q.query]} />
              ))
            ) : <p className="text-[11px] text-zinc-500">Loading…</p>}
          </div>
        </div>
      )}

      {/* Recommended inbound links — only shown if this page is in the orphan
          list. Each row links straight to the source page on the in-flight
          Vercel preview if a PR matches. */}
      {orphanData?.candidateSources?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-zinc-300">Recommended inbound links</p>
            <span className="text-[10px] text-zinc-600">
              {previewBaseUrl
                ? <>preview is live — click <span className="text-blue-400">preview</span> on a row</>
                : 'no preview yet — open a PR to enable'}
            </span>
          </div>
          <div className="space-y-1">
            {orphanData.candidateSources.map(c => (
              <CandidateSourceRow
                key={c.sourcePage}
                candidate={c}
                target={opp.page}
                siteOrigin={siteOrigin}
                doneEntry={findDoneEntry(doneEntries, opp.page, c.sourcePage)}
                onMarkDone={onMarkDone}
                onUnmarkDone={onUnmarkDone}
                previewBaseUrl={previewBaseUrl}
              />
            ))}
          </div>
          {orphanData.anchorMatrix && <AnchorMatrix matrix={orphanData.anchorMatrix} />}
          <AnchorDistribution
            existing={opp.inboundAnchors || []}
            proposed={orphanData.candidateSources}
            topQuery={opp.topQuery}
            gscQueries={opp.top3Queries || []}
            targetPath={opp.page}
          />
        </div>
      )}

      {/* Existing inbound + outbound anchors */}
      {(opp.inboundAnchors?.length > 0 || opp.outboundAnchors?.length > 0) && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2a2d3a]">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1">Inbound ({opp.inboundAnchors?.length || 0})</p>
            <div className="space-y-1">
              {opp.inboundAnchors?.length === 0 && <p className="text-[11px] text-zinc-600">No inbound contextual anchors detected.</p>}
              {opp.inboundAnchors?.map((a, i) => (
                <div key={i} className="flex items-center gap-2 px-1.5 py-1 bg-[#1a1d27] rounded">
                  <code className="text-emerald-400 truncate flex-1" title={a.text}>{`"${a.text}"`}</code>
                  {a.count > 1 && <span className="text-[10px] text-zinc-500">×{a.count}</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-blue-400/80 mb-1">Outbound ({opp.outboundAnchors?.length || 0})</p>
            <div className="space-y-1">
              {opp.outboundAnchors?.length === 0 && <p className="text-[11px] text-zinc-600">No outbound contextual anchors detected.</p>}
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
      )}
    </div>
  );
}
