# World-Class SEO Dashboard Research
## Feature Analysis for KotorDirectory.com Campaign Dashboard

*Research compiled March 2026 — based on analysis of leading SEO platforms*

---

## TABLE OF CONTENTS

1. [Current Dashboard Audit](#1-current-dashboard-audit)
2. [Top SEO Dashboard Tools — Feature Breakdown](#2-top-seo-dashboard-tools)
3. [Must-Have Dashboard Features](#3-must-have-dashboard-features)
4. [Reporting Features](#4-reporting-features)
5. [Strategy & Recommendation Engines](#5-strategy--recommendation-engines)
6. [Local SEO Specific Features](#6-local-seo-specific-features)
7. [Visualization Best Practices](#7-visualization-best-practices)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Data Sources & APIs](#9-data-sources--apis)

---

## 1. CURRENT DASHBOARD AUDIT

Your existing dashboard (Next.js 14 + Recharts + Tailwind) already has a solid foundation:

**What you HAVE:**
- Overview with KPI cards (clicks, impressions, avg position, CTR, keywords, clusters)
- Position distribution pie chart (Top 3 / Top 10 / Top 20 / 20+)
- Keyword status classification (winning/optimize/opportunity/future)
- Daily impressions & clicks trend (area chart)
- Biggest gainers/losers (position movers)
- Network sites overview
- Keyword tracking with search, filters, pagination
- Keyword position history (fetched live from GSC API)
- Cluster analysis with health scores
- Page performance with type classification (Listing/Category/Site Page)
- Page-level keyword mapping (keywords ranking for selected page)
- Category audit (meta description + on-page content status)
- Meta crawl tracker
- Strategy page with 8 recommendation types and priority scoring
- Action status tracking (pending/in-progress/done)
- Date range filtering
- DataForSEO integration (competitors, rankings, SERP)
- GSC API integration (queries, pages, dates, keyword history, page keywords)

**What you're MISSING compared to world-class tools:**
(Detailed in sections below)

---

## 2. TOP SEO DASHBOARD TOOLS — FEATURE BREAKDOWN

### Ahrefs Dashboard
**Standout features:**
- **Site Explorer** with complete backlink profile, referring domains graph over time
- **Content Explorer** finding content gaps and trending topics
- **Rank Tracker** with SERP feature tracking (featured snippets, PAA, local pack, images, videos)
- **Site Audit** with crawl health score, issue severity classification, and trend over time
- **Keyword Explorer** with keyword difficulty (KD) score, click metrics, parent topic grouping
- **Competing domains** overlay showing visibility comparison over time
- **Share of Voice** metric — percentage of all possible clicks you're capturing
- **SERP overview** for each keyword showing exactly who ranks and with what content

**What to replicate for Kotor:**
The Share of Voice concept is extremely valuable. For a directory site, you want to know: "Of all the searches for 'restaurants in Kotor', what percentage of clicks are we capturing?" This tells you market dominance per category.

### SEMrush Projects
**Standout features:**
- **Position Tracking** with visibility trend, estimated traffic, and SERP feature icons next to each keyword
- **On Page SEO Checker** with specific optimization ideas per page
- **Site Audit** with 140+ technical check types, issues grouped by severity
- **Backlink Audit** with toxic score per link
- **Content Analyzer** showing word count, readability, social shares for each page
- **Keyword Gap** tool comparing your keywords vs up to 5 competitors simultaneously
- **Traffic Analytics** estimating competitor traffic
- **Keyword cannibalization report** — detects when multiple pages compete for the same keyword
- **Brand Monitoring** tracking mentions across the web

**What to replicate for Kotor:**
The keyword cannibalization detection is critical for a directory site. With hundreds of listing pages and category pages, you likely have situations where `/listing-category/restaurants/` and `/listing/best-restaurant-kotor/` both target "restaurants kotor." SEMrush flags these automatically.

### SE Ranking
**Standout features:**
- **100% accurate rank tracking** with frequency options (daily, every 3 days, weekly)
- **Rank tracking by location** — down to city/zip code level
- **Mobile vs Desktop split** for every keyword
- **SERP feature tracking** with visual icons
- **Competitor comparison** on same graph
- **Marketing plan** feature generating a step-by-step SEO task list
- **Auto-generated reports** with scheduled email delivery
- **White-label** capabilities
- **Local Marketing** module for GMB management

**What to replicate for Kotor:**
The location-specific rank tracking is essential. Rankings for "restaurants kotor" differ based on whether the searcher is in Kotor, Podgorica, or Belgrade. SE Ranking lets you set the exact location for tracking.

### AgencyAnalytics
**Standout features:**
- **80+ integration sources** (GSC, GA4, social, ads, reviews, etc.) all in one dashboard
- **Drag-and-drop dashboard builder** — arrange widgets however you want
- **Custom metrics** — combine data from different sources into calculated fields
- **Automated reports** with scheduling and white-labeling
- **Goal tracking** with visual progress indicators
- **Client-facing dashboards** with custom branding
- **SEO Auditor** built-in with site health score
- **Rank Tracker** with local pack tracking
- **Annotations** — mark timeline events ("launched new page", "updated content")

**What to replicate for Kotor:**
The annotations feature is a game-changer. When you publish 10 new listings or update all category descriptions, you should be able to mark that date on your trend charts so you can visually correlate actions with ranking changes.

### DashThis
**Standout features:**
- **Pre-built SEO dashboard templates** that look professional out of the box
- **Automatic data refresh** at configurable intervals
- **Custom widget types** — KPI, trend, table, pie, bar, funnel, gauge
- **Period comparison** — this month vs last month, this quarter vs last quarter
- **Percentage change indicators** on every KPI (green up arrow / red down arrow)
- **Notes/comments** on individual widgets
- **PDF export** that looks publication-ready

**What to replicate for Kotor:**
The period-over-period comparison on KPI cards. Your current cards show absolute numbers but don't show "vs last period." Adding "+12.5% vs last 28d" in green or "-3.2% vs last 28d" in red to each KPI card immediately makes the dashboard more informative.

### Databox
**Standout features:**
- **DataWalls** — TV-mode dashboards for wall displays
- **Goals** with progress tracking (e.g., "reach 1000 monthly clicks by June")
- **Alerts** when metrics cross thresholds ("position dropped below 10 for keyword X")
- **Scorecards** — daily/weekly summary emails with key metric changes
- **Benchmarking** — compare your metrics against industry averages
- **Forecast** lines on charts showing projected trends
- **Query builder** for complex metric combinations

**What to replicate for Kotor:**
Goals and alerts. Set goals like "500 monthly clicks by Q3" or "Average position under 15 for all cluster keywords" and display progress visually. Alerts when important keywords drop.

### Google Looker Studio SEO Templates
**Standout features:**
- **Free** and widely used in the industry
- **Direct GSC/GA4 connectors** — always up to date
- **Blended data sources** — join GSC keyword data with GA4 landing page data
- **Custom calculated fields** with CASE statements
- **Filter controls** that affect all charts simultaneously
- **Date range comparison** built-in
- **Community templates** showing best-practice layouts
- **Embedding** in websites or portals

**What to replicate for Kotor:**
The blended data concept. Your dashboard should join GSC keyword data (which keyword got clicks) with page-level data (which page those clicks went to) and then correlate with your cluster/listing metadata. You're already doing some of this.

### Rank Ranger
**Standout features:**
- **Visibility score** — a single number representing your overall organic visibility (weighted by search volume and position)
- **SERP feature monitoring** — tracks which SERP features appear for each keyword and whether you own them
- **Share of Voice** with market share percentage
- **Keyword tagging** — group keywords by custom tags, view performance by tag
- **Marketing dashboard** combining SEO + PPC + social data
- **Competitor discovery** — automatically finds sites competing for your keywords
- **Rank distribution graph** showing how many keywords are in each position range over time

**What to replicate for Kotor:**
The visibility score is probably the single most important metric you're missing. It condenses all your ranking data into one number that trends over time. Formula: for each keyword, multiply the estimated CTR at your position by the keyword's search volume, then sum across all keywords. This gives you an "estimated organic traffic potential" score.

### AccuRanker
**Standout features:**
- **On-demand rank updates** — refresh rankings instantly, not just daily
- **SERP history** for each keyword — see exactly how the SERP changed over time
- **Dynamic tagging** — auto-tag keywords based on rules (position range, URL, etc.)
- **Landing page analysis** — which URL ranks for each keyword and when it changed
- **Share of Voice** with competitor comparison
- **Integration with GA/GSC** to overlay actual traffic onto rank data
- **API-first design** — easy to build custom dashboards on top

**What to replicate for Kotor:**
The landing page change detection. This flags when Google starts ranking a different URL for one of your keywords. For a directory, this could mean Google switched from ranking your category page to a listing page (or vice versa), which signals a cannibalization issue.

### Nightwatch.io
**Standout features:**
- **Segmented rank tracking** — track the same keyword from different locations simultaneously
- **SERP feature opportunity detection** — identifies which keywords have featured snippets you could potentially win
- **Custom graphs** with any metric combination
- **Site audit** with issue tracking over time
- **Keyword discovery** — suggests new keywords based on your existing rankings
- **URL-level keyword grouping** — see all keywords a single URL ranks for
- **Backlink monitoring** with new/lost link alerts

**What to replicate for Kotor:**
SERP feature opportunity detection. For a local directory, featured snippets and "People Also Ask" boxes are high-value targets. If your keyword "things to do in kotor" has a featured snippet, you should know about it and whether you can win it.

### Wincher
**Standout features:**
- **Clean, minimalist UI** — proves you don't need complexity to be effective
- **Daily rank tracking** at affordable pricing
- **Keyword suggestions** based on your GSC data
- **Competitor tracking** overlaid on your keyword charts
- **Position change notifications** via email
- **Page grouping** — group pages and see aggregate metrics

**What to replicate for Kotor:**
The clean UI philosophy. Your current dashboard already follows this — dark theme, clear hierarchy, focused metrics. Keep this. The temptation with adding features is to clutter. Wincher proves restraint works.

---

## 3. MUST-HAVE DASHBOARD FEATURES

### 3.1 Rank Tracking with Historical Comparison

**Why it matters:** Without historical data, you can't measure progress. A keyword at position 12 means nothing unless you know it was at position 30 last month.

**Kotor application:** Track whether your "restaurants in kotor" cluster is improving week over week. Show the trajectory, not just the snapshot.

**Implementation complexity:** MEDIUM — You already have GSC keyword history API. Need to store historical snapshots in a database/blob storage and compute period-over-period deltas.

**Data source:** Google Search Console API (you already use this) + local storage of daily snapshots.

**What to build:**
- Period comparison on every metric (28d vs previous 28d)
- Sparklines showing 30-day trend on KPI cards
- Position change arrows with magnitude on keyword table (not just movers section)
- Historical position chart with competitor overlay

---

### 3.2 Competitor Tracking & Gap Analysis

**Why it matters:** SEO is relative. Your position only matters in context of who you're competing against for the same searches.

**Kotor application:** Your main competitors are likely TripAdvisor Kotor, Booking.com Kotor pages, kotor.travel, Visit Montenegro sites, and perhaps local Montenegrin directories. Understanding what keywords they rank for that you don't reveals your biggest growth opportunities.

**Implementation complexity:** HARD — Requires DataForSEO or similar API for competitor keyword data, which you already have partially integrated.

**Data source:** DataForSEO Competitors API (already integrated), plus DataForSEO Domain Analytics.

**What to build:**
- Competitor overview panel showing top 5-10 competing domains
- Keyword overlap Venn diagram (you + up to 3 competitors)
- "Keyword gap" table: keywords competitors rank for that you don't
- Competitor visibility score comparison over time
- New competitor detection alerts

---

### 3.3 Content Gap Analysis

**Why it matters:** Identifies topics/keywords your competitors cover that you don't have content for yet. This directly feeds your content strategy.

**Kotor application:** If TripAdvisor ranks for "best beaches near kotor" but you have no beach-related listing category, that's a content gap. If competitors rank for "kotor old town restaurants" but your restaurant listings don't mention "old town," that's an on-page gap.

**Implementation complexity:** MEDIUM — Use DataForSEO to pull competitor keywords, diff against yours.

**Data source:** DataForSEO Domain Keywords + your own GSC data.

**What to build:**
- Content gap report showing competitor keywords you don't rank for
- Grouped by topic/cluster potential
- Estimated search volume and difficulty for each gap keyword
- "Quick wins" filter — gaps where difficulty is low and intent matches your site

---

### 3.4 Keyword Cannibalization Detection

**Why it matters:** When multiple pages on your site compete for the same keyword, Google may not know which to rank, resulting in lower positions for both. This is extremely common on directory sites.

**Kotor application:** Your `/listing-category/restaurants/` page and individual restaurant listings like `/listing/restaurant-name/` may both try to rank for "restaurants kotor." If Google alternates which page it ranks, neither will reach its potential.

**Implementation complexity:** MEDIUM — Query GSC API for each keyword to see which URLs rank, flag keywords with 2+ URLs.

**Data source:** GSC API (query by keyword, get all ranking URLs).

**What to build:**
- Cannibalization report showing keywords where 2+ of your URLs rank
- Impact score based on how close the competing pages are in position
- Recommended "canonical" page for each keyword
- Historical tracking of URL changes per keyword (which URL ranks changes over time)

---

### 3.5 Internal Link Analysis

**Why it matters:** Internal links distribute page authority and help Google understand your site structure. For a directory site, internal linking between categories and listings is the backbone of your SEO architecture.

**Kotor application:** Your cluster system already tracks whether listings have backlinks from category pages. This should be expanded to show the full internal link graph — which pages link to what, orphan pages, link equity flow.

**Implementation complexity:** HARD — Requires crawling your own site to map all internal links.

**Data source:** Custom site crawler (Screaming Frog export, or build a lightweight crawler using your Next.js API routes).

**What to build:**
- Internal link count per page (inbound and outbound)
- Orphan page detection (pages with zero internal links)
- Link equity distribution visualization (which pages have the most internal link juice)
- Category-to-listing link completeness matrix
- Suggested internal links based on keyword relevance

---

### 3.6 Page-Level Keyword Mapping

**Why it matters:** Every page should have a clear "target keyword" and you should know if that page is actually ranking for it. This prevents overlap and ensures coverage.

**Kotor application:** Each listing page should target its business name + type + location. Each category page should target the category + location. The keyword map ensures 1:1 mapping between pages and target keywords.

**Implementation complexity:** EASY — You already have page-keyword data from GSC. Need a UI to assign "target keyword" per page and compare with actual ranking keyword.

**Data source:** GSC page-keywords API (already built) + manual target keyword assignment.

**What to build:**
- Keyword mapping table: Page | Target Keyword | Actual Top Keyword | Position | Match Status
- Mismatch alerts when a page's top keyword doesn't match its target
- Coverage report — how many pages have assigned targets vs not

---

### 3.7 Share of Voice (SOV)

**Why it matters:** SOV measures what percentage of all available search traffic in your niche you're capturing. It's the best single metric for overall SEO success. Ahrefs, Rank Ranger, and AccuRanker all emphasize this.

**Kotor application:** For a local directory, SOV answers: "Of all the people searching for Kotor-related business/tourism queries, what percentage ends up on kotordirectory.com?" Track this by category to see where you dominate and where you're weak.

**Implementation complexity:** MEDIUM — Requires search volume data (DataForSEO) and position-based CTR curves.

**Data source:** DataForSEO Keyword Data (search volume) + GSC positions + standard CTR curve model.

**Formula:**
```
SOV = SUM( keyword_search_volume * estimated_CTR_at_your_position )
      / SUM( keyword_search_volume * CTR_at_position_1 )
```

**What to build:**
- Overall SOV score displayed prominently on Overview page
- SOV by cluster/category
- SOV trend over time
- SOV vs top 3 competitors
- SOV breakdown by brand vs non-brand keywords

---

### 3.8 Visibility Score / Index

**Why it matters:** Like SOV but simpler — a single score representing your overall ranking strength. Sistrix's visibility index is the gold standard.

**Kotor application:** Reduces all your SEO data to one number you can track weekly. "Our visibility is 42, up from 38 last month." Makes reporting to stakeholders trivial.

**Implementation complexity:** EASY — Pure calculation from existing data.

**Data source:** GSC positions + search volume estimates.

**Formula:**
```
Visibility = SUM( search_volume * position_weight )
where position_weight = {1: 1.0, 2: 0.8, 3: 0.6, 4: 0.4, 5: 0.3, 6-10: 0.15, 11-20: 0.05, 21+: 0.01}
```

**What to build:**
- Visibility score KPI card on Overview
- Visibility trend chart (this is often the "hero chart" on professional dashboards)
- Visibility by cluster/category
- Competitor visibility comparison

---

### 3.9 Estimated Traffic Value

**Why it matters:** Translates your organic rankings into a dollar/euro value. If you rank #1 for "restaurants kotor" and that keyword has X monthly searches, you can estimate the traffic value based on what that click would cost in Google Ads.

**Kotor application:** Demonstrates the monetary value of your SEO work. "Our organic rankings are worth EUR 2,400/month in equivalent ad spend."

**Implementation complexity:** MEDIUM — Requires CPC data from DataForSEO.

**Data source:** DataForSEO Keyword Data (CPC values).

**Formula:**
```
Traffic Value = SUM( estimated_monthly_clicks * keyword_CPC )
estimated_monthly_clicks = search_volume * CTR_at_position
```

**What to build:**
- Traffic value KPI card
- Traffic value trend
- Traffic value by cluster (which clusters generate the most "value"?)
- Traffic value of keywords you could gain (content gap value)

---

### 3.10 Keyword Difficulty Scoring

**Why it matters:** Not all keywords are equally easy to rank for. KD helps prioritize which keywords to target based on competitive landscape.

**Kotor application:** "Hotels in kotor" (very competitive, big players) vs "pottery workshop kotor" (low competition, niche). Your strategy should prioritize low-KD keywords where you can win quickly while building authority for harder ones.

**Implementation complexity:** EASY — DataForSEO provides KD scores.

**Data source:** DataForSEO Keyword Data.

**What to build:**
- KD column in keyword table with color-coded difficulty (green=easy, yellow=medium, red=hard)
- KD vs current position scatter plot (find keywords where you rank well despite high KD = strong pages, and where you rank poorly on easy KD = quick wins)
- Quick win filter: KD < 30 + position 5-20 + search volume > 100

---

### 3.11 SERP Feature Opportunities

**Why it matters:** Beyond standard blue links, Google shows featured snippets, People Also Ask, local packs, image carousels, videos, etc. Winning these features dramatically increases visibility and clicks.

**Kotor application:** Local pack results are critical for a directory site. Featured snippets for "things to do in kotor" or "best restaurants kotor" can drive massive traffic. PAA boxes let you appear even if your organic position is lower.

**Implementation complexity:** MEDIUM — DataForSEO SERP API provides feature data.

**Data source:** DataForSEO SERP API (already partially integrated).

**What to build:**
- SERP feature column on keyword table (icons showing which features exist for each keyword)
- "Feature ownership" indicator — do YOU currently hold the featured snippet/local pack?
- Feature opportunity report: keywords with features you don't own yet, sorted by impact potential
- Featured snippet content suggestions

---

### 3.12 Core Web Vitals Monitoring

**Why it matters:** CWV are a Google ranking factor. Poor performance = lower rankings. Especially important for directory sites which often have many pages with similar templates.

**Kotor application:** Monitor your listing page template performance. If all 200 listing pages share the same template and CWV degrades, it affects everything at once.

**Implementation complexity:** EASY — Google PageSpeed Insights API is free.

**Data source:** Google PageSpeed Insights API (CrUX data) / Chrome UX Report API.

**What to build:**
- CWV scores for key page templates (homepage, category page, listing page)
- LCP, FID/INP, CLS with pass/fail indicators
- Historical CWV trend
- Mobile vs desktop CWV comparison
- Alert when any CWV metric fails threshold

---

### 3.13 Crawl Error & Index Coverage Monitoring

**Why it matters:** If Google can't crawl or index your pages, they can't rank. Directory sites with hundreds of pages often have crawl budget issues.

**Kotor application:** Monitor that all your listing and category pages are being indexed. Catch 404 errors from deleted listings. Detect noindex tags accidentally applied.

**Implementation complexity:** MEDIUM — GSC API provides indexing data but requires separate API calls.

**Data source:** Google Search Console URL Inspection API + GSC Index Coverage report.

**What to build:**
- Index coverage summary: indexed, excluded, errors counts
- Crawl error list with affected URLs
- New page indexation tracker (submitted URL -> indexed timeline)
- Index coverage trend over time

---

### 3.14 Backlink Monitoring

**Why it matters:** Backlinks remain one of Google's top ranking factors. Knowing when you gain or lose links helps you understand ranking changes.

**Kotor application:** Track backlinks to your directory from tourism sites, travel blogs, government tourism pages, and other directories. New backlinks from .gov.me or tourism authority sites would be particularly valuable.

**Implementation complexity:** HARD — Requires Ahrefs/DataForSEO backlink API, which can be expensive.

**Data source:** DataForSEO Backlinks API or Ahrefs API.

**What to build:**
- Total backlinks and referring domains KPI
- New/lost backlinks feed (timeline)
- Top referring domains list
- Backlink quality distribution (dofollow vs nofollow, domain authority distribution)
- Anchor text analysis

---

### 3.15 Brand vs Non-Brand Keyword Split

**Why it matters:** Brand searches ("kotor directory") vs non-brand ("restaurants in kotor") tell very different stories. Brand growth = awareness. Non-brand growth = SEO effectiveness.

**Kotor application:** If 80% of your traffic is brand searches, your SEO hasn't scaled yet. The goal is growing non-brand traffic — people who discover your directory through generic searches like "what to do in kotor."

**Implementation complexity:** EASY — Pure filtering logic on existing GSC keyword data.

**Data source:** GSC keyword data (already have).

**What to build:**
- Brand vs non-brand traffic split pie chart
- Trend chart showing brand vs non-brand over time
- Separate KPIs for brand and non-brand
- Non-brand keyword growth as a primary success metric

**Auto-detection logic:**
```javascript
const BRAND_TERMS = ['kotor directory', 'kotordirectory', 'kotor dir'];
const isBrand = (keyword) => BRAND_TERMS.some(t => keyword.toLowerCase().includes(t));
```

---

### 3.16 Mobile vs Desktop Performance Split

**Why it matters:** Google uses mobile-first indexing. If your mobile performance differs significantly from desktop, you need to know.

**Kotor application:** Tourists searching on mobile phones in Kotor are your primary audience. Mobile rankings and CTR may differ from desktop.

**Implementation complexity:** EASY — GSC API supports device dimension filtering.

**Data source:** GSC API with `device` dimension.

**What to build:**
- Mobile vs desktop KPI comparison cards
- Device split trend over time
- Keywords where mobile position differs significantly from desktop
- Mobile usability issues from GSC

---

### 3.17 Geographic Performance Split

**Why it matters:** Rankings vary by country and city. A query searched from Montenegro may show different results than the same query from Germany.

**Kotor application:** Your traffic likely comes from multiple countries — locals in Montenegro, tourists from Western Europe, cruise ship passengers from the US. Understanding geographic performance helps you optimize for the right markets.

**Implementation complexity:** EASY — GSC API supports country dimension.

**Data source:** GSC API with `country` dimension.

**What to build:**
- Traffic by country (top 10 countries with clicks/impressions)
- Position by country for key keywords
- Country trend over time (is traffic from Germany growing?)
- Language opportunity detection (are you missing content in German/Italian/French?)

---

### 3.18 Content Freshness Scoring

**Why it matters:** Google favors fresh content, especially for local/travel queries. Outdated content loses rankings over time.

**Kotor application:** Listing descriptions that haven't been updated in a year, category pages with stale content, seasonal information that's outdated.

**Implementation complexity:** EASY — Track last-modified dates for your content.

**Data source:** Your CMS/database for content update dates.

**What to build:**
- Content freshness score per page (days since last update)
- Color-coded freshness: green (<30 days), yellow (30-90 days), red (>90 days)
- "Needs refresh" queue sorted by traffic impact
- Freshness impact analysis (correlation between update date and ranking changes)

---

### 3.19 Topical Authority Mapping

**Why it matters:** Google rewards sites that demonstrate deep expertise in a topic. A directory covering "restaurants in kotor" with 50 detailed restaurant listings has more topical authority than one with 3.

**Kotor application:** Visualize which topics you've thoroughly covered (many listings + category page + good rankings) vs where you're thin.

**Implementation complexity:** MEDIUM — Requires topic clustering and coverage analysis.

**Data source:** Your cluster data (already have) + GSC keyword data.

**What to build:**
- Topic authority matrix: topic vs depth score
- Cluster completeness indicators (listings count, content quality, ranking performance)
- Topic coverage gaps ("you have 50 restaurant listings but only 2 tour operator listings")
- Authority growth trend per topic

---

## 4. REPORTING FEATURES

### 4.1 PDF Export

**Why it matters:** Stakeholders want downloadable reports they can review offline, share in meetings, or file.

**Implementation complexity:** MEDIUM — Use a library like `@react-pdf/renderer` or `html2canvas` + `jspdf`.

**What to build:**
- One-click "Export Report" button on each page
- Configurable report (select which sections to include)
- Professional layout with header, date range, logo
- Charts rendered as images in the PDF

**Libraries:** `jspdf` + `html2canvas` for quick implementation, or `@react-pdf/renderer` for more control.

---

### 4.2 Automated Weekly/Monthly Email Reports

**Why it matters:** Regular reporting keeps stakeholders informed without them having to visit the dashboard.

**Implementation complexity:** MEDIUM — Next.js API route + email service (Resend/SendGrid) + cron job (Vercel cron or external).

**What to build:**
- Weekly summary email with key metrics + period-over-period change
- Monthly deep-dive email with charts
- Configurable recipients and frequency
- Inline metrics (not just a link to the dashboard)

---

### 4.3 Custom Date Range Comparisons

**Why it matters:** "How did we do this month vs last month?" or "How does Q1 compare to Q4?" are fundamental questions.

**Implementation complexity:** EASY — You already have a DateRangeFilter component. Extend it with comparison.

**What to build:**
- "Compare to" toggle on date range selector
- Previous period auto-calculation (if viewing Jan 1-31, compare period = Dec 1-31)
- Custom comparison period selection
- Delta indicators on all metrics when comparison is active

---

### 4.4 Annotations / Event Markers

**Why it matters:** Correlating actions with outcomes is the core of SEO strategy. When you see a ranking jump, you need to know "we published 20 new listings that week" to understand causation.

**Implementation complexity:** EASY — Store annotations in a JSON file or database, render as vertical lines/markers on timeline charts.

**What to build:**
- "Add annotation" button on any chart with a date axis
- Annotation types: content published, technical change, backlink acquired, algorithm update, competitor action
- Visual markers on timeline charts (vertical dotted lines with labels)
- Annotation log/history page

**Data model:**
```javascript
{
  id: 'ann_001',
  date: '2026-03-15',
  type: 'content',
  title: 'Published 15 new restaurant listings',
  description: 'Added listings for Old Town restaurants with full descriptions',
  color: '#22c55e'
}
```

---

### 4.5 Goal Tracking & KPI Targets

**Why it matters:** Without goals, metrics are just numbers. Goals create accountability and direction.

**Implementation complexity:** EASY — Store goals, compute progress, render progress bars.

**What to build:**
- Goal configuration: metric, target value, deadline
- Visual progress bars on Overview page
- Goal status: on track (green), at risk (amber), off track (red)
- Projected completion date based on current trajectory

**Example goals for Kotor:**
- "Reach 1,000 monthly organic clicks by June 2026"
- "Get 50 keywords in Top 10 by August 2026"
- "Achieve 80% category page content coverage by May 2026"
- "Visibility score of 100 by Q4 2026"

---

### 4.6 Traffic Forecasting

**Why it matters:** Predicting future traffic based on current trends helps set realistic expectations and justify SEO investment.

**Implementation complexity:** MEDIUM — Requires trend analysis and basic time-series forecasting.

**What to build:**
- Dotted "forecast" line extending trend charts 30-90 days into the future
- Simple linear regression or exponential smoothing
- Confidence interval bands (optimistic/pessimistic)
- "If current trend continues" projections

---

### 4.7 ROI Calculations

**Why it matters:** Ties SEO effort to business value. Essential for justifying continued investment.

**Implementation complexity:** EASY (if you have traffic value already) — Just needs a cost input.

**What to build:**
- Monthly SEO cost input (manual entry: hosting, tools, time investment)
- ROI = (Traffic Value - SEO Cost) / SEO Cost
- ROI trend over time
- Break-even analysis
- Per-cluster ROI (which content investments paid off most?)

---

## 5. STRATEGY & RECOMMENDATION ENGINES

### How the Best Tools Generate Recommendations

**Ahrefs approach:**
- Data-driven alerts based on specific thresholds
- Opportunities scored by traffic potential
- Recommendations tied to specific pages and keywords
- Action items are specific: "Add X to Y" not "improve your content"

**SEMrush On Page SEO Checker approach:**
- Analyzes top 10 results for each keyword
- Compares your page against what top-ranking pages have
- Specific recommendations: "Top-ranking pages have average word count of 2,400 words. Your page has 800 words."
- Grouped by priority: high/medium/low impact
- Each recommendation includes estimated traffic impact

**SE Ranking Marketing Plan approach:**
- Step-by-step task checklist
- Tasks organized by SEO phase (technical, on-page, content, off-page)
- Auto-populates tasks based on site audit findings
- Progress tracking per task

### What Makes Recommendations Actionable vs Generic

**GOOD (Actionable):**
- "Add internal links from /listing-category/restaurants/ to your top 5 restaurant listings. Currently 0 of 12 restaurant listings are linked from the category page."
- "Your page for 'boat tours kotor' ranks #8 but has only 200 words. The #1 result has 1,500 words with an FAQ section. Add an FAQ with 5-8 common questions about Kotor boat tours."
- "You rank #4 for 'kotor restaurants' but your CTR is 3.1%. The expected CTR at position 4 is 8-12%. Rewrite your meta title to include 'Best Kotor Restaurants 2026 | Local Guide'."

**BAD (Generic):**
- "Improve your content quality"
- "Build more backlinks"
- "Optimize for mobile"

### Rules for Generating Good Recommendations

Your current `strategy.js` has 8 recommendation types. Here are additional rules to implement:

**NEW RECOMMENDATION TYPES TO ADD:**

1. **Keyword Cannibalization Fix**
   - Rule: If 2+ URLs rank for the same keyword with positions within 10 of each other
   - Action: Recommend consolidating content or adding canonical signals
   - Priority: HIGH (cannibalization actively hurts rankings)

2. **SERP Feature Opportunity**
   - Rule: If a keyword has a featured snippet and you rank in top 10 but don't hold it
   - Action: Recommend restructuring content for featured snippet (lists, tables, direct answers)
   - Priority: HIGH (featured snippets get 35%+ CTR)

3. **Content Length Optimization**
   - Rule: If your page content is significantly shorter than top-ranking competitors
   - Action: Recommend expanding content to match or exceed competitor average
   - Priority: MEDIUM

4. **Schema Markup Opportunity**
   - Rule: If page type supports structured data but doesn't have it
   - Action: Recommend adding LocalBusiness, FAQ, Breadcrumb, or Review schema
   - Priority: MEDIUM (can win rich results)

5. **Page Speed Optimization**
   - Rule: If CWV scores fail thresholds
   - Action: Specific recommendations based on which metric fails (image optimization for LCP, code splitting for INP, layout fixes for CLS)
   - Priority: HIGH (affects all pages on that template)

6. **Seasonal Content Opportunity**
   - Rule: Based on month, suggest seasonal content updates
   - Action: "Summer is approaching — update beach and outdoor activity listings with seasonal hours and availability"
   - Priority: MEDIUM (time-sensitive)

7. **Link Equity Redistribution**
   - Rule: If high-authority pages aren't linking to important but low-ranking pages
   - Action: "Your homepage has the highest authority. Add internal links from homepage to your top 5 category pages."
   - Priority: MEDIUM

8. **Index Coverage Fix**
   - Rule: If important pages are not indexed
   - Action: "These 5 listing pages are not indexed. Submit them via GSC and add internal links."
   - Priority: HIGH (can't rank if not indexed)

### Recommendation Prioritization Framework

```
Priority Score = (Traffic Impact * 0.4) + (Ease of Implementation * 0.3) + (Time Sensitivity * 0.3)

Traffic Impact (0-100):
- Based on search volume and current position potential
- Higher for keywords with more impressions
- Higher for pages that are already close to page 1

Ease of Implementation (0-100):
- On-page text changes = 90 (easy)
- Internal link additions = 80
- New content creation = 50
- Technical fixes = 40
- Backlink acquisition = 20 (hard, external dependency)

Time Sensitivity (0-100):
- Declining positions = 90 (urgent)
- Seasonal opportunity = 80 (time-limited)
- New competitor threat = 70
- Growth opportunity = 40 (evergreen)
- Maintenance task = 20
```

### Examples of Good SEO Recommendations for a Local Directory Site

1. **"Create a 'Best of Kotor' hub page targeting 'best things to do in kotor' (position 15, 1,200 monthly searches, KD 22)"**
   - Why: High search volume, achievable difficulty, no current dedicated page
   - Action: Create `/best-things-to-do-in-kotor/` with curated links to top listings across categories
   - Expected impact: +200 monthly visits

2. **"Add FAQ schema to all category pages — 0 of 35 categories have FAQ structured data"**
   - Why: FAQ schema can win PAA boxes and rich results
   - Action: Add 3-5 FAQs to each category page with LocalBusiness-relevant questions
   - Expected impact: 15-30% CTR increase on category pages

3. **"Strengthen 'boat tours' cluster — 3 listings but only 1 has a backlink from the category page"**
   - Why: Incomplete internal linking weakens the cluster
   - Action: Add featured links to all 3 boat tour listings from the category page
   - Expected impact: +2-5 positions for 'boat tours kotor'

4. **"Translate top 5 category pages to German — 23% of your impressions come from Germany/Austria"**
   - Why: Geographic data shows significant German-language market untapped
   - Action: Create /de/ versions of restaurants, tours, accommodation, activities, nightlife categories
   - Expected impact: Capture German-language tourism searches

---

## 6. LOCAL SEO SPECIFIC FEATURES

### 6.1 Local Pack Tracking

**Why it matters:** The Google "3-pack" (map results) appears for most local searches and gets 42% of clicks. For a directory site, appearing in the local pack is critical.

**Kotor application:** Track whether kotordirectory.com appears in local pack results for queries like "restaurants kotor," "tours kotor," etc.

**Implementation complexity:** MEDIUM — DataForSEO SERP API can detect local pack results.

**Data source:** DataForSEO SERP API.

**What to build:**
- Local pack presence indicator per keyword
- Local pack vs organic position comparison
- Local pack competitor tracking (who appears in the 3-pack for each query)

---

### 6.2 Google Business Profile Metrics

**Why it matters:** GBP is central to local SEO. If kotordirectory.com has a GBP listing, its performance data should be in the dashboard.

**Kotor application:** Track GBP views, clicks, directions requests, phone calls.

**Implementation complexity:** MEDIUM — Google Business Profile API.

**Data source:** Google Business Profile API (requires GBP ownership).

**What to build:**
- GBP metrics cards (views, searches, actions)
- GBP photo views and customer photo count
- GBP post performance
- GBP review sentiment summary

---

### 6.3 Citation Consistency / NAP Monitoring

**Why it matters:** NAP (Name, Address, Phone) consistency across the web is a local ranking factor. Inconsistent business info confuses Google.

**Kotor application:** If kotordirectory.com is listed on Google Maps, Yelp, TripAdvisor, etc., the business name, address, and phone should be identical everywhere.

**Implementation complexity:** HARD — Requires checking multiple citation sources.

**Data source:** Manual audit or BrightLocal/Whitespark API.

**What to build:**
- Citation source list with consistency status
- Mismatch alerts showing which fields differ where
- Citation completeness score

---

### 6.4 Review Monitoring

**Why it matters:** Reviews impact local rankings and click-through rates. A directory site should monitor reviews of the businesses it lists.

**Kotor application:** Track Google reviews for listed businesses. Businesses with poor reviews may hurt your directory's reputation.

**Implementation complexity:** HARD — Google Places API for review data.

**Data source:** Google Places API.

**What to build:**
- Average review score across all listed businesses
- Review count trend
- Businesses with declining reviews (alert)
- Review response rate tracking

---

### 6.5 Local Keyword Tracking (City + Service)

**Why it matters:** Local searches follow a pattern: [service] + [location]. You need to track all permutations.

**Kotor application:** Track matrix of keywords: {restaurants, hotels, tours, activities, ...} x {kotor, old town kotor, dobrota, perast, risan, ...}

**Implementation complexity:** EASY — Extend existing keyword tracking with location tags.

**Data source:** GSC data (already have) + manual keyword tagging.

**What to build:**
- Keyword matrix: service categories as rows, location modifiers as columns
- Position/traffic heatmap for the matrix
- Location modifier performance comparison (which location terms drive most traffic)
- Nearby city tracking (Perast, Tivat, Herceg Novi — "near Kotor" queries)

---

### 6.6 Proximity-Based Rank Checking

**Why it matters:** Google local results vary based on the searcher's physical location. Someone in Kotor Old Town may see different results than someone in Dobrota.

**Kotor application:** Check how your rankings differ when searched from Kotor center vs Tivat vs Podgorica vs international locations.

**Implementation complexity:** HARD — Requires rank checking from multiple geolocations.

**Data source:** DataForSEO SERP API with location parameters, or BrightLocal Local Search Grid.

**What to build:**
- Rank grid showing position from different locations
- Heatmap visualization of ranking strength by geography
- Key location performance comparison

---

## 7. VISUALIZATION BEST PRACTICES

### 7.1 Chart Type Recommendations by Metric

| Metric | Best Chart Type | Why |
|--------|----------------|-----|
| Position over time | Line chart (Y-axis reversed) | Shows trajectory clearly; reversed axis because lower = better |
| Click/impression trends | Area chart with gradient fill | Shows volume with visual weight; you already do this well |
| Position distribution | Donut/pie chart | Shows proportions at a glance; you already have this |
| Keyword status breakdown | Horizontal bar chart | Easy to read labels; you already have this |
| Cluster health | Bar chart with color coding | Comparative across clusters; you already have this |
| Visibility score trend | Large area chart (hero position) | This should be the most prominent chart on Overview |
| Brand vs non-brand | Stacked area chart | Shows both the split and the total simultaneously |
| Competitor comparison | Multi-line chart with different colors | Direct comparison over time |
| SOV by category | Stacked bar chart or treemap | Shows relative market share per category |
| CWV scores | Gauge/speedometer widgets | Intuitive pass/fail visualization |
| Content freshness | Calendar heatmap (like GitHub contribution graph) | Shows update patterns at a glance |
| Keyword/page matrix | Heatmap with color intensity | Shows density of coverage across two dimensions |
| Internal link flow | Sankey diagram | Shows how link equity flows through the site |
| Site structure | Treemap | Shows content distribution by section size |
| Goal progress | Progress bar with percentage | Simple, clear, motivating |
| Top movers | Sorted horizontal lollipop chart | Better than bar chart for showing magnitude + direction |
| Traffic by country | Choropleth map or horizontal bars | Geographic distribution |

### 7.2 Color Coding Conventions

Follow established SEO conventions:

```
Position ranges:
  #1-3:   Green (#22c55e)    — "Winning"
  #4-10:  Blue (#3b82f6)     — "Competitive"
  #11-20: Amber (#f59e0b)    — "Striking distance"
  #21-50: Orange (#f97316)   — "Opportunity"
  #51+:   Red/Gray (#ef4444) — "Future/Not ranking"

Changes:
  Improvement: Green with up arrow
  Decline:     Red with down arrow
  Stable:      Gray with dash

Health/Status:
  Good/Pass:   Green
  Warning:     Amber/Yellow
  Error/Fail:  Red
  Info/Neutral: Blue

SERP Features:
  Featured Snippet: Gold/star icon
  Local Pack:       Map pin icon (blue)
  PAA:              Question mark icon (purple)
  Images:           Image icon (green)
  Video:            Play icon (red)
  Sitelinks:        Link icon (blue)
```

### 7.3 How to Show Position Changes Effectively

**Current approach (yours):** Shows movers in a card with old -> new position and +/- delta. This is good but can be enhanced.

**Best practices from top tools:**

1. **Inline position badges in keyword tables:**
   ```
   "restaurants kotor"  Pos 5  ↑3  (was 8)
   ```
   Use a small green/red badge right next to the position number.

2. **Position change column with visual magnitude:**
   - Small arrow + number for minor changes (1-2 positions)
   - Medium arrow for moderate changes (3-5 positions)
   - Large arrow + bold for big changes (5+ positions)

3. **Position trend sparklines:**
   Tiny inline charts (30px high) in the keyword table showing 28-day position trend. AccuRanker does this.

4. **Position distribution over time (stacked area):**
   Shows how your keyword distribution shifts. More keywords moving from "20+" into "Top 10" is visible as the green area growing.

### 7.4 Heatmaps for Keyword/Page Matrix

**Use case:** Show which pages rank for which keywords, with color intensity showing position.

**Layout:**
- Rows: Your top pages (category pages, listing pages)
- Columns: Your target keywords
- Cell color: Dark green (#1) -> Light green (#3) -> Yellow (#10) -> Orange (#20) -> Red (#50) -> Gray (not ranking)

**Implementation:** Use a custom table component with conditional background colors. Libraries like `nivo` or custom CSS.

### 7.5 Sankey Diagrams for User/Link Flow

**Use case:** Visualize how internal links flow from homepage -> category pages -> listing pages.

**Layout:**
- Left: Entry pages (homepage, top landing pages)
- Middle: Category pages
- Right: Listing pages
- Band width: Number of internal links or link equity estimate

**Library:** `recharts` doesn't support Sankey. Use `nivo` (@nivo/sankey) or `d3-sankey`.

### 7.6 Treemaps for Content Structure

**Use case:** Visualize your entire site content, sized by impressions or clicks. Immediately shows which sections are performing well.

**Layout:**
- Large rectangles: Categories (sized by total category traffic)
- Small rectangles within: Individual pages
- Color: Based on performance trend (improving = green, declining = red)

**Library:** Recharts has `<Treemap>` component. Alternatively, use `nivo` (@nivo/treemap).

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 weeks) — EASY complexity

These enhance your existing dashboard significantly with minimal new data requirements:

1. **Period-over-period comparison on KPI cards** — Add "+12% vs last period" to each card
2. **Brand vs non-brand split** — Simple keyword filtering logic
3. **Visibility score** — Calculated metric from existing data
4. **Mobile vs desktop split** — One extra GSC API parameter
5. **Geographic traffic breakdown** — One extra GSC API parameter
6. **Annotations system** — JSON storage + chart overlay markers
7. **Goal tracking** — Configuration UI + progress bars
8. **Content freshness scoring** — Track update dates
9. **Page-level keyword mapping UI** — Target keyword assignment
10. **Keyword difficulty display** — Add KD from DataForSEO to keyword table

### Phase 2: Medium Effort (2-4 weeks) — MEDIUM complexity

11. **Keyword cannibalization detection** — GSC API multi-URL analysis
12. **Content gap analysis** — DataForSEO competitor keyword comparison
13. **Share of Voice calculation** — Search volume * CTR model
14. **Estimated traffic value** — CPC data integration
15. **SERP feature tracking** — DataForSEO SERP data
16. **Traffic forecasting** — Trend line projection
17. **Competitor tracking panel** — DataForSEO competitor data
18. **PDF export** — html2canvas + jsPDF
19. **Automated email reports** — API route + email service
20. **Custom date range comparison** — Enhanced date picker with comparison

### Phase 3: Advanced Features (4-8 weeks) — HARD complexity

21. **Internal link analysis** — Site crawler integration
22. **Backlink monitoring** — DataForSEO Backlinks API
23. **Core Web Vitals monitoring** — PageSpeed API integration
24. **Crawl error / index coverage** — GSC URL Inspection API
25. **Local pack tracking** — DataForSEO SERP with local pack detection
26. **Proximity-based rank checking** — Multi-location SERP checks
27. **Sankey diagram for link flow** — New visualization library
28. **Full competitor dashboard** — Competitor data aggregation
29. **Review monitoring** — Google Places API
30. **NAP consistency checking** — Multi-source citation audit

---

## 9. DATA SOURCES & APIs

### Already Integrated
| Source | What It Provides | Cost |
|--------|-----------------|------|
| **Google Search Console API** | Keywords, pages, clicks, impressions, positions, dates, devices, countries | Free |
| **DataForSEO** | Competitor analysis, SERP features, rankings | Varies (pay-per-task, ~$0.002-0.05 per task) |

### Recommended Additions
| Source | What It Provides | Cost | Priority |
|--------|-----------------|------|----------|
| **Google PageSpeed Insights API** | Core Web Vitals, performance scores | Free (with API key, 25k requests/day) | HIGH |
| **DataForSEO Keyword Data API** | Search volume, KD, CPC, SERP features | ~$0.01 per keyword | HIGH |
| **DataForSEO Backlinks API** | Backlink profile, referring domains | ~$0.02 per domain | MEDIUM |
| **Google Business Profile API** | GBP metrics, reviews | Free (requires verification) | MEDIUM |
| **Google Places API** | Review data for listed businesses | $17/1000 requests | LOW |
| **GSC URL Inspection API** | Index status per URL | Free (limited to 2000/day) | MEDIUM |
| **Resend / SendGrid** | Email delivery for reports | Free tier available | MEDIUM |

### Self-Generated Data (No External API)
| Data | How to Generate | Storage |
|------|----------------|---------|
| **Historical snapshots** | Cron job saving daily GSC data | Vercel Blob (already using @vercel/blob) |
| **Annotations** | User input | JSON file or Vercel KV |
| **Goals** | User configuration | JSON file or Vercel KV |
| **Content freshness** | Track page update dates | JSON file |
| **Brand/non-brand classification** | Keyword filtering logic | Computed in real-time |
| **Visibility score** | Calculated from GSC + search volume | Computed + stored daily |
| **Keyword-to-page mapping** | User assignment + GSC data | JSON file |

---

## SUMMARY: TOP 10 HIGHEST-IMPACT FEATURES TO ADD

Ranked by impact-to-effort ratio for your specific case (local directory in Kotor):

1. **Period-over-period comparison on KPI cards** — EASY, massive UX improvement
2. **Visibility Score as hero metric** — EASY, gives you a single trackable number
3. **Brand vs Non-Brand split** — EASY, critical strategic insight
4. **Annotations on timeline charts** — EASY, enables action-to-outcome correlation
5. **Keyword cannibalization detection** — MEDIUM, likely costing you rankings right now
6. **SERP feature tracking** — MEDIUM, identifies high-value opportunities
7. **Goal tracking with progress bars** — EASY, adds accountability
8. **Content gap analysis** — MEDIUM, directly feeds content strategy
9. **Geographic traffic breakdown** — EASY, reveals market opportunities
10. **Share of Voice** — MEDIUM, the best competitive metric in SEO

These 10 features would put your dashboard on par with professional tools costing $100-500/month, specifically tailored to the needs of a local directory site in Montenegro.
