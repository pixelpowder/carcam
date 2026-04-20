import { NextResponse } from 'next/server';

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

function buildRawEmail({ from, to, subject, body }) {
  const lines = [];
  if (from) lines.push(`From: ${from}`);
  lines.push(`To: ${to || ''}`);
  lines.push(`Subject: ${subject}`);
  lines.push('Content-Type: text/plain; charset=utf-8');
  lines.push('');
  lines.push(body);
  // Gmail API expects base64url-encoded RFC 2822 message
  const raw = Buffer.from(lines.join('\r\n')).toString('base64url');
  return raw;
}

export async function POST(request) {
  try {
    const { from, to, subject, body } = await request.json();
    if (!subject || !body) {
      return NextResponse.json({ success: false, error: 'subject and body required' }, { status: 400 });
    }

    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
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

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error?.message || 'Gmail API error' }, { status: res.status });
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
