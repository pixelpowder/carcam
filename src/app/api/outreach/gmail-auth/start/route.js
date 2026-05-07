import { NextResponse } from 'next/server';
import { callbackUrlFromRequest } from '@/lib/gmail-token';

export const dynamic = 'force-dynamic';

// Kicks off the Google consent flow. Click the "Reauthorize" button in the
// link-prospecting banner to land here.
export async function GET(request) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ success: false, error: 'GMAIL_CLIENT_ID not set' }, { status: 500 });
  }

  const redirectUri = callbackUrlFromRequest(request);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.compose',
    access_type: 'offline',
    prompt: 'consent', // force refresh token issuance every time
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
