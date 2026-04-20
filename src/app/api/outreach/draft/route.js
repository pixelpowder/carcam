import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, emailBody } = body;

    if (!subject || !emailBody) {
      return NextResponse.json({ success: false, error: 'subject and emailBody required' }, { status: 400 });
    }

    // Return the generated email for the client to save via Gmail MCP
    return NextResponse.json({
      success: true,
      to: to || '',
      subject,
      body: emailBody,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
