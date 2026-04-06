'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SITES = [
  { id: 'montenegrocarhire', label: 'Montenegro Car Hire', domain: 'montenegrocarhire.com', gscUrl: 'https://www.montenegrocarhire.com/' },
  { id: 'tivatcarhire', label: 'Tivat Car Hire', domain: 'tivatcarhire.com', gscUrl: 'https://www.tivatcarhire.com/' },
  { id: 'budvacarhire', label: 'Budva Car Hire', domain: 'budvacarhire.com', gscUrl: 'https://www.budvacarhire.com/' },
  { id: 'hercegnovicarhire', label: 'Herceg Novi Car Hire', domain: 'hercegnovicarhire.com', gscUrl: 'https://www.hercegnovicarhire.com/' },
  { id: 'ulcinjcarhire', label: 'Ulcinj Car Hire', domain: 'ulcinjcarhire.com', gscUrl: 'https://www.ulcinjcarhire.com/' },
  { id: 'kotorcarhire', label: 'Kotor Car Hire', domain: 'kotorcarhire.com', gscUrl: 'https://www.kotorcarhire.com/' },
  { id: 'podgoricacarhire', label: 'Podgorica Car Hire', domain: 'podgoricacarhire.com', gscUrl: 'https://www.podgoricacarhire.com/' },
  { id: 'northernirelandcarhire', label: 'Northern Ireland Car Hire', domain: 'northernirelandcarhire.com', gscUrl: 'https://www.northernirelandcarhire.com/' },
];

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [activeSite, setActiveSiteState] = useState(SITES[0]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('carcam-active-site');
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = SITES.find(s => s.id === parsed.id);
        if (match) setActiveSiteState(match);
      }
    } catch (e) {}
  }, []);

  const setActiveSite = useCallback((site) => {
    setActiveSiteState(site);
    try { localStorage.setItem('carcam-active-site', JSON.stringify(site)); } catch (e) {}
  }, []);

  return (
    <SiteContext.Provider value={{ activeSite, setActiveSite, sites: SITES }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used within SiteProvider');
  return ctx;
}

export { SITES };
