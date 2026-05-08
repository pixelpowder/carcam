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

// GSC stores queries all-lowercase. Re-cast to Title Case for EN anchor text
// so the rendered link reads naturally in body prose. Small words (in/of/at/
// with/etc.) stay lowercase mid-phrase. Brand and known place names get
// re-cased explicitly so e.g. "TGD" stays uppercase if it appears.
const TITLE_CASE_LOWER = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
function titleCaseEN(text) {
  if (!text) return text;
  const words = text.split(/(\s+)/); // keep whitespace tokens
  return words.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok;
    const lower = tok.toLowerCase();
    // Mid-phrase small words: lowercase. First word always capitalized.
    if (i > 0 && TITLE_CASE_LOWER.has(lower)) return lower;
    // Acronyms: 2-4 chars all alpha → uppercase (TGD, USA, etc.)
    if (/^[a-z]{2,4}$/.test(lower) && /^[A-Z]+$/.test(tok)) return tok;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join('');
}

// Detect if target is an airport so we use "at" (Eng) vs "in"
function isAirport(targetPath) {
  return /-airport$/.test(targetPath);
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
  if (locale === 'en' && gscTopQuery && /\b(car rental|car hire|rent a car)\b/i.test(gscTopQuery)) {
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
