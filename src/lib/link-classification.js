/**
 * Domain classification utility for link building analysis.
 * Categorises referring domains by type using URL pattern matching.
 */

const CATEGORIES = [
  {
    type: 'Spam/Low Value',
    color: 'rose',
    patterns: ['grokpedia', 'wikitia', 'dbpedia', 'wikidata', 'crunchbase.com/hub', 'similarsites', 'sitelike', 'siteprice', 'worthofweb', 'hypestat', 'statscrop', 'websiteoutlook', 'semrush.com/website', 'similarweb.com/website', 'web.archive.org', 'whois.', 'whoisdomain', 'domaintools', 'spamhaus', 'linkbuildfarm', 'fiverr.com/categories/backlinks'],
    bgClass: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
  },
  {
    type: 'Forum/Q&A',
    color: 'purple',
    patterns: ['forum', 'community', 'reddit.com', 'quora.com', 'stackexchange', '/ShowTopic', '/ShowForum', 'answers.', 'discuss.'],
    bgClass: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
  },
  {
    type: 'Tourism/Gov',
    color: 'amber',
    patterns: ['.gov', 'visit-', 'visitmontenegro', 'visit.', 'tourism', 'tourist-board', 'montenegro.travel', 'nationaltrust', 'discovernorthernireland', 'tourismni'],
    bgClass: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
  },
  {
    type: 'Aggregator',
    color: 'red',
    patterns: ['discovercars', 'localrent', 'economybookings', 'rhinocarhire', 'vipcars', 'rentalcars', 'kayak', 'skyscanner', 'autoeurope', 'zestcarrental', 'driveboo', 'booking.com', 'expedia'],
    bgClass: 'text-red-400 bg-red-500/10 border border-red-500/20',
  },
  {
    type: 'Travel Blog',
    color: 'green',
    patterns: ['blog', 'travel', 'adventure', 'wanderlust', 'backpack', 'nomad', 'wander-lush', 'chasingthedonkey', 'alongdustyroads', 'adventurousmiriam', 'travelgroove', 'musafir', 'flyroman', 'tip-to-trip', 'lonelyplanet', 'nomadicmatt', 'theblondeabroad'],
    bgClass: 'text-green-400 bg-green-500/10 border border-green-500/20',
  },
  {
    type: 'Directory',
    color: 'blue',
    patterns: ['directory', 'listing', 'yellowpages', 'yelp', 'tripadvisor', 'foursquare', 'myguidemontenegro', 'montenegrofortravellers', 'hotfrog', 'cylex', 'europages'],
    bgClass: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
  },
  {
    type: 'News',
    color: 'cyan',
    patterns: ['news', 'press', 'media', 'journal', 'times', 'herald', 'post', 'gazette', 'telegraph', 'guardian', 'bbc', 'reuters', 'balkaninsight'],
    bgClass: 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20',
  },
];

const GENERAL = {
  type: 'General',
  color: 'zinc',
  bgClass: 'text-zinc-400 bg-zinc-500/10 border border-zinc-500/20',
};

export function classifyDomain(domain, url = '') {
  const haystack = (domain + ' ' + url).toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.patterns.some(p => haystack.includes(p))) {
      return { type: cat.type, color: cat.color, bgClass: cat.bgClass };
    }
  }
  return { ...GENERAL };
}

export const CATEGORY_COLORS = Object.fromEntries(
  [...CATEGORIES, GENERAL].map(c => [c.type, { color: c.color, bgClass: c.bgClass }])
);

export const CATEGORY_HEX = {
  'Spam/Low Value': '#fb7185',
  'Travel Blog': '#22c55e',
  'Directory': '#3b82f6',
  'Forum/Q&A': '#a855f7',
  'Tourism/Gov': '#f59e0b',
  'News': '#06b6d4',
  'Aggregator': '#ef4444',
  'General': '#71717a',
};
