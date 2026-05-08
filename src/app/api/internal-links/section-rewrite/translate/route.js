import { NextResponse } from 'next/server';
import { translateSectionRewrite } from '@/lib/sectionRewrite';

export const maxDuration = 60;

// POST — translate a previously-generated EN section-rewrite into 6 locales.
// Body: { enRewrite, anchorMatrix }
// Returns the same shape with newValues populated for all 7 locales.
export async function POST(req) {
  try {
    const { enRewrite, anchorMatrix } = await req.json();
    if (!enRewrite || !anchorMatrix) {
      return NextResponse.json({ error: 'enRewrite, anchorMatrix required' }, { status: 400 });
    }
    const result = await translateSectionRewrite({ enRewrite, anchorMatrix });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[section-rewrite/translate] failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
