import { GoogleAuth } from 'google-auth-library';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '518520113';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google credentials not configured');

  return new GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
}

async function ga4Request(body, propertyOverride) {
  const auth = getAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const propId = propertyOverride || PROPERTY_ID;

  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getOverviewMetrics(days = 28) {
  const startDate = `${days}daysAgo`;
  const data = await ga4Request({
    dateRanges: [{ startDate, endDate: 'today' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'engagedSessions' },
    ],
  });

  const row = data.rows?.[0];
  if (!row) return null;
  return {
    sessions: parseInt(row.metricValues[0].value) || 0,
    users: parseInt(row.metricValues[1].value) || 0,
    newUsers: parseInt(row.metricValues[2].value) || 0,
    pageviews: parseInt(row.metricValues[3].value) || 0,
    bounceRate: parseFloat(row.metricValues[4].value) || 0,
    avgSessionDuration: parseFloat(row.metricValues[5].value) || 0,
    engagedSessions: parseInt(row.metricValues[6].value) || 0,
  };
}

export async function getTopPages(days = 28, limit = 20) {
  const data = await ga4Request({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit,
  });

  return (data.rows || []).map(row => ({
    path: row.dimensionValues[0].value,
    pageviews: parseInt(row.metricValues[0].value) || 0,
    sessions: parseInt(row.metricValues[1].value) || 0,
    bounceRate: parseFloat(row.metricValues[2].value) || 0,
    avgDuration: parseFloat(row.metricValues[3].value) || 0,
  }));
}

export async function getTrafficSources(days = 28) {
  const data = await ga4Request({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  });

  return (data.rows || []).map(row => ({
    source: row.dimensionValues[0].value,
    sessions: parseInt(row.metricValues[0].value) || 0,
    users: parseInt(row.metricValues[1].value) || 0,
  }));
}

export async function getDailyTraffic(days = 28) {
  const data = await ga4Request({
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  return (data.rows || []).map(row => ({
    date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    sessions: parseInt(row.metricValues[0].value) || 0,
    users: parseInt(row.metricValues[1].value) || 0,
    pageviews: parseInt(row.metricValues[2].value) || 0,
  }));
}
