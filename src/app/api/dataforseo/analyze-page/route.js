import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });

    // Use DataForSEO content parsing to get page structure
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    if (!login || !password) return NextResponse.json({ success: false, error: 'DataForSEO credentials not configured' }, { status: 500 });

    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const res = await fetch('https://api.dataforseo.com/v3/on_page/content_parsing/live', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ url }]),
    });

    if (!res.ok) return NextResponse.json({ success: false, error: `API error: ${res.status}` }, { status: 500 });
    const data = await res.json();
    const result = data.tasks?.[0]?.result?.[0]?.items?.[0];
    if (!result) return NextResponse.json({ success: false, error: 'No content returned' }, { status: 404 });

    // Extract useful info
    const content = result.page_content || {};
    const title = content.title?.content || '';
    const headings = (content.heading || []).map(h => h.content).filter(Boolean);
    const paragraphs = (content.paragraph || []).map(p => p.content).filter(Boolean);
    const links = (content.anchor || []).map(a => ({
      text: a.content || '',
      url: a.url || '',
    })).filter(l => l.url);

    // Classify the page type based on content signals
    const fullText = [title, ...headings, ...paragraphs.slice(0, 5)].join(' ').toLowerCase();
    let pageType = 'Article';
    if (fullText.match(/best\s+\d|top\s+\d|review|compare|vs\b|ranking/)) pageType = 'Roundup/Review';
    else if (fullText.match(/resource|useful links|helpful|tools|guide/)) pageType = 'Resource Page';
    else if (fullText.match(/submit|add your|list your|sign up|register|join/)) pageType = 'Directory/Submit';
    else if (fullText.match(/forum|discussion|thread|reply|comment/)) pageType = 'Forum/Discussion';
    else if (fullText.match(/hire|rent|car|vehicle|drive/)) pageType = 'Niche Content';

    // Find competitor-related links — passed via query param or use defaults
    const competitorParam = searchParams.get('competitors');
    const competitorPatterns = competitorParam
      ? competitorParam.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
      : ['discovercars', 'localrent', 'economybookings', 'rhinocarhire', 'vipcars', 'rentalcars', 'autoeurope', 'booking.com', 'kayak'];
    const competitorLinks = links.filter(l =>
      competitorPatterns.some(p => l.url.toLowerCase().includes(p))
    );

    // Find niche-related links — passed via query param or use defaults
    const nicheParam = searchParams.get('niche');
    const nichePatterns = nicheParam
      ? nicheParam.split(',').map(n => n.trim()).filter(Boolean)
      : ['car\\s*(hire|rental)', 'rent\\s*a?\\s*car', 'vehicle', 'drive'];
    const nicheLinks = links.filter(l => {
      const combined = (l.text + ' ' + l.url).toLowerCase();
      return nichePatterns.some(p => combined.match(new RegExp(p, 'i')));
    });

    return NextResponse.json({
      success: true,
      url,
      title,
      pageType,
      wordCount: content.plain_text_word_count || 0,
      headings: headings.slice(0, 15),
      totalLinks: links.length,
      competitorLinks,
      nicheLinks,
      sampleParagraphs: paragraphs.slice(0, 3).map(p => p.slice(0, 200)),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
