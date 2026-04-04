'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { computeAnalytics } from '@/lib/analytics';
import { generateRecommendations } from '@/lib/strategy';
import seedData from '@/lib/seedData.json';

const DataContext = createContext(null);

function classifyKeyword(position, impressions, clicks) {
  if (position <= 1.5 && impressions <= 3 && clicks === 0) return 'monitor';
  if (position <= 3 && clicks > 0) return 'winning';
  if (position <= 3 && impressions >= 5) return 'winning';
  if (position <= 10) return 'optimize';
  if (position <= 30 && impressions >= 3) return 'opportunity';
  if (impressions > 0) return 'future';
  return 'monitor';
}

export function DataProvider({ children }) {
  const [rawData, setRawData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [actionStatuses, setActionStatuses] = useState({});
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [autoFetchStatus, setAutoFetchStatus] = useState('idle');
  const [lastUpdated, setLastUpdated] = useState(null);
  const openUploader = useCallback(() => setUploaderOpen(true), []);
  const closeUploader = useCallback(() => setUploaderOpen(false), []);
  const fetchAttempted = useRef(false);

  useEffect(() => {
    let hasData = false;
    // Cache version — bump to invalidate old data
    const CACHE_VERSION = 'v4';
    const cacheVer = localStorage.getItem('carhire-cache-version');
    if (cacheVer !== CACHE_VERSION) {
      localStorage.removeItem('carhire-seo-data');
      localStorage.removeItem('kotor-heatmap');
      localStorage.removeItem('kotor-content-audit');
      localStorage.removeItem('kotor-competitors');
      localStorage.removeItem('kotor-research');
      localStorage.removeItem('kotor-link-building');
      localStorage.removeItem('kotor-backlinks');
      localStorage.removeItem('kotor-mobile-data');
      localStorage.removeItem('kotor-regional');
      localStorage.setItem('carhire-cache-version', CACHE_VERSION);
    }
    try {
      const saved = localStorage.getItem('carhire-seo-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRawData(parsed);
        const a = computeAnalytics(parsed);
        setAnalytics(a);
        setRecommendations(generateRecommendations(parsed, a));
        setLastUpdated(localStorage.getItem('kotor-seo-updated') || null);
        hasData = true;
      }
      const statuses = localStorage.getItem('kotor-seo-action-statuses');
      if (statuses) setActionStatuses(JSON.parse(statuses));
    } catch (e) {
      console.warn('Failed to load saved data:', e);
    }

    // Try loading shared cloud data first, then fall back to GSC auto-fetch
    if (!hasData && !fetchAttempted.current) {
      fetchAttempted.current = true;
      setAutoFetchStatus('loading');
      // First try cloud data
      fetch('/api/data')
        .then(r => r.json())
        .then(cloudRes => {
          if (cloudRes.success && cloudRes.data) {
            setRawData(cloudRes.data);
            const a = computeAnalytics(cloudRes.data);
            setAnalytics(a);
            setRecommendations(generateRecommendations(cloudRes.data, a));
            try { localStorage.setItem('carhire-seo-data', JSON.stringify(cloudRes.data)); } catch (e) {}
            setAutoFetchStatus('done');
            return;
          }
          // No cloud data — fall back to GSC auto-fetch
          return fetchFromGSC();
        })
        .catch(() => fetchFromGSC());

      function fetchFromGSC() {
      fetch('/api/gsc?type=queries&days=28')
        .then(r => r.json())
        .then(async (queries) => {
          if (!queries.success || !queries.data?.length) {
            setAutoFetchStatus('done');
            return;
          }
          const [pages, dates, devicesRes, countriesRes] = await Promise.all([
            fetch('/api/gsc?type=pages&days=28').then(r => r.json()),
            fetch('/api/gsc?type=dates&days=28').then(r => r.json()),
            fetch('/api/gsc/devices?days=28').then(r => r.json()).catch(() => ({ data: [] })),
            fetch('/api/gsc/countries?days=28').then(r => r.json()).catch(() => ({ data: [] })),
          ]);
          const freshCategories = seedData.categories || [];
          const clusterByKeyword = {};
          (seedData.network || []).forEach(n => {
            if (n.cluster) clusterByKeyword[n.keyword.toLowerCase()] = n.cluster;
          });
          const liveKeywords = (queries.data || []).map(q => ({
            keyword: q.keys[0], clicks: q.clicks, impressions: q.impressions,
            ctr: q.ctr, position: q.position,
            status: classifyKeyword(q.position, q.impressions, q.clicks),
            cluster: clusterByKeyword[q.keys[0].toLowerCase()] || '', action: '',
          }));
          const livePages = (pages.data || []).map(p => ({
            date: new Date().toISOString().split('T')[0], site: 'carhire', is28d: true,
            page: p.keys[0], clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position,
          }));
          const liveDates = (dates.data || []).map(d => ({
            date: d.keys[0], site: 'carhire', is28d: true, keyword: '_daily_total',
            clicks: d.clicks, impressions: d.impressions, ctr: d.ctr, position: d.position,
          }));
          const merged = {
            clusters: seedData.clusters || [], network: seedData.network || [],
            categories: freshCategories, metaCrawl: [], submitQueue: [],
            siteKeywords: { carhire: liveKeywords },
            dailySnapshots: liveDates, dailyPageSnapshots: livePages, sheetNames: ['live'],
            devices: devicesRes.data || [],
            countries: countriesRes.data || [],
          };
          setRawData(merged);
          const a = computeAnalytics(merged);
          setAnalytics(a);
          setRecommendations(generateRecommendations(merged, a));
          try { localStorage.setItem('carhire-seo-data', JSON.stringify(merged)); } catch (e) {}
          // Save to cloud for other visitors
          fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged) }).catch(() => {});
          setAutoFetchStatus('done');
        })
        .catch(() => setAutoFetchStatus('done'));
      }
    }
  }, []);

  const loadData = useCallback((parsed, saveToCloud = false) => {
    setRawData(parsed);
    const a = computeAnalytics(parsed);
    setAnalytics(a);
    setRecommendations(generateRecommendations(parsed, a));
    const now = new Date().toISOString();
    setLastUpdated(now);
    try {
      localStorage.setItem('carhire-seo-data', JSON.stringify(parsed));
      localStorage.setItem('kotor-seo-updated', now);
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
    // Save to Vercel Blob so all visitors see this data
    if (saveToCloud) {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      }).catch(e => console.warn('Failed to save to cloud:', e));
    }
  }, []);

  const updateActionStatus = useCallback((index, status) => {
    setActionStatuses(prev => {
      const next = { ...prev, [index]: status };
      try { localStorage.setItem('kotor-seo-action-statuses', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  return (
    <DataContext.Provider value={{ rawData, analytics, recommendations, actionStatuses, updateActionStatus, loadData, uploaderOpen, openUploader, closeUploader, autoFetchStatus, lastUpdated }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
