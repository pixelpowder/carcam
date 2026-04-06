'use client';
import { Globe } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useSite } from '@/context/SiteContext';
import Link from 'next/link';

export default function EmptyState() {
  const { autoFetchStatus } = useData();
  const { activeSite } = useSite();

  if (autoFetchStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Pulling live data from Google Search Console...</p>
        <p className="text-xs text-zinc-600 mt-1">{activeSite.domain}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
        <Globe size={36} className="text-blue-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No GSC Data Yet</h2>
      <p className="text-sm text-zinc-500 mb-2 max-w-sm">
        No data available for <span className="text-zinc-300">{activeSite.domain}</span>
      </p>
      <p className="text-xs text-zinc-600 mb-6 max-w-sm">
        New sites take 2-3 days to appear in Google Search Console. Check back soon.
      </p>
      <Link
        href="/sites"
        className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all"
      >
        Switch Site
      </Link>
    </div>
  );
}
