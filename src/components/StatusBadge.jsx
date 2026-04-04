'use client';
import Tooltip from '@/components/Tooltip';

const STYLES = {
  winning: 'bg-green-500/10 text-green-400 border-green-500/20',
  optimize: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  opportunity: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  future: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  monitor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  unknown: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const TOOLTIPS = {
  winning: 'Top 3 with clicks — maintain and protect this position',
  optimize: 'Top 10 — optimize content and meta to push higher',
  opportunity: 'Position 10-30 — within striking distance, boost with content and links',
  future: 'Low visibility — needs content or cluster strategy to rank',
  monitor: 'Low-signal keyword — minimal impressions, track for changes',
};

export default function StatusBadge({ status }) {
  const s = (status || 'unknown').toLowerCase();
  const style = STYLES[s] || STYLES.unknown;
  const tip = TOOLTIPS[s] || '';

  const badge = (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border cursor-help ${style}`}>
      {status || 'Unknown'}
    </span>
  );

  if (tip) return <Tooltip text={tip}>{badge}</Tooltip>;
  return badge;
}
