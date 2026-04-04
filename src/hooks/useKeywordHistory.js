'use client';
import { useState, useEffect } from 'react';

export default function useKeywordHistory(selectedKeyword) {
  const [keywordHistory, setKeywordHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!selectedKeyword) { setKeywordHistory([]); return; }
    setHistoryLoading(true);
    fetch(`/api/gsc/keyword-history?keyword=${encodeURIComponent(selectedKeyword)}&days=28`)
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
  }, [selectedKeyword]);

  return { keywordHistory, historyLoading };
}
