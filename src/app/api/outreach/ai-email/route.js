import { NextResponse } from 'next/server';

const SITE_INTROS = {
  'kotorcarrental.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a car rental guide for Kotor and the Bay of Kotor, covering rental options, parking, and scenic driving routes',
  },
  'montenegrocarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a comprehensive car hire guide for Montenegro, covering all major cities, airports, driving tips, and rental comparisons for visitors',
  },
  'kotorcarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a dedicated car hire resource for visitors to Kotor, covering rental options, driving routes around the Bay of Kotor, and practical tips',
  },
  'budvacarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a dedicated car hire guide for Budva visitors, covering rental options, beach-hopping routes, and driving tips along the Montenegrin coast',
  },
  'tivatcarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a car hire guide for Tivat and the surrounding Bay of Kotor area, covering rental options and local driving routes',
  },
  'hercegnovicarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a car hire resource for Herceg Novi visitors, covering rental options, cross-border routes to Croatia, and coastal driving tips',
  },
  'podgoricacarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a car hire guide for Podgorica and central Montenegro, covering airport rentals, city routes, and trips to Durmitor and Lake Skadar',
  },
  'ulcinjcarhire.com': {
    name: 'Allan Sykes',
    role: 'based in Montenegro',
    desc: 'a car hire guide for Ulcinj and southern Montenegro, covering rental options, routes to Ada Bojana, and cross-border trips to Albania',
  },
  'northernirelandcarhire.com': {
    name: 'Allan Sykes',
    role: 'a travel writer',
    desc: 'a comprehensive car hire guide for Northern Ireland, covering rental options at Belfast airports, Causeway Coast routes, and driving tips',
  },
};

export async function POST(request) {
  try {
    const { pageTitle, pageUrl, domain, pageType, competitorLinks, siteToPitch, contactName, headings, sampleParagraphs } = await request.json();

    if (!pageTitle || !domain) {
      return NextResponse.json({ success: false, error: 'pageTitle and domain required' }, { status: 400 });
    }

    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const site = siteToPitch || 'montenegrocarhire.com';
    const siteInfo = SITE_INTROS[site] || SITE_INTROS['montenegrocarhire.com'];
    const cleanDomain = domain.replace('www.', '');
    const firstName = contactName ? contactName.split(' ')[0] : null;
    const hasCompetitors = competitorLinks && competitorLinks.length > 0;

    const contentType = pageType === 'Roundup/Review' ? 'roundup'
      : pageType === 'Resource Page' ? 'resource page'
      : pageType === 'Directory/Submit' ? 'directory'
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
1. PERSONALISED HOOK — reference 2-3 SPECIFIC details from their article that show you actually read it. Name specific sections, tips, places, or facts they mentioned. Be genuine — not generic praise.
2. WHO I AM — one sentence: "${siteInfo.name}, ${siteInfo.role}. I run ${site} (https://www.${site}) — ${siteInfo.desc}."
3. THE ASK — soft request to add a link. If they link to competitors, mention those specifically and suggest your site alongside them.
4. SIGN-OFF — "Best regards,\\n${siteInfo.name}\\n${site}\\nMontenegro"`;

    const userPrompt = `Write an outreach email for this prospect:

TARGET ARTICLE: "${pageTitle}"
URL: ${pageUrl}
DOMAIN: ${cleanDomain}
CONTENT TYPE: ${contentType}
${headings?.length ? `ARTICLE HEADINGS: ${headings.slice(0, 8).join(', ')}` : ''}
${sampleParagraphs?.length ? `ARTICLE EXCERPTS:\n${sampleParagraphs.slice(0, 3).join('\n')}` : ''}
${hasCompetitors ? `COMPETITOR LINKS FOUND: ${competitorLinks.slice(0, 3).map(c => c.text || c.url).join(', ')}` : 'No competitor links found on the page.'}

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
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${err}`);
    }

    const msg = await res.json();
    const output = (msg.content?.[0]?.text || '').trim();
    const lines = output.split('\n');
    const subject = lines[0].replace(/^Subject:\s*/i, '').trim();
    const body = lines.slice(2).join('\n').trim() || lines.slice(1).join('\n').trim();

    return NextResponse.json({
      success: true,
      subject,
      body,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
