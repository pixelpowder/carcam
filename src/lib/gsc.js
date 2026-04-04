import { GoogleAuth } from 'google-auth-library';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('GSC credentials not configured');

  return new GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

async function gscRequest(endpoint, body) {
  const auth = getAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getSearchAnalytics({ siteUrl, startDate, endDate, dimensions = ['query'], rowLimit = 1000, dimensionFilterGroups }) {
  const site = siteUrl || process.env.GSC_SITE_URL;
  const body = {
    startDate,
    endDate,
    dimensions,
    rowLimit,
    ...(dimensionFilterGroups && { dimensionFilterGroups }),
  };

  const data = await gscRequest(`/sites/${encodeURIComponent(site)}/searchAnalytics/query`, body);
  return (data.rows || []).map(row => ({
    keys: row.keys,
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export async function getSearchAnalyticsByDate({ siteUrl, startDate, endDate, rowLimit = 1000 }) {
  return getSearchAnalytics({ siteUrl, startDate, endDate, dimensions: ['date'], rowLimit });
}

export async function getSearchAnalyticsByQuery({ siteUrl, startDate, endDate, rowLimit = 500 }) {
  return getSearchAnalytics({ siteUrl, startDate, endDate, dimensions: ['query'], rowLimit });
}

export async function getSearchAnalyticsByPage({ siteUrl, startDate, endDate, rowLimit = 500 }) {
  return getSearchAnalytics({ siteUrl, startDate, endDate, dimensions: ['page'], rowLimit });
}

export async function getSearchAnalyticsByDevice({ siteUrl, startDate, endDate, rowLimit = 10 }) {
  return getSearchAnalytics({ siteUrl, startDate, endDate, dimensions: ['device'], rowLimit });
}

export async function getSearchAnalyticsByCountry({ siteUrl, startDate, endDate, rowLimit = 20 }) {
  return getSearchAnalytics({ siteUrl, startDate, endDate, dimensions: ['country'], rowLimit });
}

export async function getSearchAnalyticsByQueryAndPage({ siteUrl, startDate, endDate, rowLimit = 2000 }) {
  return getSearchAnalytics({ siteUrl, startDate, endDate, dimensions: ['query', 'page'], rowLimit });
}

export async function getSearchAnalyticsQueryByDate({ siteUrl, startDate, endDate, query }) {
  return getSearchAnalytics({
    siteUrl, startDate, endDate,
    dimensions: ['query', 'date'],
    rowLimit: 1000,
    dimensionFilterGroups: [{
      filters: [{ dimension: 'query', operator: 'equals', expression: query }],
    }],
  });
}
