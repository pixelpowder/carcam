import { NextResponse } from 'next/server';
import { loadGmailToken } from '@/lib/gmail-token';

export const dynamic = 'force-dynamic';

// Google's OAuth refresh tokens for apps in Testing mode expire 7 days after issue.
// This endpoint pings Google's token endpoint to verify the token still works AND
// computes how many days remain based on the stored issuedAt.
const TESTING_MODE_TTL_DAYS = 7;

export async function GET() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const { refreshToken, issuedAt: issued, source } = await loadGmailToken();

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({
      valid: false,
      configured: false,
      error: 'GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN not set in .env.local',
    });
  }

  let daysRemaining = null;
  let issuedAt = null;
  if (issued) {
    issuedAt = new Date(issued).toISOString();
    const ageMs = Date.now() - new Date(issued).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    daysRemaining = Math.max(0, Math.round((TESTING_MODE_TTL_DAYS - ageDays) * 10) / 10);
  }

  // Live test: ask Google to mint an access token. If the refresh token is dead
  // we get invalid_grant immediately.
  let valid = false;
  let error = null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.access_token) {
      valid = true;
    } else {
      error = `${data.error || 'unknown'}: ${data.error_description || `HTTP ${res.status}`}`;
    }
  } catch (e) {
    error = e.message;
  }

  return NextResponse.json({
    configured: true,
    valid,
    error,
    issuedAt,
    daysRemaining,
    ttlDays: TESTING_MODE_TTL_DAYS,
    source, // 'blob' (re-auth flow) or 'env' (bootstrap)
  });
}
