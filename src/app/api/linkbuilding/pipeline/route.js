import { NextResponse } from 'next/server';
import { initRun, loadState, processChunk } from '@/lib/linkbuilding-pipeline';

export const maxDuration = 60;

// POST — start a new pipeline run
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const existing = await loadState();
    if (existing?.status === 'running') {
      return NextResponse.json({ success: false, error: 'Pipeline already running', runId: existing.runId }, { status: 409 });
    }

    const state = await initRun({
      siteToPitch: body.siteToPitch || 'montenegrocarhire.com',
      keywords: body.keywords,
      searchTypes: body.searchTypes,
      maxProspectsPerKeyword: body.maxProspectsPerKeyword,
      triggeredBy: 'manual',
    });

    // Process first chunk immediately
    const updated = await processChunk(state);

    return NextResponse.json({
      success: true,
      runId: updated.runId,
      status: updated.status,
      stage: updated.stage,
      progress: updated.progress,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET — poll current pipeline status
export async function GET() {
  try {
    const state = await loadState();
    if (!state) {
      return NextResponse.json({ success: true, status: 'idle', message: 'No pipeline runs yet' });
    }
    return NextResponse.json({
      success: true,
      runId: state.runId,
      status: state.status,
      stage: state.stage,
      progress: state.progress,
      config: state.config,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      lastChunkAt: state.lastChunkAt,
      prospectCount: state.prospects?.length || 0,
      prospects: state.prospects || [],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH — process next chunk (called by cron or manual)
export async function PATCH() {
  try {
    const state = await loadState();
    if (!state || state.status !== 'running') {
      return NextResponse.json({ success: true, status: state?.status || 'idle', message: 'Nothing to process' });
    }

    const updated = await processChunk(state);

    return NextResponse.json({
      success: true,
      runId: updated.runId,
      status: updated.status,
      stage: updated.stage,
      progress: updated.progress,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
