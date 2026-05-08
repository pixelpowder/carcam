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
        en: 'Podgorica Airport Car Rental',
        de: 'Mietwagen am Flughafen Podgorica',
        fr: "Location de voiture à l'aéroport de Podgorica",
        it: "Noleggio auto all'aeroporto di Podgorica",
        me: 'Rent a car na aerodromu Podgorica',
        pl: 'Wypożyczalnia samochodów na lotnisku Podgorica',
        ru: 'Аренда авто в аэропорту Подгорица',
      },
    },
    bodyHeadline: {
      i18nKey: 'podgoricaAirportBody.h1',
      content: {
        en: 'Car Rental at Podgorica Airport: Pickup at Arrivals',
        de: 'Mietwagen am Flughafen Podgorica: Übernahme im Ankunftsbereich',
        fr: "Location de voiture à l'aéroport de Podgorica : retrait aux arrivées",
        it: "Noleggio auto all'aeroporto di Podgorica: ritiro agli arrivi",
        me: 'Rent a car na aerodromu Podgorica: preuzimanje na izlazu iz aviona',
        pl: 'Wypożyczalnia samochodów na lotnisku Podgorica: odbiór na przylotach',
        ru: 'Аренда авто в аэропорту Подгорица: получение при прилёте',
      },
    },
    bodyIntro1: {
      i18nKey: 'podgoricaAirportBody.p1',
      content: {
        en: "Renting a car at Podgorica Airport (TGD) is the fastest way out of arrivals. We meet you at the gate, the car is parked outside the terminal, and you're on the road within ten minutes. No shuttle bus, no off-site parking lot, no queueing at a counter.",
        de: 'Ein Mietwagen am Flughafen Podgorica (TGD) ist der schnellste Weg vom Gate auf die Straße. Wir empfangen Sie im Ankunftsbereich, der Wagen steht direkt vor dem Terminal — innerhalb von zehn Minuten sind Sie unterwegs. Kein Shuttle, kein externer Parkplatz, keine Schlange am Schalter.',
        fr: "Louer une voiture à l'aéroport de Podgorica (TGD) est le moyen le plus rapide de quitter les arrivées. Nous vous accueillons à la porte, la voiture est garée devant le terminal — vous êtes en route en dix minutes. Pas de navette, pas de parking extérieur, pas de file d'attente.",
        it: "Noleggiare un'auto all'aeroporto di Podgorica (TGD) è il modo più rapido di lasciare gli arrivi. Vi accogliamo al gate, l'auto è parcheggiata davanti al terminal: in dieci minuti siete in viaggio. Niente navetta, niente parcheggi esterni, niente code al banco.",
        me: 'Rent a car na aerodromu Podgorica (TGD) je najbrži način da napustite zonu dolazaka. Dočekujemo vas na izlazu, automobil je parkiran ispred terminala — za deset minuta ste na putu. Bez šatla, bez vanjskog parkinga, bez čekanja na šalteru.',
        pl: 'Wypożyczenie samochodu na lotnisku Podgorica (TGD) to najszybsza droga z przylotów. Czekamy na was przy bramce, samochód stoi przed terminalem — w dziesięć minut ruszacie w drogę. Bez busa, bez zewnętrznego parkingu, bez kolejki przy kasie.',
        ru: 'Аренда авто в аэропорту Подгорица (TGD) — самый быстрый способ выйти из зоны прилёта. Мы встречаем вас у выхода, машина припаркована у терминала — через десять минут вы уже в пути. Без шаттла, без удалённой стоянки, без очереди у стойки.',
      },
    },
    bodyIntro2: {
      i18nKey: 'podgoricaAirportBody.p2',
      content: {
        en: "TGD is Montenegro's main international hub: 11 km south of Podgorica city centre, year-round flights, and direct road access north to Ostrog and Durmitor or south to the coast. From the airport carpark you can be in Kotor in 90 minutes or at Skadar Lake in under an hour.",
        de: 'TGD ist Montenegros wichtigstes internationales Drehkreuz: 11 km südlich des Stadtzentrums von Podgorica, ganzjährig Flüge, direkter Straßenanschluss nach Norden Richtung Ostrog und Durmitor oder südlich zur Küste. Vom Flughafenparkplatz erreichen Sie Kotor in 90 Minuten und den Skadar-See in unter einer Stunde.',
        fr: "TGD est le principal hub international du Monténégro : 11 km au sud du centre-ville de Podgorica, vols toute l'année, accès routier direct au nord vers Ostrog et Durmitor, ou au sud vers la côte. Depuis le parking de l'aéroport, vous êtes à Kotor en 90 minutes et au lac de Skadar en moins d'une heure.",
        it: "TGD è il principale hub internazionale del Montenegro: 11 km a sud del centro di Podgorica, voli tutto l'anno, accesso stradale diretto verso nord a Ostrog e Durmitor o verso la costa. Dal parcheggio dell'aeroporto raggiungete Cattaro in 90 minuti e il lago di Scutari in meno di un'ora.",
        me: 'TGD je glavni međunarodni čvor Crne Gore: 11 km južno od centra Podgorice, letovi tokom cijele godine, direktan put na sjever ka Ostrogu i Durmitoru ili na jug ka primorju. Sa parkinga aerodroma do Kotora ste za 90 minuta, do Skadarskog jezera za manje od sat.',
        pl: 'TGD to główny hub międzynarodowy Czarnogóry: 11 km na południe od centrum Podgoricy, loty przez cały rok, bezpośredni dojazd na północ do Ostrogu i Durmitoru lub na południe na wybrzeże. Z parkingu lotniska do Kotoru jest 90 minut, do jeziora Skadar mniej niż godzina.',
        ru: 'TGD — главный международный хаб Черногории: 11 км к югу от центра Подгорицы, рейсы круглый год, прямой выезд на север к Острогу и Дурмитору или на юг к побережью. С парковки аэропорта до Котора 90 минут, до Скадарского озера — менее часа.',
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
