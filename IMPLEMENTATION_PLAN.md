# KotorDirectory SEO Dashboard — Master Implementation Plan
## Compiled from 4 research reports, March 2026

---

## EXECUTIVE SUMMARY

Your dashboard currently uses **4 out of 30+ DataForSEO endpoints** and **basic GSC data**. The research identified **50+ features** to add, **10+ free APIs** to integrate, and **25 high-value DataForSEO endpoints** you're already paying for but not using. This plan organizes everything into 4 phases with estimated costs and timelines.

**Estimated monthly API cost for full implementation: $50-80/month** (mostly DataForSEO you already pay for)

---

## PHASE 1: QUICK WINS (1-2 weeks)
*Zero or minimal additional cost — uses existing APIs and free services*

### 1.1 Parse SERP Features from Existing Data ($0)
- Your DataForSEO SERP response already contains `item.type` for each result
- Currently the code ignores this data
- **Add:** SERP feature icons next to keywords (featured snippet, local pack, PAA, etc.)
- **Add:** "SERP Features" column to keyword table
- **Add:** Chart showing which features appear for your keywords
- **Impact:** HIGH — know which keywords have featured snippet opportunities

### 1.2 Visibility Score ($0)
- Calculate: Sum of estimated CTR for each position across all tracked keywords
- Formula: Position 1 = 31.7% CTR, Position 2 = 24.7%, Position 3 = 18.7% etc.
- Single number showing overall search visibility (e.g. "14.3%")
- Track over time as a trend line
- **Impact:** HIGH — single metric to show overall SEO progress

### 1.3 Brand vs Non-Brand Split ($0)
- Classify keywords containing "kotor directory" or "kotordirectory" as brand
- Everything else is non-brand
- Show separate KPIs for each
- **Impact:** MEDIUM — understand organic growth vs brand searches

### 1.4 Google PageSpeed Insights API (FREE)
- 25,000 queries/day free
- Add "Site Health" tab with Core Web Vitals (LCP, INP, CLS)
- Monitor top 20 pages automatically
- Show pass/fail status with scores
- **Impact:** HIGH — Core Web Vitals are a ranking factor

### 1.5 Moz Domain Authority (FREE — 10 requests/month)
- Track DA/PA for your site and top competitors
- Show in overview as a KPI card
- **Impact:** MEDIUM — industry-standard authority metric

### 1.6 Keyword Cannibalization Detection ($0)
- Analyse existing GSC data: find keywords where 2+ pages rank
- Flag when multiple pages compete for same keyword
- Show which page ranks higher and suggest consolidation
- **Impact:** HIGH for directory sites — category pages and listing pages often compete

### 1.7 Mobile vs Desktop Split ($0 — from GSC data)
- GSC already returns device dimension data
- Add device breakdown chart to overview
- Show which keywords perform better on mobile vs desktop
- **Impact:** MEDIUM — most Kotor searches are mobile (tourists on phones)

### 1.8 Country/Geography Split ($0 — from GSC data)
- GSC returns country data
- The 3-month GSC export already has 142 countries
- Show top countries by clicks/impressions
- Identify which markets to target content for
- **Impact:** MEDIUM — understand which countries search for Kotor

### 1.9 Improve Strategy Recommendations ($0)
Add these new recommendation types:
- **Keyword cannibalization** — "Pages X and Y both rank for Z, consolidate"
- **SERP feature opportunity** — "Featured snippet available for X, optimize content"
- **Schema missing** — "Add FAQ schema to category page X"
- **PageSpeed issue** — "Page X fails Core Web Vitals, fix LCP"
- **Mobile opportunity** — "Keyword X gets 80% mobile traffic, ensure mobile-optimized"
- **Seasonal content** — "Search volume for X peaks in June, publish content by May"

### 1.10 Date Comparison (Period over Period) ($0)
- "This period vs last period" for all KPIs
- Show percentage change arrows on KPI cards
- Compare current 28 days vs previous 28 days
- **Impact:** HIGH — instantly see if things are improving

---

## PHASE 2: CORE UPGRADES (2-4 weeks)
*Uses DataForSEO endpoints you already pay for*

### 2.1 Backlink Monitoring (DataForSEO Backlinks API ~$0.002/line)
- **Endpoints:** `/backlinks/summary/live`, `/backlinks/backlinks/live`, `/backlinks/referring_domains/live`
- Track total backlinks, referring domains, dofollow/nofollow ratio
- Show new and lost backlinks
- Monitor competitor backlink profiles
- **Add:** "Backlinks" page to dashboard

### 2.2 On-Page Site Health Audit (DataForSEO On-Page API ~$0.003/page)
- **Endpoint:** `/on_page/task_post`
- Crawl your site for: broken links, missing meta tags, duplicate content, redirect chains, image issues
- Health score out of 100
- Issues grouped by severity (critical/warning/notice)
- **Add:** "Site Health" tab with issue list and trend

### 2.3 Google Maps / Local Pack Tracking (DataForSEO ~$0.004/task)
- **Endpoint:** `/serp/google/maps/live/regular`
- Track which businesses appear in local packs for Kotor keywords
- Show local pack positions for listed businesses
- **Add:** "Local Pack" section to clusters page

### 2.4 Competitor Gap Analysis (DataForSEO ~$0.001/line)
- **Endpoint:** `/dataforseo_labs/google/domain_intersection/live`
- Compare kotordirectory.com vs tripadvisor.com, lonelyplanet.com, etc.
- Show keywords where competitors rank but you don't
- Identify content gaps
- **Add:** "Competitors" page to dashboard

### 2.5 Keyword Suggestions & Expansion (DataForSEO ~$0.001/line)
- **Endpoint:** `/dataforseo_labs/google/keyword_suggestions/live`
- Enter a seed keyword, get related terms
- Show search volume, difficulty, CPC
- Help expand keyword clusters
- **Add:** "Keyword Research" tool to dashboard

### 2.6 Historical Search Volume / Seasonality (DataForSEO ~$0.001/line)
- **Endpoint:** `/dataforseo_labs/google/historical_search_volume/live`
- Show monthly search volume trends for Kotor keywords
- Identify peak tourist season searches
- Help plan content calendar
- **Add:** Seasonality chart to keyword detail views

### 2.7 Google Business Profile Data (DataForSEO ~$0.004/listing)
- **Endpoint:** `/business_data/google/my_business_info/task_post`
- Pull ratings, reviews, categories, hours for listed businesses
- **Endpoint:** `/business_data/google/reviews/task_post`
- Pull actual Google reviews
- **Add:** Business data cards to listing details

### 2.8 Search Intent Classification (DataForSEO)
- **Endpoint:** `/dataforseo_labs/google/search_intent/live`
- Classify keywords as informational, navigational, commercial, transactional
- Help prioritize which keywords to target with which content type
- **Add:** Intent column to keyword table

### 2.9 Automated PDF Reports ($0 — frontend only)
- Generate downloadable PDF of dashboard data
- Weekly/monthly summary format
- Include charts, KPIs, top recommendations
- **Add:** "Export Report" button

### 2.10 Annotations & Event Markers ($0)
- Mark dates on charts: "Published new content", "Added backlinks", "Algorithm update"
- Track which actions caused ranking changes
- **Add:** Annotation system to trend charts

---

## PHASE 3: ADVANCED FEATURES (4-8 weeks)
*New APIs and more complex implementations*

### 3.1 Share of Voice Metric
- For each cluster/category, calculate: what % of total clicks for those keywords are you capturing
- Compare against competitors
- Track over time — the ultimate SEO success metric
- **Data:** DataForSEO SERP + estimated CTR curves

### 3.2 Content Gap Analysis Engine
- Crawl competitor content for Kotor-related pages
- Compare against your content
- Identify topics they cover that you don't
- Suggest new articles/listings to create
- **Data:** DataForSEO Content Analysis API + SERP API

### 3.3 Schema Markup Validator
- Audit all pages for schema implementation
- Check LocalBusiness, FAQ, Breadcrumb, AggregateRating
- Flag missing or invalid schema
- **Data:** Google Rich Results Test (free) or DataForSEO On-Page API

### 3.4 Internal Link Analysis
- Map internal links between pages
- Identify orphaned pages (no internal links pointing to them)
- Suggest internal link opportunities
- Visualize site structure
- **Data:** DataForSEO On-Page API crawl data

### 3.5 Review Monitoring Dashboard
- Track Google reviews for listed businesses
- Sentiment analysis on review text
- Alert when new reviews are posted
- Show review trends over time
- **Data:** DataForSEO Business Data API

### 3.6 Automated Email Reports
- Weekly/monthly email digest to you (and friend)
- Key metrics, biggest movers, new recommendations
- Uses existing email tool you built with DataForSEO
- **Data:** Scheduled serverless function on Vercel

### 3.7 Traffic Forecasting
- Based on current position trends and search volumes
- Estimate clicks you'll gain if position improves
- "If you reach page 1 for X, expect Y additional clicks/month"
- **Data:** Historical GSC data + DataForSEO search volumes

### 3.8 Topical Authority Map
- Visualize which topics/clusters you have authority in
- Treemap showing content coverage depth
- Identify thin areas needing more content
- **Data:** Computed from keyword/cluster data

---

## PHASE 4: PREMIUM FEATURES (8-12 weeks)
*Third-party APIs and advanced integrations*

### 4.1 Local Falcon Geo-Grid Rankings (~$25/month)
- Heat map showing ranking variation across Kotor geographic area
- See how rankings differ in Kotor Old Town vs Dobrota vs Muo
- Unique differentiator no competitor dashboard has
- **API:** Local Falcon API

### 4.2 Competitor Traffic Estimates
- Estimate how much organic traffic competitors get
- Which pages drive their traffic
- **Data:** DataForSEO Labs domain analytics

### 4.3 AI-Powered Content Briefs
- Generate content briefs for target keywords
- Analyse top-ranking content, extract key topics
- Suggest headings, word count, entities to include
- **Data:** DataForSEO SERP + Content Analysis API + Claude API

### 4.4 White-Label Mode
- Customizable branding (logo, colors, domain)
- Perfect for presenting to clients or business partners
- **Implementation:** Theme system with configurable assets

### 4.5 Multi-Site Dashboard
- Toggle between kotordirectory.com, hercegnovidirectory.com, and network sites
- Unified view across all properties
- Compare performance between sites
- **Data:** GSC API supports multiple properties

---

## FREE APIs TO INTEGRATE

| API | Cost | What It Adds |
|-----|------|-------------|
| Google PageSpeed Insights | Free (25k/day) | Core Web Vitals monitoring |
| Google Knowledge Graph | Free (100k/day) | Entity enrichment |
| Moz Link API | Free (10/month) | Domain Authority tracking |
| Google Rich Results Test | Free | Schema validation |
| Google Trends (via pytrends) | Free | Seasonal search patterns |
| Reddit API | Free tier | Content idea mining |
| W3C Validator | Free | HTML validity checking |

---

## DATAFORSEO ENDPOINTS TO ADD (already in your plan)

| Endpoint | Cost/Request | Priority | Dashboard Section |
|----------|-------------|----------|-------------------|
| SERP Advanced (features) | $0.003 | MUST | Keywords |
| Google Maps SERP | $0.004 | MUST | Local Pack |
| Backlinks Summary | $0.002 | HIGH | Backlinks page |
| Referring Domains | $0.002 | HIGH | Backlinks page |
| On-Page Crawl | $0.003/page | HIGH | Site Health |
| Domain Intersection | $0.001 | HIGH | Competitors page |
| Keyword Suggestions | $0.001 | HIGH | Keyword Research |
| Historical Search Vol | $0.001 | MEDIUM | Seasonality |
| Search Intent | $0.001 | MEDIUM | Keywords |
| Business Data (GMB) | $0.004 | MEDIUM | Listings |
| Google Reviews | $0.004 | MEDIUM | Reviews |
| Content Analysis | $0.002 | LOW | Content gaps |
| Bulk Keyword Difficulty | $0.001 | LOW | Keyword Research |

---

## ESTIMATED MONTHLY COSTS

| Tier | What's Included | DataForSEO | Other APIs | Total |
|------|----------------|------------|------------|-------|
| **Current** | GSC + 4 endpoints | ~$5-10 | $0 | ~$5-10 |
| **Phase 1-2** | + backlinks, on-page, maps, competitors | ~$30-50 | $0 | ~$30-50 |
| **Phase 3** | + reviews, content analysis, reports | ~$50-80 | $0 | ~$50-80 |
| **Phase 4** | + Local Falcon, multi-site | ~$80-120 | ~$25 | ~$105-145 |

---

## STRATEGY RECOMMENDATIONS FROM RESEARCH

### Immediate Actions for kotordirectory.com:

1. **Fix keyword cannibalization** — multiple pages likely compete for same terms
2. **Add FAQ schema to all category pages** — 3-5 questions each, target PAA
3. **Add AggregateRating schema** — pull Google ratings for businesses, 20-35% CTR lift
4. **Create "Things to Do in Kotor" mega-guide** — target high-volume informational keywords
5. **Build seasonal content calendar** — publish Kotor content 2-3 months before peak season (June-September)
6. **Expand clusters to 15-20 listings each** — car rental and boat tours clusters need more supporting pages
7. **Cross-link network sites safely** — max 2-3 links per site, varied anchors, natural editorial context
8. **Monitor local pack rankings** — tourists search on mobile, local pack is prime real estate
9. **Submit schema-rich pages to GSC for re-indexing** after adding schema markup
10. **Target long-tail "near me" and multilingual keywords** — tourists search in their own language

### Key Metrics to Track:
- **Visibility Score** (aggregate CTR-weighted positions) — the single most important metric
- **Share of Voice per cluster** — how much of each market you own
- **Clicks from non-brand keywords** — true organic growth indicator
- **Schema coverage %** — what % of pages have full schema markup
- **Core Web Vitals pass rate** — technical health
- **Backlink growth rate** — monthly new referring domains
- **Content freshness score** — how recently pages were updated

---

## DETAILED RESEARCH REPORTS

The following files contain the full research behind this plan:

1. **`SEO-DASHBOARD-RESEARCH.md`** — Dashboard features from 11 top tools, 19 must-have features, visualization best practices
2. **`DATAFORSEO_API_ENDPOINTS.md`** — 100+ DataForSEO endpoints cataloged with costs and priorities
3. **`SEO_STRATEGY_2025_2026.md`** (in kotor-rewriter/) — Full local SEO playbook with schema, clusters, content, links, technical SEO

---

*Plan compiled from 4 parallel research agents analyzing SEO APIs, dashboard tools, local SEO strategies, and DataForSEO endpoints.*
