'use client';
import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { Target, Download, Globe, Loader2, Plus, X, Trash2, Save, Search, ExternalLink, AlertTriangle, BarChart2, RefreshCw, Link2, ChevronDown, ChevronRight, FileSearch, Mail, MessageSquare, Send, FolderPlus, Pencil, Cpu, Play, Clock, CheckCircle2, AlertCircle, Inbox } from 'lucide-react';
import { classifyDomain, CATEGORY_COLORS, CATEGORY_HEX } from '@/lib/link-classification';

// ── Reusable components ─────────────────────────────────────────────────────
function HBar({ label, value, max, color = '#3b82f6', suffix = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-zinc-400 w-28 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-zinc-400 w-10 text-right flex-shrink-0">{value.toLocaleString()}{suffix}</span>
    </div>
  );
}

function Donut({ segments, size = 80 }) {
  let cumulativePct = 0;
  const gradientParts = segments.map(s => {
    const start = cumulativePct;
    cumulativePct += s.pct;
    return `${s.color} ${start}% ${cumulativePct}%`;
  });
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full w-full h-full" style={{ background: `conic-gradient(${gradientParts.join(', ')})` }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-[#0f1117]" style={{ width: size * 0.58, height: size * 0.58 }} />
      </div>
    </div>
  );
}

// ── Expandable backlink row for Deep Dive ───────────────────────────────
function ExpandableBacklinkRow({ r }) {
  const [expanded, setExpanded] = useState(false);
  const [backlinks, setBacklinks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageAnalysis, setPageAnalysis] = useState({});
  const [analyzingUrl, setAnalyzingUrl] = useState(null);

  const { type } = classifyDomain(r.domain);
  const outreach = OUTREACH_ACTIONS[type] || OUTREACH_ACTIONS['General'];
  const OutreachIcon = outreach.icon;

  const fetchBacklinks = async () => {
    if (backlinks) { setExpanded(!expanded); return; }
    setExpanded(true); setLoading(true);
    try {
      const res = await fetch(`/api/dataforseo/backlinks?type=links&domain=${encodeURIComponent(r.domain)}`);
      const data = await res.json();
      setBacklinks(data.success ? (data.data || []).slice(0, 10) : []);
    } catch (e) { setBacklinks([]); }
    setLoading(false);
  };

  const analyzePage = async (url) => {
    if (pageAnalysis[url]) return;
    setAnalyzingUrl(url);
    try {
      const res = await fetch(`/api/dataforseo/analyze-page?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setPageAnalysis(prev => ({ ...prev, [url]: data.success ? data : { error: data.error } }));
    } catch (e) { setPageAnalysis(prev => ({ ...prev, [url]: { error: e.message } })); }
    setAnalyzingUrl(null);
  };

  return (
    <>
      <tr className="border-b border-[#2a2d3a]/50 hover:bg-white/[0.01] cursor-pointer" onClick={fetchBacklinks}>
        <td className="py-2 px-3">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronDown size={10} className="text-zinc-500 flex-shrink-0" /> : <ChevronRight size={10} className="text-zinc-600 flex-shrink-0" />}
            <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-400 hover:underline text-xs flex items-center gap-1">
              {r.domain} <ExternalLink size={10} className="text-zinc-600" />
            </a>
          </div>
        </td>
        <td className="py-2 px-2"><TypeBadge domain={r.domain} /></td>
        <td className="py-2 px-2 text-right">
          <span className={`text-xs ${r.rank >= 50 ? 'text-green-400' : r.rank >= 20 ? 'text-amber-400' : 'text-zinc-400'}`}>{r.rank}</span>
        </td>
        <td className="py-2 px-2 text-center">
          {r.dofollow > 0 ? <span className="text-[9px] px-1.5 py-0.5 rounded text-green-400 bg-green-500/10 border border-green-500/20">dofollow</span>
            : r.nofollow > 0 ? <span className="text-[9px] px-1.5 py-0.5 rounded text-zinc-500 bg-zinc-500/10 border border-zinc-500/20">nofollow</span>
            : <span className="text-[9px] text-zinc-600">&mdash;</span>}
        </td>
        <td className="py-2 px-2 text-right text-xs text-zinc-300">{r.backlinks?.toLocaleString()}</td>
        <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5" title={outreach.tip}>
            <OutreachIcon size={10} className="text-zinc-500 flex-shrink-0" />
            <span className="text-[9px] text-zinc-400">{outreach.action}</span>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[#2a2d3a]/50">
          <td colSpan={7} className="p-0">
            <div className="bg-[#0f1117] px-5 py-3 space-y-3">
              {/* Outreach tip */}
              <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
                <OutreachIcon size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-blue-400 font-medium">{outreach.action}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{outreach.tip}</p>
                </div>
              </div>

              {/* Backlinks list */}
              {loading && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={12} className="animate-spin text-blue-400" />
                  <span className="text-[10px] text-zinc-500">Fetching backlinks from {r.domain}...</span>
                </div>
              )}
              {backlinks && backlinks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-500 font-medium">Linking pages (click Analyse to inspect):</p>
                  {backlinks.map((bl, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="text-blue-400 hover:underline truncate max-w-[350px] flex-shrink-0">
                          {bl.sourceUrl?.replace(/^https?:\/\//, '').slice(0, 70)}
                        </a>
                        <span className="text-zinc-700">&rarr;</span>
                        <span className="text-zinc-500 truncate max-w-[150px]">{bl.targetUrl?.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
                        {bl.anchor && <span className="text-zinc-600 truncate max-w-[120px]" title={bl.anchor}>&ldquo;{bl.anchor}&rdquo;</span>}
                        <span className={`flex-shrink-0 ${bl.isDofollow ? 'text-green-400' : 'text-zinc-600'}`}>{bl.isDofollow ? 'do' : 'no'}</span>
                        <button onClick={e => { e.stopPropagation(); analyzePage(bl.sourceUrl); }}
                          disabled={!!pageAnalysis[bl.sourceUrl] || analyzingUrl === bl.sourceUrl}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 disabled:opacity-40 flex-shrink-0">
                          {analyzingUrl === bl.sourceUrl ? <Loader2 size={8} className="animate-spin" /> : <FileSearch size={8} />}
                          Analyse
                        </button>
                      </div>

                      {/* Page analysis result */}
                      {pageAnalysis[bl.sourceUrl] && !pageAnalysis[bl.sourceUrl].error && (
                        <div className="ml-4 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{pageAnalysis[bl.sourceUrl].pageType}</span>
                            <span className="text-[9px] text-zinc-600">{pageAnalysis[bl.sourceUrl].wordCount?.toLocaleString()} words &middot; {pageAnalysis[bl.sourceUrl].totalLinks} links</span>
                          </div>
                          <p className="text-[10px] text-white font-medium">{pageAnalysis[bl.sourceUrl].title}</p>

                          {pageAnalysis[bl.sourceUrl].competitorLinks?.length > 0 && (
                            <div>
                              <p className="text-[9px] text-amber-400 font-medium mb-1">Competitor links found on this page:</p>
                              {pageAnalysis[bl.sourceUrl].competitorLinks.map((cl, j) => (
                                <div key={j} className="flex items-center gap-2 text-[9px]">
                                  <span className="text-zinc-500">{cl.text || '(no anchor)'}</span>
                                  <span className="text-zinc-700">&rarr;</span>
                                  <a href={cl.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-amber-400 hover:underline truncate max-w-[300px]">{cl.url}</a>
                                </div>
                              ))}
                            </div>
                          )}

                          {pageAnalysis[bl.sourceUrl].nicheLinks?.length > 0 && (
                            <div>
                              <p className="text-[9px] text-green-400 font-medium mb-1">Niche related links:</p>
                              {pageAnalysis[bl.sourceUrl].nicheLinks.map((cl, j) => (
                                <div key={j} className="flex items-center gap-2 text-[9px]">
                                  <span className="text-zinc-500">{cl.text || '(no anchor)'}</span>
                                  <span className="text-zinc-700">&rarr;</span>
                                  <a href={cl.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-400 hover:underline truncate max-w-[300px]">{cl.url}</a>
                                </div>
                              ))}
                            </div>
                          )}

                          {pageAnalysis[bl.sourceUrl].headings?.length > 0 && (
                            <div>
                              <p className="text-[9px] text-zinc-500 font-medium mb-1">Page headings:</p>
                              <div className="flex flex-wrap gap-1">
                                {pageAnalysis[bl.sourceUrl].headings.slice(0, 8).map((h, j) => (
                                  <span key={j} className="text-[8px] px-1 py-0.5 rounded bg-zinc-700/30 text-zinc-500">{h.slice(0, 50)}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {pageAnalysis[bl.sourceUrl]?.error && (
                        <p className="ml-4 text-[9px] text-red-400">Analysis failed: {pageAnalysis[bl.sourceUrl].error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {backlinks && backlinks.length === 0 && (
                <p className="text-[10px] text-zinc-600 py-1">No individual backlinks found</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TypeBadge({ domain, url }) {
  const cls = classifyDomain(domain, url);
  return <span className={`text-[9px] px-1.5 py-0.5 rounded ${cls.bgClass} whitespace-nowrap`}>{cls.type}</span>;
}

// ── Status config ───────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'new', label: 'New', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' },
  { value: 'contacted', label: 'Contacted', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'pitched', label: 'Pitched', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'won', label: 'Won', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { value: 'lost', label: 'Lost', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'skipped', label: 'Skipped', color: 'text-zinc-600 bg-zinc-700/10 border-zinc-700/20' },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));

// ── Default presets ─────────────────────────────────────────────────────────
const DEFAULT_PRESETS = [
  { name: 'Aggregators', domains: 'discovercars.com, localrent.com, economybookings.com, rhinocarhire.com, vipcars.com' },
  { name: 'Local Companies', domains: 'respectacar.com, terraecar.com, abbycar.com' },
  { name: 'Travel Blogs', domains: 'chasingthedonkey.com, wander-lush.org, alongdustyroads.com' },
];

// ── Outreach approach suggestions by domain type ────────────────────────
const OUTREACH_ACTIONS = {
  'Travel Blog': { action: 'Guest Post / Resource Pitch', icon: Pencil, tip: 'Pitch a guest post about driving in Montenegro, or ask to be added to their car hire recommendations section' },
  'Directory': { action: 'Submit Listing', icon: FolderPlus, tip: 'Find their submit/add listing page and register your site' },
  'Forum/Q&A': { action: 'Engage & Contribute', icon: MessageSquare, tip: 'Join the community, answer car hire questions genuinely, include your site where relevant' },
  'Tourism/Gov': { action: 'Partnership Email', icon: Mail, tip: 'Email the tourism board about being listed as a local car hire resource' },
  'News': { action: 'PR / Press Pitch', icon: Send, tip: 'Send a press release or pitch a story about car hire trends in Montenegro' },
  'Aggregator': { action: 'Join Partner Program', icon: Link2, tip: 'Apply to their affiliate or partner program to get listed' },
  'General': { action: 'Outreach Email', icon: Mail, tip: 'Contact the site owner about adding your car hire service as a resource' },
  'Spam/Low Value': { action: 'Skip', icon: X, tip: 'Not worth pursuing — low quality or AI-generated content' },
};

// ── Site descriptions for outreach emails ───────────────────────────────
const SITE_DESCRIPTIONS = {
  'montenegrocarhire.com': 'a dedicated car hire guide for travellers arriving at Tivat Airport, covering rental options, driving tips, and routes across Montenegro',
  'montenegrocarhire.com': 'a comprehensive car hire guide for Montenegro, covering all major cities, airports, driving tips, and rental comparisons for visitors',
  'kotorcarhire.com': 'a dedicated car hire resource for visitors to Kotor, covering rental options, driving routes around the Bay of Kotor, and practical tips',
  'budvacarhire.com': 'a dedicated car hire guide for Budva visitors, covering rental options, beach-hopping routes, and driving tips along the Montenegrin coast',
  'tivatcarhire.com': 'a car hire guide for Tivat and the surrounding Bay of Kotor area, covering rental options and local driving routes',
  'hercegnovicarhire.com': 'a car hire resource for Herceg Novi visitors, covering rental options, cross-border routes to Croatia, and coastal driving tips',
  'podgoricacarhire.com': 'a car hire guide for Podgorica and central Montenegro, covering airport rentals, city routes, and trips to Durmitor and Lake Skadar',
  'ulcinjcarhire.com': 'a car hire guide for Ulcinj and southern Montenegro, covering rental options, routes to Ada Bojana, and cross-border trips to Albania',
  'northernirelandcarhire.com': 'a comprehensive car hire guide for Northern Ireland, covering rental options at Belfast airports, Causeway Coast routes, and driving tips',
};

// ── Email template generator (matches Allan's outreach style) ───────────
function generateOutreachEmail({ pageTitle, pageUrl, domain, pageType, competitorLinks, siteToPitch, contactName, headings }) {
  const site = siteToPitch || 'montenegrocarhire.com';
  const siteDesc = SITE_DESCRIPTIONS[site] || 'a dedicated car hire guide for travellers visiting Montenegro';
  const hasCompetitors = competitorLinks && competitorLinks.length > 0;
  const firstName = contactName ? contactName.split(' ')[0] : null;

  // Subject line — matches sent email pattern
  const contentType = pageType === 'Roundup/Review' ? 'roundup' : pageType === 'Resource Page' ? 'resource page' : 'guide';
  const subject = `Your ${domain.replace('www.', '')} ${contentType} — car hire resource`;

  // Body — matches Allan's proven template
  let body = `Hi${firstName ? ' ' + firstName : ''},\n\n`;

  // Personalised opening referencing the specific article
  body += `I came across your ${contentType} "${pageTitle}" on ${domain.replace('www.', '')}`;

  // Add specific detail if we have headings from page analysis
  if (headings && headings.length >= 2) {
    body += ` — the ${headings[0].toLowerCase()} section`;
    if (headings.length >= 3) {
      body += ` and the coverage of ${headings[1].toLowerCase()}`;
    }
    body += ` makes it a genuinely useful read for visitors`;
  }
  body += `.\n\n`;

  // About section
  body += `I'm Allan Sykes, based in Montenegro. I run ${site} — ${siteDesc}.\n\n`;

  // The ask
  if (hasCompetitors) {
    body += `I noticed you reference ${competitorLinks.slice(0, 2).map(c => c.text || c.url.split('/')[2]).join(' and ')} for car hire. I think ${site} would be a useful addition alongside those for your readers. Would you consider adding a link?\n\n`;
  } else {
    body += `I think it would be a useful practical resource for your readers. Would you consider adding a link?\n\n`;
  }

  body += `Best regards,\nAllan Sykes\n${site}\nMontenegro`;

  return { subject, body };
}

// ── Outreach history tracker ────────────────────────────────────────────
function getOutreachHistory() {
  try {
    const saved = localStorage.getItem('kotor-outreach-history');
    return saved ? JSON.parse(saved) : {};
  } catch (e) { return {}; }
}
function saveOutreach(domain, data) {
  const history = getOutreachHistory();
  const existing = history[domain] || {};
  const byTarget = { ...(existing.byTarget || {}) };
  const now = new Date().toISOString();
  if (data.site) byTarget[data.site] = { ...data, date: now };
  history[domain] = { ...existing, ...data, date: now, byTarget };
  localStorage.setItem('kotor-outreach-history', JSON.stringify(history));
}
// Returns [{site, date, email, status, ...}] for all drafts to this domain.
// Migrates legacy single-site records (no byTarget) into a one-element array.
function listOutreachDrafts(record) {
  if (!record) return [];
  if (record.byTarget && Object.keys(record.byTarget).length) {
    return Object.entries(record.byTarget).map(([site, d]) => ({ site, ...d }));
  }
  if (record.site) return [{ site: record.site, date: record.date, email: record.email, status: record.status }];
  return [];
}

function OutreachEmailModal({ isOpen, onClose, pageTitle, pageUrl, domain, pageType, competitorLinks, headings, onDrafted }) {
  const [siteToPitch, setSiteToPitch] = useState('montenegrocarhire.com');
  const [sendAs, setSendAs] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [findingContact, setFindingContact] = useState(false);
  const [contactMethod, setContactMethod] = useState(null); // 'email', 'form', 'unknown'
  const [contactPage, setContactPage] = useState(null);
  const [outreachDone, setOutreachDone] = useState(null); // existing outreach record
  const [aiGenerating, setAiGenerating] = useState(false);
  const [articleData, setArticleData] = useState(null); // { headings, sampleParagraphs } from analyze-page

  // Auto-find contact + fetch article content on open
  useEffect(() => {
    if (!isOpen || !domain) return;
    setSaved(false); setSaveError(null); setContactMethod(null); setContactPage(null);
    setArticleData(null);
    // Clear stale recipient details — find-contact will repopulate if it succeeds.
    // Empty contact name avoids "Hi Allan" greetings when the API is still searching.
    setContactName(''); setRecipientEmail('');
    // Clear stale email content from previous prospect — fresh template will populate
    // once articleData + contact-search complete.
    setSubject(''); setBody('');

    // Check if already contacted
    const history = getOutreachHistory();
    const existing = history[domain.replace('www.', '')];
    setOutreachDone(existing || null);

    // Find contact info
    setFindingContact(true);
    fetch(`/api/outreach/find-contact?domain=${encodeURIComponent(domain)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          if (data.email) setRecipientEmail(data.email);
          if (data.name) setContactName(data.name);
          setContactMethod(data.method);
          setContactPage(data.contactPage);
        }
      })
      .catch(() => {})
      .finally(() => setFindingContact(false));

    // Fetch article content for AI personalisation (if we have a URL)
    if (pageUrl) {
      fetch(`/api/dataforseo/analyze-page?url=${encodeURIComponent(pageUrl)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setArticleData({ headings: data.headings, sampleParagraphs: data.sampleParagraphs });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, domain, pageUrl]);

  // Auto-set sendAs to match pitching site
  useEffect(() => {
    setSendAs(`info@${siteToPitch}`);
  }, [siteToPitch]);

  // Generate AI email once we have article data + contact info settled
  const generateAiRef = useRef(false);
  useEffect(() => {
    if (!isOpen || generateAiRef.current || aiGenerating) return;
    if (findingContact) return; // wait for contact search to finish
    // Need at least article data OR headings to generate
    const hasContent = articleData || (headings && headings.length > 0);
    if (!hasContent && !pageTitle) return;

    generateAiRef.current = true;
    setAiGenerating(true);

    // Use fallback template while AI loads
    const fallback = generateOutreachEmail({ pageTitle, pageUrl, domain, pageType, competitorLinks, siteToPitch, contactName, headings });
    setSubject(fallback.subject);
    setBody(fallback.body);

    fetch('/api/outreach/ai-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageTitle, pageUrl, domain, pageType, competitorLinks, siteToPitch, contactName,
        headings: articleData?.headings || headings || [],
        sampleParagraphs: articleData?.sampleParagraphs || [],
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSubject(data.subject);
          setBody(data.body);
        }
      })
      .catch(() => {})
      .finally(() => setAiGenerating(false));
  }, [isOpen, findingContact, articleData, headings, pageTitle]);

  // Reset generateAiRef when modal closes
  useEffect(() => {
    if (!isOpen) generateAiRef.current = false;
  }, [isOpen]);

  // Regenerate when site changes (user switched pitch site)
  const prevSiteRef = useRef(siteToPitch);
  useEffect(() => {
    if (!isOpen || prevSiteRef.current === siteToPitch) return;
    prevSiteRef.current = siteToPitch;
    generateAiRef.current = false; // allow re-generation
  }, [isOpen, siteToPitch]);

  const saveToDrafts = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch('/api/outreach/gmail-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: sendAs, to: recipientEmail, subject, body }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        // Track outreach — local-first for instant UI, then mirror to server blob
        const cleanDomain = domain.replace('www.', '');
        const record = {
          email: recipientEmail,
          name: contactName,
          subject,
          site: siteToPitch,
          method: contactMethod || 'email',
          pageUrl,
          draftId: data.draftId,
          status: 'drafted',
        };
        saveOutreach(cleanDomain, record);
        fetch('/api/linkbuilding/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: cleanDomain, ...record }),
        }).catch(() => {});
        if (onDrafted) onDrafted({ domain, recipientEmail, subject });
      } else {
        setSaveError(data.error);
      }
    } catch (e) { setSaveError(e.message); }
    setSaving(false);
  };

  // Manual record — for when you reach out via contact form / Twitter / DM / phone
  // and just need the system to remember you contacted this domain. Skips Gmail.
  const markAsSentManually = async (method = 'form') => {
    setSaving(true); setSaveError(null);
    try {
      const cleanDomain = domain.replace('www.', '');
      const record = {
        email: recipientEmail || null,
        name: contactName || null,
        subject: subject || null,
        site: siteToPitch,
        method,
        pageUrl,
        draftId: null,
        status: 'sent', // skip 'drafted' — user is saying outreach went out
      };
      saveOutreach(cleanDomain, record);
      fetch('/api/linkbuilding/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain, ...record }),
      }).catch(() => {});
      setSaved(true);
      if (onDrafted) onDrafted({ domain, recipientEmail, subject });
    } catch (e) {
      setSaveError(e.message);
    }
    setSaving(false);
  };

  // Lock body scroll while the modal is open so wheel events don't leak to the page behind.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  const PITCH_SITES = [
    'montenegrocarhire.com', 'tivatcarhire.com', 'budvacarhire.com',
    'hercegnovicarhire.com', 'ulcinjcarhire.com', 'kotorcarhire.com',
    'podgoricacarhire.com', 'northernirelandcarhire.com', 'kotorcarrental.com',
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-2xl max-h-[calc(80vh+80px)] overflow-y-auto overscroll-contain" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-[#2a2d3a] flex items-center justify-between sticky top-0 bg-[#1a1d27] z-10">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Draft Outreach Email</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {/* Already contacted warning — list every site previously drafted to this domain */}
          {(() => {
            const drafts = listOutreachDrafts(outreachDone);
            if (!drafts.length) return null;
            const dupeForCurrent = drafts.find(d => d.site === siteToPitch);
            return (
              <div className={`border rounded-lg p-3 flex items-start gap-2 ${
                dupeForCurrent ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/20'
              }`}>
                <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${dupeForCurrent ? 'text-red-400' : 'text-amber-400'}`} />
                <div className="flex-1 space-y-0.5">
                  <p className={`text-[10px] font-medium ${dupeForCurrent ? 'text-red-400' : 'text-amber-400'}`}>
                    {dupeForCurrent
                      ? `Already drafted ${siteToPitch} to this domain — duplicate!`
                      : `Drafted ${drafts.length} time${drafts.length > 1 ? 's' : ''} to this domain`}
                  </p>
                  {drafts.map(d => (
                    <p key={d.site} className="text-[10px] text-zinc-400">
                      <span className={d.site === siteToPitch ? 'text-red-300 font-medium' : 'text-amber-300'}>{d.site}</span>
                      {' — '}{new Date(d.date).toLocaleDateString()}
                      {d.email && ` · ${d.email}`}
                      {d.status && ` · ${d.status}`}
                    </p>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Contact method detection */}
          {findingContact && (
            <div className="flex items-center gap-2 bg-[#0f1117] rounded-lg p-3">
              <Loader2 size={12} className="animate-spin text-blue-400" />
              <span className="text-[10px] text-zinc-500">Finding contact info on {domain}...</span>
            </div>
          )}
          {!findingContact && contactMethod === 'form' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-[10px] text-amber-400 font-medium">This site uses a contact form (no email found)</p>
              {contactPage && (
                <a href={contactPage} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">{contactPage}</a>
              )}
              <p className="text-[10px] text-zinc-500 mt-1">You can still save a draft for reference, or submit via their form</p>
            </div>
          )}
          {!findingContact && contactMethod === 'unknown' && (
            <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-lg p-3">
              <p className="text-[10px] text-zinc-400">No contact email or form found &mdash; check the site manually</p>
            </div>
          )}

          {/* Target page info */}
          <div className="bg-[#0f1117] rounded-lg p-3">
            <p className="text-[10px] text-zinc-500 mb-1">Pitching to:</p>
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">{pageTitle}</a>
            <p className="text-[10px] text-zinc-600 mt-0.5">{pageUrl}</p>
          </div>

          {/* Site to pitch */}
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Your site to promote:</label>
            <select value={siteToPitch} onChange={e => setSiteToPitch(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white outline-none">
              {PITCH_SITES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Send as */}
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Send from (Gmail &ldquo;Send as&rdquo; alias):</label>
            <input type="text" value={sendAs} onChange={e => setSendAs(e.target.value)}
              placeholder="info@tivatairportcarhire.com"
              className="w-full px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />
          </div>

          {/* Contact name + email */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">Contact name:</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 mb-1 block">
                Recipient email:
                {findingContact && <span className="text-blue-400 ml-1">searching...</span>}
                {!findingContact && recipientEmail && <span className="text-green-400 ml-1">found</span>}
              </label>
              <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white placeholder-zinc-600 outline-none focus:border-blue-500/50" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Subject:</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white outline-none focus:border-blue-500/50" />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-zinc-500 flex items-center gap-1">
                Email body (edit freely):
                {aiGenerating && <><Loader2 size={9} className="animate-spin text-blue-400" /> <span className="text-blue-400">AI personalising...</span></>}
              </label>
              <button
                onClick={() => { generateAiRef.current = false; }}
                disabled={aiGenerating || findingContact}
                className="text-[9px] text-blue-400 hover:text-blue-300 disabled:opacity-40"
              >
                ↻ Regenerate
              </button>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
              className="w-full px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white outline-none focus:border-blue-500/50 resize-y font-mono leading-relaxed" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button onClick={saveToDrafts} disabled={saving || saved}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg ${
                saved ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
              } disabled:opacity-60`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <span>&#10003;</span> : <Send size={14} />}
              {saving ? 'Saving...' : saved ? 'Saved to Drafts!' : 'Save to Gmail Drafts'}
            </button>
            <button onClick={() => markAsSentManually('form')} disabled={saving || saved}
              title="Use this when you reach out via the prospect's contact form / Twitter / wherever — records the outreach without creating a Gmail draft"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-60">
              <CheckCircle2 size={14} />
              Mark as sent (form / other)
            </button>
            {contactPage && (
              <a href={contactPage} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-[#2a2d3a] text-zinc-300 hover:text-white">
                <ExternalLink size={14} /> Open contact page
              </a>
            )}
            {saveError && <p className="text-[10px] text-red-400">{saveError}</p>}
            {saved && <p className="text-[10px] text-green-400">Outreach recorded</p>}
            <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 border border-[#2a2d3a] rounded-lg hover:text-white ml-auto">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function calcScore(rank, overlapCount) {
  return Math.round((rank || 0) * 0.6 + overlapCount * 20 * 0.4);
}

function cleanDomain(d) {
  return d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase().trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: PIPELINE
// ═══════════════════════════════════════════════════════════════════════════
function PipelineTab() {
  const [pipeline, setPipeline] = useState([]);
  const [competitors, setCompetitors] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [minAuthority, setMinAuthority] = useState(10);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kotor-link-pipeline');
      if (saved) setPipeline(JSON.parse(saved));
    } catch {}
  }, []);

  const persist = useCallback((updated) => {
    setPipeline(updated);
    localStorage.setItem('kotor-link-pipeline', JSON.stringify(updated));
  }, []);

  const importFromGap = async () => {
    if (!competitors.trim()) return;
    setImporting(true); setImportError(null);
    try {
      const res = await fetch(`/api/dataforseo/backlink-gap?competitors=${encodeURIComponent(competitors)}`);
      const data = await res.json();
      if (!data.success) { setImportError(data.error); setImporting(false); return; }
      const existing = new Set(pipeline.map(p => p.domain));
      const newProspects = (data.data || [])
        .filter(d => !existing.has(d.domain))
        .map(d => ({
          domain: d.domain,
          rank: d.rank || 0,
          backlinks: d.backlinks || 0,
          dofollow: d.dofollow || 0,
          nofollow: d.nofollow || 0,
          linksTo: d.linksTo || [],
          status: 'new',
          score: calcScore(d.rank, (d.linksTo || []).length),
          addedAt: Date.now(),
        }));
      persist([...pipeline, ...newProspects]);
    } catch (e) { setImportError(e.message); }
    setImporting(false);
  };

  const updateStatus = (domain, newStatus) => {
    persist(pipeline.map(p => p.domain === domain ? { ...p, status: newStatus } : p));
  };

  const removeProspect = (domain) => {
    persist(pipeline.filter(p => p.domain !== domain));
  };

  const filtered = useMemo(() => {
    let list = pipeline.filter(p => p.rank >= minAuthority);
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (sortBy === 'score') list = [...list].sort((a, b) => b.score - a.score);
    else if (sortBy === 'authority') list = [...list].sort((a, b) => b.rank - a.rank);
    else if (sortBy === 'overlap') list = [...list].sort((a, b) => b.linksTo.length - a.linksTo.length);
    return list;
  }, [pipeline, statusFilter, sortBy, minAuthority]);

  const kpis = useMemo(() => {
    const total = pipeline.length;
    const contacted = pipeline.filter(p => ['contacted', 'pitched', 'won'].includes(p.status)).length;
    const won = pipeline.filter(p => p.status === 'won');
    const lost = pipeline.filter(p => p.status === 'lost').length;
    const winRate = (won.length + lost) > 0 ? Math.round(won.length / (won.length + lost) * 100) : 0;
    const avgAuth = won.length > 0 ? Math.round(won.reduce((s, p) => s + p.rank, 0) / won.length) : 0;
    return { total, contactedPct: total > 0 ? Math.round(contacted / total * 100) : 0, winRate, avgAuth };
  }, [pipeline]);

  return (
    <div className="space-y-4">
      {/* Import section */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Import Prospects from Backlink Gap</h3>
        <p className="text-[10px] text-zinc-500 mb-3">Enter competitor domains to find sites linking to them but not to you</p>
        <div className="flex gap-2">
          <input type="text" value={competitors} onChange={e => setCompetitors(e.target.value)}
            placeholder="e.g. discovercars.com, localrent.com"
            className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
            onKeyDown={e => e.key === 'Enter' && importFromGap()} />
          <button onClick={importFromGap} disabled={importing || !competitors.trim()}
            className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40 flex items-center gap-2">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
        {importError && <p className="text-xs text-red-400 mt-2">{importError}</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#1a1d27] border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Target size={14} className="text-blue-400" /><p className="text-[10px] text-zinc-500">Total Prospects</p></div>
          <p className="text-2xl font-bold text-blue-400">{kpis.total}</p>
        </div>
        <div className="bg-[#1a1d27] border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><BarChart2 size={14} className="text-amber-400" /><p className="text-[10px] text-zinc-500">Contacted %</p></div>
          <p className="text-2xl font-bold text-amber-400">{kpis.contactedPct}%</p>
        </div>
        <div className="bg-[#1a1d27] border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Target size={14} className="text-green-400" /><p className="text-[10px] text-zinc-500">Win Rate</p></div>
          <p className="text-2xl font-bold text-green-400">{kpis.winRate}%</p>
        </div>
        <div className="bg-[#1a1d27] border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><Globe size={14} className="text-purple-400" /><p className="text-[10px] text-zinc-500">Avg Authority (Won)</p></div>
          <p className="text-2xl font-bold text-purple-400">{kpis.avgAuth}</p>
        </div>
      </div>

      {/* Filters */}
      {pipeline.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2d3a] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded text-zinc-300 outline-none">
                <option value="all">All statuses</option>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">Min authority:</span>
                <select value={minAuthority} onChange={e => setMinAuthority(Number(e.target.value))}
                  className="px-1.5 py-1 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded text-zinc-300 outline-none">
                  <option value={0}>All</option>
                  <option value={5}>5+</option>
                  <option value={10}>10+</option>
                  <option value={20}>20+</option>
                  <option value={30}>30+</option>
                  <option value={50}>50+</option>
                </select>
              </div>
              <div className="flex gap-1">
                {['score', 'authority', 'overlap'].map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-2 py-1 text-[10px] rounded ${sortBy === s ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-zinc-600">{filtered.length} shown</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#1a1d27] z-10">
                <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a]">
                  <th className="py-2 px-3 text-left font-medium">Domain</th>
                  <th className="py-2 px-2 text-left font-medium">Type</th>
                  <th className="py-2 px-2 text-right font-medium">Score</th>
                  <th className="py-2 px-2 text-right font-medium">Authority</th>
                  <th className="py-2 px-2 text-center font-medium">Link Type</th>
                  <th className="py-2 px-2 text-right font-medium">Overlap</th>
                  <th className="py-2 px-2 text-left font-medium">Links To</th>
                  <th className="py-2 px-2 text-left font-medium">Status</th>
                  <th className="py-2 px-2 text-center font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.domain} className="border-b border-[#2a2d3a]/50 hover:bg-white/[0.01]">
                    <td className="py-2 px-3">
                      <a href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                        {p.domain} <ExternalLink size={10} className="text-zinc-600" />
                      </a>
                    </td>
                    <td className="py-2 px-2"><TypeBadge domain={p.domain} /></td>
                    <td className="py-2 px-2 text-right text-xs text-white font-medium">{p.score}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`text-xs ${p.rank >= 50 ? 'text-green-400' : p.rank >= 20 ? 'text-amber-400' : 'text-zinc-400'}`}>{p.rank}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {p.dofollow > 0 ? <span className="text-[9px] px-1.5 py-0.5 rounded text-green-400 bg-green-500/10 border border-green-500/20">dofollow</span>
                        : p.nofollow > 0 ? <span className="text-[9px] px-1.5 py-0.5 rounded text-zinc-500 bg-zinc-500/10 border border-zinc-500/20">nofollow</span>
                        : <span className="text-[9px] text-zinc-600">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-zinc-300">{p.linksTo.length}</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        {p.linksTo.map(d => (
                          <span key={d} className="text-[8px] px-1 py-0.5 rounded bg-zinc-700/30 text-zinc-500">{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <select value={p.status} onChange={e => updateStatus(p.domain, e.target.value)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border outline-none cursor-pointer ${STATUS_MAP[p.status]?.color || ''}`}
                        style={{ background: 'transparent' }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button onClick={() => removeProspect(p.domain)} className="text-zinc-600 hover:text-red-400"><X size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pipeline.length === 0 && !importing && (
        <div className="p-8 text-center">
          <Target size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No prospects yet</p>
          <p className="text-xs text-zinc-700">Import from a backlink gap analysis above to start building your pipeline</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: DEEP DIVE (+ Presets)
// ═══════════════════════════════════════════════════════════════════════════
function DeepDiveTab() {
  const [competitors, setCompetitors] = useState('');
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [minAuth, setMinAuth] = useState(10);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kotor-competitor-presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch {}
  }, []);

  const persistPresets = (updated) => {
    setPresets(updated);
    localStorage.setItem('kotor-competitor-presets', JSON.stringify(updated));
  };

  const savePreset = () => {
    if (!presetName.trim() || !competitors.trim()) return;
    persistPresets([...presets, { name: presetName.trim(), domains: competitors }]);
    setPresetName('');
    setShowSavePreset(false);
  };

  const deletePreset = (idx) => {
    persistPresets(presets.filter((_, i) => i !== idx));
  };

  const runDeepDive = async () => {
    if (!competitors.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const domains = competitors.split(',').map(d => cleanDomain(d)).filter(Boolean);
      const fetches = domains.map(d =>
        fetch(`/api/dataforseo/backlinks?type=referring&domain=${encodeURIComponent(d)}`)
          .then(r => r.json())
          .then(j => ({ domain: d, data: j.success ? j.data : [] }))
          .catch(() => ({ domain: d, data: [] }))
      );
      const allResults = await Promise.all(fetches);

      // Consolidate referring domains
      const domainMap = new Map();
      allResults.forEach(({ domain: comp, data }) => {
        (data || []).forEach(ref => {
          const key = ref.domain;
          if (domainMap.has(key)) {
            const existing = domainMap.get(key);
            if (!existing.linksTo.includes(comp)) existing.linksTo.push(comp);
            existing.rank = Math.max(existing.rank, ref.rank || 0);
            existing.backlinks = Math.max(existing.backlinks, ref.backlinks || 0);
            existing.dofollow = Math.max(existing.dofollow || 0, ref.dofollow || 0);
            existing.nofollow = Math.max(existing.nofollow || 0, ref.nofollow || 0);
          } else {
            domainMap.set(key, {
              domain: ref.domain,
              rank: ref.rank || 0,
              backlinks: ref.backlinks || 0,
              dofollow: ref.dofollow || 0,
              nofollow: ref.nofollow || 0,
              linksTo: [comp],
              firstSeen: ref.firstSeen,
            });
          }
        });
      });

      const consolidated = Array.from(domainMap.values())
        .sort((a, b) => b.linksTo.length - a.linksTo.length || b.rank - a.rank);

      setResults({ domains: domains, data: consolidated, total: consolidated.length });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    if (!results?.data) return [];
    return results.data.filter(d => (d.rank || 0) >= minAuth);
  }, [results, minAuth]);

  const categoryBreakdown = useMemo(() => {
    if (!filteredData.length) return [];
    const counts = {};
    filteredData.forEach(d => {
      const { type } = classifyDomain(d.domain);
      counts[type] = (counts[type] || 0) + 1;
    });
    const total = filteredData.length;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
        color: CATEGORY_HEX[type] || '#71717a',
      }));
  }, [filteredData]);

  const exportCSV = () => {
    if (!filteredData.length) return;
    const rows = filteredData.map(r => {
      const { type } = classifyDomain(r.domain);
      return `${r.domain},${type},${r.rank},${r.backlinks},"${r.linksTo.join('; ')}"`;
    });
    const csv = ['Domain,Type,Authority,Backlinks,LinksTo', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `competitor-deep-dive-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Preset selector + competitor input */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Multi-Competitor Backlink Deep Dive</h3>
        <p className="text-[10px] text-zinc-500 mb-3">Analyse referring domains across multiple competitors, categorised by source type</p>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map((p, i) => (
            <div key={i} className="flex items-center gap-1">
              <button onClick={() => setCompetitors(p.domains)}
                className="px-2 py-1 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20">
                {p.name}
              </button>
              {i >= DEFAULT_PRESETS.length && (
                <button onClick={() => deletePreset(i)} className="text-zinc-600 hover:text-red-400"><X size={10} /></button>
              )}
            </div>
          ))}
          {!showSavePreset ? (
            <button onClick={() => setShowSavePreset(true)} className="px-2 py-1 text-[10px] text-zinc-500 border border-dashed border-zinc-700 rounded hover:text-zinc-300">
              <Plus size={10} className="inline mr-1" />Save Preset
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
                placeholder="Preset name" className="px-2 py-1 text-[10px] bg-[#0f1117] border border-[#2a2d3a] rounded text-white outline-none w-28"
                onKeyDown={e => e.key === 'Enter' && savePreset()} />
              <button onClick={savePreset} className="text-green-400 hover:text-green-300"><Save size={12} /></button>
              <button onClick={() => setShowSavePreset(false)} className="text-zinc-600 hover:text-zinc-400"><X size={12} /></button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input type="text" value={competitors} onChange={e => setCompetitors(e.target.value)}
            placeholder="Competitor domains (comma-separated)"
            className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
            onKeyDown={e => e.key === 'Enter' && runDeepDive()} />
          <button onClick={runDeepDive} disabled={loading || !competitors.trim()}
            className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40 flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Analysing...' : 'Run Deep Dive'}
          </button>
        </div>
        {loading && <p className="text-[10px] text-zinc-600 mt-2">Fetching referring domains for {competitors.split(',').length} competitor(s)... This may take 15-30 seconds.</p>}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Category breakdown */}
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">Source Type Distribution</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">Min authority:</span>
                  <select value={minAuth} onChange={e => setMinAuth(Number(e.target.value))}
                    className="px-1.5 py-0.5 text-[10px] bg-[#0f1117] border border-[#2a2d3a] rounded text-zinc-300 outline-none">
                    <option value={0}>All</option>
                    <option value={5}>5+</option>
                    <option value={10}>10+</option>
                    <option value={20}>20+</option>
                    <option value={30}>30+</option>
                    <option value={50}>50+</option>
                  </select>
                </div>
                <span className="text-[10px] text-zinc-600">{filteredData.length} of {results?.total || 0} domains</span>
              </div>
              <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-400 border border-zinc-700 rounded hover:text-white hover:border-zinc-500">
                <Download size={10} /> Export CSV
              </button>
            </div>
            <div className="flex items-center gap-8">
              <Donut
                segments={categoryBreakdown.map(c => ({ pct: c.pct, color: c.color }))}
                size={100}
              />
              <div className="flex-1 space-y-1.5">
                {categoryBreakdown.map(c => (
                  <div key={c.type} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                    <span className="text-[10px] text-zinc-400 w-24">{c.type}</span>
                    <div className="flex-1 h-1 bg-[#2a2d3a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-8 text-right">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Domain table */}
          <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2a2d3a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{filteredData.length} Referring Domains</h3>
              <span className="text-[10px] text-zinc-600">Across {results.domains.join(', ')}</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1a1d27] z-10">
                  <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a]">
                    <th className="py-2 px-3 text-left font-medium">Domain</th>
                    <th className="py-2 px-2 text-left font-medium">Type</th>
                    <th className="py-2 px-2 text-right font-medium">Authority</th>
                    <th className="py-2 px-2 text-center font-medium">Link Type</th>
                    <th className="py-2 px-2 text-right font-medium">Backlinks</th>
                    <th className="py-2 px-2 text-left font-medium">Outreach</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(r => (
                    <ExpandableBacklinkRow key={r.domain} r={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!results && !loading && (
        <div className="p-8 text-center">
          <Search size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Select a preset or enter competitor domains</p>
          <p className="text-xs text-zinc-700">Analyses referring domains across competitors and categorises by source type</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: CLUSTER VIEW
// ═══════════════════════════════════════════════════════════════════════════
function ClusterViewTab() {
  const [domains, setDomains] = useState(['montenegrocarhire.com']);
  const [addInput, setAddInput] = useState('');
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addDomain = () => {
    const d = cleanDomain(addInput);
    if (d && !domains.includes(d)) {
      setDomains([...domains, d]);
      setAddInput('');
    }
  };

  const removeDomain = (d) => setDomains(domains.filter(x => x !== d));

  const fetchAll = async () => {
    if (domains.length === 0) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/dataforseo/multi-backlinks?domains=${encodeURIComponent(domains.join(','))}`);
      const data = await res.json();
      if (data.success) setSummaries(data.data);
      else setError(data.error);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const maxReferring = useMemo(() => {
    return Math.max(...Object.values(summaries).map(s => s.referringDomains || 0), 1);
  }, [summaries]);

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Cluster Backlink Comparison</h3>
        <p className="text-[10px] text-zinc-500 mb-3">Compare backlink profiles across multiple domains side by side</p>

        {/* Domain chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {domains.map(d => (
            <span key={d} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              {d}
              <button onClick={() => removeDomain(d)} className="text-zinc-600 hover:text-red-400"><X size={10} /></button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input type="text" value={addInput} onChange={e => setAddInput(e.target.value)}
            placeholder="Add domain..."
            className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
            onKeyDown={e => e.key === 'Enter' && addDomain()} />
          <button onClick={addDomain} disabled={!addInput.trim()}
            className="px-3 py-2 text-sm text-zinc-400 border border-[#2a2d3a] rounded-lg hover:text-white disabled:opacity-40">
            <Plus size={14} />
          </button>
          <button onClick={fetchAll} disabled={loading || domains.length === 0}
            className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40 flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? 'Loading...' : 'Compare'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Results table */}
      {Object.keys(summaries).length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2d3a]">
            <h3 className="text-sm font-semibold text-white">Comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a]">
                  <th className="py-2 px-3 text-left font-medium">Domain</th>
                  <th className="py-2 px-2 text-right font-medium">Referring Domains</th>
                  <th className="py-2 px-2 text-right font-medium">Total Backlinks</th>
                  <th className="py-2 px-2 text-right font-medium">Domain Rank</th>
                  <th className="py-2 px-2 text-right font-medium">Dofollow %</th>
                  <th className="py-2 px-2 text-right font-medium">Broken</th>
                </tr>
              </thead>
              <tbody>
                {domains.map(d => {
                  const s = summaries[d];
                  if (!s || !s.success) return (
                    <tr key={d} className="border-b border-[#2a2d3a]/50">
                      <td className="py-2 px-3 text-xs text-zinc-400">{d}</td>
                      <td colSpan={5} className="py-2 px-2 text-xs text-red-400">{s?.error || 'No data'}</td>
                    </tr>
                  );
                  const dfPct = (s.dofollow && s.nofollow) ? Math.round(s.dofollow / (s.dofollow + s.nofollow) * 100) : 0;
                  return (
                    <tr key={d} className="border-b border-[#2a2d3a]/50 hover:bg-white/[0.01]">
                      <td className="py-2 px-3 text-xs text-blue-400">{d}</td>
                      <td className="py-2 px-2 text-right text-xs text-white font-medium">{(s.referringDomains || 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right text-xs text-zinc-300">{(s.totalBacklinks || 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`text-xs ${(s.rank || 0) >= 50 ? 'text-green-400' : (s.rank || 0) >= 20 ? 'text-amber-400' : 'text-zinc-400'}`}>{s.rank || 0}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-xs text-zinc-300">{dfPct}%</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`text-xs ${(s.brokenBacklinks || 0) > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{(s.brokenBacklinks || 0).toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="px-5 py-4 border-t border-[#2a2d3a]">
            <p className="text-[10px] text-zinc-500 mb-3">Referring Domains Comparison</p>
            <div className="space-y-2">
              {domains.map(d => {
                const s = summaries[d];
                const val = s?.referringDomains || 0;
                return <HBar key={d} label={d} value={val} max={maxReferring} color={d === domains[0] ? '#3b82f6' : '#6366f1'} />;
              })}
            </div>
          </div>
        </div>
      )}

      {Object.keys(summaries).length === 0 && !loading && (
        <div className="p-8 text-center">
          <BarChart2 size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Add domains and click Compare</p>
          <p className="text-xs text-zinc-700">See backlink profiles side by side across your cluster</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: BROKEN LINKS
// ═══════════════════════════════════════════════════════════════════════════
function BrokenLinksTab() {
  const [domains, setDomains] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scan = async () => {
    if (!domains.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const domainList = domains.split(',').map(d => cleanDomain(d)).filter(Boolean);
      const fetches = domainList.map(d =>
        fetch(`/api/dataforseo/backlinks?type=summary&domain=${encodeURIComponent(d)}`)
          .then(r => r.json())
          .then(j => ({
            domain: d,
            totalBacklinks: j.data?.totalBacklinks || 0,
            brokenBacklinks: j.data?.brokenBacklinks || 0,
            brokenPct: j.data?.totalBacklinks > 0 ? Math.round((j.data.brokenBacklinks || 0) / j.data.totalBacklinks * 100) : 0,
          }))
          .catch(() => ({ domain: d, totalBacklinks: 0, brokenBacklinks: 0, brokenPct: 0 }))
      );
      const all = await Promise.all(fetches);
      setResults(all.filter(r => r.brokenBacklinks > 0).sort((a, b) => b.brokenBacklinks - a.brokenBacklinks));
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // Pre-fill from pipeline
  const loadFromPipeline = () => {
    try {
      const saved = localStorage.getItem('kotor-link-pipeline');
      if (saved) {
        const pipeline = JSON.parse(saved);
        const domainStr = pipeline.slice(0, 20).map(p => p.domain).join(', ');
        setDomains(domainStr);
      }
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Broken Link Opportunities</h3>
        <p className="text-[10px] text-zinc-500 mb-3">Scan prospect domains for broken backlinks — sites with broken links are more receptive to new link placements</p>

        <div className="flex gap-2 mb-2">
          <input type="text" value={domains} onChange={e => setDomains(e.target.value)}
            placeholder="Domains to scan (comma-separated)"
            className="flex-1 px-3 py-2 bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
            onKeyDown={e => e.key === 'Enter' && scan()} />
          <button onClick={scan} disabled={loading || !domains.trim()}
            className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40 flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>
        <button onClick={loadFromPipeline} className="text-[10px] text-zinc-500 hover:text-zinc-300">
          Load top 20 from pipeline
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {results && results.length > 0 && (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2d3a]">
            <h3 className="text-sm font-semibold text-white">{results.length} Domains with Broken Links</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a]">
                  <th className="py-2 px-3 text-left font-medium">Domain</th>
                  <th className="py-2 px-2 text-right font-medium">Total Backlinks</th>
                  <th className="py-2 px-2 text-right font-medium">Broken</th>
                  <th className="py-2 px-2 text-right font-medium">Broken %</th>
                  <th className="py-2 px-2 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.domain} className="border-b border-[#2a2d3a]/50 hover:bg-white/[0.01]">
                    <td className="py-2 px-3">
                      <a href={`https://${r.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                        {r.domain} <ExternalLink size={10} className="text-zinc-600" />
                      </a>
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-zinc-300">{r.totalBacklinks.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-xs text-red-400 font-medium">{r.brokenBacklinks.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-xs text-zinc-400">{r.brokenPct}%</td>
                    <td className="py-2 px-2 text-center">
                      <a href={`https://ahrefs.com/broken-backlinks/${r.domain}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-zinc-500 hover:text-blue-400">Check manually</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="p-8 text-center">
          <AlertTriangle size={32} className="text-green-500/30 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No broken links found on scanned domains</p>
        </div>
      )}

      {!results && !loading && (
        <div className="p-8 text-center">
          <AlertTriangle size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Enter domains or load from pipeline</p>
          <p className="text-xs text-zinc-700">Sites with broken backlinks are more receptive to replacement link outreach</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: FIND OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════
// Seed keywords loaded from localStorage so users can customise per-site
function getSeedKeywords() {
  try {
    const saved = localStorage.getItem('kotor-link-seed-keywords');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return ['montenegro car hire', 'kotor directory', 'montenegro travel'];
}
function saveSeedKeywords(kws) {
  localStorage.setItem('kotor-link-seed-keywords', JSON.stringify(kws));
}

const SEARCH_TYPES = [
  { type: 'resource', label: 'Resource Pages', desc: 'Pages with useful links lists' },
  { type: 'guest-post', label: 'Guest Posts', desc: 'Sites accepting guest contributions' },
  { type: 'submit', label: 'Submit/Directory', desc: 'Pages where you can add your site' },
  { type: 'roundup', label: 'Best/Top Lists', desc: 'Roundup posts you should be featured in' },
  { type: 'guide', label: 'Travel Guides', desc: 'Blog posts and travel guides' },
];

// Default seeds match what the server will render; localStorage customisations
// are merged in client-side after mount to avoid hydration mismatch.
const DEFAULT_SEED_KEYWORDS = ['montenegro car hire', 'kotor directory', 'montenegro travel'];

function FindOpportunitiesTab() {
  const [seedKeywords, setSeedKeywords] = useState(DEFAULT_SEED_KEYWORDS);
  const [keyword, setKeyword] = useState(DEFAULT_SEED_KEYWORDS[0] || '');
  // Hydrate from localStorage after mount — keeps server and first client render
  // identical, then swaps in the user's customised list.
  useEffect(() => {
    const stored = getSeedKeywords();
    setSeedKeywords(stored);
    setKeyword(prev => prev === DEFAULT_SEED_KEYWORDS[0] ? (stored[0] || '') : prev);
  }, []);
  const [searchType, setSearchType] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyzing, setAnalyzing] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [newSeed, setNewSeed] = useState('');
  const [emailModal, setEmailModal] = useState(null);
  const [outreachHistory, setOutreachHistory] = useState(() => getOutreachHistory());
  const [editingSeeds, setEditingSeeds] = useState(false);
  const [hideContacted, setHideContacted] = useState(true);
  const [includeCompetitors, setIncludeCompetitors] = useState(false);
  const [backlinkSource, setBacklinkSource] = useState('');
  const [backlinkLoading, setBacklinkLoading] = useState(false);

  // Auto-trigger mining when arriving from the Competitors tab via ?mine=domain
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mineDomain = params.get('mine');
      if (mineDomain) {
        setBacklinkSource(mineDomain);
        // Strip the param so refreshes don't re-trigger
        params.delete('mine');
        const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState(null, '', clean);
        // Defer one tick so the state update lands before the fetch
        setTimeout(() => {
          // Guard via state setter pattern — call mineBacklinks with explicit domain via overrides
          (async () => {
            const target = mineDomain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '');
            if (!target) return;
            setBacklinkLoading(true); setError(null); setResults(null);
            try {
              const competitorParam = includeCompetitors ? '&includeCompetitors=1' : '';
              const res = await fetch(`/api/dataforseo/competitor-backlinks?domain=${encodeURIComponent(target)}${competitorParam}`);
              const data = await res.json();
              if (data.success) setResults(data);
              else setError(data.error || 'Mining failed');
            } catch (e) { setError(e.message); }
            setBacklinkLoading(false);
          })();
        }, 0);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pull server-side outreach history once on mount and merge into localStorage so
  // the "Hide contacted" filter reflects records made on other devices / by the
  // pipeline / via the Outreach tab. Without this, switching tabs could surface
  // many already-contacted prospects only after the first per-row action triggered
  // a state refresh — making it look like clicking one row hid all the others.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/linkbuilding/history')
      .then(r => r.json())
      .then(data => {
        if (cancelled || !data.success) return;
        const local = getOutreachHistory();
        const merged = { ...local, ...(data.history || {}) };
        try { localStorage.setItem('kotor-outreach-history', JSON.stringify(merged)); } catch {}
        setOutreachHistory(merged);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const addSeed = () => {
    if (!newSeed.trim() || seedKeywords.includes(newSeed.trim().toLowerCase())) return;
    const updated = [...seedKeywords, newSeed.trim().toLowerCase()];
    setSeedKeywords(updated);
    saveSeedKeywords(updated);
    setNewSeed('');
  };

  const removeSeed = (kw) => {
    const updated = seedKeywords.filter(k => k !== kw);
    setSeedKeywords(updated);
    saveSeedKeywords(updated);
  };

  const mineBacklinks = async (overrides = {}) => {
    const target = (backlinkSource || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '');
    if (!target) return;
    setBacklinkLoading(true); setError(null); setResults(null);
    try {
      const useCompetitors = overrides.includeCompetitors ?? includeCompetitors;
      const competitorParam = useCompetitors ? '&includeCompetitors=1' : '';
      const res = await fetch(`/api/dataforseo/competitor-backlinks?domain=${encodeURIComponent(target)}${competitorParam}`);
      const data = await res.json();
      if (data.success) setResults(data);
      else setError(data.error);
    } catch (e) { setError(e.message); }
    setBacklinkLoading(false);
  };

  const search = async (overrides = {}) => {
    if (!keyword.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const typeParam = searchType ? `&type=${searchType}` : '';
      // overrides.includeCompetitors lets the toggle re-run with the new value
      // before React state has propagated (setState is async).
      const useCompetitors = overrides.includeCompetitors ?? includeCompetitors;
      const competitorParam = useCompetitors ? '&includeCompetitors=1' : '';
      const res = await fetch(`/api/dataforseo/link-opportunities?keyword=${encodeURIComponent(keyword)}${typeParam}${competitorParam}`);
      const data = await res.json();
      if (data.success) setResults(data);
      else setError(data.error);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const analyzePage = async (url) => {
    if (analyses[url]) return;
    setAnalyzing(prev => ({ ...prev, [url]: true }));
    try {
      const res = await fetch(`/api/dataforseo/analyze-page?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setAnalyses(prev => ({ ...prev, [url]: data.success ? data : { error: data.error } }));
    } catch (e) { setAnalyses(prev => ({ ...prev, [url]: { error: e.message } })); }
    setAnalyzing(prev => ({ ...prev, [url]: false }));
  };

  const typeColors = {
    'resource': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'guest-post': 'text-green-400 bg-green-500/10 border-green-500/20',
    'submit': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'roundup': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'guide': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Find Link Opportunities</h3>
        <p className="text-[10px] text-zinc-500 mb-3">Search Google for pages where you can actually place a link &mdash; resource pages, guest post opportunities, directories, and roundup lists</p>

        {/* Keyword chips — editable */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {seedKeywords.map(kw => (
            <div key={kw} className="flex items-center gap-0.5">
              <button onClick={() => setKeyword(kw)}
                className={`px-2 py-1 text-[10px] rounded-l border transition-colors ${
                  keyword === kw ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-zinc-500 border-[#2a2d3a] hover:text-zinc-300'
                }`}>
                {kw}
              </button>
              {editingSeeds && (
                <button onClick={() => removeSeed(kw)} className="px-1 py-1 text-[10px] text-zinc-600 border border-[#2a2d3a] border-l-0 rounded-r hover:text-red-400">
                  <X size={8} />
                </button>
              )}
            </div>
          ))}
          {editingSeeds ? (
            <div className="flex items-center gap-1">
              <input type="text" value={newSeed} onChange={e => setNewSeed(e.target.value)} placeholder="Add keyword"
                className="px-2 py-1 text-[10px] bg-[#0f1117] border border-[#2a2d3a] rounded text-white outline-none w-36"
                onKeyDown={e => e.key === 'Enter' && addSeed()} />
              <button onClick={addSeed} className="text-green-400 hover:text-green-300"><Plus size={10} /></button>
              <button onClick={() => setEditingSeeds(false)} className="text-zinc-500 hover:text-zinc-300 text-[10px] ml-1">Done</button>
            </div>
          ) : (
            <button onClick={() => setEditingSeeds(true)} className="px-2 py-1 text-[10px] text-zinc-600 border border-dashed border-zinc-700 rounded hover:text-zinc-400">
              Edit keywords
            </button>
          )}
        </div>

        {/* Search type filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button onClick={() => setSearchType('')}
            className={`px-2 py-1 text-[10px] rounded border ${!searchType ? 'text-white bg-white/5 border-white/20' : 'text-zinc-500 border-[#2a2d3a] hover:text-zinc-300'}`}>
            All types
          </button>
          {SEARCH_TYPES.map(st => (
            <button key={st.type} onClick={() => setSearchType(st.type)}
              className={`px-2 py-1 text-[10px] rounded border ${searchType === st.type ? typeColors[st.type] : 'text-zinc-500 border-[#2a2d3a] hover:text-zinc-300'}`}
              title={st.desc}>
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="Enter keyword to find link opportunities..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
              onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <button onClick={search} disabled={loading || !keyword.trim()}
            className="px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40 flex items-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Searching...' : 'Find Opportunities'}
          </button>
        </div>
        {loading && <p className="text-[10px] text-zinc-600 mt-2">Searching {searchType ? '1' : '5'} Google queries for link placement opportunities...</p>}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Results */}
      {results && results.data?.length > 0 && (() => {
        // Hide any domain that already has an outreach record — drafted, sent,
        // marked not-suitable, etc. The user has already seen / decided on it.
        const HIDE_STATUSES = new Set(['drafted', 'sent', 'replied', 'linked', 'no-reply', 'dead', 'not-suitable']);
        const normalizeDomain = (d) => (d || '').toString().trim().toLowerCase().replace(/^www\./, '');
        // Build a normalised lookup once so opp.domain differences (case, www,
        // stray whitespace) can't bypass the filter.
        const normalisedHistory = Object.fromEntries(
          Object.entries(outreachHistory || {}).map(([k, v]) => [normalizeDomain(k), v])
        );
        const isContacted = (domain) => {
          const drafts = listOutreachDrafts(normalisedHistory[normalizeDomain(domain)]);
          return drafts.some(d => HIDE_STATUSES.has(d.status));
        };
        const markNotSuitable = (opp) => {
          const cleanDomain = opp.domain.replace('www.', '');
          const record = {
            email: null,
            name: null,
            subject: null,
            site: 'montenegrocarhire.com', // any site — the filter is domain-level
            method: 'manual',
            pageUrl: opp.url,
            status: 'not-suitable',
            draftId: null,
          };
          saveOutreach(cleanDomain, record);
          setOutreachHistory(getOutreachHistory());
          fetch('/api/linkbuilding/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain: cleanDomain, ...record }),
          }).catch(() => {});
        };
        const visible = hideContacted ? results.data.filter(o => !isContacted(o.domain)) : results.data;
        const hiddenCount = results.data.length - visible.length;
        return (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2d3a] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">{visible.length} Opportunities</h3>
              {hiddenCount > 0 && hideContacted && (
                <span className="text-[11px] text-zinc-500">
                  ({hiddenCount} already contacted, hidden)
                </span>
              )}
              {results.filteredCompetitors > 0 && (
                <span className="text-[11px] text-zinc-600" title="Stripped before display: car-rental brands, aggregators (rentalcars, discovercars, kayak), and your own sister sites">
                  · {results.filteredCompetitors} competitors filtered
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={hideContacted} onChange={e => setHideContacted(e.target.checked)}
                  className="accent-blue-500" />
                Hide contacted
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer"
                title="Re-run the search including domains the server-side filter strips as competitors (rental brands, aggregators). Useful for sanity-checking whether the filter is too aggressive.">
                <input type="checkbox" checked={includeCompetitors} onChange={e => {
                  const next = e.target.checked;
                  setIncludeCompetitors(next);
                  // Re-run whichever query produced the current results
                  if (results?.mode === 'backlinks') mineBacklinks({ includeCompetitors: next });
                  else search({ includeCompetitors: next });
                }}
                  className="accent-blue-500" />
                Show competitors
              </label>
              <span className="text-[11px] text-zinc-600">for &ldquo;{results.keyword}&rdquo;</span>
            </div>
          </div>
          <div className="divide-y divide-[#2a2d3a]/50">
            {visible.map((opp, i) => (
              <div key={i} className="px-5 py-3 hover:bg-white/[0.01]">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-zinc-600 w-6 pt-0.5 flex-shrink-0">{opp.position}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a href={opp.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:underline text-sm font-medium truncate max-w-[500px] flex items-center gap-1">
                        {opp.title} <ExternalLink size={12} className="text-zinc-600 flex-shrink-0" />
                      </a>
                    </div>
                    <p className="text-xs text-zinc-600 truncate mb-1.5">{opp.url}</p>
                    <p className="text-xs text-zinc-500 line-clamp-2">{opp.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${typeColors[opp.searchType] || 'text-zinc-400 border-zinc-500/20'}`}>{opp.searchLabel}</span>
                      <span className="text-[11px] text-zinc-500">{opp.domain}</span>
                      <button onClick={() => analyzePage(opp.url)}
                        disabled={!!analyses[opp.url] || analyzing[opp.url]}
                        className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 disabled:opacity-40 ml-auto">
                        {analyzing[opp.url] ? <Loader2 size={10} className="animate-spin" /> : <FileSearch size={10} />}
                        Analyse
                      </button>
                      {(() => {
                        const domainKey = opp.domain.replace('www.', '');
                        const drafts = listOutreachDrafts(outreachHistory[domainKey]);
                        // If anything past 'drafted' has been recorded, suppress the
                        // action buttons — the row has been actioned and only the
                        // status pill should show.
                        const hasFinalStatus = drafts.some(d => d.status === 'not-suitable' || d.status === 'sent' || d.status === 'replied' || d.status === 'linked' || d.status === 'no-reply' || d.status === 'dead');
                        return (
                          <>
                            {drafts.map(d => {
                              const colorClasses = OUTREACH_STATUS_COLORS[d.status] || OUTREACH_STATUS_COLORS.drafted;
                              const Icon = d.status === 'not-suitable' || d.status === 'dead' ? X
                                : d.status === 'linked' ? CheckCircle2
                                : Mail;
                              const label = d.status === 'not-suitable' ? 'not suitable'
                                : `${d.status}: ${d.site.replace('.com', '')}`;
                              return (
                                <span key={d.site}
                                  title={`${d.status} · site: ${d.site} · ${new Date(d.date).toLocaleString()}${d.email ? ` · ${d.email}` : ''}`}
                                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${colorClasses}`}>
                                  <Icon size={10} />
                                  {label} · {new Date(d.date).toLocaleDateString()}
                                </span>
                              );
                            })}
                            {!hasFinalStatus && (
                              <>
                                <button onClick={() => setEmailModal({
                                    title: opp.title, url: opp.url, domain: opp.domain,
                                    pageType: analyses[opp.url]?.pageType || 'Article',
                                    competitorLinks: analyses[opp.url]?.competitorLinks || [],
                                    headings: analyses[opp.url]?.headings || [],
                                  })}
                                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">
                                  <Mail size={10} />
                                  Draft Email
                                </button>
                                <button onClick={() => markNotSuitable(opp)}
                                  title="Mark this prospect as not suitable — hides it from future searches"
                                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20">
                                  <X size={10} />
                                  Not suitable
                                </button>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Page analysis */}
                {analyses[opp.url] && !analyses[opp.url].error && (
                  <div className="ml-8 mt-2 bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{analyses[opp.url].pageType}</span>
                      <span className="text-[9px] text-zinc-600">{analyses[opp.url].wordCount?.toLocaleString()} words &middot; {analyses[opp.url].totalLinks} links</span>
                    </div>

                    {analyses[opp.url].competitorLinks?.length > 0 && (
                      <div>
                        <p className="text-[9px] text-amber-400 font-medium mb-1">Competitor links on this page &mdash; your link should be here too:</p>
                        {analyses[opp.url].competitorLinks.map((cl, j) => (
                          <div key={j} className="flex items-center gap-2 text-[9px]">
                            <span className="text-zinc-500">{cl.text || '(no anchor)'}</span>
                            <span className="text-zinc-700">&rarr;</span>
                            <a href={cl.url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline truncate max-w-[300px]">{cl.url}</a>
                          </div>
                        ))}
                      </div>
                    )}

                    {analyses[opp.url].nicheLinks?.length > 0 && (
                      <div>
                        <p className="text-[9px] text-green-400 font-medium mb-1">Niche-related links already on this page:</p>
                        {analyses[opp.url].nicheLinks.map((cl, j) => (
                          <div key={j} className="flex items-center gap-2 text-[9px]">
                            <span className="text-zinc-500">{cl.text || '(no anchor)'}</span>
                            <span className="text-zinc-700">&rarr;</span>
                            <a href={cl.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline truncate max-w-[300px]">{cl.url}</a>
                          </div>
                        ))}
                      </div>
                    )}

                    {analyses[opp.url].competitorLinks?.length === 0 && analyses[opp.url].nicheLinks?.length === 0 && (
                      <p className="text-[9px] text-zinc-600">No competitor or car hire links found &mdash; this could be a fresh placement opportunity</p>
                    )}

                    {analyses[opp.url].headings?.length > 0 && (
                      <div>
                        <p className="text-[9px] text-zinc-500 font-medium mb-1">Page sections:</p>
                        <div className="flex flex-wrap gap-1">
                          {analyses[opp.url].headings.slice(0, 8).map((h, j) => (
                            <span key={j} className="text-[8px] px-1 py-0.5 rounded bg-zinc-700/30 text-zinc-500">{h.slice(0, 50)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {analyses[opp.url]?.error && (
                  <p className="ml-8 mt-2 text-[9px] text-red-400">Analysis failed: {analyses[opp.url].error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {results && results.data?.length === 0 && (
        <div className="p-8 text-center">
          <Search size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No opportunities found for this keyword</p>
          <p className="text-xs text-zinc-700">Try a different keyword or broader search type</p>
        </div>
      )}

      {!results && !loading && (
        <div className="p-8 text-center">
          <Globe size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Search for link placement opportunities</p>
          <p className="text-xs text-zinc-700">Finds resource pages, guest post sites, directories, and roundup lists where you can get your link placed</p>
        </div>
      )}

      {/* Email modal */}
      <OutreachEmailModal
        isOpen={!!emailModal}
        onClose={() => setEmailModal(null)}
        pageTitle={emailModal?.title || ''}
        pageUrl={emailModal?.url || ''}
        domain={emailModal?.domain || ''}
        pageType={emailModal?.pageType || 'Article'}
        competitorLinks={emailModal?.competitorLinks || []}
        headings={emailModal?.headings || []}
        onDrafted={() => { setOutreachHistory(getOutreachHistory()); setEmailModal(null); }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO PIPELINE TAB
// ═══════════════════════════════════════════════════════════════════════════
function AutoPipelineTab() {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({});
  const [savingGmail, setSavingGmail] = useState(null);
  const [gmailSuccess, setGmailSuccess] = useState({});
  const [runs, setRuns] = useState([]);
  const [showRuns, setShowRuns] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [keywords, setKeywords] = useState('kotor travel guide\nmontenegro tourism blog\nthings to do in kotor\nbay of kotor guide\nkotor Montenegro travel');
  const [siteToPitch, setSiteToPitch] = useState('montenegrocarhire.com');
  const [searchTypes, setSearchTypes] = useState(['resource', 'roundup', 'guide']);
  const pollRef = useRef(null);

  // Poll pipeline status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/linkbuilding/pipeline');
      const data = await res.json();
      if (data.success) setPipeline(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
    // Fetch run history
    fetch('/api/linkbuilding/history?type=runs').then(r => r.json()).then(d => { if (d.success) setRuns(d.runs || []); }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  // Auto-poll when running
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (pipeline?.status === 'running') {
      pollRef.current = setInterval(fetchStatus, 10000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pipeline?.status, fetchStatus]);

  // Start new run
  const startRun = async () => {
    setStarting(true);
    try {
      const kws = keywords.split('\n').map(k => k.trim()).filter(Boolean);
      const res = await fetch('/api/linkbuilding/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteToPitch, keywords: kws, searchTypes }),
      });
      const data = await res.json();
      if (data.success) fetchStatus();
      else alert(data.error || 'Failed to start');
    } catch (err) { alert(err.message); }
    setStarting(false);
  };

  // Process next chunk manually
  const processNext = async () => {
    setProcessing(true);
    try {
      await fetch('/api/linkbuilding/pipeline', { method: 'PATCH' });
      await fetchStatus();
    } catch {}
    setProcessing(false);
  };

  // Save single prospect to Gmail draft
  const saveToGmail = async (prospect) => {
    if (!prospect.draft?.subject || !prospect.contact?.email) return;
    setSavingGmail(prospect.id);
    try {
      const edited = editingDraft[prospect.id] || {};
      const res = await fetch('/api/outreach/gmail-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: prospect.contact.email,
          subject: edited.subject || prospect.draft.subject,
          body: edited.body || prospect.draft.body,
          from: `info@${siteToPitch}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGmailSuccess(prev => ({ ...prev, [prospect.id]: true }));
        // Update outreach history
        fetch('/api/linkbuilding/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: prospect.domain, status: 'drafted', draftId: data.draftId }),
        }).catch(() => {});
      } else alert(data.error || 'Failed');
    } catch (err) { alert(err.message); }
    setSavingGmail(null);
  };

  // Sync sent Gmail outreach into history
  const syncGmail = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch('/api/linkbuilding/gmail-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: 'kotordirectory@gmail.com' }),
      });
      const data = await res.json();
      setSyncResult(data);
    } catch (err) { setSyncResult({ success: false, error: err.message }); }
    setSyncing(false);
  };

  // Stage progress indicator
  const STAGES = [
    { key: 'prospect', label: 'Prospecting', icon: Search },
    { key: 'filter', label: 'Filtering', icon: AlertTriangle },
    { key: 'analyze', label: 'Analyzing', icon: FileSearch },
    { key: 'contact', label: 'Finding Contacts', icon: Mail },
    { key: 'draft', label: 'Drafting Emails', icon: Pencil },
    { key: 'done', label: 'Complete', icon: CheckCircle2 },
  ];

  const prospects = pipeline?.prospects || [];
  const drafted = prospects.filter(p => p.stage === 'drafted' && p.draft?.subject);
  const skipped = prospects.filter(p => p.stage === 'skipped');

  const toggleSearchType = (type) => {
    setSearchTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 size={14} className="animate-spin text-blue-400" /><span className="text-xs text-zinc-500">Loading pipeline status...</span></div>;

  return (
    <div className="space-y-5">
      {/* Run controls */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">Automated Link Prospecting</h3>
            {pipeline?.status === 'running' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">Running</span>
            )}
            {pipeline?.status === 'completed' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Completed</span>
            )}
          </div>
          <p className="text-[10px] text-zinc-600">Searches for link prospects, analyzes pages, finds contacts, and drafts outreach emails automatically</p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncGmail} disabled={syncing} className="text-[10px] px-3 py-1.5 rounded-lg bg-[#2a2d3a] text-zinc-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1">
            {syncing ? <Loader2 size={10} className="animate-spin" /> : <Inbox size={10} />}
            Sync Gmail
          </button>
          <button onClick={() => setShowConfig(!showConfig)} className="text-[10px] px-3 py-1.5 rounded-lg bg-[#2a2d3a] text-zinc-400 hover:text-white transition-colors">
            Config
          </button>
          {pipeline?.status === 'running' ? (
            <button onClick={processNext} disabled={processing} className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1.5">
              {processing ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
              Process Next Chunk
            </button>
          ) : (
            <button onClick={startRun} disabled={starting} className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1.5">
              {starting ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
              Run Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 font-medium">Site to pitch</label>
            <select value={siteToPitch} onChange={e => setSiteToPitch(e.target.value)} className="w-full mt-1 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white p-2">
              <option value="montenegrocarhire.com">montenegrocarhire.com</option>
              <option value="tivatcarhire.com">tivatcarhire.com</option>
              <option value="budvacarhire.com">budvacarhire.com</option>
              <option value="hercegnovicarhire.com">hercegnovicarhire.com</option>
              <option value="ulcinjcarhire.com">ulcinjcarhire.com</option>
              <option value="kotorcarhire.com">kotorcarhire.com</option>
              <option value="podgoricacarhire.com">podgoricacarhire.com</option>
              <option value="northernirelandcarhire.com">northernirelandcarhire.com</option>
              <option value="kotorcarrental.com">kotorcarrental.com</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-medium">Keywords (one per line)</label>
            <textarea value={keywords} onChange={e => setKeywords(e.target.value)} rows={4} className="w-full mt-1 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white p-2 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-medium">Search types</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {[{ type: 'resource', label: 'Resource Pages' }, { type: 'guest-post', label: 'Guest Posts' }, { type: 'submit', label: 'Submit Site' }, { type: 'roundup', label: 'Roundups' }, { type: 'guide', label: 'Travel Guides' }].map(st => (
                <button key={st.type} onClick={() => toggleSearchType(st.type)}
                  className={`text-[9px] px-2 py-1 rounded-lg border transition-colors ${searchTypes.includes(st.type) ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#1a1d27] text-zinc-500 border-[#2a2d3a] hover:text-zinc-300'}`}>
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gmail sync result */}
      {syncResult && (
        <div className={`text-[10px] p-3 rounded-lg border ${syncResult.success ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
          {syncResult.success ? (
            <>{syncResult.synced} new domains synced from Gmail ({syncResult.scanned} emails scanned, {syncResult.total} total in history){syncResult.domains?.length > 0 && <span className="text-zinc-500"> — {syncResult.domains.join(', ')}</span>}</>
          ) : syncResult.error}
        </div>
      )}

      {/* Stage progress */}
      {pipeline && pipeline.status !== 'idle' && (
        <div className="bg-[#0f1117] border border-[#2a2d3a] rounded-xl p-4">
          <div className="flex items-center gap-1 mb-3">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const isActive = pipeline.stage === s.key;
              const isPast = STAGES.findIndex(x => x.key === pipeline.stage) > i;
              const isDone = pipeline.status === 'completed' || s.key === 'done' && pipeline.status === 'completed';
              return (
                <div key={s.key} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium w-full justify-center ${
                    isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    isPast || isDone ? 'bg-green-500/10 text-green-400' : 'text-zinc-600'
                  }`}>
                    {isActive && pipeline.status === 'running' ? <Loader2 size={9} className="animate-spin" /> : <Icon size={9} />}
                    {s.label}
                  </div>
                  {i < STAGES.length - 1 && <div className={`w-3 h-px flex-shrink-0 ${isPast ? 'bg-green-500/30' : 'bg-[#2a2d3a]'}`} />}
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="flex gap-4 text-[10px]">
            <span className="text-zinc-500">Prospected: <span className="text-white">{pipeline.progress?.prospected || 0}</span></span>
            <span className="text-zinc-500">Filtered: <span className="text-white">{pipeline.progress?.filtered || 0}</span></span>
            <span className="text-zinc-500">Analyzed: <span className="text-white">{pipeline.progress?.analyzed || 0}</span></span>
            <span className="text-zinc-500">Contacts: <span className="text-white">{pipeline.progress?.contacted || 0}</span></span>
            <span className="text-zinc-500">Drafted: <span className="text-green-400">{pipeline.progress?.drafted || 0}</span></span>
            <span className="text-zinc-500">Skipped: <span className="text-zinc-400">{pipeline.progress?.skipped || 0}</span></span>
            {(pipeline.progress?.errors || 0) > 0 && <span className="text-zinc-500">Errors: <span className="text-red-400">{pipeline.progress.errors}</span></span>}
          </div>

          {pipeline.startedAt && (
            <div className="mt-2 text-[9px] text-zinc-600">
              Started {new Date(pipeline.startedAt).toLocaleString()}
              {pipeline.completedAt && <> &middot; Completed {new Date(pipeline.completedAt).toLocaleString()}</>}
              {pipeline.lastChunkAt && !pipeline.completedAt && <> &middot; Last chunk {new Date(pipeline.lastChunkAt).toLocaleString()}</>}
            </div>
          )}
        </div>
      )}

      {/* Drafted prospects table */}
      {drafted.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-white flex items-center gap-1.5">
              <Inbox size={12} className="text-green-400" />
              {drafted.length} Outreach Emails Ready
            </h4>
          </div>

          <div className="border border-[#2a2d3a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a] bg-[#0f1117]">
                  <th className="py-2 px-3 text-left font-medium">Domain</th>
                  <th className="py-2 px-2 text-left font-medium">Type</th>
                  <th className="py-2 px-2 text-left font-medium">Page Type</th>
                  <th className="py-2 px-2 text-left font-medium">Contact</th>
                  <th className="py-2 px-2 text-left font-medium">Subject</th>
                  <th className="py-2 px-2 text-center font-medium">Gmail</th>
                </tr>
              </thead>
              <tbody>
                {drafted.map(p => {
                  const isOpen = expandedId === p.id;
                  const { type } = classifyDomain(p.domain, p.url);
                  const catStyle = CATEGORY_COLORS[type] || CATEGORY_COLORS['General'];
                  return (
                    <Fragment key={p.id}>
                      <tr className={`border-b border-[#2a2d3a]/50 hover:bg-white/[0.01] cursor-pointer ${isOpen ? 'bg-blue-500/[0.03]' : ''}`}
                        onClick={() => setExpandedId(isOpen ? null : p.id)}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            {isOpen ? <ChevronDown size={10} className="text-zinc-500" /> : <ChevronRight size={10} className="text-zinc-600" />}
                            <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-blue-400 hover:underline text-xs truncate max-w-[200px]">
                              {p.domain}
                            </a>
                          </div>
                        </td>
                        <td className="py-2 px-2"><span className={`text-[9px] px-1.5 py-0.5 rounded ${catStyle.bgClass}`}>{type}</span></td>
                        <td className="py-2 px-2 text-[10px] text-zinc-400">{p.analysis?.pageType || '—'}</td>
                        <td className="py-2 px-2">
                          {p.contact?.email ? (
                            <span className="text-[10px] text-green-400 truncate max-w-[150px] block">{p.contact.email}</span>
                          ) : p.contact?.method === 'form' ? (
                            <span className="text-[10px] text-amber-400">Form</span>
                          ) : (
                            <span className="text-[10px] text-zinc-600">None</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-[10px] text-zinc-300 truncate max-w-[200px]">{p.draft?.subject || '—'}</td>
                        <td className="py-2 px-2 text-center" onClick={e => e.stopPropagation()}>
                          {gmailSuccess[p.id] ? (
                            <CheckCircle2 size={12} className="text-green-400 mx-auto" />
                          ) : (
                            <button onClick={() => saveToGmail(p)} disabled={savingGmail === p.id || !p.contact?.email}
                              className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-30">
                              {savingGmail === p.id ? <Loader2 size={8} className="animate-spin" /> : 'Draft'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded draft preview */}
                      {isOpen && (
                        <tr className="border-b border-[#2a2d3a]/50">
                          <td colSpan={6} className="p-0">
                            <div className="bg-[#0f1117] px-5 py-4 space-y-3">
                              {/* Article info */}
                              <div className="flex items-start gap-3 text-[10px]">
                                <div className="flex-1">
                                  <p className="text-zinc-400"><span className="text-zinc-600">Article:</span> {p.analysis?.title || p.title}</p>
                                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{p.url}</a>
                                  {p.analysis?.wordCount > 0 && <span className="text-zinc-600 ml-2">{p.analysis.wordCount.toLocaleString()} words &middot; {p.analysis.totalLinks} links</span>}
                                  {p.analysis?.competitorLinks?.length > 0 && (
                                    <p className="text-amber-400 mt-1">Competitor links: {p.analysis.competitorLinks.map(c => c.text || c.url.split('/')[2]).join(', ')}</p>
                                  )}
                                </div>
                                <div className="text-right text-zinc-600">
                                  {p.contact?.name && <p>Contact: <span className="text-zinc-400">{p.contact.name}</span></p>}
                                  <p>Via: <span className="text-zinc-400">{p.searchLabel}</span></p>
                                  <p>Keyword: <span className="text-zinc-400">{p.searchKeyword}</span></p>
                                </div>
                              </div>

                              {/* Editable email */}
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[9px] text-zinc-600 font-medium">Subject</label>
                                  <input
                                    value={editingDraft[p.id]?.subject ?? p.draft?.subject ?? ''}
                                    onChange={e => setEditingDraft(prev => ({ ...prev, [p.id]: { ...prev[p.id], subject: e.target.value } }))}
                                    className="w-full mt-0.5 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white p-2"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-zinc-600 font-medium">Body</label>
                                  <textarea
                                    value={editingDraft[p.id]?.body ?? p.draft?.body ?? ''}
                                    onChange={e => setEditingDraft(prev => ({ ...prev, [p.id]: { ...prev[p.id], body: e.target.value } }))}
                                    rows={8}
                                    className="w-full mt-0.5 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white p-2 font-mono leading-relaxed"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button onClick={() => saveToGmail(p)} disabled={savingGmail === p.id || !p.contact?.email}
                                  className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-30 flex items-center gap-1.5">
                                  {savingGmail === p.id ? <Loader2 size={10} className="animate-spin" /> : <Mail size={10} />}
                                  Save to Gmail Drafts
                                </button>
                                {gmailSuccess[p.id] && <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> Saved</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Skipped prospects summary */}
      {skipped.length > 0 && (
        <details className="text-[10px]">
          <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300">{skipped.length} prospects skipped</summary>
          <div className="mt-2 space-y-0.5 pl-4">
            {skipped.slice(0, 20).map(p => (
              <div key={p.id} className="flex items-center gap-2 text-zinc-600">
                <span className="text-zinc-500 truncate max-w-[200px]">{p.domain}</span>
                <span className="text-zinc-700">&mdash;</span>
                <span>{p.skipReason}</span>
              </div>
            ))}
            {skipped.length > 20 && <p className="text-zinc-600">...and {skipped.length - 20} more</p>}
          </div>
        </details>
      )}

      {/* Run history */}
      {runs.length > 0 && (
        <details className="text-[10px]">
          <summary className="text-zinc-500 cursor-pointer hover:text-zinc-300 flex items-center gap-1.5">
            <Clock size={10} />
            {runs.length} previous runs
          </summary>
          <div className="mt-2 space-y-1.5 pl-4">
            {runs.slice(0, 10).map(r => (
              <div key={r.runId} className="flex items-center gap-3 text-zinc-500">
                <span className="text-zinc-400">{new Date(r.startedAt).toLocaleDateString()}</span>
                <span>{r.triggeredBy}</span>
                <span>Drafted: <span className="text-green-400">{r.stats?.drafted || 0}</span></span>
                <span>Skipped: {r.stats?.skipped || 0}</span>
                <span>Errors: {r.stats?.errors || 0}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty state */}
      {!pipeline || pipeline.status === 'idle' ? (
        <div className="text-center py-12">
          <Cpu size={24} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 mb-1">No pipeline runs yet</p>
          <p className="text-[10px] text-zinc-600">Click &ldquo;Run Pipeline&rdquo; to automatically find link prospects, analyze pages, find contacts, and draft outreach emails</p>
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTREACH TRACKER TAB — every draft logged from this browser, grouped by site
// ═══════════════════════════════════════════════════════════════════════════
const OUTREACH_STATUSES = ['drafted', 'sent', 'replied', 'linked', 'no-reply', 'dead', 'not-suitable'];
const OUTREACH_STATUS_COLORS = {
  drafted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  replied: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  linked: 'bg-green-500/10 text-green-400 border-green-500/20',
  'no-reply': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  dead: 'bg-red-500/10 text-red-400 border-red-500/20',
  'not-suitable': 'bg-red-500/10 text-red-400 border-red-500/20',
};

function flattenOutreach(history) {
  const rows = [];
  for (const [domain, record] of Object.entries(history || {})) {
    const drafts = listOutreachDrafts(record);
    for (const d of drafts) {
      rows.push({
        domain,
        site: d.site || 'unknown',
        date: d.date,
        email: d.email || record.email || null,
        name: d.name || record.name || null,
        subject: d.subject || record.subject || null,
        pageUrl: d.pageUrl || record.pageUrl || null,
        method: d.method || record.method || null,
        status: d.status || 'drafted',
        draftId: d.draftId || record.draftId || null,
      });
    }
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  return rows;
}

function updateOutreachStatus(domain, site, newStatus) {
  const history = getOutreachHistory();
  const record = history[domain];
  if (!record) return history;
  if (record.byTarget?.[site]) record.byTarget[site].status = newStatus;
  if (record.site === site) record.status = newStatus;
  // Legacy single-site record without byTarget
  if (!record.byTarget && record.site === site) record.status = newStatus;
  history[domain] = record;
  localStorage.setItem('kotor-outreach-history', JSON.stringify(history));
  return history;
}

function deleteOutreachDraft(domain, site) {
  const history = getOutreachHistory();
  const record = history[domain];
  if (!record) return history;
  if (record.byTarget) {
    delete record.byTarget[site];
    if (!Object.keys(record.byTarget).length) delete history[domain];
    else history[domain] = record;
  } else if (record.site === site) {
    delete history[domain];
  }
  localStorage.setItem('kotor-outreach-history', JSON.stringify(history));
  return history;
}

function OutreachTrackerTab() {
  const [history, setHistory] = useState(() => getOutreachHistory());
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serverSyncing, setServerSyncing] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Pull server-side history once on mount; server wins for any overlapping domain
  // so cross-browser drafts show up. Local additions are pushed up via POST elsewhere.
  useEffect(() => {
    let cancelled = false;
    setServerSyncing(true);
    fetch('/api/linkbuilding/history')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.success) { setServerError(data.error || 'failed'); return; }
        const local = getOutreachHistory();
        const merged = { ...local, ...(data.history || {}) };
        setHistory(merged);
        try { localStorage.setItem('kotor-outreach-history', JSON.stringify(merged)); } catch {}
      })
      .catch(e => { if (!cancelled) setServerError(e.message); })
      .finally(() => { if (!cancelled) setServerSyncing(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => flattenOutreach(history), [history]);
  const sites = useMemo(() => Array.from(new Set(rows.map(r => r.site))).sort(), [rows]);
  const filtered = rows.filter(r =>
    (siteFilter === 'all' || r.site === siteFilter) &&
    (statusFilter === 'all' || r.status === statusFilter)
  );
  const counts = useMemo(() => {
    const c = { total: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const onStatusChange = (domain, site, status) => {
    const updated = updateOutreachStatus(domain, site, status);
    setHistory({ ...updated });
    // Mirror to server blob so it persists across browsers / devices
    fetch('/api/linkbuilding/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, site, status }),
    }).catch(() => {});
  };
  const onDelete = (domain, site) => {
    if (!confirm(`Remove ${site} draft for ${domain}?`)) return;
    const updated = deleteOutreachDraft(domain, site);
    setHistory({ ...updated });
    fetch(`/api/linkbuilding/history?domain=${encodeURIComponent(domain)}&site=${encodeURIComponent(site)}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const exportCSV = () => {
    const header = ['date', 'site', 'domain', 'email', 'subject', 'pageUrl', 'status'];
    const escape = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const r of filtered) {
      lines.push(header.map(k => escape(r[k])).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `outreach-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white mb-1">Outreach Tracker</h2>
        <p className="text-[10px] text-zinc-500">Every link opportunity you&rsquo;ve drafted an email to, grouped per target site</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)}
          className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white px-2 py-1.5">
          <option value="all">All sites ({rows.length})</option>
          {sites.map(s => (
            <option key={s} value={s}>{s} ({rows.filter(r => r.site === s).length})</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg text-xs text-white px-2 py-1.5">
          <option value="all">All statuses</option>
          {OUTREACH_STATUSES.map(s => (
            <option key={s} value={s}>{s} ({counts[s] || 0})</option>
          ))}
        </select>
        <span className="text-[10px] text-zinc-600">{filtered.length} of {rows.length} shown</span>
        <button onClick={() => setHistory(getOutreachHistory())}
          className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded border border-[#2a2d3a]">
          <RefreshCw size={10} /> Refresh
        </button>
        <button onClick={exportCSV}
          disabled={!filtered.length}
          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded border border-[#2a2d3a] disabled:opacity-40">
          <Download size={10} /> Export CSV
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl">
          <Inbox size={24} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">{rows.length === 0 ? 'No drafts logged yet' : 'No drafts match these filters'}</p>
          <p className="text-[10px] text-zinc-600 mt-1">Drafts created from the Find Opportunities tab will appear here</p>
        </div>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a] bg-[#0f1117]">
                <th className="text-left py-2 px-3 font-medium">Date</th>
                <th className="text-left py-2 px-2 font-medium">Site pitched</th>
                <th className="text-left py-2 px-2 font-medium">Prospect</th>
                <th className="text-left py-2 px-2 font-medium">Recipient</th>
                <th className="text-left py-2 px-2 font-medium">Subject</th>
                <th className="text-left py-2 px-2 font-medium">Status</th>
                <th className="text-right py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={`${r.domain}::${r.site}::${r.date}`} className="border-b border-[#2a2d3a]/50 hover:bg-white/[0.01]">
                  <td className="py-2 px-3 text-[10px] text-zinc-400 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-2 px-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{r.site}</span>
                  </td>
                  <td className="py-2 px-2">
                    {r.pageUrl ? (
                      <a href={r.pageUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1">
                        <span className="truncate max-w-[280px]">{r.domain}</span>
                        <ExternalLink size={9} className="text-zinc-600 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-300">{r.domain}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-[10px] text-zinc-400 truncate max-w-[180px]">{r.email || <span className="text-zinc-600">&mdash;</span>}</td>
                  <td className="py-2 px-2 text-[10px] text-zinc-400 truncate max-w-[220px]" title={r.subject}>{r.subject || <span className="text-zinc-600">&mdash;</span>}</td>
                  <td className="py-2 px-2">
                    <select value={r.status}
                      onChange={e => onStatusChange(r.domain, r.site, e.target.value)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border outline-none cursor-pointer ${OUTREACH_STATUS_COLORS[r.status] || OUTREACH_STATUS_COLORS.drafted}`}>
                      {OUTREACH_STATUSES.map(s => <option key={s} value={s} className="bg-[#1a1d27] text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    {r.draftId && (
                      <a href={`https://mail.google.com/mail/u/0/#drafts`} target="_blank" rel="noopener noreferrer"
                        title="Open Gmail drafts"
                        className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-blue-400 mr-2">
                        <Mail size={10} />
                      </a>
                    )}
                    <button onClick={() => onDelete(r.domain, r.site)}
                      title="Remove from tracker"
                      className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400">
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GMAIL TOKEN BANNER — warns when refresh token is dead or near 7-day expiry
// ═══════════════════════════════════════════════════════════════════════════
function GmailTokenBanner() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  // Re-fetch status. Also fires once on mount and after a successful re-auth
  // (?gmailAuth=ok in the URL after the callback redirects back here).
  const refreshStatus = useCallback(() => {
    fetch('/api/outreach/gmail-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshStatus();
    try {
      const params = new URLSearchParams(window.location.search);
      const flag = params.get('gmailAuth');
      if (flag) {
        // Strip the flag so refreshing doesn't re-trigger any banner state
        params.delete('gmailAuth');
        const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState(null, '', clean);
        if (flag === 'ok') refreshStatus();
      }
    } catch {}
  }, [refreshStatus]);

  if (!status || dismissed) return null;
  // Healthy + plenty of runway → don't clutter the UI
  if (status.valid && (status.daysRemaining == null || status.daysRemaining > 2)) return null;

  const tone = !status.valid
    ? { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertCircle }
    : { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle };
  const Icon = tone.icon;

  const headline = !status.configured
    ? 'Gmail OAuth not configured'
    : !status.valid
    ? 'Gmail refresh token is dead — drafts will fail'
    : status.daysRemaining === 0
    ? 'Gmail refresh token expires today'
    : `Gmail refresh token expires in ${status.daysRemaining} day${status.daysRemaining === 1 ? '' : 's'}`;

  return (
    <div className={`${tone.bg} ${tone.border} border rounded-xl px-4 py-3 flex items-start gap-3`}>
      <Icon size={16} className={`${tone.text} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 space-y-0.5">
        <p className={`text-xs font-medium ${tone.text}`}>{headline}</p>
        {status.error && <p className="text-[10px] text-zinc-400 font-mono">{status.error}</p>}
        <p className="text-[10px] text-zinc-500">
          Google rotates refresh tokens for Testing-mode apps every {status.ttlDays} days. One-click reauthorize below — you&rsquo;ll be sent to Google&rsquo;s consent screen.
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <a href="/api/outreach/gmail-auth/start"
            className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
            <RefreshCw size={10} />
            Reauthorize Gmail
          </a>
          <span className="text-[9px] text-zinc-600">
            Token source: {status.source || 'env'}
            {status.issuedAt && ` · issued ${new Date(status.issuedAt).toLocaleDateString()}`}
          </span>
        </div>
      </div>
      <button onClick={() => setDismissed(true)}
        title="Dismiss for this session"
        className="text-zinc-500 hover:text-zinc-300 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPETITORS TAB — saved list of prospect publishers + competitors to mine
// ═══════════════════════════════════════════════════════════════════════════
const COMPETITORS_KEY = 'kotor-competitors';
const COMPETITOR_STATUSES = ['queued', 'mined', 'in-progress', 'done', 'rejected'];
const COMPETITOR_STATUS_COLORS = {
  queued: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  mined: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'in-progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  done: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// Curated seed list of high-authority Balkans / Montenegro travel publishers.
// First-run defaults — user can edit, delete, add their own.
const SEED_COMPETITORS = [
  { domain: 'wander-lush.org', notes: 'Emily Lush · Balkans focus, very high authority' },
  { domain: 'chasingthedonkey.com', notes: 'Croatia + heavy Balkans coverage incl. Montenegro' },
  { domain: 'theculturetrip.com', notes: '/europe/montenegro/ section' },
  { domain: 'velvetescape.com', notes: 'Luxury travel angle' },
  { domain: 'journalofnomads.com', notes: 'Overland / road-trip travellers' },
  { domain: 'migrationology.com', notes: 'Food + travel angle' },
];

function loadCompetitors() {
  try {
    const saved = localStorage.getItem(COMPETITORS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return SEED_COMPETITORS.map(c => ({ ...c, status: 'queued', addedAt: new Date().toISOString() }));
}
function saveCompetitors(list) {
  try { localStorage.setItem(COMPETITORS_KEY, JSON.stringify(list)); } catch {}
}

function CompetitorsTab() {
  const [list, setList] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  // Inline mining results
  const [results, setResults] = useState(null);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [outreachHistory, setOutreachHistory] = useState(() => getOutreachHistory());

  useEffect(() => {
    setList(loadCompetitors());
    setHydrated(true);
  }, []);

  const cleanDomain = (d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  const updateList = (next) => { setList(next); saveCompetitors(next); };

  const addCompetitor = () => {
    const d = cleanDomain(newDomain);
    if (!d) return;
    if (list.some(c => c.domain === d)) { setNewDomain(''); return; }
    updateList([
      { domain: d, notes: newNotes.trim(), status: 'queued', addedAt: new Date().toISOString() },
      ...list,
    ]);
    setNewDomain(''); setNewNotes('');
  };

  const removeCompetitor = (domain) => {
    if (!confirm(`Remove ${domain}?`)) return;
    updateList(list.filter(c => c.domain !== domain));
  };

  const setStatus = (domain, status) => {
    updateList(list.map(c => c.domain === domain ? { ...c, status, statusUpdatedAt: new Date().toISOString() } : c));
  };

  const markMined = (domain) => {
    updateList(list.map(c => c.domain === domain
      ? { ...c, status: c.status === 'queued' ? 'mined' : c.status, lastMinedAt: new Date().toISOString() }
      : c));
  };

  const startEditNotes = (c) => { setEditingId(c.domain); setEditNotes(c.notes || ''); };
  const saveNotes = () => {
    updateList(list.map(c => c.domain === editingId ? { ...c, notes: editNotes } : c));
    setEditingId(null); setEditNotes('');
  };

  const exportCSV = () => {
    const header = ['domain', 'status', 'notes', 'addedAt', 'lastMinedAt'];
    const escape = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    for (const c of list) lines.push(header.map(k => escape(c[k])).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `competitors-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trigger backlink mining inline — fetch and render results in this tab.
  const goMine = async (rawDomain) => {
    const target = (rawDomain || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '');
    if (!target) return;
    markMined(target);
    setMineLoading(true); setMineError(null); setResults(null);
    try {
      const res = await fetch(`/api/dataforseo/competitor-backlinks?domain=${encodeURIComponent(target)}`);
      const data = await res.json();
      if (data.success) setResults(data);
      else setMineError(data.error || 'Mining failed');
    } catch (e) { setMineError(e.message); }
    setMineLoading(false);
    // Scroll results into view after render
    setTimeout(() => {
      const el = document.getElementById('competitors-results');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Mark a prospect domain as not suitable so it doesn't reappear next time
  const markNotSuitable = (opp) => {
    const cleanDomain = opp.domain.replace(/^www\./, '');
    const record = {
      email: null, name: null, subject: null,
      site: 'montenegrocarhire.com',
      method: 'manual',
      pageUrl: opp.url,
      status: 'not-suitable',
      draftId: null,
    };
    saveOutreach(cleanDomain, record);
    setOutreachHistory(getOutreachHistory());
    fetch('/api/linkbuilding/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: cleanDomain, ...record }),
    }).catch(() => {});
  };

  if (!hydrated) return null;

  const counts = list.reduce((c, x) => { c[x.status] = (c[x.status] || 0) + 1; return c; }, { total: list.length });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white mb-1">Competitors</h2>
        <p className="text-[10px] text-zinc-500">Mine a competitor&rsquo;s referring domains for outreach prospects, or save publishers to a watchlist for repeat mining.</p>
      </div>

      {/* Quick mine — ad-hoc, doesn't add to watchlist */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
        <p className="text-xs text-zinc-300 font-medium mb-1">Mine a competitor&rsquo;s referring domains</p>
        <p className="text-[10px] text-zinc-500 mb-2">Pulls sites that link to or mention a competitor. Higher conversion than SERP modifiers because these sites have already chosen to write about similar content. Try <code className="text-zinc-400">wander-lush.org</code>, <code className="text-zinc-400">chasingthedonkey.com</code>, <code className="text-zinc-400">theculturetrip.com</code>.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
              placeholder="competitor.com"
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
              onKeyDown={e => { if (e.key === 'Enter' && newDomain.trim()) goMine(cleanDomain(newDomain)); }} />
          </div>
          <button onClick={() => newDomain.trim() && goMine(cleanDomain(newDomain))} disabled={!newDomain.trim() || mineLoading}
            className="px-3 py-2 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 disabled:opacity-40 flex items-center gap-1.5">
            {mineLoading ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            {mineLoading ? 'Mining...' : 'Mine'}
          </button>
          <button onClick={addCompetitor} disabled={!newDomain.trim() || mineLoading}
            title="Save to watchlist below (without mining yet)"
            className="px-3 py-2 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40 flex items-center gap-1.5">
            <Plus size={12} /> Save
          </button>
        </div>
        {mineLoading && <p className="text-[10px] text-zinc-600 mt-2">Running Apify scraper — usually 60-120 seconds...</p>}
        {mineError && <p className="text-[10px] text-red-400 mt-2">{mineError}</p>}
      </div>

      {/* Inline mining results — render below the input so user stays on tab */}
      {results && results.data?.length > 0 && (
        <div id="competitors-results" className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2d3a] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">{results.count} prospects from {results.source}</h3>
              <p className="text-[10px] text-zinc-500">
                {results.provider === 'apify' ? 'via Apify Google Search' : 'via DataForSEO Backlinks'}
                {results.filteredCompetitors > 0 && ` · ${results.filteredCompetitors} competitors filtered`}
              </p>
            </div>
            <button onClick={() => setResults(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px]">clear</button>
          </div>
          <div className="divide-y divide-[#2a2d3a]/50">
            {results.data.map((opp, i) => {
              const domainKey = opp.domain.replace(/^www\./, '');
              const drafts = listOutreachDrafts(outreachHistory[domainKey]);
              const hasFinalStatus = drafts.some(d => d.status === 'not-suitable' || d.status === 'sent' || d.status === 'replied' || d.status === 'linked' || d.status === 'no-reply' || d.status === 'dead');
              return (
                <div key={i} className="px-5 py-3 hover:bg-white/[0.01] flex items-start gap-3">
                  <span className="text-xs text-zinc-600 w-6 pt-0.5 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <a href={opp.url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm font-medium truncate flex items-center gap-1">
                      {opp.title || opp.domain} <ExternalLink size={12} className="text-zinc-600 flex-shrink-0" />
                    </a>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">{opp.description || opp.url}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-zinc-600">{opp.domain}</span>
                      {drafts.map(d => {
                        const colorClasses = OUTREACH_STATUS_COLORS[d.status] || OUTREACH_STATUS_COLORS.drafted;
                        const Icon = d.status === 'not-suitable' || d.status === 'dead' ? X
                          : d.status === 'linked' ? CheckCircle2 : Mail;
                        const label = d.status === 'not-suitable' ? 'not suitable' : `${d.status}: ${d.site.replace('.com', '')}`;
                        return (
                          <span key={d.site} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${colorClasses}`}>
                            <Icon size={10} /> {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {!hasFinalStatus && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setEmailModal({
                          title: opp.title || opp.domain, url: opp.url, domain: opp.domain,
                          pageType: 'Article', competitorLinks: [], headings: [],
                        })}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">
                        <Mail size={10} /> Draft Email
                      </button>
                      <button onClick={() => markNotSuitable(opp)}
                        title="Mark as not suitable — hides from future searches"
                        className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20">
                        <X size={10} /> Not suitable
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-[#2a2d3a] pt-4">
        <h3 className="text-xs font-medium text-zinc-400 mb-2">Watchlist</h3>
      </div>

      {/* Add new — kept for explicit "add with notes" flow */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-3 flex gap-2">
        <input type="text" value={newDomain} onChange={e => setNewDomain(e.target.value)}
          placeholder="competitor.com"
          className="flex-1 px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
          onKeyDown={e => e.key === 'Enter' && (newDomain.trim() ? addCompetitor() : null)} />
        <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 px-3 py-2 text-xs bg-[#0f1117] border border-[#2a2d3a] rounded-lg text-white placeholder-zinc-600 outline-none focus:border-blue-500/50"
          onKeyDown={e => e.key === 'Enter' && (newDomain.trim() ? addCompetitor() : null)} />
        <button onClick={addCompetitor} disabled={!newDomain.trim()}
          className="flex items-center gap-1 px-3 py-2 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 disabled:opacity-40">
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Counts + actions */}
      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
        <span>{counts.total} tracked</span>
        {COMPETITOR_STATUSES.map(s => counts[s] ? (
          <span key={s} className={`px-1.5 py-0.5 rounded border ${COMPETITOR_STATUS_COLORS[s]}`}>{s}: {counts[s]}</span>
        ) : null)}
        <button onClick={exportCSV} className="ml-auto flex items-center gap-1 text-zinc-400 hover:text-white px-2 py-1 rounded border border-[#2a2d3a]">
          <Download size={10} /> Export CSV
        </button>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl">
          <Target size={24} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No competitors tracked yet</p>
        </div>
      ) : (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-zinc-500 border-b border-[#2a2d3a] bg-[#0f1117]">
                <th className="text-left py-2 px-3 font-medium">Domain</th>
                <th className="text-left py-2 px-2 font-medium">Notes</th>
                <th className="text-left py-2 px-2 font-medium">Status</th>
                <th className="text-left py-2 px-2 font-medium">Last mined</th>
                <th className="text-right py-2 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.domain} className="border-b border-[#2a2d3a]/50 hover:bg-white/[0.01]">
                  <td className="py-2 px-3 text-xs">
                    <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1">
                      {c.domain} <ExternalLink size={10} className="text-zinc-600" />
                    </a>
                  </td>
                  <td className="py-2 px-2 text-[11px] text-zinc-400 max-w-[300px]">
                    {editingId === c.domain ? (
                      <div className="flex items-center gap-1">
                        <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveNotes(); if (e.key === 'Escape') setEditingId(null); }}
                          className="flex-1 px-2 py-1 text-[11px] bg-[#0f1117] border border-[#2a2d3a] rounded text-white outline-none" />
                        <button onClick={saveNotes} className="text-green-400 text-[10px]">save</button>
                        <button onClick={() => setEditingId(null)} className="text-zinc-500 text-[10px]">cancel</button>
                      </div>
                    ) : (
                      <span onClick={() => startEditNotes(c)} className="cursor-text hover:text-zinc-200 block">
                        {c.notes || <span className="text-zinc-600 italic">click to add notes</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <select value={c.status} onChange={e => setStatus(c.domain, e.target.value)}
                      className={`text-[11px] px-2 py-0.5 rounded border outline-none cursor-pointer ${COMPETITOR_STATUS_COLORS[c.status]}`}>
                      {COMPETITOR_STATUSES.map(s => <option key={s} value={s} className="bg-[#1a1d27] text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2 text-[10px] text-zinc-500 whitespace-nowrap">
                    {c.lastMinedAt ? new Date(c.lastMinedAt).toLocaleDateString() : <span className="text-zinc-700">never</span>}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <button onClick={() => goMine(c.domain)}
                      title="Pull this domain's referring domains into Find Opportunities"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 mr-2">
                      <Link2 size={10} /> Mine
                    </button>
                    <button onClick={() => removeCompetitor(c.domain)}
                      title="Remove from watchlist"
                      className="inline-flex items-center text-zinc-500 hover:text-red-400">
                      <Trash2 size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Email modal — same component used in Find Opportunities, scoped to this tab */}
      <OutreachEmailModal
        isOpen={!!emailModal}
        onClose={() => setEmailModal(null)}
        pageTitle={emailModal?.title || ''}
        pageUrl={emailModal?.url || ''}
        domain={emailModal?.domain || ''}
        pageType={emailModal?.pageType || 'Article'}
        competitorLinks={emailModal?.competitorLinks || []}
        headings={emailModal?.headings || []}
        onDrafted={() => { setOutreachHistory(getOutreachHistory()); setEmailModal(null); }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'competitors', label: 'Competitors', icon: BarChart2 },
  { id: 'find', label: 'Find Opportunities', icon: Globe },
  { id: 'outreach', label: 'Outreach', icon: Inbox },
  { id: 'pipeline', label: 'Pipeline', icon: Target },
  { id: 'deep-dive', label: 'Deep Dive', icon: Search },
  { id: 'cluster', label: 'Cluster View', icon: BarChart2 },
  { id: 'broken', label: 'Broken Links', icon: AlertTriangle },
  { id: 'auto', label: 'Auto Pipeline', icon: Cpu },
];

export default function LinkProspectingPage() {
  const [activeTab, setActiveTab] = useState('find');

  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t && TABS.some(tab => tab.id === t)) setActiveTab(t);
    } catch {}
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Target size={20} className="text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Link Prospecting</h1>
        </div>
        <p className="text-sm text-zinc-500">Pipeline management, competitor deep dive, cluster comparison, and broken link opportunities</p>
      </div>

      <GmailTokenBanner />

      {/* Tab bar */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
        <div className="flex gap-0 border-b border-[#2a2d3a] px-5">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === t.id
                    ? 'text-blue-400 border-blue-400'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}>
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {activeTab === 'find' && <FindOpportunitiesTab />}
          {activeTab === 'competitors' && <CompetitorsTab />}
          {activeTab === 'outreach' && <OutreachTrackerTab />}
          {activeTab === 'pipeline' && <PipelineTab />}
          {activeTab === 'deep-dive' && <DeepDiveTab />}
          {activeTab === 'cluster' && <ClusterViewTab />}
          {activeTab === 'broken' && <BrokenLinksTab />}
          {activeTab === 'auto' && <AutoPipelineTab />}
        </div>
      </div>
    </div>
  );
}
