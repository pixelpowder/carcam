// Anchor variants engine.
// Given a target page (path + GSC top query) and a source-page locale,
// returns 5 anchor variants for that target in that locale:
//   1. exact     — the GSC top query, normalised to the source locale's car-rental term
//   2. partial   — partial-match anchor with the location/topic
//   3. branded   — includes the brand voice (Montenegro Car Hire)
//   4. generic   — neutral location/topic name with no rental term
//   5. contextual — a longer descriptive phrase suitable for body prose
//
// Term policy: EN sources get 70/30 split rental/hire across the 5 variants;
// other locales use their single canonical term ("Mietwagen" for DE, "noleggio
// auto" for IT, etc.).

// Canonical car-rental term per locale.
const RENTAL_TERMS = {
  en: { primary: 'car rental', secondary: 'car hire', short: 'rental' },
  de: { primary: 'Mietwagen', secondary: 'Mietwagen', short: 'Mietwagen' },
  fr: { primary: 'location de voiture', secondary: 'location de voiture', short: 'location' },
  it: { primary: 'noleggio auto', secondary: 'noleggio auto', short: 'noleggio' },
  me: { primary: 'rent a car', secondary: 'iznajmljivanje auta', short: 'rent a car' },
  pl: { primary: 'wypożyczalnia samochodów', secondary: 'wynajem samochodów', short: 'wypożyczalnia' },
  ru: { primary: 'аренда авто', secondary: 'прокат авто', short: 'аренда' },
};

// "in" preposition per locale (for "rental in X" patterns)
const PREP_IN = {
  en: 'in', de: 'in', fr: 'à', it: 'a', me: 'u', pl: 'w', ru: 'в',
};

// "at" preposition per locale (for airports — "rental at X airport")
const PREP_AT = {
  en: 'at', de: 'am', fr: 'à', it: 'a', me: 'na', pl: 'na', ru: 'в',
};

const BRAND = 'Montenegro Car Hire';
const SITE_DOMAIN = 'montenegrocarhire.com';

// Locale-aware generic ("click here") anchors. These act as deliberate
// keyword-light anchors in the diversification mix.
const GENERIC_ANCHORS = {
  en: ['here', 'this guide', 'more details', 'see the page', 'read more'],
  de: ['hier', 'mehr Details', 'mehr erfahren', 'die Seite ansehen', 'weiter lesen'],
  fr: ['ici', 'plus de détails', 'en savoir plus', 'voir la page', 'lire plus'],
  it: ['qui', 'più dettagli', 'scopri di più', 'vedi la pagina', 'leggi di più'],
  me: ['ovdje', 'više detalja', 'saznaj više', 'pogledaj stranicu', 'pročitaj više'],
  pl: ['tutaj', 'więcej szczegółów', 'dowiedz się więcej', 'zobacz stronę', 'czytaj dalej'],
  ru: ['здесь', 'подробнее', 'узнать больше', 'смотреть страницу', 'читать далее'],
};

// Locale-specific location-name overrides. Most are identical; only a few
// languages decline location names (Slavic in particular).
// Format: { locale: { '/path': displayName } }
const LOCATION_NAMES = {
  en: {
    '/kotor': 'Kotor', '/budva': 'Budva', '/tivat': 'Tivat', '/podgorica': 'Podgorica',
    '/perast': 'Perast', '/herceg-novi': 'Herceg Novi', '/ulcinj': 'Ulcinj',
    '/bar': 'Bar', '/niksic': 'Nikšić', '/montenegro': 'Montenegro',
    '/podgorica-airport': 'Podgorica Airport', '/tivat-airport': 'Tivat Airport',
    '/dubrovnik-airport': 'Dubrovnik Airport',
  },
  de: {
    '/kotor': 'Kotor', '/budva': 'Budva', '/tivat': 'Tivat', '/podgorica': 'Podgorica',
    '/perast': 'Perast', '/herceg-novi': 'Herceg Novi', '/ulcinj': 'Ulcinj',
    '/bar': 'Bar', '/niksic': 'Nikšić', '/montenegro': 'Montenegro',
    '/podgorica-airport': 'Flughafen Podgorica', '/tivat-airport': 'Flughafen Tivat',
    '/dubrovnik-airport': 'Flughafen Dubrovnik',
  },
  fr: {
    '/kotor': 'Kotor', '/budva': 'Budva', '/tivat': 'Tivat', '/podgorica': 'Podgorica',
    '/perast': 'Perast', '/herceg-novi': 'Herceg Novi', '/ulcinj': 'Ulcinj',
    '/bar': 'Bar', '/niksic': 'Nikšić', '/montenegro': 'Monténégro',
    '/podgorica-airport': "aéroport de Podgorica", '/tivat-airport': "aéroport de Tivat",
    '/dubrovnik-airport': "aéroport de Dubrovnik",
  },
  it: {
    '/kotor': 'Cattaro', '/budva': 'Budva', '/tivat': 'Teodo', '/podgorica': 'Podgorica',
    '/perast': 'Perasto', '/herceg-novi': 'Castelnuovo', '/ulcinj': 'Dulcigno',
    '/bar': 'Antivari', '/niksic': 'Nikšić', '/montenegro': 'Montenegro',
    '/podgorica-airport': 'aeroporto di Podgorica', '/tivat-airport': 'aeroporto di Tivat',
    '/dubrovnik-airport': 'aeroporto di Dubrovnik',
  },
  me: {
    '/kotor': 'Kotor', '/budva': 'Budva', '/tivat': 'Tivat', '/podgorica': 'Podgorica',
    '/perast': 'Perast', '/herceg-novi': 'Herceg Novi', '/ulcinj': 'Ulcinj',
    '/bar': 'Bar', '/niksic': 'Nikšić', '/montenegro': 'Crna Gora',
    '/podgorica-airport': 'aerodrom Podgorica', '/tivat-airport': 'aerodrom Tivat',
    '/dubrovnik-airport': 'aerodrom Dubrovnik',
  },
  pl: {
    '/kotor': 'Kotor', '/budva': 'Budva', '/tivat': 'Tivat', '/podgorica': 'Podgorica',
    '/perast': 'Perast', '/herceg-novi': 'Herceg Novi', '/ulcinj': 'Ulcinj',
    '/bar': 'Bar', '/niksic': 'Nikšić', '/montenegro': 'Czarnogóra',
    '/podgorica-airport': 'lotnisko Podgorica', '/tivat-airport': 'lotnisko Tivat',
    '/dubrovnik-airport': 'lotnisko Dubrownik',
  },
  ru: {
    '/kotor': 'Котор', '/budva': 'Будва', '/tivat': 'Тиват', '/podgorica': 'Подгорица',
    '/perast': 'Пераст', '/herceg-novi': 'Херцег-Нови', '/ulcinj': 'Улцинь',
    '/bar': 'Бар', '/niksic': 'Никшич', '/montenegro': 'Черногория',
    '/podgorica-airport': 'аэропорт Подгорица', '/tivat-airport': 'аэропорт Тиват',
    '/dubrovnik-airport': 'аэропорт Дубровник',
  },
};

function locationName(targetPath, locale) {
  return LOCATION_NAMES[locale]?.[targetPath]
    || LOCATION_NAMES.en[targetPath]
    || targetPath.replace(/^\//, '').replace(/-/g, ' ');
}

// GSC stores queries all-lowercase. Re-cast for natural body prose: only
// proper nouns get capitalized, common nouns ("car rental", "hire") stay
// lowercase. This produces anchors that flow inside sentences (e.g.
// "Podgorica Airport car rentals" rather than the brand-y "Podgorica
// Airport Car Rentals" that title case produced).
const PROPER_NOUNS = new Set([
  'kotor', 'budva', 'tivat', 'podgorica', 'perast',
  'herceg', 'novi', 'ulcinj', 'bar', 'niksic',
  'montenegro', 'dubrovnik', 'cetinje', 'ostrog',
  'durmitor', 'lovcen', 'biogradska', 'skadar',
  'airport',  // capitalised when adjacent to a city name (handled below)
  'bay',      // "Bay of Kotor"
]);
const ACRONYMS = new Set(['tgd', 'tiv', 'dbv', 'usa', 'eu', 'uk']);
const ALWAYS_UPPER = new Set(['Montenegro Car Hire']); // brand string
function titleCaseEN(text) {
  if (!text) return text;
  // Brand replacement first — it's case-insensitive in GSC but should be
  // properly cased in the rendered anchor.
  let out = text;
  for (const brand of ALWAYS_UPPER) {
    out = out.replace(new RegExp(brand, 'gi'), brand);
  }
  const words = out.split(/(\s+)/);
  return words.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    const lower = tok.toLowerCase();
    const stripped = lower.replace(/[^a-zа-яё]/gi, ''); // ignore punctuation for matching
    // Acronyms: capitalize fully
    if (ACRONYMS.has(stripped)) return tok.toUpperCase();
    // Proper nouns: capitalize first letter
    if (PROPER_NOUNS.has(stripped)) return lower.charAt(0).toUpperCase() + lower.slice(1);
    // Special: "airport" capitalized only when preceded by a city proper noun
    if (stripped === 'airport') {
      // Look at previous non-whitespace token
      for (let j = i - 1; j >= 0; j--) {
        if (/^\s+$/.test(words[j])) continue;
        const prev = words[j].toLowerCase().replace(/[^a-z]/g, '');
        if (PROPER_NOUNS.has(prev)) return lower.charAt(0).toUpperCase() + lower.slice(1);
        break;
      }
      return lower; // standalone "airport" → lowercase
    }
    // Everything else: keep lowercase. NO first-word-cap because anchors are
    // typically inline mid-sentence, not standalone.
    return lower;
  }).join('');
}

// Detect if target is an airport so we use "at" (Eng) vs "in"
function isAirport(targetPath) {
  return /-airport$/.test(targetPath);
}

// Detect ungrammatical EN search queries that read fine as a Google query but
// awkwardly as anchor text. Pattern: "rental term + location" with no
// preposition between them. e.g. "car hire podgorica airport" — users search
// it that way, but writing it inside body copy reads robotic and matches the
// over-optimised anchor pattern Google's spam policy flags. We drop these
// from the longtail pool (the contextual variant covers the same query
// semantically with natural phrasing like "car hire at Podgorica Airport").
const RENTAL_HEAD_RE = /^(car rentals?|car hires?|rent\s+(?:a\s+)?cars?|car\s+rent)\s+/i;
const PREPOSITION_RE = /^(at|in|near|from|to|with|around|by|for|inside|outside|of)\s+/i;
function isUngrammaticalLongtail(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  // Must start with a rental term
  if (!RENTAL_HEAD_RE.test(t)) return false;
  const tail = t.replace(RENTAL_HEAD_RE, '');
  if (!tail) return false;
  // If a preposition immediately follows the rental term, it's natural English
  if (PREPOSITION_RE.test(tail)) return false;
  // Otherwise: rental term directly followed by a noun/location → ungrammatical
  return true;
}

// Generate the FULL anchor variant pool for a (target, locale) pair.
// Returns 10-15 variants spread across types: exact, partial, branded, generic
// (page name only), contextual, longtail (GSC-derived), nakedUrl, and weak
// (locale-aware "here" / "more details").
//
// The picker (pickVariantForEdge) then assigns ONE variant per inbound edge —
// hash-stable so re-runs are deterministic but distributing across the pool.
//
// Param `gscQueries` should be an array of { query, impressions } sorted by
// impressions desc — typically the target's queries with imp ≥ 3.
export function generateAnchorVariants(targetPath, locale, gscTopQuery, gscQueries = []) {
  const terms = RENTAL_TERMS[locale] || RENTAL_TERMS.en;
  const loc = locationName(targetPath, locale);
  const inPrep = PREP_IN[locale] || 'in';
  const atPrep = PREP_AT[locale] || 'at';
  const isAir = isAirport(targetPath);

  // Variants — start with the simple case and let locale shape the wording
  // EN: 70/30 rental/hire — variants 1-3 use rental, variants 4-5 use hire/generic
  // Other locales: one canonical term across all variants
  const useHire = locale === 'en';

  const variants = [];

  // 1. EXACT — use GSC top query if it's in this locale's language; else generate
  // For EN sources, GSC English queries map directly; for other locales we
  // generate a fresh exact match using the canonical term + location.
  // Use the GSC top query directly only if it reads as natural English.
  // Ungrammatical queries (e.g. "car hire podgorica airport" — missing
  // preposition) fall through to the constructed pattern below, which uses
  // proper grammar with "at"/"in" while preserving keyword density.
  if (locale === 'en' && gscTopQuery && /\b(car rental|car hire|rent a car)\b/i.test(gscTopQuery) && !isUngrammaticalLongtail(gscTopQuery)) {
    variants.push({ label: 'exact', term: 'rental', text: titleCaseEN(gscTopQuery) });
  } else {
    variants.push({
      label: 'exact', term: 'primary',
      text: isAir
        ? `${terms.primary} ${atPrep} ${loc}`
        : `${terms.primary} ${inPrep} ${loc}`,
    });
  }

  // 2. PARTIAL — flip word order or shorten
  variants.push({
    label: 'partial', term: 'short',
    text: locale === 'en'
      ? (isAir ? `${loc} ${terms.short}` : `${loc} ${terms.short}`)
      : (isAir ? `${loc} ${terms.short}` : `${loc} ${terms.short}`),
  });

  // 3. BRANDED — include the brand
  variants.push({
    label: 'branded', term: 'primary',
    text: locale === 'en'
      ? (isAir
          ? `${terms.primary} ${atPrep} ${loc} with ${BRAND}`
          : `${terms.primary} ${inPrep} ${loc} with ${BRAND}`)
      : (isAir
          ? `${terms.primary} ${atPrep} ${loc} — ${BRAND}`
          : `${terms.primary} ${inPrep} ${loc} — ${BRAND}`),
  });

  // 4. GENERIC — just the location name (or destination phrase) with no rental term
  variants.push({ label: 'generic', term: 'none', text: loc });

  // 5. CONTEXTUAL — longer descriptive phrase usable inline in body copy
  if (isAir) {
    variants.push({
      label: 'contextual', term: useHire ? 'secondary' : 'primary',
      text: locale === 'en'
        ? `${terms.secondary} ${atPrep} ${loc}`
        : `${terms.primary} ${atPrep} ${loc}`,
    });
  } else {
    variants.push({
      label: 'contextual', term: useHire ? 'secondary' : 'primary',
      text: locale === 'en'
        ? `${terms.secondary} ${inPrep} ${loc}`
        : `${terms.primary} ${inPrep} ${loc}`,
    });
  }

  // 6+. LONGTAIL variants from GSC — one per high-impression query that's
  // distinct from variants we already have. These bring real query diversity
  // (different word orders, modifiers like "tgd", "rent a car", etc.).
  // Only EN locale gets these directly since GSC queries for non-EN locales
  // tend to be in the page's locale already (mietwagen, noleggio, etc.)
  // and we want to keep the matrix coherent.
  if (locale === 'en' && Array.isArray(gscQueries)) {
    const seen = new Set(variants.map(v => v.text.toLowerCase()));
    let added = 0;
    for (const q of gscQueries) {
      const text = q.query?.toLowerCase().trim();
      if (!text || seen.has(text)) continue;
      // Skip non-English queries (mietwagen, noleggio, location voiture, etc.)
      if (/\b(mietwagen|noleggio|location|alquiler|locazione|wynajem|аренда|прокат|wypożyczalnia)\b/i.test(text)) continue;
      // Skip ungrammatical EN queries — they're a real search pattern but
      // awkward as anchor text; the contextual variant handles the same
      // query semantically with natural phrasing.
      if (isUngrammaticalLongtail(text)) continue;
      variants.push({ label: 'longtail', term: 'gsc', text: titleCaseEN(text) });
      seen.add(text);
      added++;
      if (added >= 4) break;
    }
  }

  // 7. NAKED URL — url-as-anchor (highly natural, appears in citations/footnotes)
  variants.push({
    label: 'nakedUrl', term: 'none',
    text: `${SITE_DOMAIN}${targetPath}`,
  });

  // 8. WEAK / GENERIC — locale-aware "here" / "more details". Use 2 of these
  // to dilute keyword density.
  const weak = GENERIC_ANCHORS[locale] || GENERIC_ANCHORS.en;
  variants.push({ label: 'weak', term: 'none', text: weak[0] });
  variants.push({ label: 'weak', term: 'none', text: weak[1] });

  return variants;
}

// Assign UNIQUE variants across N candidate edges that all link to the same
// target. We sort candidate sources stably (by sourcePage), then round-robin
// through the variant pool, prioritising in this order:
//   exact → longtail → partial → branded → contextual → generic → nakedUrl → weak
// This produces a deliberately varied anchor profile per target. If there are
// more candidates than variants, we cycle but warn (rare given pool ~10-15).
const VARIANT_PRIORITY = ['exact', 'longtail', 'partial', 'branded', 'contextual', 'generic', 'nakedUrl', 'weak'];

// `anchorTextCounts` is the sitewide map from crawlLinkGraph (or live crawl)
// keyed by `${text.toLowerCase()}::${target}` → existing usage count.
// Strategy: sort variants by sitewide-usage ASC (least-used first) within
// the priority bands. So variants Google has never seen pointing at this
// target get used before ones that already appear 100+ times in nav/footer.
export function assignVariantsToEdges(targetPath, locale, gscTopQuery, gscQueries, sourcePages, anchorTextCounts = {}) {
  const variants = generateAnchorVariants(targetPath, locale, gscTopQuery, gscQueries);
  // Annotate each with sitewide usage
  const annotated = variants.map(v => ({
    ...v,
    sitewideUsage: anchorTextCounts[`${v.text.toLowerCase()}::${targetPath}`] || 0,
  }));
  // Order: priority band first, then within each band by sitewide-usage ASC
  const priorityIndex = (label) => {
    const idx = VARIANT_PRIORITY.indexOf(label);
    return idx === -1 ? 99 : idx;
  };
  const ordered = annotated
    .slice()
    .sort((a, b) => (priorityIndex(a.label) - priorityIndex(b.label)) || (a.sitewideUsage - b.sitewideUsage));

  const sources = [...sourcePages].sort();
  const assignments = {};
  for (let i = 0; i < sources.length; i++) {
    assignments[sources[i]] = ordered[i % ordered.length];
  }
  return { assignments, variants: ordered };
}

// Backward-compatible single-edge picker — used when we just need one variant
// for a specific edge without the round-robin context.
export function pickVariantForEdge(sourcePage, targetPath, locale, gscTopQuery, gscQueries = []) {
  const variants = generateAnchorVariants(targetPath, locale, gscTopQuery, gscQueries);
  const key = `${sourcePage}->${targetPath}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return variants[Math.abs(h) % variants.length];
}
