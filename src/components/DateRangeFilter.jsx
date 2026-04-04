'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 28 days', days: 28 },
  { label: 'Last 3 months', days: 90 },
  { label: 'All data', days: null },
];

const STORAGE_KEY = 'kotor-date-range-selection';

export default function DateRangeFilter({ dailySnapshots, onChange }) {
  const savedSelection = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || 'Last 28 days' : 'Last 28 days';
  const [selected, setSelected] = useState(savedSelection);
  const initialized = useRef(false);

  const dateRange = useMemo(() => {
    const dates = (dailySnapshots || [])
      .filter(s => s.keyword === '_daily_total')
      .map(s => s.date)
      .sort();
    return { min: dates[0], max: dates[dates.length - 1], count: dates.length };
  }, [dailySnapshots]);

  // Apply saved selection on mount
  useEffect(() => {
    if (initialized.current || !dateRange.max) return;
    initialized.current = true;
    const preset = PRESETS.find(p => p.label === selected);
    if (preset) {
      if (!preset.days) {
        onChange(null);
      } else {
        const end = new Date(dateRange.max);
        const start = new Date(end);
        start.setDate(start.getDate() - preset.days);
        onChange({ start: start.toISOString().split('T')[0], end: dateRange.max });
      }
    }
  }, [dateRange.max, selected, onChange]);

  const handleSelect = (preset) => {
    setSelected(preset.label);
    try { localStorage.setItem(STORAGE_KEY, preset.label); } catch (e) {}
    if (!preset.days) {
      onChange(null);
      return;
    }
    if (!dateRange.max) return;
    const end = new Date(dateRange.max);
    const start = new Date(end);
    start.setDate(start.getDate() - preset.days);
    onChange({ start: start.toISOString().split('T')[0], end: dateRange.max });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={14} className="text-zinc-500" />
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => handleSelect(p)}
          className={`px-3 py-1 text-xs rounded-lg border transition-all ${
            selected === p.label
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'text-zinc-500 border-[#2a2d3a] hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          {p.label}
        </button>
      ))}
      {dateRange.min && (
        <span className="text-xs text-zinc-600 ml-2">
          {dateRange.min} — {dateRange.max} ({dateRange.count} days)
        </span>
      )}
    </div>
  );
}

export function filterByDateRange(items, dateRange, dateField = 'date') {
  if (!dateRange) return items;
  return items.filter(item => {
    const d = item[dateField];
    return d >= dateRange.start && d <= dateRange.end;
  });
}
