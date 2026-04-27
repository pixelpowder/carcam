'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { computeAnalytics } from '@/lib/analytics';
const generateRecommendations = () => []; // strategy removed for car hire
import seedData from '@/lib/seedData.json';
import { useSite } from '@/context/SiteContext';

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
  const { activeSite } = useSite();
  const [rawData, setRawData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [actionStatuses, setActionStatuses] = useState({});
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [autoFetchStatus, setAutoFetchStatus] = useState('idle');
  const [lastUpdated, setLastUpdated] = useState(null);
  const openUploader = useCallback(() => setUploaderOpen(true), []);
  const closeUploader = useCallback(() => setUploaderOpen(false), []);
  const prevSiteRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const siteId = activeSite.id;
    const cacheKey = `carcam-data-${siteId}`;
    const updatedKey = `carcam-updated-${siteId}`;

    let cachedTimestamp = null;
    let hasCached = false;

    // Show cached data instantly (warm cache for fast load)
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRawData(parsed);
        const a = computeAnalytics(parsed, activeSite.id);
        setAnalytics(a);
        setRecommendations(generateRecommendations(parsed, a));
        cachedTimestamp = localStorage.getItem(updatedKey) || null;
        setLastUpdated(cachedTimestamp);
        setAutoFetchStatus('done');
        hasCached = true;
      } else {
        setRawData(null);
        setAnalytics(null);
        setAutoFetchStatus('loading');
      }
    } catch (e) {
      console.warn('Failed to load saved data:', e);
    }

    // Always fetch blob in background — blob is source of truth, update if newer/different
    fetch(`/api/site-data?site=${siteId}`)
      .then(r => r.json())
      .then(blobRes => {
        if (cancelled) return;
        if (blobRes.success && blobRes.data) {
          const merged = blobRes.data;
          const blobTime = merged.pulledAt;
          // Only update if blob is newer than cached version (or no cached version)
          if (!cachedTimestamp || !blobTime || new Date(blobTime) > new Date(cachedTimestamp)) {
            setRawData(merged);
            const a = computeAnalytics(merged, activeSite.id);
            setAnalytics(a);
            setRecommendations(generateRecommendations(merged, a));
            setLastUpdated(blobTime || null);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(merged));
              if (blobTime) localStorage.setItem(updatedKey, blobTime);
            } catch (e) {}
          }
          setAutoFetchStatus('done');

          // Auto-trigger cron if data is stale (>12 hours old)
          const STALE_HOURS = 12;
          if (blobTime && (Date.now() - new Date(blobTime).getTime()) > STALE_HOURS * 60 * 60 * 1000) {
            fetch('/api/cron?manual=true').catch(() => {});
          }
          return;
        }
        // No blob data and no cache — fall back to live GSC
        if (!hasCached) fetchLiveGsc();
      })
      .catch(() => { if (!cancelled && !hasCached) fetchLiveGsc(); });

      function fetchLiveGsc() {
      const siteParam = encodeURIComponent(activeSite.gscUrl);
      fetch(`/api/gsc?type=queries&days=28&site=${siteParam}`)
        .then(r => r.json())
        .then(async (queries) => {
          if (cancelled) return;
          if (!queries.success || !queries.data?.length) {
            setAutoFetchStatus('done');
            return;
          }
          const [pages, dates, devicesRes, countriesRes] = await Promise.all([
            fetch(`/api/gsc?type=pages&days=28&site=${siteParam}`).then(r => r.json()),
            fetch(`/api/gsc?type=dates&days=28&site=${siteParam}`).then(r => r.json()),
            fetch(`/api/gsc/devices?days=28&site=${siteParam}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`/api/gsc/countries?days=28&site=${siteParam}`).then(r => r.json()).catch(() => ({ data: [] })),
          ]);
          const liveKeywords = (queries.data || []).map(q => ({
            keyword: q.keys[0], clicks: q.clicks, impressions: q.impressions,
            ctr: q.ctr, position: q.position,
            status: classifyKeyword(q.position, q.impressions, q.clicks),
            cluster: '', action: '',
          }));
          const livePages = (pages.data || []).map(p => ({
            date: new Date().toISOString().split('T')[0], site: siteId, is28d: true,
            page: p.keys[0], clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position,
          }));
          const liveDates = (dates.data || []).map(d => ({
            date: d.keys[0], site: siteId, is28d: true, keyword: '_daily_total',
            clicks: d.clicks, impressions: d.impressions, ctr: d.ctr, position: d.position,
          }));
          const merged = {
            clusters: [], network: [], categories: [], metaCrawl: [], submitQueue: [],
            siteKeywords: { [siteId]: liveKeywords },
            dailySnapshots: liveDates, dailyPageSnapshots: livePages, sheetNames: ['live'],
            devices: devicesRes.data || [],
            countries: countriesRes.data || [],
          };
          if (cancelled) return;
          setRawData(merged);
          const a = computeAnalytics(merged, activeSite.id);
          setAnalytics(a);
          setRecommendations(generateRecommendations(merged, a));
          try { localStorage.setItem(cacheKey, JSON.stringify(merged)); } catch (e) {}
          setAutoFetchStatus('done');
        })
        .catch(() => { if (!cancelled) setAutoFetchStatus('done'); });
      }

    return () => { cancelled = true; };
  }, [activeSite.id]);

  const loadData = useCallback((parsed, saveToCloud = false) => {
    setRawData(parsed);
    const a = computeAnalytics(parsed, activeSite.id);
    setAnalytics(a);
    setRecommendations(generateRecommendations(parsed, a));
    const now = new Date().toISOString();
    setLastUpdated(now);
    try {
      localStorage.setItem(`carcam-data-${activeSite.id}`, JSON.stringify(parsed));
      localStorage.setItem(`carcam-updated-${activeSite.id}`, now);
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
  }, [activeSite.id]);

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
