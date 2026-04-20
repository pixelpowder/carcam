import { list, put } from '@vercel/blob';

// Cache blob URLs to avoid repeated list() calls (each list() = 1 advanced operation)
// After first list(), we cache the URL and fetch it directly (= simple operation)
const urlCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get a blob's content by prefix. Uses cached URL if available.
 * Returns parsed JSON or null if not found.
 */
export async function readBlob(prefix) {
  const cached = urlCache.get(prefix);
  const now = Date.now();

  let url;
  if (cached && now - cached.ts < CACHE_TTL) {
    url = cached.url;
  } else {
    const { blobs } = await list({ prefix });
    if (!blobs.length) {
      urlCache.set(prefix, { url: null, ts: now });
      return null;
    }
    url = blobs[0].url;
    urlCache.set(prefix, { url, ts: now });
  }

  if (!url) return null;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const res = await fetch(url + '?t=' + now, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return await res.json();
}

/**
 * Write a blob and update the URL cache so next read skips list().
 */
export async function writeBlob(key, data) {
  const blob = await put(key, JSON.stringify(data), { access: 'private', addRandomSuffix: false, allowOverwrite: true });
  urlCache.set(key, { url: blob.url, ts: Date.now() });
  return blob;
}

/**
 * Invalidate a cached URL so next read does a fresh list().
 */
export function invalidateBlob(prefix) {
  urlCache.delete(prefix);
}
