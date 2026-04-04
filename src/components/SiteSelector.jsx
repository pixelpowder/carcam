'use client';
import { Globe } from 'lucide-react';

const SITES = [
  { id: 'carhire', label: 'KotorDirectory', domain: 'montenegrocarhire.com', gscUrl: 'https://www.montenegrocarhire.com/' },
  { id: 'hercegnovidirectory', label: 'HercegNoviDirectory', domain: 'hercegnovidirectory.com', gscUrl: 'https://www.hercegnovidirectory.com/' },
];

export default function SiteSelector({ currentSite, onSiteChange }) {
  return (
    <div className="flex items-center gap-2">
      <Globe size={14} className="text-zinc-500" />
      {SITES.map(site => (
        <button
          key={site.id}
          onClick={() => onSiteChange(site)}
          className={`px-3 py-1 text-xs rounded-lg border transition-all ${
            currentSite?.id === site.id
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'text-zinc-500 border-[#2a2d3a] hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          {site.label}
        </button>
      ))}
    </div>
  );
}

export { SITES };
