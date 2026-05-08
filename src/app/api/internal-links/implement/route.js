import { NextResponse } from 'next/server';
import { implementOrphanFix } from '@/lib/implementOrphanFix';

export const maxDuration = 60; // Vercel function timeout — Octokit + Anthropic call

export async function POST(req) {
  try {
    const { siteId, targetPath, sourcePage, anchorVariant, anchorMatrix } = await req.json();
    if (!siteId || !targetPath || !sourcePage) {
      return NextResponse.json({ error: 'siteId, targetPath, sourcePage required' }, { status: 400 });
    }
    const result = await implementOrphanFix({ siteId, targetPath, sourcePage, anchorVariant, anchorMatrix });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[implement] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
