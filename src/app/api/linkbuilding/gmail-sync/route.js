import { NextResponse } from 'next/server';
import { loadHistory, saveHistory } from '@/lib/linkbuilding-pipeline';

/**
 * Syncs sent outreach emails from Gmail into the pipeline's outreach history.
 * Scans sent folder for emails NOT to self, extracts recipient domains,
 * and marks them as "sent" so the pipeline won't contact them again.
 */

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || 'Failed to get access token');
  return data.access_token;
}

// Extract domain from email address
function emailToDomain(email) {
  if (!email) return null;
  const match = email.match(/@([a-zA-Z0-9.-]+)/);
  if (!match) return null;
  return match[1].toLowerCase().replace('www.', '');
}

// Extract email address from "Name <email>" format
function parseEmailAddress(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/<([^>]+)>/) || headerValue.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
}

// Extract name from "Name <email>" format
function parseEmailName(headerValue) {
  if (!headerValue) return null;
  const match = headerValue.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : null;
}

// Domains to ignore (self, providers, platforms)
const IGNORE_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'googlegroups.com', 'customer.io', 'google.com',
  // Self (all owned properties, so dedup doesn't flag own sites)
  'kotordirectory.com', 'pixelpowder.com',
  'montenegrocarhire.com', 'tivatcarhire.com', 'budvacarhire.com', 'hercegnovicarhire.com',
  'ulcinjcarhire.com', 'kotorcarhire.com', 'podgoricacarhire.com', 'northernirelandcarhire.com',
  'kotorcarrental.com',
]);

export const maxDuration = 60;

export async function POST(request) {
  try {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      return NextResponse.json({ success: false, error: 'Gmail OAuth not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const gmailAccount = body.account || 'kotordirectory@gmail.com';

    const accessToken = await getAccessToken();

    // Search for sent outreach emails (exclude self-sends and ranking reports)
    const query = encodeURIComponent(`from:${gmailAccount} in:sent -to:${gmailAccount} -to:pixelpowder@gmail.com -subject:Rankings -subject:"KD Rankings"`);
    const maxResults = 100;

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();

    if (!listRes.ok) {
      return NextResponse.json({ success: false, error: listData.error?.message || 'Gmail list failed' }, { status: 500 });
    }

    const messageIds = (listData.messages || []).map(m => m.id);
    if (messageIds.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: 'No outreach emails found' });
    }

    // Fetch message headers in batches of 10
    const history = await loadHistory();
    let synced = 0;
    const syncedDomains = [];

    for (let i = 0; i < messageIds.length; i += 10) {
      const batch = messageIds.slice(i, i + 10);
      const messages = await Promise.all(
        batch.map(async (id) => {
          try {
            const res = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=From`,
              { headers: { 'Authorization': `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) }
            );
            return res.ok ? res.json() : null;
          } catch { return null; }
        })
      );

      for (const msg of messages) {
        if (!msg) continue;

        const headers = {};
        (msg.payload?.headers || []).forEach(h => { headers[h.name.toLowerCase()] = h.value; });

        const toEmail = parseEmailAddress(headers.to);
        const toName = parseEmailName(headers.to);
        const subject = headers.subject || '';
        const date = headers.date || '';
        const toDomain = emailToDomain(toEmail);

        if (!toDomain || IGNORE_DOMAINS.has(toDomain)) continue;

        // Only add if not already in history
        if (!history[toDomain]) {
          history[toDomain] = {
            email: toEmail,
            name: toName,
            subject,
            site: 'gmail-sync',
            method: 'email',
            pageUrl: null,
            status: 'sent',
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            runId: 'gmail-sync',
          };
          synced++;
          syncedDomains.push(toDomain);
        }
      }
    }

    if (synced > 0) {
      await saveHistory(history);
    }

    return NextResponse.json({
      success: true,
      synced,
      total: Object.keys(history).length,
      domains: syncedDomains,
      scanned: messageIds.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
