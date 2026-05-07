import { NextResponse } from 'next/server';
import { callbackUrlFromRequest, saveGmailToken } from '@/lib/gmail-token';

export const dynamic = 'force-dynamic';

// Receives Google's auth code, exchanges for a refresh token, persists to Blob.
// Then redirects back to /link-prospecting with a success/error flag.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const back = new URL('/link-prospecting', url.origin);

  if (error) {
    back.searchParams.set('gmailAuth', `error:${error}`);
    return NextResponse.redirect(back);
  }
  if (!code) {
    back.searchParams.set('gmailAuth', 'error:missing_code');
    return NextResponse.redirect(back);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID || '',
        client_secret: process.env.GMAIL_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrlFromRequest(request),
      }),
    });

    const data = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !data.refresh_token) {
      const reason = data.error_description || data.error || `HTTP ${tokenRes.status}`;
      back.searchParams.set('gmailAuth', `error:${encodeURIComponent(reason)}`);
      return NextResponse.redirect(back);
    }

    await saveGmailToken({
      refreshToken: data.refresh_token,
      issuedAt: new Date().toISOString(),
    });

    back.searchParams.set('gmailAuth', 'ok');
    return NextResponse.redirect(back);
  } catch (e) {
    back.searchParams.set('gmailAuth', `error:${encodeURIComponent(e.message)}`);
    return NextResponse.redirect(back);
  }
}
