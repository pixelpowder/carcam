# DataForSEO API v3 -- Comprehensive Endpoint Catalog
## For kotordirectory.com SEO Dashboard (Kotor, Montenegro)

**Account:** info@kotordirectory.com
**API Base:** https://api.dataforseo.com/v3/
**Auth:** HTTP Basic (login:password)
**Montenegro Location Code:** 2499
**Language Code:** en (or sr for Serbian)

> **IMPORTANT DISCLAIMER:** This catalog was compiled from training data (cutoff May 2025).
> Pricing figures are approximate and should be verified at https://dataforseo.com/pricing
> and https://docs.dataforseo.com/v3/ before implementation. DataForSEO uses a prepaid
> credit system -- you load funds and each API call deducts from your balance.

---

## GENERAL NOTES

### Pricing Model
- DataForSEO uses a **prepaid balance** system (minimum deposit ~$50)
- Costs are per "task" or per "request" depending on the endpoint
- Most endpoints have both **Task Post** (async) and **Live** (sync) modes
- Live mode typically costs the same but returns results immediately
- Bulk endpoints offer significant savings for high-volume operations

### Rate Limits
- Default: **2,000 requests per minute** across all endpoints
- Can be increased by contacting support
- Each endpoint has its own concurrent task limits
- Task-based (async): up to 30,000 tasks in queue
- Live: rate-limited by requests per minute

### Task-Based vs Live
- **Task Post**: Submit task, poll for results later (seconds to minutes). Best for batch operations.
- **Live**: Submit and get results immediately in same request. Best for on-demand dashboard queries.
- Both cost the same per task typically.

---

## 1. SERP API

The SERP API provides real Google search results for any query and location.

### 1.1 Google Organic SERP (Regular)

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/serp/google/organic/live/regular` |
| **Endpoint (Task)** | `POST /v3/serp/google/organic/task_post` |
| **Get Results** | `GET /v3/serp/google/organic/task_get/regular/{task_id}` |
| **Cost** | ~$0.0020 per task (2 credits per 1000 results) |
| **Returns** | Full organic SERP results: titles, URLs, descriptions, positions, SERP features |
| **Dashboard Use** | Track rankings for target keywords; monitor where kotordirectory.com appears; track competitor positions |
| **Priority** | **MUST-HAVE** |

**Key parameters:**
- `keyword` - search query
- `location_code` - 2499 for Montenegro
- `language_code` - "en" or "sr"
- `device` - "desktop" or "mobile"
- `os` - "windows", "macos", "android", "ios"
- `depth` - number of results (10, 20, 30, ..., 100)

### 1.2 Google SERP (Advanced)

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/serp/google/organic/live/advanced` |
| **Endpoint (Task)** | `POST /v3/serp/google/organic/task_get/advanced/{task_id}` |
| **Cost** | ~$0.0030 per task |
| **Returns** | All regular results PLUS all SERP features: People Also Ask, Featured Snippets, Local Pack, Knowledge Panel, Top Stories, Video, Images, Shopping, etc. |
| **Dashboard Use** | Identify which SERP features appear for your keywords; track Featured Snippet opportunities; monitor Local Pack results for Kotor businesses |
| **Priority** | **MUST-HAVE** |

**SERP features detected include:**
- `featured_snippet` - Position zero answers
- `people_also_ask` - PAA boxes with questions
- `local_pack` - Google Maps/local 3-pack
- `knowledge_graph` - Knowledge panel
- `top_stories` - News carousel
- `video` - Video results
- `images` - Image pack
- `shopping` - Product ads
- `twitter` - Twitter/X results
- `related_searches` - Related search suggestions
- `faq` - FAQ rich results
- `jobs` - Job listings
- `events` - Event listings
- `hotels_pack` - Hotel results
- `flights` - Flight results
- `map` - Map result
- `carousel` - Carousel results
- `multi_carousel` - Multi-carousel
- `recipes` - Recipe results
- `scholarly_articles` - Academic results

### 1.3 Google Maps SERP

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/serp/google/maps/live/advanced` |
| **Endpoint (Task)** | `POST /v3/serp/google/maps/task_post` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Google Maps listing results: business name, address, phone, rating, reviews count, category, coordinates, website, place ID |
| **Dashboard Use** | Track local map rankings for Kotor businesses; monitor which listings appear in map results for key queries; competitive local SEO analysis |
| **Priority** | **MUST-HAVE** |

### 1.4 Google Local Finder

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/serp/google/local_finder/live/advanced` |
| **Endpoint (Task)** | `POST /v3/serp/google/local_finder/task_post` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Extended local finder results (the full list you see when clicking "More places" in local pack) |
| **Dashboard Use** | Get comprehensive local business rankings beyond the 3-pack; identify all competitors ranking locally |
| **Priority** | **NICE-TO-HAVE** |

### 1.5 Google Events SERP

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/serp/google/events/live/advanced` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Event listings from Google Events: title, date, venue, URL |
| **Dashboard Use** | Monitor event listings in Kotor; potential content/listing opportunities |
| **Priority** | **FUTURE** |

### 1.6 SERP Locations Endpoint

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /v3/serp/google/locations` |
| **Cost** | FREE |
| **Returns** | All available location codes and names |
| **Dashboard Use** | Look up and verify Montenegro location code (2499); find sub-locations if available |
| **Priority** | **MUST-HAVE** (for setup) |

### 1.7 SERP Languages Endpoint

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /v3/serp/google/languages` |
| **Cost** | FREE |
| **Returns** | All available language codes |
| **Dashboard Use** | Verify available languages for Montenegro |
| **Priority** | **MUST-HAVE** (for setup) |

---

## 2. KEYWORDS DATA API

Provides search volume, competition, CPC, and keyword suggestions from Google Ads and Google Trends.

### 2.1 Google Ads Search Volume

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/keywords_data/google_ads/search_volume/live` |
| **Endpoint (Task)** | `POST /v3/keywords_data/google_ads/search_volume/task_post` |
| **Cost** | ~$0.0500 per task (but supports up to 700 keywords per task) |
| **Returns** | Monthly search volume, competition level (LOW/MEDIUM/HIGH), competition index (0-100), CPC (low/high range), monthly search volumes for past 12 months |
| **Dashboard Use** | Get search volume for all target keywords; understand seasonal trends; prioritize keywords by volume; estimate traffic potential |
| **Priority** | **MUST-HAVE** |

**Key notes:**
- Can submit up to **700 keywords in a single task** -- massive cost savings
- Returns `search_volume`, `competition`, `competition_index`, `cpc`, `low_top_of_page_bid`, `high_top_of_page_bid`
- Monthly breakdown shows seasonality (crucial for tourism in Kotor)

### 2.2 Google Ads Keywords for Site

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/keywords_data/google_ads/keywords_for_site/live` |
| **Endpoint (Task)** | `POST /v3/keywords_data/google_ads/keywords_for_site/task_post` |
| **Cost** | ~$0.0500 per task |
| **Returns** | Keywords that Google Ads suggests for a given domain, with search volumes |
| **Dashboard Use** | Discover what keywords Google associates with kotordirectory.com; find keyword opportunities; see what Google thinks your site is about |
| **Priority** | **MUST-HAVE** |

### 2.3 Google Ads Keywords for Keywords (Suggestions)

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/keywords_data/google_ads/keywords_for_keywords/live` |
| **Endpoint (Task)** | `POST /v3/keywords_data/google_ads/keywords_for_keywords/task_post` |
| **Cost** | ~$0.0500 per task |
| **Returns** | Related keyword suggestions based on seed keywords, with search volumes and competition |
| **Dashboard Use** | Expand keyword lists; find long-tail variations of core keywords like "restaurants in Kotor", "things to do in Kotor" |
| **Priority** | **MUST-HAVE** |

### 2.4 Google Ads Ad Traffic by Keywords

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/keywords_data/google_ads/ad_traffic_by_keywords/live` |
| **Cost** | ~$0.0500 per task |
| **Returns** | Estimated impressions, clicks, cost, CTR for keywords at various bid levels |
| **Dashboard Use** | Estimate potential paid traffic; understand keyword value |
| **Priority** | **NICE-TO-HAVE** |

### 2.5 Google Trends Explore

| Detail | Value |
|--------|-------|
| **Endpoint (Live)** | `POST /v3/keywords_data/google_trends/explore/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Google Trends interest-over-time data, related queries, related topics |
| **Dashboard Use** | Track trending searches in Kotor/Montenegro; identify seasonal patterns; compare keyword popularity over time; content strategy |
| **Priority** | **MUST-HAVE** |

### 2.6 Google Trends Categories

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /v3/keywords_data/google_trends/categories` |
| **Cost** | FREE |
| **Returns** | List of available Google Trends categories |
| **Dashboard Use** | Filter trends by category (Travel, Food & Drink, etc.) |
| **Priority** | **NICE-TO-HAVE** |

### 2.7 Bing Keyword Data

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/keywords_data/bing/search_volume/live` |
| **Cost** | ~$0.0500 per task |
| **Returns** | Bing search volumes and competition data |
| **Dashboard Use** | Supplementary search volume data |
| **Priority** | **FUTURE** |

### 2.8 DataForSEO Trends (Clickstream Data)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/keywords_data/dataforseo_trends/explore/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Clickstream-based search trends (DataForSEO's own data source, separate from Google Trends) |
| **Dashboard Use** | Alternative trend data; cross-reference with Google Trends |
| **Priority** | **NICE-TO-HAVE** |

---

## 3. DATAFORSEO LABS API

Massive analytical API built on DataForSEO's own keyword and SERP database. Provides competitive intelligence, keyword research, and domain analysis.

### 3.1 Ranked Keywords

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/ranked_keywords/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | All keywords a domain ranks for, with positions, search volumes, URLs, SERP features, traffic estimates |
| **Dashboard Use** | See every keyword kotordirectory.com ranks for; identify top-performing pages; track ranking distribution; find quick-win keywords (positions 4-20) |
| **Priority** | **MUST-HAVE** |

**Key fields returned:**
- `keyword`, `position`, `url`, `search_volume`, `cpc`, `competition`
- `traffic_cost` (estimated value of organic traffic)
- `is_featured_snippet`, `is_local_pack` etc.

### 3.2 Domain Intersection (Keyword Gap)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/domain_intersection/live` |
| **Cost** | ~$0.0150 per task |
| **Returns** | Keywords that multiple domains share or where one ranks but another doesn't |
| **Dashboard Use** | Find keywords competitors rank for that kotordirectory.com doesn't; identify keyword gaps and opportunities |
| **Priority** | **MUST-HAVE** |

### 3.3 Competitors Domain

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/competitors_domain/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Domains that compete for similar keywords, with overlap metrics (relevance, avg_position, intersections) |
| **Dashboard Use** | Discover who kotordirectory.com's real SEO competitors are; might find competitors you didn't know about |
| **Priority** | **MUST-HAVE** |

### 3.4 Related Keywords

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/related_keywords/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Semantically related keywords based on SERP similarity, with search volumes and difficulty |
| **Dashboard Use** | Expand content topics; find related terms for content optimization; build topic clusters around Kotor travel/tourism |
| **Priority** | **MUST-HAVE** |

### 3.5 Keyword Suggestions

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/keyword_suggestions/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Keyword suggestions based on seed keyword, with volumes, difficulty, CPC |
| **Dashboard Use** | Generate keyword ideas; find long-tail variations |
| **Priority** | **MUST-HAVE** |

### 3.6 Keyword Ideas

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/keyword_ideas/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Broad keyword ideas combining suggestions, related, and questions |
| **Dashboard Use** | Brainstorm new content ideas; comprehensive keyword discovery |
| **Priority** | **NICE-TO-HAVE** |

### 3.7 Keywords for Site

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/keywords_for_site/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Keywords relevant to a domain based on its content and rankings |
| **Dashboard Use** | Alternative to Google Ads keywords_for_site; discover topic relevance |
| **Priority** | **NICE-TO-HAVE** |

### 3.8 SERP Competitors

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/serp_competitors/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | For a given keyword, shows all competing domains on the SERP with their metrics |
| **Dashboard Use** | Analyze who ranks for specific Kotor-related keywords; understand competitive landscape per keyword |
| **Priority** | **MUST-HAVE** |

### 3.9 Subdomains

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/subdomains/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | All subdomains of a domain with their ranking metrics |
| **Dashboard Use** | Analyze competitor site structure; see if competitors use subdomains for different content areas |
| **Priority** | **NICE-TO-HAVE** |

### 3.10 Relevant Pages

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/relevant_pages/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Most relevant/important pages on a domain by organic traffic and rankings |
| **Dashboard Use** | Find your top-performing pages; identify which pages drive the most traffic; analyze competitor top pages |
| **Priority** | **MUST-HAVE** |

### 3.11 Domain Rank Overview

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/domain_rank_overview/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Overall domain metrics: total organic keywords, estimated traffic, traffic cost, domain rank |
| **Dashboard Use** | High-level domain health overview; compare with competitors; track progress over time |
| **Priority** | **MUST-HAVE** |

### 3.12 Historical Rank Overview

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/historical_rank_overview/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Historical domain metrics over time: organic keywords count, traffic estimates, by month |
| **Dashboard Use** | Track domain growth over time; visualize SEO progress in charts; compare historical performance |
| **Priority** | **MUST-HAVE** |

### 3.13 Keyword Difficulty (Bulk)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live` |
| **Cost** | ~$0.0010 per keyword in bulk |
| **Returns** | Keyword difficulty score (0-100) for up to 1000 keywords per request |
| **Dashboard Use** | Quickly assess difficulty for large keyword lists; prioritize achievable keywords |
| **Priority** | **MUST-HAVE** |

### 3.14 Bulk Traffic Estimation

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/bulk_traffic_estimation/live` |
| **Cost** | ~$0.0010 per domain in bulk |
| **Returns** | Traffic estimates for multiple domains at once |
| **Dashboard Use** | Compare traffic estimates across competitors quickly |
| **Priority** | **NICE-TO-HAVE** |

### 3.15 Categories for Domain

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/categories_for_domain/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Google categories associated with a domain |
| **Dashboard Use** | Understand how Google categorizes kotordirectory.com; compare with competitor categorization |
| **Priority** | **NICE-TO-HAVE** |

### 3.16 Top Searches

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/top_searches/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Top/trending searches for a given keyword or topic |
| **Dashboard Use** | Identify trending Kotor/Montenegro search queries |
| **Priority** | **NICE-TO-HAVE** |

### 3.17 Search Intent

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/search_intent/live` |
| **Cost** | ~$0.0010 per keyword in bulk |
| **Returns** | Search intent classification for keywords: informational, navigational, commercial, transactional |
| **Dashboard Use** | Classify keywords by intent; align content strategy with user intent; prioritize transactional keywords for listings |
| **Priority** | **MUST-HAVE** |

**Supports up to 1000 keywords per request -- very cost-effective.**

### 3.18 Page Intersection

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/page_intersection/live` |
| **Cost** | ~$0.0150 per task |
| **Returns** | Keywords shared between specific pages (not entire domains) |
| **Dashboard Use** | Compare specific pages against competitor pages |
| **Priority** | **NICE-TO-HAVE** |

### 3.19 Historical Search Volume

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/historical_search_volume/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Monthly search volume history for keywords over time |
| **Dashboard Use** | Track keyword popularity trends; identify seasonal patterns for Kotor tourism keywords |
| **Priority** | **MUST-HAVE** |

### 3.20 Keywords for Categories

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/keywords_for_categories/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Keywords associated with specific Google categories |
| **Dashboard Use** | Find keywords by category (e.g., Travel > Accommodation, Food > Restaurants) |
| **Priority** | **NICE-TO-HAVE** |

### 3.21 Domain Metrics by Categories

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/dataforseo_labs/google/domain_metrics_by_categories/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Domain performance broken down by Google categories |
| **Dashboard Use** | See which content categories drive the most traffic |
| **Priority** | **NICE-TO-HAVE** |

---

## 4. BACKLINKS API

Comprehensive backlink analysis using DataForSEO's own link index.

### 4.1 Backlinks Summary

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/summary/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Domain backlink summary: total backlinks, referring domains, referring IPs, dofollow/nofollow ratio, domain rank, referring domain rank distribution |
| **Dashboard Use** | Overview of kotordirectory.com's backlink profile; track backlink growth; compare with competitors |
| **Priority** | **MUST-HAVE** |

### 4.2 Backlinks (Detailed List)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/backlinks/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Detailed list of individual backlinks: source URL, target URL, anchor text, dofollow/nofollow, first seen, last seen, page rank |
| **Dashboard Use** | Audit all backlinks; identify high-quality links; find toxic links; monitor new/lost links |
| **Priority** | **MUST-HAVE** |

### 4.3 Referring Domains

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/referring_domains/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | List of all referring domains with metrics: backlink count, first seen, domain rank |
| **Dashboard Use** | See which domains link to you; identify strongest referring domains; track referring domain growth |
| **Priority** | **MUST-HAVE** |

### 4.4 Anchors

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/anchors/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Anchor text distribution: all anchor texts used to link to your domain with counts |
| **Dashboard Use** | Analyze anchor text diversity; identify over-optimized anchors; monitor brand vs keyword anchor ratios |
| **Priority** | **MUST-HAVE** |

### 4.5 New/Lost Backlinks

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/history/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Historical backlink data: new and lost backlinks/referring domains over time |
| **Dashboard Use** | Track backlink velocity; detect link building campaigns; identify link loss patterns |
| **Priority** | **MUST-HAVE** |

### 4.6 Competitors (by Backlinks)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/competitors/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Domains that share the most referring domains with your site |
| **Dashboard Use** | Find link building opportunities; see who competes for similar backlinks |
| **Priority** | **NICE-TO-HAVE** |

### 4.7 Domain Intersection (Backlinks)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/domain_intersection/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Referring domains that link to competitors but not to you |
| **Dashboard Use** | Find link building opportunities from domains that already link to similar sites |
| **Priority** | **MUST-HAVE** |

### 4.8 Domain Pages

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/domain_pages/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Pages on a domain with their individual backlink metrics |
| **Dashboard Use** | Find most-linked-to pages; identify content that attracts links |
| **Priority** | **NICE-TO-HAVE** |

### 4.9 Domain Pages Summary

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/domain_pages_summary/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Summary of domain pages with backlink distribution |
| **Dashboard Use** | Quick overview of which pages have the most link equity |
| **Priority** | **NICE-TO-HAVE** |

### 4.10 Referring Networks

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/referring_networks/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Referring IP networks and Class C subnets |
| **Dashboard Use** | Identify link network diversity; detect PBN patterns |
| **Priority** | **FUTURE** |

### 4.11 Bulk Ranks

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/bulk_ranks/live` |
| **Cost** | ~$0.0010 per domain in bulk |
| **Returns** | Rank/authority metrics for multiple domains at once |
| **Dashboard Use** | Quickly compare authority of multiple competitors |
| **Priority** | **NICE-TO-HAVE** |

### 4.12 Bulk Backlinks

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/bulk_backlinks/live` |
| **Cost** | ~$0.0010 per domain in bulk |
| **Returns** | Backlink counts for multiple domains at once |
| **Dashboard Use** | Quick competitive backlink comparison |
| **Priority** | **NICE-TO-HAVE** |

### 4.13 Bulk Referring Domains

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/bulk_referring_domains/live` |
| **Cost** | ~$0.0010 per domain in bulk |
| **Returns** | Referring domain counts for multiple domains at once |
| **Dashboard Use** | Quick competitive referring domain comparison |
| **Priority** | **NICE-TO-HAVE** |

### 4.14 Bulk New/Lost Backlinks

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/bulk_new_lost_backlinks/live` |
| **Cost** | ~$0.0010 per domain in bulk |
| **Returns** | New/lost backlink counts for multiple domains |
| **Dashboard Use** | Monitor backlink velocity across competitors |
| **Priority** | **NICE-TO-HAVE** |

### 4.15 Bulk New/Lost Referring Domains

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/bulk_new_lost_referring_domains/live` |
| **Cost** | ~$0.0010 per domain in bulk |
| **Returns** | New/lost referring domain counts for multiple domains |
| **Dashboard Use** | Monitor referring domain growth across competitors |
| **Priority** | **NICE-TO-HAVE** |

### 4.16 Page Intersection (Backlinks)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/page_intersection/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Referring pages that link to one page but not another |
| **Dashboard Use** | Page-level link gap analysis |
| **Priority** | **FUTURE** |

### 4.17 Timeseries Summary

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/timeseries_summary/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Historical backlink metrics over time as a time series |
| **Dashboard Use** | Chart backlink growth over months/years |
| **Priority** | **NICE-TO-HAVE** |

### 4.18 Timeseries New/Lost Summary

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/backlinks/timeseries_new_lost_summary/live` |
| **Cost** | ~$0.0200 per task |
| **Returns** | Time series of new and lost backlinks/referring domains |
| **Dashboard Use** | Visualize link acquisition/loss trends over time |
| **Priority** | **NICE-TO-HAVE** |

---

## 5. ON-PAGE API

Full technical SEO audit of a website.

### 5.1 Task Post (Start Crawl)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/task_post` |
| **Cost** | ~$0.0020 per page crawled |
| **Returns** | Starts a website crawl; returns task_id |
| **Dashboard Use** | Initiate technical SEO audit of kotordirectory.com |
| **Priority** | **MUST-HAVE** |

**Key parameters:**
- `target` - domain to crawl
- `max_crawl_pages` - limit pages crawled (controls cost)
- `load_resources` - whether to load CSS/JS (for rendering analysis)
- `enable_javascript` - JS rendering (more expensive)
- `custom_js` - inject custom JS during crawl

### 5.2 Summary

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /v3/on_page/summary/{task_id}` |
| **Cost** | Included with crawl |
| **Returns** | Overall site health: total pages, errors, warnings, notices, broken links, duplicate content, meta issues, load time averages |
| **Dashboard Use** | Site health score; technical SEO overview dashboard |
| **Priority** | **MUST-HAVE** |

### 5.3 Pages

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/pages` |
| **Cost** | Included with crawl |
| **Returns** | Detailed per-page data: status codes, load time, size, meta tags, headings, word count, internal/external links, canonical URL, robots directives |
| **Dashboard Use** | Page-by-page technical audit; find pages with issues |
| **Priority** | **MUST-HAVE** |

### 5.4 Pages by Resource

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/pages_by_resource` |
| **Cost** | Included with crawl |
| **Returns** | Pages that use a specific resource (CSS, JS, image) |
| **Dashboard Use** | Identify resource dependencies; optimize resource loading |
| **Priority** | **NICE-TO-HAVE** |

### 5.5 Resources

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/resources` |
| **Cost** | Included with crawl |
| **Returns** | All resources found during crawl: CSS, JS, images, fonts with sizes and status codes |
| **Dashboard Use** | Find broken resources; identify large files; optimize assets |
| **Priority** | **MUST-HAVE** |

### 5.6 Duplicate Tags

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/duplicate_tags` |
| **Cost** | Included with crawl |
| **Returns** | Pages with duplicate title tags, meta descriptions, H1 tags |
| **Dashboard Use** | Fix duplicate content issues; ensure unique meta for all directory listings |
| **Priority** | **MUST-HAVE** |

### 5.7 Duplicate Content

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/duplicate_content` |
| **Cost** | Included with crawl |
| **Returns** | Groups of pages with similar/duplicate content |
| **Dashboard Use** | Critical for directory site -- find listings with too-similar descriptions; fix thin content |
| **Priority** | **MUST-HAVE** |

### 5.8 Links

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/links` |
| **Cost** | Included with crawl |
| **Returns** | All internal and external links found: source, target, anchor text, type (dofollow/nofollow), status code |
| **Dashboard Use** | Internal linking audit; find broken links; optimize link structure; ensure proper internal linking between directory categories |
| **Priority** | **MUST-HAVE** |

### 5.9 Non-Indexable Pages

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/non_indexable` |
| **Cost** | Included with crawl |
| **Returns** | Pages blocked from indexing: noindex, robots.txt blocked, canonical to other page |
| **Dashboard Use** | Ensure important pages are indexable; find accidentally blocked pages |
| **Priority** | **MUST-HAVE** |

### 5.10 Waterfall (Page Speed)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/waterfall` |
| **Cost** | Included with crawl |
| **Returns** | Waterfall loading chart for a page: resource loading sequence and timing |
| **Dashboard Use** | Debug slow pages; identify render-blocking resources |
| **Priority** | **NICE-TO-HAVE** |

### 5.11 Page Screenshot

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/page_screenshot` |
| **Cost** | ~$0.0020 per screenshot |
| **Returns** | Screenshot of a rendered page |
| **Dashboard Use** | Visual audit; compare desktop vs mobile rendering |
| **Priority** | **FUTURE** |

### 5.12 Content Parsing

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/content_parsing/live` |
| **Cost** | ~$0.0020 per page |
| **Returns** | Parsed page content: plain text, word count, headings structure, paragraphs, images with alt text |
| **Dashboard Use** | Content analysis; check content length; verify heading hierarchy; audit alt text |
| **Priority** | **MUST-HAVE** |

### 5.13 Instant Pages

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/instant_pages` |
| **Cost** | ~$0.0020 per page |
| **Returns** | On-demand single-page audit without full crawl |
| **Dashboard Use** | Quick check of individual pages; ad-hoc audits |
| **Priority** | **NICE-TO-HAVE** |

### 5.14 Lighthouse (Page Speed / Core Web Vitals)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/lighthouse/task_post` |
| **Cost** | ~$0.0020 per audit |
| **Returns** | Full Google Lighthouse audit: Performance score, Accessibility score, Best Practices, SEO score, Core Web Vitals (LCP, FID/INP, CLS) |
| **Dashboard Use** | Core Web Vitals monitoring; page speed scores; accessibility compliance |
| **Priority** | **MUST-HAVE** |

### 5.15 Raw HTML

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/raw_html` |
| **Cost** | Included with crawl |
| **Returns** | Raw HTML of crawled pages |
| **Dashboard Use** | Inspect source code; verify structured data; check meta tags |
| **Priority** | **NICE-TO-HAVE** |

### 5.16 Key-Value Content Parsing

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/content_parsing/live` (with structured extraction) |
| **Cost** | ~$0.0020 per page |
| **Returns** | Structured extraction of specific data fields from page |
| **Dashboard Use** | Extract business listing data from pages |
| **Priority** | **FUTURE** |

### 5.17 Redirect Chains

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/on_page/redirect_chains` |
| **Cost** | Included with crawl |
| **Returns** | All redirect chains found during crawl |
| **Dashboard Use** | Find redirect chains/loops; clean up redirects |
| **Priority** | **MUST-HAVE** |

---

## 6. BUSINESS DATA API

Business listings, reviews, and local business data from Google, Tripadvisor, and more.

### 6.1 Google My Business Info

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/my_business_info/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Google Business Profile data: business name, address, phone, website, hours, category, attributes, photos count, place_id |
| **Dashboard Use** | Monitor Google Business Profile completeness for Kotor businesses; track business data accuracy |
| **Priority** | **MUST-HAVE** |

### 6.2 Google My Business Updates

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/my_business_updates/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Google Business Profile posts and updates |
| **Dashboard Use** | Monitor competitor GMB posting activity |
| **Priority** | **NICE-TO-HAVE** |

### 6.3 Google Reviews

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/reviews/task_post` |
| **Cost** | ~$0.0040 per task |
| **Returns** | Google reviews for a business: reviewer, rating, text, date, response |
| **Dashboard Use** | Monitor reviews for listed businesses; track review sentiment; identify reputation issues |
| **Priority** | **MUST-HAVE** |

### 6.4 Google Reviews Search

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/reviews/search/task_post` |
| **Cost** | ~$0.0040 per task |
| **Returns** | Search through reviews with keyword filters |
| **Dashboard Use** | Find reviews mentioning specific topics; sentiment analysis on specific aspects |
| **Priority** | **NICE-TO-HAVE** |

### 6.5 Google Hotel Info

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/hotel_info/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Hotel details: amenities, star rating, price range, nearby attractions |
| **Dashboard Use** | Enrich hotel listings in the directory; monitor hotel data |
| **Priority** | **MUST-HAVE** (Kotor is a tourism destination) |

### 6.6 Google Hotel Searches

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/hotel_searches/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Hotel search results for a location with pricing |
| **Dashboard Use** | Track hotel availability and pricing in Kotor; competitive analysis |
| **Priority** | **NICE-TO-HAVE** |

### 6.7 Tripadvisor Reviews

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/tripadvisor/reviews/task_post` |
| **Cost** | ~$0.0040 per task |
| **Returns** | Tripadvisor reviews: rating, text, date, reviewer info |
| **Dashboard Use** | Monitor Tripadvisor reviews for Kotor businesses; aggregate review data |
| **Priority** | **MUST-HAVE** (Tripadvisor is huge for Kotor tourism) |

### 6.8 Tripadvisor Search

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/tripadvisor/search/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Tripadvisor search results for businesses in a location |
| **Dashboard Use** | Find and track Kotor businesses on Tripadvisor; monitor rankings |
| **Priority** | **MUST-HAVE** |

### 6.9 Trustpilot Reviews

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/trustpilot/reviews/task_post` |
| **Cost** | ~$0.0040 per task |
| **Returns** | Trustpilot reviews for a business |
| **Dashboard Use** | Less relevant for local Kotor businesses but useful for larger brands |
| **Priority** | **FUTURE** |

### 6.10 Business Listings Search

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/business_listings/search/live` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Business listings from DataForSEO's aggregated database with categories, NAP data, ratings |
| **Dashboard Use** | Aggregate business data; verify NAP consistency; discover new businesses to list |
| **Priority** | **MUST-HAVE** |

### 6.11 Business Listings Categories

| Detail | Value |
|--------|-------|
| **Endpoint** | `GET /v3/business_data/business_listings/categories` |
| **Cost** | FREE |
| **Returns** | List of all business categories in the database |
| **Dashboard Use** | Map categories to your directory categories |
| **Priority** | **NICE-TO-HAVE** |

### 6.12 Google Photos

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/photos/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Photos associated with a Google Business Profile |
| **Dashboard Use** | Enrich directory listings with photos |
| **Priority** | **NICE-TO-HAVE** |

### 6.13 Google Questions and Answers

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/business_data/google/questions_and_answers/task_post` |
| **Cost** | ~$0.0030 per task |
| **Returns** | Q&A from Google Business Profile |
| **Dashboard Use** | Monitor business Q&A; find common questions; content ideas |
| **Priority** | **NICE-TO-HAVE** |

---

## 7. CONTENT ANALYSIS API

Analyze web content across the internet for mentions, sentiment, and trends.

### 7.1 Content Search

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/content_analysis/search/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Web content mentioning specific keywords/topics: URLs, titles, dates, sentiment, content type, social metrics |
| **Dashboard Use** | Monitor mentions of "Kotor" across the web; track brand mentions of kotordirectory.com; find content opportunities |
| **Priority** | **NICE-TO-HAVE** |

### 7.2 Content Summary

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/content_analysis/summary/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Aggregated statistics about content mentioning a topic: total mentions, sentiment distribution, top domains, content types |
| **Dashboard Use** | Overview of how Kotor is discussed online; sentiment trends |
| **Priority** | **NICE-TO-HAVE** |

### 7.3 Content Sentiment Analysis

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/content_analysis/sentiment_analysis/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Sentiment scoring of content: positive, negative, neutral with confidence |
| **Dashboard Use** | Track sentiment about Kotor tourism/businesses over time |
| **Priority** | **NICE-TO-HAVE** |

### 7.4 Content Rating Distribution

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/content_analysis/rating_distribution/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Distribution of ratings across content about a topic |
| **Dashboard Use** | Aggregate review rating distribution for Kotor businesses |
| **Priority** | **NICE-TO-HAVE** |

### 7.5 Content Category Trends

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/content_analysis/category_trends/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Content trends by category over time |
| **Dashboard Use** | Track which topics about Kotor are trending in content |
| **Priority** | **FUTURE** |

### 7.6 Content Phrase Trends

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/content_analysis/phrase_trends/live` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Trending phrases related to a keyword over time |
| **Dashboard Use** | Identify emerging topics and phrases in Kotor tourism content |
| **Priority** | **FUTURE** |

---

## 8. APP DATA API (Lower Priority for Directory Site)

### 8.1 Google Play / Apple App Store

| Detail | Value |
|--------|-------|
| **Endpoints** | Various under `/v3/app_data/google/` and `/v3/app_data/apple/` |
| **Cost** | ~$0.0020 per task |
| **Returns** | App store search results, app info, reviews, rankings |
| **Dashboard Use** | Only relevant if kotordirectory.com has a mobile app |
| **Priority** | **FUTURE / NOT NEEDED** |

---

## 9. MERCHANT API (Lower Priority)

### 9.1 Google Shopping

| Detail | Value |
|--------|-------|
| **Endpoints** | Various under `/v3/merchant/google/` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Google Shopping results, product listings, pricing |
| **Dashboard Use** | Not directly relevant for a local directory site |
| **Priority** | **FUTURE / NOT NEEDED** |

### 9.2 Amazon Products

| Detail | Value |
|--------|-------|
| **Endpoints** | Various under `/v3/merchant/amazon/` |
| **Cost** | ~$0.0020 per task |
| **Returns** | Amazon product data, reviews, pricing |
| **Dashboard Use** | Not relevant for local directory |
| **Priority** | **NOT NEEDED** |

---

## 10. DOMAIN ANALYTICS API

### 10.1 Technologies (BuiltWith-like)

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/domain_analytics/technologies/domain_technologies/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Technologies used by a domain: CMS, analytics, hosting, frameworks, CDN, advertising |
| **Dashboard Use** | Analyze competitor tech stacks; see what CMS/platforms Kotor competitors use |
| **Priority** | **NICE-TO-HAVE** |

### 10.2 Technologies Aggregation

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/domain_analytics/technologies/technologies_summary/live` |
| **Cost** | ~$0.0100 per task |
| **Returns** | Summary of technologies usage across domains |
| **Dashboard Use** | Market research on technology adoption |
| **Priority** | **FUTURE** |

### 10.3 Whois

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /v3/domain_analytics/whois/overview/live` |
| **Cost** | ~$0.0050 per task |
| **Returns** | Domain WHOIS data: registrar, creation date, expiry, nameservers |
| **Dashboard Use** | Competitor domain age analysis; domain research |
| **Priority** | **NICE-TO-HAVE** |

---

## APPENDIX A: ADDITIONAL UTILITY ENDPOINTS

### A.1 Appendix: ID Lists (Free)

| Endpoint | Returns |
|----------|---------|
| `GET /v3/serp/google/locations` | All location codes |
| `GET /v3/serp/google/languages` | All language codes |
| `GET /v3/keywords_data/google_ads/locations` | Google Ads location codes |
| `GET /v3/keywords_data/google_ads/languages` | Google Ads language codes |
| `GET /v3/keywords_data/google_trends/locations` | Trends location codes |
| `GET /v3/keywords_data/google_trends/languages` | Trends language codes |
| `GET /v3/dataforseo_labs/locations_and_languages` | Labs location/language codes |
| `GET /v3/backlinks/index` | Backlink index status (total links in database) |
| `GET /v3/business_data/business_listings/categories` | Business categories |
| `GET /v3/business_data/google/locations` | Google Business locations |
| `GET /v3/business_data/tripadvisor/locations` | Tripadvisor locations |

All of the above are **FREE** and should be called during dashboard setup.

### A.2 Appendix: Webhook/Pingback

All Task-based endpoints support a `pingback_url` parameter. When the task completes, DataForSEO will POST to your URL. This enables efficient async processing without polling.

---

## APPENDIX B: PRIORITY MATRIX FOR KOTOR DIRECTORY DASHBOARD

### Phase 1: MUST-HAVE (Core Dashboard) -- ~$2-5/day estimated

| # | Endpoint | Use Case | Est. Daily Cost |
|---|----------|----------|-----------------|
| 1 | Labs: Ranked Keywords | Track all keywords kotordirectory.com ranks for | $0.01/query |
| 2 | Labs: Domain Rank Overview | Domain health metrics | $0.01/query |
| 3 | Labs: Historical Rank Overview | Track SEO progress over time | $0.01/query |
| 4 | Labs: Competitors Domain | Discover competitors | $0.01/query |
| 5 | Labs: Domain Intersection | Keyword gap analysis | $0.015/query |
| 6 | Labs: Search Intent | Classify keyword intent | $0.001/kw bulk |
| 7 | Labs: Bulk Keyword Difficulty | Assess keyword difficulty | $0.001/kw bulk |
| 8 | Labs: Relevant Pages | Find top pages | $0.01/query |
| 9 | Labs: Related Keywords | Content expansion | $0.01/query |
| 10 | Labs: SERP Competitors | Per-keyword competition | $0.01/query |
| 11 | SERP: Google Organic (Advanced) | Track SERP positions + features | $0.003/query |
| 12 | SERP: Google Maps | Track local map rankings | $0.002/query |
| 13 | Keywords: Google Ads Search Volume | Get search volumes (700/batch) | $0.05/batch |
| 14 | Keywords: Google Trends | Seasonal trends for tourism | $0.002/query |
| 15 | Keywords: Keywords for Site | Discover relevant keywords | $0.05/batch |
| 16 | Backlinks: Summary | Backlink profile overview | $0.02/query |
| 17 | Backlinks: Referring Domains | Who links to you | $0.02/query |
| 18 | Backlinks: History | Track link growth | $0.02/query |
| 19 | On-Page: Full Crawl + Summary | Technical audit | $0.002/page |
| 20 | On-Page: Duplicate Content/Tags | Find duplicate issues | included |
| 21 | On-Page: Lighthouse | Core Web Vitals | $0.002/page |
| 22 | Business Data: Google Reviews | Monitor reviews | $0.004/query |
| 23 | Business Data: Tripadvisor Reviews | Monitor TA reviews | $0.004/query |
| 24 | Business Data: Google Business Info | GMB profile data | $0.003/query |
| 25 | Business Data: Business Listings | Discover businesses | $0.003/query |

### Phase 2: NICE-TO-HAVE (Enhanced Dashboard)

| # | Endpoint | Use Case |
|---|----------|----------|
| 1 | Labs: Keyword Suggestions | Expand keyword research |
| 2 | Labs: Keyword Ideas | Brainstorm content topics |
| 3 | Labs: Keywords for Site | Alternative keyword discovery |
| 4 | Labs: Subdomains | Competitor structure analysis |
| 5 | Labs: Categories for Domain | Understand categorization |
| 6 | Labs: Bulk Traffic Estimation | Quick traffic comparison |
| 7 | Labs: Historical Search Volume | Keyword trend charts |
| 8 | Backlinks: Detailed Backlink List | Full backlink audit |
| 9 | Backlinks: Anchors | Anchor text analysis |
| 10 | Backlinks: Domain Intersection | Link gap opportunities |
| 11 | Backlinks: Competitors | Find link opportunities |
| 12 | Backlinks: Bulk Ranks/Backlinks | Quick comparisons |
| 13 | On-Page: Content Parsing | Content quality audit |
| 14 | On-Page: Redirect Chains | Fix redirect issues |
| 15 | Content Analysis: Search | Brand monitoring |
| 16 | Content Analysis: Sentiment | Reputation tracking |
| 17 | Business Data: Hotel Info | Enrich hotel listings |
| 18 | Business Data: Google Photos | Add photos to listings |
| 19 | Business Data: Q&A | Common questions |
| 20 | Domain Analytics: Technologies | Competitor tech stacks |
| 21 | Domain Analytics: Whois | Domain research |
| 22 | Google Ads: Ad Traffic by Keywords | Paid traffic estimates |
| 23 | SERP: Local Finder | Extended local results |

### Phase 3: FUTURE (Advanced Features)

| # | Endpoint | Use Case |
|---|----------|----------|
| 1 | Content Analysis: Category Trends | Content trending |
| 2 | Content Analysis: Phrase Trends | Emerging topics |
| 3 | Backlinks: Referring Networks | PBN detection |
| 4 | On-Page: Page Screenshot | Visual auditing |
| 5 | SERP: Google Events | Event monitoring |
| 6 | App Data APIs | If app is built |
| 7 | Merchant APIs | E-commerce features |
| 8 | Bing Keyword Data | Bing coverage |

---

## APPENDIX C: COST OPTIMIZATION STRATEGIES

### 1. Batch Operations
- **Google Ads Search Volume**: Up to 700 keywords per task ($0.05) = $0.00007/keyword
- **Bulk Keyword Difficulty**: Up to 1000 keywords per task (~$0.001/kw)
- **Search Intent**: Up to 1000 keywords per task (~$0.001/kw)
- **Bulk Backlink Metrics**: Multiple domains per task (~$0.001/domain)

### 2. Caching Strategy
- Cache Labs data for 24-48 hours (rankings don't change hourly)
- Cache backlink data for 1-7 days
- Cache keyword volumes for 7-30 days (monthly data)
- Cache Google Trends for 24 hours
- Cache On-Page audits for 1-7 days
- Never cache SERP results for tracking (need fresh data for rank tracking)

### 3. Scheduled vs On-Demand
- **Daily**: SERP rank tracking for top 50 keywords (~$0.15/day)
- **Weekly**: Labs domain overview, backlink summary, competitor analysis
- **Monthly**: Full on-page audit, keyword research refresh, bulk keyword difficulty
- **On-demand**: Individual keyword lookups, page audits, business data queries

### 4. Estimated Monthly Budget

| Tier | Description | Est. Cost |
|------|-------------|-----------|
| **Minimal** | Track 50 keywords daily, weekly domain overview, monthly audit | $15-25/month |
| **Standard** | Track 200 keywords daily, full Labs suite weekly, backlinks weekly, monthly audit | $50-80/month |
| **Comprehensive** | Track 500 keywords daily, all endpoints, business data monitoring | $100-200/month |

---

## APPENDIX D: MONTENEGRO-SPECIFIC NOTES

### Location Codes
- **Montenegro (country)**: 2499
- May also have city-level targeting for Podgorica, but Kotor-specific targeting may not be available
- Use `location_name: "Montenegro"` or `location_code: 2499`

### Language Considerations
- Primary: Serbian (`sr`)
- Also useful: English (`en`), Croatian (`hr`), Montenegrin (may map to `sr`)
- Tourist searches will mostly be in English
- Local searches will be in Serbian/Montenegrin/Croatian

### Keyword Strategy
Track keywords in both English and Serbian:
- English: "kotor restaurants", "things to do in kotor", "kotor hotels", "kotor old town"
- Serbian: "restorani kotor", "hoteli kotor", "stari grad kotor"

---

## APPENDIX E: API AUTHENTICATION EXAMPLE

```javascript
// Node.js example
const credentials = Buffer.from('info@kotordirectory.com:YOUR_PASSWORD').toString('base64');

const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([{
    target: 'kotordirectory.com',
    location_code: 2499,
    language_code: 'en',
    limit: 100
  }])
});

const data = await response.json();
```

---

## IMPORTANT VERIFICATION NOTES

> **The pricing figures in this document are approximate estimates based on training data
> from before May 2025. Before implementing:**
>
> 1. Visit https://docs.dataforseo.com/v3/ to verify each endpoint path
> 2. Visit https://dataforseo.com/pricing to confirm current costs
> 3. Test each endpoint with your account to verify available features
> 4. Check your account dashboard at https://app.dataforseo.com for current balance/limits
> 5. Some endpoints may have been added, removed, or renamed since this catalog was compiled
> 6. Rate limits and bulk limits should be verified with your account tier
