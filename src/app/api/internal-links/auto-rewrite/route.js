import { NextResponse } from 'next/server';
import { generateAutoRewrite, applyAutoRewrite, PAGE_CONFIGS } from '@/lib/autoRewriteAgent';

export const maxDuration = 60;

// GET — return whether auto-rewrite is supported for this page, and if so,
// expose the namespace + key info so the UI can render inline action editors
// (e.g. "Rewrite the meta description" → know which i18n key that maps to).
export async function GET(req) {
  const url = new URL(req.url);
  const page = url.searchParams.get('page');
  if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });
  const cfg = PAGE_CONFIGS[page];
  return NextResponse.json({
    success: true,
    supported: !!cfg,
    config: cfg ? {
      metaNamespace: cfg.metaNamespace,
      bodyNamespace: cfg.bodyNamespace,
      // Convenience: pre-resolved keys for the common action targets
      keys: {
        title: `${cfg.metaNamespace}.title`,
        subtitle: `${cfg.metaNamespace}.subtitle`,
        seoDesc: `${cfg.metaNamespace}.seoDesc`,
        h1: `${cfg.bodyNamespace}.h1`,
      },
    } : null,
  });
}

// POST — generate proposed meta+h1 rewrites (no PR yet). Returns the diff
// payload the UI uses for review before user commits. Body content is OUT OF
// SCOPE and stays untouched — only title/subtitle/seoDesc/h1 are rewritten.
export async function POST(req) {
  try {
    const { siteId, page, brandGuide } = await req.json();
    if (!siteId || !page) {
      return NextResponse.json({ error: 'siteId, page required' }, { status: 400 });
    }
    const result = await generateAutoRewrite({ siteId, page, brandGuide });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[auto-rewrite] generate failed:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
