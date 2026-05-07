import { NextResponse } from 'next/server';
import { loadHistory, saveHistory, loadRuns } from '@/lib/linkbuilding-pipeline';

// GET — read outreach history + run history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'history';

    if (type === 'runs') {
      const runs = await loadRuns();
      return NextResponse.json({ success: true, runs });
    }

    const history = await loadHistory();
    return NextResponse.json({ success: true, history, count: Object.keys(history).length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — upsert an outreach record (create or update). Accepts either a full draft
// payload from the manual Find-Opportunities flow, or {domain, status, draftId}
// for status-only updates from the tracker tab.
export async function POST(request) {
  try {
    // Skip silently in environments without Blob storage (e.g. local dev). The
    // client treats this as a best-effort mirror — localStorage is the live source.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ success: true, skipped: 'no-blob-storage' });
    }
    const body = await request.json();
    const { domain, site, status, draftId, email, name, subject, pageUrl, method } = body;
    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain required' }, { status: 400 });
    }

    const history = await loadHistory();
    const cleanDomain = domain.replace('www.', '');
    const now = new Date().toISOString();
    const existing = history[cleanDomain] || {};

    // Status-only update path: requires record to exist already
    if (status && !email && !subject && !pageUrl && !site) {
      if (!existing.runId && !existing.byTarget && !existing.site) {
        return NextResponse.json({ success: false, error: 'Domain not found in history' }, { status: 404 });
      }
      // Update top-level + the matching byTarget entry if site provided implicitly via existing
      existing.status = status;
      if (draftId) existing.draftId = draftId;
      existing.updatedAt = now;
      // If a single site is identifiable, mirror status into byTarget for that site
      if (existing.byTarget) {
        for (const s of Object.keys(existing.byTarget)) {
          existing.byTarget[s].status = status;
        }
      }
      history[cleanDomain] = existing;
      await saveHistory(history);
      return NextResponse.json({ success: true, updated: 'status-only' });
    }

    // Full upsert — keep nested byTarget map for multi-site outreach per domain
    const byTarget = { ...(existing.byTarget || {}) };
    if (site) {
      byTarget[site] = {
        site,
        email: email ?? byTarget[site]?.email ?? existing.email ?? null,
        name: name ?? byTarget[site]?.name ?? existing.name ?? null,
        subject: subject ?? byTarget[site]?.subject ?? existing.subject ?? null,
        pageUrl: pageUrl ?? byTarget[site]?.pageUrl ?? existing.pageUrl ?? null,
        method: method ?? byTarget[site]?.method ?? existing.method ?? 'email',
        status: status ?? byTarget[site]?.status ?? 'drafted',
        draftId: draftId ?? byTarget[site]?.draftId ?? null,
        date: now,
      };
    }

    history[cleanDomain] = {
      ...existing,
      // Top-level mirrors latest write so legacy readers still work
      email: email ?? existing.email ?? null,
      name: name ?? existing.name ?? null,
      subject: subject ?? existing.subject ?? null,
      site: site ?? existing.site ?? null,
      method: method ?? existing.method ?? 'email',
      pageUrl: pageUrl ?? existing.pageUrl ?? null,
      status: status ?? existing.status ?? 'drafted',
      draftId: draftId ?? existing.draftId ?? null,
      date: existing.date || now,
      updatedAt: now,
      runId: existing.runId || 'manual',
      byTarget,
    };

    await saveHistory(history);
    return NextResponse.json({ success: true, upserted: cleanDomain, site: site || null });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE — remove a single (domain, site) draft, or the whole domain if no site given.
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const site = searchParams.get('site');
    if (!domain) {
      return NextResponse.json({ success: false, error: 'domain required' }, { status: 400 });
    }

    const history = await loadHistory();
    const cleanDomain = domain.replace('www.', '');
    if (!history[cleanDomain]) {
      return NextResponse.json({ success: true, removed: false });
    }

    if (site && history[cleanDomain].byTarget) {
      delete history[cleanDomain].byTarget[site];
      if (!Object.keys(history[cleanDomain].byTarget).length) {
        delete history[cleanDomain];
      }
    } else {
      delete history[cleanDomain];
    }

    await saveHistory(history);
    return NextResponse.json({ success: true, removed: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT — bulk import from localStorage outreach history (one-time migration)
export async function PUT(request) {
  try {
    const { localHistory } = await request.json();
    if (!localHistory || typeof localHistory !== 'object') {
      return NextResponse.json({ success: false, error: 'localHistory object required' }, { status: 400 });
    }

    const existing = await loadHistory();
    let imported = 0;

    for (const [domain, data] of Object.entries(localHistory)) {
      const cleanDomain = domain.replace('www.', '');
      if (!existing[cleanDomain]) {
        existing[cleanDomain] = {
          email: data.email || null,
          name: data.contactName || null,
          subject: data.subject || null,
          site: data.siteToPitch || 'montenegrocarhire.com',
          method: data.method || 'email',
          pageUrl: data.pageUrl || null,
          status: data.status || 'sent',
          date: data.date || new Date().toISOString(),
          runId: 'migrated',
        };
        imported++;
      }
    }

    await saveHistory(existing);
    return NextResponse.json({ success: true, imported, total: Object.keys(existing).length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
