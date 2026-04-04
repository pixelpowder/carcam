'use client';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export default function SortHeader({ label, field, sortBy, sortDir, onSort, align = 'left', width }) {
  const active = sortBy === field;
  return (
    <th
      className={`py-3 px-3 cursor-pointer hover:text-zinc-300 select-none transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={width ? { width, minWidth: width } : undefined}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
        ) : (
          <ChevronsUpDown size={10} className="opacity-30" />
        )}
      </span>
    </th>
  );
}

export function useSort(defaultField = 'impressions', defaultDir = 'desc') {
  const [sortBy, setSortBy] = useState(defaultField);
  const [sortDir, setSortDir] = useState(defaultDir);

  const onSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const sortFn = (a, b) => {
    const av = a[sortBy] ?? 0;
    const bv = b[sortBy] ?? 0;
    if (typeof av === 'string') return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    return sortDir === 'desc' ? bv - av : av - bv;
  };

  return { sortBy, sortDir, onSort, sortFn };
}
