import { NextResponse } from 'next/server';

// Pages to check for contact info, in priority order
const CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/about-me', '/reach-out', '/get-in-touch', '/impressum', '/work-with-me', '/collaborate'];

// Known false-positive "names" to reject
const FAKE_NAMES = new Set([
  'rank math', 'yoast', 'jetpack', 'wordpress', 'flavicon', 'cloudflare',
  'google', 'facebook', 'twitter', 'instagram', 'pinterest', 'linkedin',
  'disqus', 'gravatar', 'akismet', 'cookie', 'privacy', 'theme',
  'flavor', 'flavor developer', 'flavor developer developer',
  'flavor developer developer developer', 'flavor developer developer developer developer',
]);

// Extract emails from text, including obfuscated ones like "hello [at] domain.com"
function findEmails(text, targetDomain) {
  const results = [];

  // Standard email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const standard = text.match(emailRegex) || [];
  results.push(...standard);

  // Obfuscated: "hello [at] domain.com", "hello (at) domain.com", "hello{at}domain.com"
  const obfuscatedRegex = /([a-zA-Z0-9._%+-]+)\s*[\[\(\{]\s*at\s*[\]\)\}]\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = obfuscatedRegex.exec(text)) !== null) {
    results.push(`${match[1].trim()}@${match[2].trim()}`);
  }

  // Obfuscated: "hello AT domain DOT com"
  const atDotRegex = /([a-zA-Z0-9._%+-]+)\s+AT\s+([a-zA-Z0-9.-]+)\s+DOT\s+([a-zA-Z]{2,})/g;
  while ((match = atDotRegex.exec(text)) !== null) {
    results.push(`${match[1].trim()}@${match[2].trim()}.${match[3].trim()}`);
  }

  // Deduplicate and filter
  const filtered = [...new Set(results.map(e => e.toLowerCase()))].filter(e =>
    !e.includes('example.com') &&
    !e.includes('wixpress') &&
    !e.includes('sentry.io') &&
    !e.includes('schema.org') &&
    !e.includes('w3.org') &&
    !e.includes('googleapis') &&
    !e.includes('gravatar') &&
    !e.includes('.png') &&
    !e.includes('.jpg') &&
    !e.includes('.webp') &&
    !e.includes('.svg') &&
    !e.endsWith('.js') &&
    !e.endsWith('.css') &&
    !e.includes('noreply') &&
    !e.includes('no-reply') &&
    !e.includes('donotreply')
  );

  // Prioritise: domain-matching emails first, then others
  const domainClean = targetDomain?.replace('www.', '') || '';
  filtered.sort((a, b) => {
    const aMatch = a.includes(domainClean) ? 1 : 0;
    const bMatch = b.includes(domainClean) ? 1 : 0;
    return bMatch - aMatch;
  });

  return filtered;
}

// Extract visible text from HTML (strip tags)
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Try to extract a person's name from visible page text
function findContactName(html) {
  const text = stripHtml(html);

  const patterns = [
    // "I'm Ausra" / "I am Ausra" / "My name is Ausra"
    /(?:I[''\u2019]m|I am|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    // "About Ausra" / "Meet Ausra" / "Hi, I'm Ausra"
    /(?:about|meet|hi,?\s*I[''\u2019]m|hello,?\s*I[''\u2019]m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    // "Written by Ausra" / "by Ausra Vaitkute"
    /(?:written by|posted by|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    // Standalone name after "Ausra" at end of about section (common blog pattern)
    /(?:cheers|regards|love|thanks|yours)[,.]?\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Reject fake names
      if (name.length < 2 || name.length > 30) continue;
      if (FAKE_NAMES.has(name.toLowerCase())) continue;
      // Reject if it looks like a brand/plugin (all lowercase after first letter, or contains common tech words)
      if (/^(The|My|Our|This|WordPress|Plugin|Theme|Site|Blog|Page|Post|Google|Facebook|Twitter)\b/.test(name)) continue;
      return name;
    }
  }
  return null;
}

// Check if page has a contact form
function hasContactForm(html) {
  const formIndicators = ['<form', 'type="submit"', 'contact-form', 'wpcf7', 'wpforms', 'formspree', 'getform', 'submit your message', 'send message', 'send us a message', 'contact form'];
  const lower = html.toLowerCase();
  return formIndicators.some(ind => lower.includes(ind));
}

// Try direct fetch first, fall back to DataForSEO content parsing if blocked
async function fetchPage(url) {
  // Try direct fetch
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.length > 500) return text; // Got real content
    }
  } catch (e) { /* blocked or timeout, try DFS fallback */ }

  // Fallback: use DataForSEO content parsing (renders with real browser)
  return fetchViaDFS(url);
}

async function fetchViaDFS(url) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;

  try {
    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const res = await fetch('https://api.dataforseo.com/v3/on_page/content_parsing/live', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ url }]),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.tasks?.[0]?.result?.[0]?.items?.[0];
    if (!result) return null;

    // Reconstruct text content from parsed elements
    const content = result.page_content || {};
    const parts = [];
    if (content.title?.content) parts.push(content.title.content);
    (content.heading || []).forEach(h => parts.push(h.content));
    (content.paragraph || []).forEach(p => parts.push(p.content));
    (content.anchor || []).forEach(a => {
      if (a.content) parts.push(a.content);
      if (a.url) parts.push(a.url);
    });
    return parts.join(' ');
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    if (!domain) return NextResponse.json({ success: false, error: 'domain required' }, { status: 400 });

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    const baseUrl = `https://${cleanDomain}`;

    let contactEmail = null;
    let contactName = null;
    let contactMethod = 'unknown';
    let contactPage = null;
    let checkedPages = [];
    let allEmails = [];

    // Check contact/about pages FIRST (more reliable than homepage)
    for (const path of CONTACT_PATHS) {
      const url = `${baseUrl}${path}`;
      checkedPages.push(path);
      const html = await fetchPage(url);
      if (!html) continue;

      const emails = findEmails(html, cleanDomain);
      allEmails.push(...emails);
      const name = findContactName(html);

      if (emails.length > 0 && !contactEmail) {
        contactEmail = emails[0];
        contactMethod = 'email';
        contactPage = path;
      }
      if (name && !contactName) {
        contactName = name;
      }
      if (!contactEmail && hasContactForm(html)) {
        contactMethod = 'form';
        contactPage = path;
      }

      if (contactEmail && contactName) break;
    }

    // Fall back to homepage if needed
    if (!contactEmail || !contactName) {
      const homepage = await fetchPage(baseUrl);
      if (homepage) {
        if (!contactEmail) {
          const emails = findEmails(homepage, cleanDomain);
          allEmails.push(...emails);
          if (emails.length > 0) {
            contactEmail = emails[0];
            contactMethod = 'email';
          }
        }
        if (!contactName) {
          const name = findContactName(homepage);
          if (name) contactName = name;
        }
        if (!contactEmail && hasContactForm(homepage)) {
          contactMethod = 'form';
        }
      }
    }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      email: contactEmail,
      name: contactName,
      method: contactMethod,
      contactPage: contactPage ? `${baseUrl}${contactPage}` : null,
      checkedPages,
      allEmailsFound: [...new Set(allEmails)].slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
