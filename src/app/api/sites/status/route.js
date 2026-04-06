import { NextResponse } from 'next/server';

const SITES = [
  { id: 'montenegro', name: 'Montenegro Car Hire', domain: 'montenegrocarhire.com', color: '#3b82f6' },
  { id: 'tivat', name: 'Tivat Car Hire', domain: 'tivatcarhire.com', color: '#14b8a6' },
  { id: 'budva', name: 'Budva Car Hire', domain: 'budvacarhire.com', color: '#f97316' },
  { id: 'hercegnovi', name: 'Herceg Novi Car Hire', domain: 'hercegnovicarhire.com', color: '#eab308' },
  { id: 'ulcinj', name: 'Ulcinj Car Hire', domain: 'ulcinjcarhire.com', color: '#c2410c' },
  { id: 'kotor', name: 'Kotor Car Hire', domain: 'kotorcarhire.com', color: '#6366f1' },
  { id: 'podgorica', name: 'Podgorica Car Hire', domain: 'podgoricacarhire.com', color: '#8b5cf6' },
  { id: 'northernireland', name: 'Northern Ireland Car Hire', domain: 'northernirelandcarhire.com', color: '#22c55e' },
];

export async function GET() {
  const results = await Promise.allSettled(
    SITES.map(async (site) => {
      const start = Date.now();
      try {
        const res = await fetch(`https://${site.domain}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
        });
        return {
          ...site,
          status: res.ok ? 'up' : 'down',
          statusCode: res.status,
          responseTime: Date.now() - start,
        };
      } catch (e) {
        return {
          ...site,
          status: 'down',
          statusCode: 0,
          responseTime: Date.now() - start,
          error: e.message,
        };
      }
    })
  );

  const sites = results.map((r) => (r.status === 'fulfilled' ? r.value : { ...r.reason, status: 'error' }));

  return NextResponse.json({ sites, checkedAt: new Date().toISOString() });
}
