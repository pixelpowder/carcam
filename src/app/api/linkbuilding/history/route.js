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

// POST — update a single domain's outreach status
export async function POST(request) {
  try {
    const { domain, status, draftId } = await request.json();
    if (!domain || !status) {
      return NextResponse.json({ success: false, error: 'domain and status required' }, { status: 400 });
    }

    const history = await loadHistory();
    const cleanDomain = domain.replace('www.', '');

    if (!history[cleanDomain]) {
      return NextResponse.json({ success: false, error: 'Domain not found in history' }, { status: 404 });
    }

    history[cleanDomain].status = status;
    if (draftId) history[cleanDomain].draftId = draftId;
    history[cleanDomain].updatedAt = new Date().toISOString();
    await saveHistory(history);

    return NextResponse.json({ success: true });
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
