'use client';
import { useEffect, useState } from 'react';
import { useSite } from '@/context/SiteContext';
import KeywordPositionTable from './KeywordPositionTable';

export default function Top20Keywords() {
  const { activeSite } = useSite();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/rank-tracking?site=${activeSite.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSite.id]);

  if (loading) {
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
          Loading position history...
        </div>
      </div>
    );
  }

  return <KeywordPositionTable data={data} defaultSort="position" />;
}
