'use client';
import { Download, Printer } from 'lucide-react';

export default function ExportButton() {
  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    try {
      const data = localStorage.getItem('kotor-seo-data');
      if (!data) return;
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kotor-seo-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {}
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-[#2a2d3a] rounded-lg hover:text-zinc-300 hover:border-zinc-600 transition-all">
        <Printer size={12} /> Print / PDF
      </button>
      <button onClick={handleExportJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-[#2a2d3a] rounded-lg hover:text-zinc-300 hover:border-zinc-600 transition-all">
        <Download size={12} /> Export Data
      </button>
    </div>
  );
}
