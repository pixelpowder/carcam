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

// Per-page outline: i18n keys in the order they appear on the rendered page.
// Used to show full-page side-by-side diffs (current vs proposed) so users
// can see how rewrites flow with surrounding unchanged content.
export const PAGE_OUTLINES = {
  '/podgorica-airport': [
    { key: 'podgorica-airport.title', label: 'Page title (<title>)', kind: 'meta' },
    { key: 'podgorica-airport.subtitle', label: 'Hero subtitle', kind: 'subtitle' },
    { key: 'podgorica-airport.seoDesc', label: 'Meta description', kind: 'meta' },
    { key: 'podgoricaAirportBody.h1', label: 'H2 — page headline', kind: 'h2' },
    { key: 'podgoricaAirportBody.p1', label: 'Intro paragraph 1', kind: 'p' },
    { key: 'podgoricaAirportBody.p2', label: 'Intro paragraph 2', kind: 'p' },
    { key: 'podgoricaAirportBody.distancesTitle', label: 'H2 — distances', kind: 'h2' },
    { key: 'podgoricaAirportBody.distIntro', label: 'Distances intro', kind: 'p' },
    { key: 'podgoricaAirportBody.dist1', label: 'Distance bullet 1', kind: 'li' },
    { key: 'podgoricaAirportBody.dist2', label: 'Distance bullet 2', kind: 'li' },
    { key: 'podgoricaAirportBody.dist3', label: 'Distance bullet 3', kind: 'li' },
    { key: 'podgoricaAirportBody.dist4', label: 'Distance bullet 4', kind: 'li' },
    { key: 'podgoricaAirportBody.drivingLinkPre', label: 'Driving guide link prefix', kind: 'inline' },
    { key: 'podgoricaAirportBody.drivingLinkText', label: 'Driving guide link text', kind: 'inline' },
    { key: 'podgoricaAirportBody.drivingLinkPost', label: 'Driving guide link suffix', kind: 'inline' },
    { key: 'podgoricaAirportBody.flightsTitle', label: 'H2 — flights', kind: 'h2' },
    { key: 'podgoricaAirportBody.flightsText', label: 'Flights paragraph', kind: 'p' },
    { key: 'podgoricaAirportBody.facilitiesTitle', label: 'H2 — facilities', kind: 'h2' },
    { key: 'podgoricaAirportBody.facilitiesText', label: 'Facilities paragraph', kind: 'p' },
    { key: 'podgoricaAirportBody.awardText', label: 'Award paragraph', kind: 'p' },
    { key: 'podgoricaAirportBody.rentalTitle', label: 'H2 — rental', kind: 'h2' },
    { key: 'podgoricaAirportBody.rentalText', label: 'Rental paragraph', kind: 'p' },
  ],
};

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
    distancesTitle: {
      i18nKey: 'podgoricaAirportBody.distancesTitle',
      content: {
        en: 'Pickup Location & Drive Times',
        de: 'Übernahmeort & Fahrzeiten',
        fr: 'Lieu de prise en charge & temps de trajet',
        it: 'Luogo di ritiro e tempi di percorrenza',
        me: 'Mjesto preuzimanja i vrijeme vožnje',
        pl: 'Miejsce odbioru i czasy przejazdu',
        ru: 'Место получения и время в пути',
      },
    },
    distIntro: {
      i18nKey: 'podgoricaAirportBody.distIntro',
      content: {
        en: 'Your rental car is parked outside the terminal — no shuttle, no off-site lot. From the rental space to the highway exit takes about three minutes. Drive times below assume normal traffic and the E80/E65 routes.',
        de: 'Ihr Mietwagen steht direkt vor dem Terminal — kein Shuttle, kein externer Parkplatz. Vom Stellplatz bis zur Autobahnauffahrt sind es etwa drei Minuten. Die Fahrzeiten unten gehen von normalem Verkehr und den E80/E65-Routen aus.',
        fr: "Votre voiture de location est garée devant le terminal — pas de navette, pas de parking extérieur. Du stationnement à la sortie d'autoroute, comptez environ trois minutes. Les temps de trajet ci-dessous supposent une circulation normale et les routes E80/E65.",
        it: "L'auto a noleggio è parcheggiata davanti al terminal: niente navetta, niente parcheggi esterni. Dal posto auto all'imbocco dell'autostrada bastano circa tre minuti. I tempi qui sotto presuppongono traffico normale sulle E80/E65.",
        me: 'Vaš rent-a-car je parkiran ispred terminala — bez šatla, bez vanjskog parkinga. Od mjesta parkinga do izlaza na autoput treba oko tri minute. Vremena vožnje u nastavku računaju na uobičajeni saobraćaj i rute E80/E65.',
        pl: 'Wasz samochód z wypożyczalni stoi przed terminalem — bez busa, bez zewnętrznego parkingu. Od miejsca parkowania do zjazdu na autostradę to około trzy minuty. Czasy przejazdu poniżej zakładają normalny ruch i trasy E80/E65.',
        ru: 'Ваш арендованный автомобиль припаркован у терминала — без шаттла, без удалённой стоянки. От места парковки до выезда на трассу около трёх минут. Указанное ниже время рассчитано на обычный трафик по маршрутам E80/E65.',
      },
    },
    dist1: {
      i18nKey: 'podgoricaAirportBody.dist1',
      content: {
        en: 'Podgorica city centre — 12 km / 15 min via the M2.4 ring road',
        de: 'Stadtzentrum Podgorica — 12 km / 15 Min. über die Ringstraße M2.4',
        fr: 'Centre-ville de Podgorica — 12 km / 15 min par le périphérique M2.4',
        it: 'Centro di Podgorica — 12 km / 15 min sulla circonvallazione M2.4',
        me: 'Centar Podgorice — 12 km / 15 min preko obilaznice M2.4',
        pl: 'Centrum Podgoricy — 12 km / 15 min obwodnicą M2.4',
        ru: 'Центр Подгорицы — 12 км / 15 мин по объездной M2.4',
      },
    },
    dist2: {
      i18nKey: 'podgoricaAirportBody.dist2',
      content: {
        en: 'Budva and the coast — 60 km / 60-75 min via the E80 highway',
        de: 'Budva und die Küste — 60 km / 60-75 Min. über die E80',
        fr: 'Budva et la côte — 60 km / 60-75 min par la E80',
        it: 'Budva e la costa — 60 km / 60-75 min sulla E80',
        me: 'Budva i obala — 60 km / 60-75 min autoputem E80',
        pl: 'Budva i wybrzeże — 60 km / 60-75 min autostradą E80',
        ru: 'Будва и побережье — 60 км / 60-75 мин по трассе E80',
      },
    },
    dist3: {
      i18nKey: 'podgoricaAirportBody.dist3',
      content: {
        en: 'Kolašin (mountains) — 80 km / 75 min via the E65 north — gateway to Biogradska Gora',
        de: 'Kolašin (Berge) — 80 km / 75 Min. nach Norden über die E65 — Tor zu Biogradska Gora',
        fr: 'Kolašin (montagnes) — 80 km / 75 min par la E65 vers le nord — porte de Biogradska Gora',
        it: 'Kolašin (montagne) — 80 km / 75 min verso nord sulla E65 — porta di Biogradska Gora',
        me: 'Kolašin (planine) — 80 km / 75 min na sjever putem E65 — ulaz u Biogradsku goru',
        pl: 'Kolašin (góry) — 80 km / 75 min na północ trasą E65 — wrota Biogradskiej Gory',
        ru: 'Колашин (горы) — 80 км / 75 мин на север по E65 — ворота в Биоградску Гору',
      },
    },
    dist4: {
      i18nKey: 'podgoricaAirportBody.dist4',
      content: {
        en: 'Žabljak (Durmitor) — 170 km / 3.5 hours via the E65 + Šavnik pass',
        de: 'Žabljak (Durmitor) — 170 km / 3,5 Std. über die E65 und den Šavnik-Pass',
        fr: 'Žabljak (Durmitor) — 170 km / 3 h 30 par la E65 et le col de Šavnik',
        it: 'Žabljak (Durmitor) — 170 km / 3,5 ore sulla E65 e il passo di Šavnik',
        me: 'Žabljak (Durmitor) — 170 km / 3,5 sata putem E65 i preko Šavničkog prevoja',
        pl: 'Žabljak (Durmitor) — 170 km / 3,5 godz. trasą E65 i przez przełęcz Šavnik',
        ru: 'Жабляк (Дурмитор) — 170 км / 3,5 часа по E65 и через перевал Шавник',
      },
    },
    flightsText: {
      i18nKey: 'podgoricaAirportBody.flightsText',
      content: {
        en: "International flights connect Podgorica daily to Belgrade and regularly to Paris, Rome, Frankfurt, Vienna, Budapest, and Ljubljana. Whether you arrive mid-morning or late at night, your rental car waits at arrivals — no scheduled shuttle to catch.",
        de: 'Internationale Flüge verbinden Podgorica täglich mit Belgrad und regelmäßig mit Paris, Rom, Frankfurt, Wien, Budapest und Ljubljana. Egal ob Sie vormittags oder spätabends ankommen — Ihr Mietwagen wartet im Ankunftsbereich, ohne Shuttle-Fahrplan.',
        fr: "Des vols internationaux relient Podgorica quotidiennement à Belgrade et régulièrement à Paris, Rome, Francfort, Vienne, Budapest et Ljubljana. Que vous arriviez en milieu de matinée ou tard le soir, votre voiture de location vous attend aux arrivées, sans navette à attraper.",
        it: "Voli internazionali collegano Podgorica ogni giorno a Belgrado e regolarmente a Parigi, Roma, Francoforte, Vienna, Budapest e Lubiana. Che arriviate a metà mattina o a tarda sera, l'auto a noleggio vi aspetta agli arrivi: niente navette da prendere.",
        me: 'Međunarodni letovi povezuju Podgoricu svakodnevno sa Beogradom i redovno sa Parizom, Rimom, Frankfurtom, Bečom, Budimpeštom i Ljubljanom. Bilo da slijećete prije podne ili kasno uveče, vaš rent-a-car čeka na izlazu — bez šatla po rasporedu.',
        pl: 'Loty międzynarodowe łączą Podgoricę codziennie z Belgradem i regularnie z Paryżem, Rzymem, Frankfurtem, Wiedniem, Budapesztem i Lublaną. Bez względu na to, czy lądujecie przed południem czy późnym wieczorem, samochód czeka przy przylotach — bez busa do złapania.',
        ru: 'Международные рейсы связывают Подгорицу с Белградом ежедневно и регулярно с Парижем, Римом, Франкфуртом, Веной, Будапештом и Любляной. Прилетаете утром или поздно вечером — арендованная машина ждёт в зоне прилёта, шаттл не нужен.',
      },
    },
    facilitiesText1: {
      i18nKey: 'podgoricaAirportBody.facilitiesText',
      content: {
        en: "The terminal is small enough that the walk from arrivals to your rental car takes under five minutes. Cafés, currency exchange, and an ATM sit between the customs exit and the carpark. There's a duty-free shop in departures if you want to grab gifts on the way out.",
        de: 'Das Terminal ist so klein, dass der Weg vom Ankunftsbereich zum Mietwagen unter fünf Minuten dauert. Cafés, eine Wechselstube und ein Geldautomat liegen zwischen dem Zollausgang und dem Parkplatz. Im Abflugbereich gibt es einen Duty-Free-Shop für letzte Mitbringsel.',
        fr: "Le terminal est assez petit pour que la marche des arrivées à votre voiture prenne moins de cinq minutes. Cafés, bureau de change et distributeur se trouvent entre la sortie des douanes et le parking. Une boutique hors taxes au départ pour les souvenirs.",
        it: "Il terminal è abbastanza piccolo che dal banco arrivi all'auto si arriva a piedi in meno di cinque minuti. Caffetterie, cambio valuta e bancomat si trovano tra l'uscita dogana e il parcheggio. In partenze c'è un duty-free per gli ultimi acquisti.",
        me: 'Terminal je dovoljno mali da od izlaza do rent-a-car automobila pješke stignete za manje od pet minuta. Kafići, mjenjačnica i bankomat su između carinskog izlaza i parkinga. U odlascima postoji duty-free ako želite ponijeti poklone.',
        pl: 'Terminal jest na tyle mały, że spacer od przylotów do samochodu zajmuje poniżej pięciu minut. Kawiarnie, kantor i bankomat są między wyjściem z odprawy a parkingiem. W odlotach jest sklep wolnocłowy na pamiątki.',
        ru: 'Терминал небольшой — путь от выхода с прилёта до арендованного авто пешком занимает менее пяти минут. Кафе, обменник и банкомат — между таможенным выходом и парковкой. В зоне вылета есть duty-free, если хочется захватить подарки.',
      },
    },
    rentalTitle: {
      i18nKey: 'podgoricaAirportBody.rentalTitle',
      content: {
        en: 'Rental Pickup at Podgorica Airport',
        de: 'Mietwagen-Übernahme am Flughafen Podgorica',
        fr: "Prise en charge à l'aéroport de Podgorica",
        it: "Ritiro auto all'aeroporto di Podgorica",
        me: 'Preuzimanje auta na aerodromu Podgorica',
        pl: 'Odbiór samochodu na lotnisku Podgorica',
        ru: 'Получение авто в аэропорту Подгорица',
      },
    },
    rentalText: {
      i18nKey: 'podgoricaAirportBody.rentalText',
      content: {
        en: "We meet you at the arrivals hall with a sign and your rental keys. No counter queue, no shuttle to an off-site lot — the car is parked steps from the terminal door. Within minutes of clearing customs you're on the M2.4 heading wherever you need to go. Drop-off works the same way: park, hand over the keys, walk to departures.",
        de: 'Wir empfangen Sie im Ankunftsbereich mit Schild und Mietwagenschlüssel. Keine Schlange am Schalter, kein Shuttle zu einem externen Parkplatz — der Wagen steht ein paar Schritte vor der Terminaltür. Wenige Minuten nach dem Zoll sind Sie auf der M2.4 unterwegs zu Ihrem Ziel. Die Rückgabe läuft genauso: parken, Schlüssel übergeben, zur Abflughalle gehen.',
        fr: "Nous vous accueillons aux arrivées avec un panneau et les clés de votre voiture. Pas de file au comptoir, pas de navette vers un parking extérieur — la voiture est garée à quelques pas de la porte du terminal. Quelques minutes après les douanes, vous êtes sur la M2.4 en route. Le retour fonctionne de la même façon : se garer, rendre les clés, marcher jusqu'aux départs.",
        it: "Vi accogliamo agli arrivi con un cartello e le chiavi dell'auto. Niente coda al banco, niente navetta verso un parcheggio esterno: l'auto è parcheggiata a pochi passi dalla porta del terminal. Pochi minuti dopo la dogana siete sulla M2.4 verso la vostra destinazione. La riconsegna funziona allo stesso modo: parcheggiate, lasciate le chiavi, camminate fino alle partenze.",
        me: 'Dočekujemo vas u dolascima sa natpisom i ključevima auta. Bez reda na šalteru, bez šatla do vanjskog parkinga — automobil je parkiran nekoliko koraka od izlaza iz terminala. Par minuta nakon carine ste na M2.4 i krećete ka odredištu. Povrat funkcioniše isto: parkirate, predate ključeve, prošetate do odlazaka.',
        pl: 'Spotykamy was przy przylotach z tabliczką i kluczami do samochodu. Bez kolejki przy kasie, bez busa na zewnętrzny parking — auto stoi kilka kroków od drzwi terminalu. Kilka minut po odprawie celnej jesteście na M2.4 w drodze do celu. Zwrot odbywa się tak samo: parkujecie, oddajecie kluczyki, idziecie do odlotów.',
        ru: 'Встречаем вас в зоне прилёта с табличкой и ключами от арендованной машины. Никаких очередей у стойки, никакого шаттла к удалённой стоянке — автомобиль припаркован в нескольких шагах от выхода из терминала. Через несколько минут после таможни вы уже на M2.4. Возврат работает так же: припарковались, отдали ключи, идёте на вылет.',
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
