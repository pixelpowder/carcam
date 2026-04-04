'use client';
import { useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useData } from '@/context/DataContext';
import seedData from '@/lib/seedData.json';

export default function LiveDataButton() {
  const { rawData, loadData } = useData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchLiveData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [queries, pages, dates] = await Promise.all([
        fetch('/api/gsc?type=queries&days=28').then(r => r.json()),
        fetch('/api/gsc?type=pages&days=28').then(r => r.json()),
        fetch('/api/gsc?type=dates&days=28').then(r => r.json()),
      ]);

      if (!queries.success) throw new Error(queries.error || 'Failed to fetch queries');

      // Build data structure compatible with the existing parser format
      const clusterByKeyword = {};
      (seedData.network || []).forEach(n => {
        if (n.cluster) clusterByKeyword[n.keyword.toLowerCase()] = n.cluster;
      });

      const liveKeywords = (queries.data || []).map(q => ({
        keyword: q.keys[0],
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        position: q.position,
        status: classifyStatus(q.position, q.impressions, q.clicks),
        cluster: clusterByKeyword[q.keys[0].toLowerCase()] || rawData?.siteKeywords?.kotordirectory?.find(k => k.keyword === q.keys[0])?.cluster || '',
        action: '',
      }));

      const livePages = (pages.data || []).map(p => ({
        date: dates.endDate || new Date().toISOString().split('T')[0],
        site: 'kotordirectory',
        is28d: true,
        page: p.keys[0],
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
      }));

      const liveDailySnapshots = (dates.data || []).map(d => ({
        date: d.keys[0],
        site: 'kotordirectory',
        is28d: true,
        keyword: '_daily_total',
        clicks: d.clicks,
        impressions: d.impressions,
        ctr: d.ctr,
        position: d.position,
      }));

      // Merge with existing data or create new
      const merged = {
        clusters: rawData?.clusters?.length ? rawData.clusters : seedData.clusters || [],
        network: rawData?.network?.length ? rawData.network : seedData.network || [],
        siteKeywords: {
          ...(rawData?.siteKeywords || {}),
          kotordirectory: liveKeywords,
        },
        categories: rawData?.categories?.length ? rawData.categories : seedData.categories || [],
        metaCrawl: rawData?.metaCrawl || [],
        submitQueue: rawData?.submitQueue || [],
        dailySnapshots: liveDailySnapshots,
        dailyPageSnapshots: livePages,
        sheetNames: rawData?.sheetNames || ['live_data'],
      };

      loadData(merged);
      setLastFetch(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={fetchLiveData}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-all disabled:opacity-50"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Fetching...' : 'Pull Live GSC Data'}
      </button>
      {lastFetch && (
        <span className="flex items-center gap-1 text-xs text-green-400">
          <Wifi size={12} /> Updated {lastFetch}
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <WifiOff size={12} /> {error}
        </span>
      )}
    </div>
  );
}

function classifyStatus(position, impressions, clicks) {
  if (position <= 1.5 && impressions <= 3 && clicks === 0) return 'monitor';
  if (position <= 3 && clicks > 0) return 'winning';
  if (position <= 3 && impressions >= 5) return 'winning';
  if (position <= 10) return 'optimize';
  if (position <= 30 && impressions >= 3) return 'opportunity';
  if (impressions > 0) return 'future';
  return 'monitor';
}
