'use client';
import { FileSpreadsheet } from 'lucide-react';
import { useData } from '@/context/DataContext';

export default function EmptyState() {
  const { openUploader, autoFetchStatus } = useData();

  if (autoFetchStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Pulling live data from Google Search Console...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
        <FileSpreadsheet size={36} className="text-blue-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No Data Loaded</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm">
        Upload your GSC Master Spreadsheet to see your SEO campaign performance, cluster analysis, and strategy recommendations.
      </p>
      <button
        onClick={openUploader}
        className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all"
      >
        Upload Spreadsheet
      </button>
    </div>
  );
}
