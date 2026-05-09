import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// Fetch current EN values for a list of i18n keys. Used by the manual-rewrite
// UI to show before/after diff against a Claude-pushed draft.

const SITE_REPOS = {
  montenegrocarhire: { owner: 'pixelpowder', repo: 'montenegro-car-hire', branch: 'master' },
};

export async function POST(req) {
  try {
    const { siteId, keys } = await req.json();
    if (!siteId || !Array.isArray(keys)) {
      return NextResponse.json({ error: 'siteId + keys array required' }, { status: 400 });
    }
    const cfg = SITE_REPOS[siteId];
    if (!cfg) return NextResponse.json({ error: `No repo for ${siteId}` }, { status: 400 });

    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN not set' }, { status: 500 });
    const gh = new Octokit({ auth: token });

    const { data } = await gh.repos.getContent({
      owner: cfg.owner, repo: cfg.repo,
      path: 'src/i18n/locales/en.json',
      ref: cfg.branch,
    });
    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error('en.json not a file');
    }
    const en = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8'));

    const currentValues = {};
    for (const key of keys) {
      const parts = key.split('.');
      let cur = en;
      for (const p of parts) {
        if (cur == null) break;
        cur = cur[p];
      }
      currentValues[key] = typeof cur === 'string' ? cur : '';
    }

    return NextResponse.json({ success: true, currentValues });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
