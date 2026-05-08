// Pre-written content rewrites by (page, contentType, locale).
//
// Each entry is a hand-crafted rewrite that incorporates the page's
// GSC top queries, value proposition, and locale-natural prose. Generated
// ahead of time using LLM context (covered by the Max subscription) so that
// the implement endpoint runs with zero runtime API tokens.
//
// Adding a new page: add an entry under REWRITES[pagePath]. Each contentType
// must include i18nKey + content for all 7 locales.

const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];

export const REWRITES = {
  // /podgorica-airport
  // Top queries (GSC, 180d):
  //   "car rental podgorica airport"  273 imp pos 73
  //   "car hire podgorica airport"    134 imp pos 71
  //   "podgorica airport car rentals"  74 imp pos 72
  // Strategy: lead with "Car rental at Podgorica Airport" (the dominant query),
  // include TGD code (some users search by code), price + value props.
  '/podgorica-airport': {
    metaDescription: {
      i18nKey: 'podgorica-airport.seoDesc',
      content: {
        en: 'Car rental at Podgorica Airport (TGD): meet at arrivals, full insurance, no shuttle. 11 km from city centre. From €20/day, 28+ Montenegro pickup points.',
        de: 'Mietwagen am Flughafen Podgorica (TGD): Übernahme im Ankunftsbereich, Vollkasko, kein Shuttle. 11 km zum Stadtzentrum. Ab €20/Tag, 28+ Abholorte in Montenegro.',
        fr: "Location de voiture à l'aéroport de Podgorica (TGD) : retrait aux arrivées, assurance complète, sans navette. 11 km du centre. Dès 20 €/jour, 28+ points de prise en charge.",
        it: "Noleggio auto all'aeroporto di Podgorica (TGD): ritiro agli arrivi, assicurazione completa, niente navetta. 11 km dal centro. Da €20/giorno, 28+ punti di ritiro in Montenegro.",
        me: 'Rent a car na aerodromu Podgorica (TGD): preuzimanje na izlazu, puno osiguranje, bez šatla. 11 km od centra grada. Od €20/dan, 28+ mjesta preuzimanja.',
        pl: 'Wypożyczalnia samochodów na lotnisku Podgorica (TGD): odbiór na przylotach, pełne ubezpieczenie, bez busa. 11 km od centrum. Od €20/dzień, 28+ punktów odbioru.',
        ru: 'Аренда авто в аэропорту Подгорица (TGD): получение на выходе, полная страховка, без шаттла. 11 км от центра. От €20/день, 28+ точек получения по Черногории.',
      },
    },
    subtitle: {
      i18nKey: 'podgorica-airport.subtitle',
      content: {
        en: "Pickup at arrivals, drive straight to your destination — no shuttle queues, no off-site lots.",
        de: 'Übernahme im Ankunftsbereich — direkt losfahren, ohne Shuttle und ohne externen Parkplatz.',
        fr: "Retrait aux arrivées, départ immédiat — sans navette, sans parking extérieur.",
        it: "Ritiro agli arrivi e partenza diretta — niente navetta, niente parcheggi esterni.",
        me: 'Preuzimanje na izlazu — direktno do destinacije, bez šatla i bez vanjskog parkinga.',
        pl: 'Odbiór na przylotach, prosto w drogę — bez busa, bez zewnętrznych parkingów.',
        ru: 'Получение на выходе и сразу в путь — без шаттла и удалённой стоянки.',
      },
    },
    title: {
      i18nKey: 'podgorica-airport.title',
      content: {
        en: 'Podgorica Airport Car Rental (TGD)',
        de: 'Mietwagen am Flughafen Podgorica (TGD)',
        fr: "Location de voiture à l'aéroport de Podgorica (TGD)",
        it: "Noleggio auto all'aeroporto di Podgorica (TGD)",
        me: 'Rent a car na aerodromu Podgorica (TGD)',
        pl: 'Wypożyczalnia samochodów na lotnisku Podgorica (TGD)',
        ru: 'Аренда авто в аэропорту Подгорица (TGD)',
      },
    },
  },
};

// Get the rewrite plan for a page.
// Returns { contentTypes: [...], available: bool } summary used by UI.
export function getRewritePlan(pagePath) {
  const entry = REWRITES[pagePath];
  if (!entry) return { available: false, contentTypes: [] };
  return {
    available: true,
    contentTypes: Object.keys(entry).map(ct => ({
      type: ct,
      i18nKey: entry[ct].i18nKey,
      previewEn: entry[ct].content.en,
    })),
  };
}

// Get the full rewrite for application: { i18nKey, content: {locale: text} }
export function getRewrite(pagePath, contentType) {
  return REWRITES[pagePath]?.[contentType] || null;
}

export { LOCALES };
