/**
 * Automated Link Building Pipeline Engine
 *
 * Chunk-based processing for Vercel's 60s timeout.
 * Each invocation processes one batch, saves progress, exits.
 * Pipeline: PROSPECT → FILTER → ANALYZE → CONTACT → DRAFT → DONE
 */
import { put, list } from '@vercel/blob';
import { classifyDomain } from '@/lib/link-classification';
import { sendMessage } from '@/lib/telegram';

// ── Constants ──────────────────────────────────────────────────────────────
const BLOB_STATE = 'linkbuilding/pipeline-state.json';
const BLOB_HISTORY = 'linkbuilding/outreach-history.json';
const BLOB_RUNS = 'linkbuilding/run-history.json';
const BUDGET_MS = 50_000; // 50s safe limit within 60s max

// SERP search modifiers (from link-opportunities route)
const MODIFIERS = [
  { label: 'Resource Pages', suffix: 'useful links resources', type: 'resource' },
  { label: 'Guest Posts', suffix: 'write for us guest post', type: 'guest-post' },
  { label: 'Submit Site', suffix: 'submit your site add link suggest', type: 'submit' },
  { label: 'Best Roundups', suffix: 'best top recommended', type: 'roundup' },
  { label: 'Travel Guides', suffix: 'travel guide tips blog', type: 'guide' },
];

// Domains always excluded (all CarCam properties + majors)
const ALWAYS_EXCLUDED = new Set([
  'google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
  'pinterest.com', 'linkedin.com', 'reddit.com', 'wikipedia.org', 'amazon.com',
  'montenegrocarhire.com', 'tivatcarhire.com', 'budvacarhire.com', 'hercegnovicarhire.com',
  'ulcinjcarhire.com', 'kotorcarhire.com', 'podgoricacarhire.com', 'northernirelandcarhire.com',
  'kotorcarrental.com',
]);

// Site intros for email generation — all CarCam sites share Allan Sykes persona
const SITE_INTROS = {
  'montenegrocarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a comprehensive car hire guide for Montenegro, covering all major cities, airports, driving tips, and rental comparisons for visitors' },
  'tivatcarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a dedicated car hire guide for travellers arriving at Tivat Airport, covering rental options, driving tips, and routes across Montenegro' },
  'budvacarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a car hire guide for Budva visitors, covering rental pickup points, coastal driving routes, and parking tips for the Adriatic coast' },
  'hercegnovicarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a car hire guide for Herceg Novi, covering rentals at the Croatian border, Bay of Kotor coastal drives, and day trip routes' },
  'ulcinjcarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a car hire guide for Ulcinj and the southern Montenegro coast, covering rentals, Albanian border runs, and beach access routes' },
  'kotorcarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a car hire guide for Kotor, covering rentals at the airport and Old Town, parking outside the walls, and driving routes around the bay' },
  'podgoricacarhire.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a car hire guide for Podgorica, covering airport rentals, city driving, and routes to the coast and mountains' },
  'northernirelandcarhire.com': { name: 'Allan Sykes', role: 'based in Northern Ireland', desc: 'a car hire guide for Northern Ireland, covering Belfast and Dublin airport rentals, cross-border driving, and routes along the Causeway Coast' },
  'kotorcarrental.com': { name: 'Allan Sykes', role: 'based in Montenegro', desc: 'a car rental guide for Kotor and the Bay of Kotor, covering rental options, parking, and scenic driving routes' },
};

// Contact page paths
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/about-me', '/reach-out', '/get-in-touch', '/impressum', '/work-with-me', '/collaborate'];

const FAKE_NAMES = new Set([
  'rank math', 'yoast', 'jetpack', 'wordpress', 'cloudflare',
  'google', 'facebook', 'twitter', 'instagram', 'pinterest', 'linkedin',
  'disqus', 'gravatar', 'akismet', 'cookie', 'privacy', 'theme',
  'expand', 'contact', 'click', 'read', 'learn', 'more', 'view',
  'submit', 'search', 'menu', 'close', 'open', 'share', 'follow',
  'subscribe', 'download', 'upload', 'edit', 'delete', 'save',
  'me travel', 'expand about', 'expand get', 'contact us',
  'get in', 'sign up', 'log in', 'read more', 'click here',
]);

// ── DataForSEO helper ──────────────────────────────────────────────────────
function dfsAuth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error('DataForSEO credentials not configured');
  return Buffer.from(`${login}:${password}`).toString('base64');
}

async function dfsRequest(endpoint, body) {
  const res = await fetch(`https://api.dataforseo.com/v3${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${dfsAuth()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
  return res.json();
}

// ── Blob helpers ───────────────────────────────────────────────────────────
async function readBlob(key) {
  try {
    const { blobs } = await list({ prefix: key });
    if (!blobs.length) return null;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobs[0].url, {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function writeBlob(key, data) {
  await put(key, JSON.stringify(data), { access: 'private', addRandomSuffix: false, allowOverwrite: true });
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function loadState() { return readBlob(BLOB_STATE); }
export async function saveState(state) { state.lastChunkAt = new Date().toISOString(); return writeBlob(BLOB_STATE, state); }
export async function loadHistory() { return (await readBlob(BLOB_HISTORY)) || {}; }
export async function saveHistory(history) { return writeBlob(BLOB_HISTORY, history); }
export async function loadRuns() { return (await readBlob(BLOB_RUNS)) || []; }

export async function initRun(config) {
  const state = {
    runId: new Date().toISOString(),
    status: 'running',
    stage: 'prospect',
    config: {
      siteToPitch: config.siteToPitch || 'kotordirectory.com',
      keywords: config.keywords || ['kotor travel guide', 'montenegro tourism blog', 'things to do in kotor', 'bay of kotor guide', 'kotor Montenegro'],
      searchTypes: config.searchTypes || ['resource', 'roundup', 'guide'],
      maxProspectsPerKeyword: config.maxProspectsPerKeyword || 15,
    },
    progress: { prospected: 0, filtered: 0, analyzed: 0, contacted: 0, drafted: 0, skipped: 0, errors: 0 },
    prospects: [],
    keywordsProcessed: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    lastChunkAt: null,
  };
  await saveState(state);
  return state;
}

// ── Main chunk processor ───────────────────────────────────────────────────
export async function processChunk(state) {
  const start = Date.now();
  const hasBudget = () => Date.now() - start < BUDGET_MS;

  try {
    switch (state.stage) {
      case 'prospect':
        await runProspectChunk(state, hasBudget);
        break;
      case 'filter':
        await runFilterChunk(state);
        break;
      case 'analyze':
        await runAnalyzeChunk(state, hasBudget);
        break;
      case 'contact':
        await runContactChunk(state, hasBudget);
        break;
      case 'draft':
        await runDraftChunk(state, hasBudget);
        break;
      case 'done':
        break;
    }
  } catch (err) {
    state.progress.errors++;
    console.error('Pipeline chunk error:', err.message);
  }

  await saveState(state);
  return state;
}

// ── Stage 1: PROSPECT ──────────────────────────────────────────────────────
async function runProspectChunk(state, hasBudget) {
  const { keywords, searchTypes, maxProspectsPerKeyword } = state.config;
  const modifiers = MODIFIERS.filter(m => searchTypes.includes(m.type));

  for (const keyword of keywords) {
    if (!hasBudget()) return;
    if (state.keywordsProcessed.includes(keyword)) continue;

    // Build SERP tasks for this keyword
    const tasks = modifiers.map(m => ({
      keyword: `${keyword} ${m.suffix}`,
      location_code: 2840,
      language_code: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 20,
    }));

    try {
      const data = await dfsRequest('/serp/google/organic/live/advanced', tasks);
      const seenUrls = new Set(state.prospects.map(p => p.url));

      if (data.tasks) {
        data.tasks.forEach((task, idx) => {
          const modifier = modifiers[idx];
          const items = task.result?.[0]?.items || [];

          items.forEach(item => {
            if (item.type !== 'organic') return;
            const url = item.url || '';
            const domain = (item.domain || '').replace('www.', '');
            if (ALWAYS_EXCLUDED.has(domain) || seenUrls.has(url)) return;
            seenUrls.add(url);

            state.prospects.push({
              id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              url,
              domain,
              title: item.title || '',
              description: item.description || '',
              searchType: modifier.type,
              searchLabel: modifier.label,
              searchKeyword: keyword,
              classification: null,
              stage: 'prospected',
              skipReason: null,
              analysis: null,
              contact: null,
              draft: null,
              addedAt: new Date().toISOString(),
            });
          });
        });
      }
    } catch (err) {
      console.error(`Prospect error for "${keyword}":`, err.message);
      state.progress.errors++;
    }

    state.keywordsProcessed.push(keyword);
    state.progress.prospected = state.prospects.length;
    await saveState(state);
  }

  // All keywords done → advance to filter
  if (state.keywordsProcessed.length >= keywords.length) {
    state.stage = 'filter';
  }
}

// ── Stage 2: FILTER ────────────────────────────────────────────────────────
async function runFilterChunk(state) {
  const history = await loadHistory();
  const seenDomains = new Set();

  for (const p of state.prospects) {
    if (p.stage !== 'prospected') continue;

    const cleanDomain = p.domain.replace('www.', '');
    const { type } = classifyDomain(cleanDomain, p.url);
    p.classification = type;

    // Skip spam
    if (type === 'Spam/Low Value') {
      p.stage = 'skipped'; p.skipReason = 'spam';
      state.progress.skipped++;
      continue;
    }

    // Skip aggregators (competitors, not link targets)
    if (type === 'Aggregator') {
      p.stage = 'skipped'; p.skipReason = 'aggregator';
      state.progress.skipped++;
      continue;
    }

    // Skip already contacted
    if (history[cleanDomain]) {
      p.stage = 'skipped'; p.skipReason = 'already_contacted';
      state.progress.skipped++;
      continue;
    }

    // Deduplicate by domain (keep first)
    if (seenDomains.has(cleanDomain)) {
      p.stage = 'skipped'; p.skipReason = 'duplicate_domain';
      state.progress.skipped++;
      continue;
    }
    seenDomains.add(cleanDomain);

    p.stage = 'filtered';
    state.progress.filtered++;
  }

  state.stage = 'analyze';
}

// ── Stage 3: ANALYZE ───────────────────────────────────────────────────────
async function runAnalyzeChunk(state, hasBudget) {
  const pending = state.prospects.filter(p => p.stage === 'filtered');
  if (pending.length === 0) { state.stage = 'contact'; return; }

  for (const p of pending) {
    if (!hasBudget()) return;

    try {
      const res = await fetch('https://api.dataforseo.com/v3/on_page/content_parsing/live', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${dfsAuth()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ url: p.url }]),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) throw new Error(`DFS ${res.status}`);
      const data = await res.json();
      const result = data.tasks?.[0]?.result?.[0]?.items?.[0];

      if (result) {
        const content = result.page_content || {};
        const title = content.title?.content || p.title;
        const headings = (content.heading || []).map(h => h.content).filter(Boolean);
        const paragraphs = (content.paragraph || []).map(p => p.content).filter(Boolean);
        const links = (content.anchor || []).map(a => ({ text: a.content || '', url: a.url || '' })).filter(l => l.url);

        // Classify page type
        const fullText = [title, ...headings, ...paragraphs.slice(0, 5)].join(' ').toLowerCase();
        let pageType = 'Article';
        if (fullText.match(/best\s+\d|top\s+\d|review|compare|vs\b|ranking/)) pageType = 'Roundup/Review';
        else if (fullText.match(/resource|useful links|helpful|tools|guide/)) pageType = 'Resource Page';
        else if (fullText.match(/submit|add your|list your|sign up|register|join/)) pageType = 'Directory/Submit';

        // Find competitor links
        const competitorPatterns = ['discovercars', 'localrent', 'economybookings', 'rhinocarhire', 'vipcars', 'rentalcars', 'autoeurope', 'booking.com', 'kayak', 'tripadvisor', 'getyourguide', 'viator'];
        const competitorLinks = links.filter(l => competitorPatterns.some(cp => l.url.toLowerCase().includes(cp)));

        p.analysis = {
          title,
          pageType,
          wordCount: content.plain_text_word_count || 0,
          headings: headings.slice(0, 15),
          competitorLinks: competitorLinks.slice(0, 5),
          sampleParagraphs: paragraphs.slice(0, 3).map(t => t.slice(0, 200)),
          totalLinks: links.length,
        };
        p.stage = 'analyzed';
        state.progress.analyzed++;
      } else {
        p.stage = 'skipped'; p.skipReason = 'no_content';
        state.progress.skipped++;
      }
    } catch (err) {
      p.stage = 'skipped'; p.skipReason = `analyze_error: ${err.message}`;
      state.progress.errors++;
    }

    await saveState(state);
  }

  // Check if all filtered are now analyzed/skipped
  const remaining = state.prospects.filter(p => p.stage === 'filtered');
  if (remaining.length === 0) state.stage = 'contact';
}

// ── Stage 4: CONTACT ───────────────────────────────────────────────────────
async function runContactChunk(state, hasBudget) {
  const pending = state.prospects.filter(p => p.stage === 'analyzed');
  if (pending.length === 0) { state.stage = 'draft'; return; }

  for (const p of pending) {
    if (!hasBudget()) return;

    try {
      const contact = await findContact(p.domain);
      p.contact = contact;
      p.stage = 'contacted';
      state.progress.contacted++;
    } catch (err) {
      p.contact = { email: null, name: null, method: 'unknown' };
      p.stage = 'contacted';
      state.progress.contacted++;
    }

    await saveState(state);
  }

  const remaining = state.prospects.filter(p => p.stage === 'analyzed');
  if (remaining.length === 0) state.stage = 'draft';
}

// ── Stage 5: DRAFT ─────────────────────────────────────────────────────────
async function runDraftChunk(state, hasBudget) {
  const pending = state.prospects.filter(p => p.stage === 'contacted' && p.contact?.email);
  const noEmail = state.prospects.filter(p => p.stage === 'contacted' && !p.contact?.email);

  // Skip prospects with no email
  for (const p of noEmail) {
    if (p.contact?.method === 'form') {
      p.stage = 'drafted'; // keep but note it's form-only
      p.draft = { subject: null, body: null, method: 'form', contactPage: p.contact.contactPage };
      state.progress.drafted++;
    } else {
      p.stage = 'skipped'; p.skipReason = 'no_contact';
      state.progress.skipped++;
    }
  }

  if (pending.length === 0) {
    await finishRun(state);
    return;
  }

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    for (const p of pending) { p.stage = 'skipped'; p.skipReason = 'no_api_key'; state.progress.skipped++; }
    await finishRun(state);
    return;
  }

  for (const p of pending) {
    if (!hasBudget()) return;

    try {
      const site = state.config.siteToPitch;
      const siteInfo = SITE_INTROS[site] || SITE_INTROS['kotordirectory.com'];
      const firstName = p.contact.name ? p.contact.name.split(' ')[0] : null;
      const analysis = p.analysis || {};
      const hasCompetitors = analysis.competitorLinks?.length > 0;

      const contentType = analysis.pageType === 'Roundup/Review' ? 'roundup'
        : analysis.pageType === 'Resource Page' ? 'resource page'
        : analysis.pageType === 'Directory/Submit' ? 'directory'
        : 'guide';

      const systemPrompt = `You write personalised outreach emails for link building. You write in the voice of ${siteInfo.name}, ${siteInfo.role}.

STYLE RULES (from real sent emails that get replies):
- Conversational, concise, not salesy. No bold claims about traffic or DR.
- The "local resident" or "based in Montenegro" angle is the core credibility signal.
- The ask is always soft: "Would you consider adding a link?" — never pushy.
- NEVER use marketing language, exclamation marks, or phrases like "I'd love to", "amazing content", "fantastic article".
- NEVER mention SEO, backlinks, domain authority, or link juice.
- Subject line format: "Your [domain] [content type] — [topic] resource"
- Keep it under 150 words total for the body.

STRUCTURE (4 paragraphs, all short):
1. PERSONALISED HOOK — reference 2-3 SPECIFIC details from their article that show you actually read it.
2. WHO I AM — one sentence: "${siteInfo.name}, ${siteInfo.role}. I run ${site} (https://www.${site}) — ${siteInfo.desc}."
3. THE ASK — soft request to add a link. If they link to competitors, mention those specifically and suggest your site alongside them.
4. SIGN-OFF — "Best regards,\\n${siteInfo.name}\\n${site}\\nMontenegro"`;

      const userPrompt = `Write an outreach email for this prospect:

TARGET ARTICLE: "${analysis.title || p.title}"
URL: ${p.url}
DOMAIN: ${p.domain}
CONTENT TYPE: ${contentType}
${analysis.headings?.length ? `ARTICLE HEADINGS: ${analysis.headings.slice(0, 8).join(', ')}` : ''}
${analysis.sampleParagraphs?.length ? `ARTICLE EXCERPTS:\n${analysis.sampleParagraphs.slice(0, 3).join('\n')}` : ''}
${hasCompetitors ? `COMPETITOR LINKS FOUND: ${analysis.competitorLinks.slice(0, 3).map(c => c.text || c.url).join(', ')}` : 'No competitor links found on the page.'}

RECIPIENT: ${firstName || 'unknown (use "Hi," with no name)'}
SITE TO PITCH: ${site}

Output ONLY the subject line and body, separated by a blank line. No labels, no "Subject:" prefix.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`Claude API ${res.status}`);
      const msg = await res.json();
      const output = (msg.content?.[0]?.text || '').trim();
      const lines = output.split('\n');
      const subject = lines[0].replace(/^Subject:\s*/i, '').trim();
      const body = lines.slice(2).join('\n').trim() || lines.slice(1).join('\n').trim();

      p.draft = { subject, body, generatedAt: new Date().toISOString() };
      p.stage = 'drafted';
      state.progress.drafted++;
    } catch (err) {
      p.draft = { subject: null, body: null, error: err.message };
      p.stage = 'drafted';
      state.progress.drafted++;
      state.progress.errors++;
    }

    await saveState(state);
  }

  // Check if all done
  const remaining = state.prospects.filter(p => p.stage === 'contacted');
  if (remaining.length === 0) await finishRun(state);
}

// ── Finish run ─────────────────────────────────────────────────────────────
async function finishRun(state) {
  state.stage = 'done';
  state.status = 'completed';
  state.completedAt = new Date().toISOString();

  // Save to run history
  const runs = await loadRuns();
  runs.unshift({
    runId: state.runId,
    status: 'completed',
    triggeredBy: state.config.triggeredBy || 'manual',
    siteToPitch: state.config.siteToPitch,
    keywords: state.config.keywords,
    stats: { ...state.progress },
    startedAt: state.startedAt,
    completedAt: state.completedAt,
  });
  await writeBlob(BLOB_RUNS, runs.slice(0, 20)); // keep last 20 runs

  // Update outreach history with new prospects
  const history = await loadHistory();
  for (const p of state.prospects) {
    if (p.stage === 'drafted' && p.draft?.subject && p.contact?.email) {
      const cleanDomain = p.domain.replace('www.', '');
      if (!history[cleanDomain]) {
        history[cleanDomain] = {
          email: p.contact.email,
          name: p.contact.name,
          subject: p.draft.subject,
          site: state.config.siteToPitch,
          method: p.contact.method,
          pageUrl: p.url,
          status: 'drafted',
          date: new Date().toISOString(),
          runId: state.runId,
        };
      }
    }
  }
  await saveHistory(history);

  // Send Telegram notification
  try {
    const drafted = state.prospects.filter(p => p.stage === 'drafted' && p.draft?.subject).length;
    const msg = `<b>Link Building Pipeline Complete</b>\n\n` +
      `<b>Site:</b> ${state.config.siteToPitch}\n` +
      `<b>Keywords:</b> ${state.config.keywords.join(', ')}\n\n` +
      `<b>Results:</b>\n` +
      `  Prospected: ${state.progress.prospected}\n` +
      `  Filtered: ${state.progress.filtered} (${state.progress.skipped} skipped)\n` +
      `  Analyzed: ${state.progress.analyzed}\n` +
      `  Contacts found: ${state.progress.contacted}\n` +
      `  Emails drafted: ${drafted}\n` +
      `  Errors: ${state.progress.errors}\n\n` +
      `<b>Ready for review in Link Prospecting > Auto Pipeline</b>`;
    await sendMessage(msg);
  } catch {}
}

// ── Contact finder (inlined from find-contact route) ───────────────────────
function findEmails(text, targetDomain) {
  const results = [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  results.push(...(text.match(emailRegex) || []));

  const obfuscatedRegex = /([a-zA-Z0-9._%+-]+)\s*[\[\(\{]\s*at\s*[\]\)\}]\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = obfuscatedRegex.exec(text)) !== null) results.push(`${match[1].trim()}@${match[2].trim()}`);

  const domainClean = targetDomain?.replace('www.', '') || '';
  const filtered = [...new Set(results.map(e => e.toLowerCase()))].filter(e =>
    !e.includes('example.com') && !e.includes('wixpress') && !e.includes('sentry.io') &&
    !e.includes('schema.org') && !e.includes('w3.org') && !e.includes('googleapis') &&
    !e.includes('gravatar') && !e.includes('.png') && !e.includes('.jpg') &&
    !e.endsWith('.js') && !e.endsWith('.css') && !e.includes('noreply') && !e.includes('no-reply')
  );
  filtered.sort((a, b) => (b.includes(domainClean) ? 1 : 0) - (a.includes(domainClean) ? 1 : 0));
  return filtered;
}

// Common UI/nav words that get falsely picked up as names
const UI_WORDS = new Set([
  'expand', 'contact', 'click', 'read', 'learn', 'more', 'view', 'submit',
  'search', 'menu', 'close', 'open', 'share', 'follow', 'subscribe', 'get',
  'download', 'upload', 'edit', 'delete', 'save', 'about', 'travel', 'home',
  'blog', 'posts', 'tags', 'categories', 'archives', 'previous', 'next',
]);

function findContactName(text) {
  const patterns = [
    /(?:I['\u2019]m|I am|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:meet|hi,?\s*I['\u2019]m|hello,?\s*I['\u2019]m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:written by|posted by|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/,
    /(?:cheers|regards|love|thanks|yours)[,.]?\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (name.length < 3 || name.length > 30) continue;
      if (FAKE_NAMES.has(name.toLowerCase())) continue;
      // Reject single words that are common UI/nav text
      const words = name.split(/\s+/);
      if (words.length === 1 && UI_WORDS.has(words[0].toLowerCase())) continue;
      // Reject if both words are UI words (e.g. "Expand About", "Me Travel")
      if (words.length === 2 && words.every(w => UI_WORDS.has(w.toLowerCase()))) continue;
      if (/^(The|My|Our|This|WordPress|Plugin|Theme|Site|Blog|Page|Post|Google|Facebook|Twitter)\b/.test(name)) continue;
      return name;
    }
  }
  return null;
}

function stripHtml(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.length > 500) return text;
    }
  } catch {}
  return null;
}

async function findContact(domain) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const baseUrl = `https://${cleanDomain}`;
  let email = null, name = null, method = 'unknown', contactPage = null;

  for (const path of CONTACT_PATHS) {
    const html = await fetchPage(`${baseUrl}${path}`);
    if (!html) continue;
    const text = stripHtml(html);
    const emails = findEmails(text, cleanDomain);
    const foundName = findContactName(text);
    if (emails.length > 0 && !email) { email = emails[0]; method = 'email'; contactPage = `${baseUrl}${path}`; }
    if (foundName && !name) name = foundName;
    if (email && name) break;
    if (!email && html.toLowerCase().includes('<form')) { method = 'form'; contactPage = `${baseUrl}${path}`; }
  }

  // Fall back to homepage
  if (!email || !name) {
    const homepage = await fetchPage(baseUrl);
    if (homepage) {
      const text = stripHtml(homepage);
      if (!email) { const emails = findEmails(text, cleanDomain); if (emails.length) { email = emails[0]; method = 'email'; } }
      if (!name) name = findContactName(text);
    }
  }

  return { email, name, method, contactPage };
}
