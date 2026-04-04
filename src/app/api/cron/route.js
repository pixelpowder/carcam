import { NextResponse } from 'next/server';
import { getSearchAnalyticsByQuery, getSearchAnalyticsByPage, getSearchAnalyticsByDate } from '@/lib/gsc';
import { put, list } from '@vercel/blob';
import { sendMessage } from '@/lib/telegram';

export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const results = {};

    // Pull GSC data
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28);
    const fmt = (d) => d.toISOString().split('T')[0];

    const [queries, pages, dates] = await Promise.all([
      getSearchAnalyticsByQuery({ startDate: fmt(startDate), endDate: fmt(endDate) }),
      getSearchAnalyticsByPage({ startDate: fmt(startDate), endDate: fmt(endDate) }),
      getSearchAnalyticsByDate({ startDate: fmt(startDate), endDate: fmt(endDate) }),
    ]);
    results.queries = queries.length;
    results.pages = pages.length;
    results.dates = dates.length;

    // Save daily snapshot
    const snapshot = {
      date: today,
      gsc: { queries, pages, dates },
      crawledAt: new Date().toISOString(),
    };

    await put(`snapshots/${today}.json`, JSON.stringify(snapshot), {
      access: 'public',
      addRandomSuffix: false, allowOverwrite: true,
    });

    // Compare with yesterday — send Telegram if significant changes
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = `snapshots/${yesterday.toISOString().split('T')[0]}.json`;
      const { blobs } = await list({ prefix: yKey });
      if (blobs.length) {
        const yRes = await fetch(blobs[0].url, { cache: 'no-store' });
        const ySnap = await yRes.json();
        const yQueries = ySnap.gsc?.queries || [];
        const tQueries = queries || [];

        const yClicks = yQueries.reduce((s, q) => s + (q.clicks || 0), 0);
        const tClicks = tQueries.reduce((s, q) => s + (q.clicks || 0), 0);
        const yImps = yQueries.reduce((s, q) => s + (q.impressions || 0), 0);
        const tImps = tQueries.reduce((s, q) => s + (q.impressions || 0), 0);
        const yPos = yQueries.length ? yQueries.reduce((s, q) => s + (q.position || 0), 0) / yQueries.length : 0;
        const tPos = tQueries.length ? tQueries.reduce((s, q) => s + (q.position || 0), 0) / tQueries.length : 0;

        const clickPct = yClicks > 0 ? ((tClicks - yClicks) / yClicks * 100) : 0;
        const impPct = yImps > 0 ? ((tImps - yImps) / yImps * 100) : 0;
        const posDelta = tPos - yPos;

        const significant = Math.abs(clickPct) > 10 || Math.abs(impPct) > 15 || Math.abs(posDelta) > 2;

        if (significant) {
          const arrow = (v) => v > 0 ? '📈' : v < 0 ? '📉' : '➡️';
          const sign = (v) => v > 0 ? '+' : '';
          const msg = `<b>🚗 Car Hire GSC Update</b>\n\n` +
            `<b>Clicks:</b> ${tClicks.toLocaleString()} ${arrow(clickPct)} ${sign(clickPct)}${clickPct.toFixed(0)}%\n` +
            `<b>Impressions:</b> ${tImps.toLocaleString()} ${arrow(impPct)} ${sign(impPct)}${impPct.toFixed(0)}%\n` +
            `<b>Avg Position:</b> #${tPos.toFixed(1)} ${arrow(-posDelta)} ${posDelta > 0 ? '+' : ''}${posDelta.toFixed(1)}\n` +
            `<b>Keywords:</b> ${tQueries.length}\n\n` +
            `<i>28-day window ending ${fmt(endDate)}</i>`;

          await sendMessage(msg);
          results.telegram = 'alert sent';
        } else {
          results.telegram = 'no significant changes';
        }
      }
    } catch (e) {
      results.telegram = 'comparison failed: ' + e.message;
    }

    return NextResponse.json({ success: true, date: today, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
