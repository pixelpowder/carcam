// Vercel Blob is only used when BLOB_READ_WRITE_TOKEN is set (i.e. in prod or a
// dev env that's been linked to a Blob store). Locally without the token we
// fall back to the env var. The @vercel/blob package is dynamically imported
// so it doesn't error during module init when the token is absent.
const BLOB_KEY = 'gmail/refresh-token.json';

async function readBlob(key) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: key });
    if (!blobs.length) return null;
    const res = await fetch(blobs[0].url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function writeBlob(key, data) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not set — cannot persist Gmail token. Add the env var to enable one-click reauth, or update GMAIL_REFRESH_TOKEN in .env.local manually.');
  }
  const { put } = await import('@vercel/blob');
  await put(key, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// Loads the active refresh token. Prefers Blob (mutated by re-auth flow),
// falls back to env (manually-set bootstrap token).
export async function loadGmailToken() {
  const blob = await readBlob(BLOB_KEY);
  if (blob?.refreshToken) {
    return {
      refreshToken: blob.refreshToken,
      issuedAt: blob.issuedAt || null,
      source: 'blob',
    };
  }
  return {
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || null,
    issuedAt: process.env.GMAIL_REFRESH_TOKEN_ISSUED || null,
    source: 'env',
  };
}

export async function saveGmailToken({ refreshToken, issuedAt }) {
  await writeBlob(BLOB_KEY, {
    refreshToken,
    issuedAt: issuedAt || new Date().toISOString(),
  });
}

// Compute callback URL from the incoming request — keeps localhost vs prod working.
export function callbackUrlFromRequest(request) {
  const url = new URL(request.url);
  return `${url.origin}/api/outreach/gmail-auth/callback`;
}
