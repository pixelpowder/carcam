'use client';
import { useState, useEffect } from 'react';
import { useSite } from '@/context/SiteContext';

export default function useKeywordHistory(selectedKeyword) {
  const { activeSite } = useSite();
  const [keywordHistory, setKeywordHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!selectedKeyword) { setKeywordHistory([]); return; }
    setHistoryLoading(true);
    const siteParam = encodeURIComponent(activeSite.gscUrl);
    fetch(`/api/gsc/keyword-history?keyword=${encodeURIComponent(selectedKeyword)}&days=28&site=${siteParam}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length) {
          setKeywordHistory(data.data.map(d => ({ date: d.date.slice(5), position: d.position, impressions: d.impressions })));
        } else {
          setKeywordHistory([]);
        }
      })
      .catch(() => setKeywordHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedKeyword, activeSite.id]);

  return { keywordHistory, historyLoading };
}
