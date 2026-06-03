'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

// Keywords that are GSC search-operator queries (someone typed site:/filetype:
// etc. into Google) leak into rank-tracking data but are never useful. Strip them.
const JUNK_OPERATOR_RE = /(-?site:|filetype:|intitle:|inurl:|allintitle:|allinurl:)/i;
function isJunkKeyword(kw) {
  if (!kw) return true;
  if (JUNK_OPERATOR_RE.test(kw)) return true;
  return false;
}

/**
 * Pure-presentation rank table. Caller supplies the rank-tracking blob
 * (data.keywords, data.dates). Used by RankTrackingSection on the Overview.
 *
 * Props:
 *   data         — { keywords: {...}, dates: [...] } from /api/rank-tracking
 *   topN         — how many keywords to display (default 20)
 *   windowDays   — sparkline window (default 28)
 *   defaultSort  — 'impressions' | 'position' | 'movement'
 *   showHeader   — render the title/sort/full-tracker-link strip (default true)
 *   linkFullTracker — show the "Full tracker" link in the header (default true)
 */
export default function KeywordPositionTable({
  data,
  topN = 20,
  windowDays = 28,
  defaultSort = 'impressions',
  showHeader = true,
  linkFullTracker = false,
}) {
  const [sortBy, setSortBy] = useState(defaultSort);

  const rows = useMemo(() => {
    if (!data?.keywords || !data?.dates) return [];
    const dates = data.dates;
    const sliceFrom = Math.max(0, dates.length - windowDays);
    const recentDates = dates.slice(sliceFrom);

    const list = Object.entries(data.keywords)
      .filter(([kw, v]) => !isJunkKeyword(kw) && v.latestPosition != null)
      .map(([keyword, v]) => {
        const positions = (v.positions || []).slice(sliceFrom);
        const impressions = (v.impressions || []).slice(sliceFrom);
        const totalImpressions = impressions.reduce((a, b) => a + (b || 0), 0);
        const sparkline = recentDates.map((date, i) => ({
          date,
          position: positions[i] == null ? null : positions[i],
        }));
        return {
          keyword,
          current: v.latestPosition,
          best: v.bestPosition,
          worst: v.worstPosition,
          delta: v.posChange7d || 0,
          totalImpressions,
          sparkline,
        };
      });

    const sorters = {
      impressions: (a, b) => b.totalImpressions - a.totalImpressions,
      position: (a, b) => a.current - b.current,
      movement: (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    };
    return list.sort(sorters[sortBy] || sorters.impressions).slice(0, topN);
  }, [data, sortBy, topN, windowDays]);

  if (!data || rows.length === 0) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        {showHeader && (
          <h3 className="text-sm font-semibold text-white mb-2">
            Top {topN} Keywords, {windowDays / 7}-Week Position History
          </h3>
        )}
        <p className="text-xs text-zinc-500">
          No rank tracking data for this site yet.{' '}
          <Link href="/" className="text-blue-400 hover:underline">
            Initialize rank tracking
          </Link>{' '}
          or wait for the next cron run.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
      {showHeader && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Top {topN} Keywords, {windowDays / 7}-Week Position History
            </h3>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Each row is one keyword. The line is its position over the last {windowDays} days; hover for daily values. Y-axis is inverted (up = better rank).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Sort</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-2 py-1 bg-[#0f1117] border border-[#2a2d3a] rounded text-[10px] text-zinc-300 outline-none"
            >
              <option value="impressions">Impressions</option>
              <option value="position">Current position</option>
              <option value="movement">Biggest 7d movement</option>
            </select>
            {linkFullTracker && (
              <Link href="/rank-tracker" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                Full tracker <ExternalLink size={10} />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-zinc-600 border-b border-[#2a2d3a]">
              <th className="text-left py-2 pl-1 font-medium w-6">#</th>
              <th className="text-left py-2 font-medium">Keyword</th>
              <th className="text-right py-2 font-medium w-14">Now</th>
              <th className="text-center py-2 font-medium w-44">{windowDays}-day trend</th>
              <th className="text-right py-2 font-medium w-14">7d &Delta;</th>
              <th className="text-right py-2 font-medium w-14">Best</th>
              <th className="text-right py-2 font-medium w-20">Imps</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const posColor =
                r.current <= 3 ? 'text-green-400' :
                r.current <= 10 ? 'text-blue-400' :
                r.current <= 30 ? 'text-amber-400' : 'text-red-400';
              const deltaColor =
                r.delta < -1 ? 'text-green-400' :
                r.delta > 1 ? 'text-red-400' : 'text-zinc-500';
              const deltaIcon =
                r.delta < -1 ? <TrendingUp size={10} /> :
                r.delta > 1 ? <TrendingDown size={10} /> : <Minus size={10} />;
              const sparkColor =
                r.delta < -1 ? '#22c55e' :
                r.delta > 1 ? '#ef4444' : '#3b82f6';
              const hasPoints = r.sparkline.some(p => p.position != null);

              return (
                <tr key={r.keyword} className="border-b border-[#2a2d3a]/40 hover:bg-white/[0.02]">
                  <td className="py-2 pl-1 text-zinc-600 tabular-nums">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/?kw=${encodeURIComponent(r.keyword)}`}
                      className="text-zinc-200 hover:text-white truncate block max-w-[280px]"
                      title={r.keyword}
                    >
                      {r.keyword}
                    </Link>
                  </td>
                  <td className={`py-2 text-right tabular-nums font-bold ${posColor}`}>
                    #{r.current.toFixed(0)}
                  </td>
                  <td className="py-2 px-2">
                    <div className="h-8">
                      {hasPoints ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={r.sparkline}>
                            <YAxis reversed domain={['auto', 'auto']} hide />
                            <Tooltip
                              cursor={false}
                              contentStyle={{ background: '#0f1117', border: '1px solid #2a2d3a', borderRadius: 6, fontSize: 10, padding: '4px 8px' }}
                              labelStyle={{ color: '#71717a', fontSize: 9 }}
                              formatter={(v) => [`#${(v ?? 0).toFixed(1)}`, 'Position']}
                            />
                            <Line
                              type="monotone"
                              dataKey="position"
                              stroke={sparkColor}
                              strokeWidth={1.5}
                              dot={false}
                              connectNulls
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <span className="text-[9px] text-zinc-700">no history</span>
                      )}
                    </div>
                  </td>
                  <td className={`py-2 text-right tabular-nums ${deltaColor}`}>
                    <span className="inline-flex items-center gap-0.5 justify-end">
                      {deltaIcon}{Math.abs(r.delta).toFixed(1)}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-400">
                    #{r.best != null ? r.best.toFixed(0) : '-'}
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-400">
                    {r.totalImpressions.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { isJunkKeyword };
