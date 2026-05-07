import { NextResponse } from 'next/server';
import { loadGmailToken } from '@/lib/gmail-token';

async function getAccessToken() {
  const { refreshToken } = await loadGmailToken();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) {
    const code = data.error || 'unknown';
    const desc = data.error_description || `HTTP ${res.status}`;
    console.error('[gmail-draft] OAuth refresh failed:', { code, desc, status: res.status });
    const hint = code === 'invalid_grant'
      ? ' — refresh token is expired or revoked. Regenerate via OAuth Playground (scope: gmail.compose) and update GMAIL_REFRESH_TOKEN in .env.local.'
      : code === 'invalid_client'
      ? ' — GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET don\'t match. Check .env.local against the OAuth client in Google Cloud Console.'
      : '';
    throw new Error(`OAuth ${code}: ${desc}${hint}`);
  }
  return data.access_token;
}

// RFC 2047 encoded-word for headers — needed for any non-ASCII (em dashes,
// accents, smart quotes, etc.) in Subject / From-name. Gmail otherwise treats
// the raw UTF-8 bytes as Latin-1 and produces "â€"" mojibake.
function encodeHeader(value) {
  if (value == null) return '';
  const str = String(value);
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  return `=?UTF-8?B?${Buffer.from(str, 'utf-8').toString('base64')}?=`;
}

function buildRawEmail({ from, to, subject, body }) {
  const lines = [];
  if (from) lines.push(`From: ${encodeHeader(from)}`);
  lines.push(`To: ${encodeHeader(to || '')}`);
  lines.push(`Subject: ${encodeHeader(subject)}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/plain; charset=utf-8');
  lines.push('Content-Transfer-Encoding: 8bit');
  lines.push('');
  lines.push(body);
  // Gmail API expects base64url-encoded RFC 2822 message
  const raw = Buffer.from(lines.join('\r\n'), 'utf-8').toString('base64url');
  return raw;
}

export async function POST(request) {
  try {
    const { from, to, subject, body } = await request.json();
    if (!subject || !body) {
      return NextResponse.json({ success: false, error: 'subject and body required' }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ success: false, error: 'recipient email (to) required' }, { status: 400 });
    }

    const { refreshToken: hasToken } = await loadGmailToken();
    if (!process.env.GMAIL_CLIENT_ID || !hasToken) {
      return NextResponse.json({ success: false, error: 'Gmail OAuth not configured' }, { status: 500 });
    }

    const accessToken = await getAccessToken();
    const raw = buildRawEmail({ from, to, subject, body });

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw } }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const gmailMsg = data?.error?.message || data?.error_description || `Gmail API ${res.status}`;
      const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || null;
      // Common case: From: alias not set up as Send As in Gmail
      const hint = /from|alias|sender|delegation/i.test(gmailMsg)
        ? ` (Tip: configure "${from}" as a Send As alias in Gmail Settings → Accounts, or leave the From field empty to use the default address.)`
        : '';
      return NextResponse.json({
        success: false,
        error: `${gmailMsg}${reason ? ` [${reason}]` : ''}${hint}`,
        gmailStatus: res.status,
      }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      draftId: data.id,
      messageId: data.message?.id,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
