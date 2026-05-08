// Locale-natural prose templates for orphan-fix link insertions.
//
// Goal: produce publish-ready prose for the wrapper sentence around an
// internal link, in all 7 locales, without any LLM API call at runtime.
//
// Templates are categorised by (sourceCategory, targetCategory). Picker
// chooses a template deterministically from a stable hash of the
// (source path, target path) tuple so different edges get different
// wording even when categories match.
//
// Each template has three pieces, mirroring the existing JSX pattern:
//   pre + <a>{anchor}</a> + post
// Placeholders:
//   {anchor}  — replaced with the target's locale-appropriate anchor text
//
// Categories:
//   blog       — content under /blog/*
//   location   — destination cities (Kotor, Budva, Podgorica, etc.)
//   airport    — *-airport pages
//   guide      — driving / border crossing guides
//   home       — / (home page)
//   other      — about, contact, privacy, terms etc.

const LOCALES = ['en', 'de', 'fr', 'it', 'me', 'pl', 'ru'];

export function categorise(path) {
  if (path === '/') return 'home';
  if (path.startsWith('/blog/')) return 'blog';
  if (/-airport$/.test(path)) return 'airport';
  if (/(driving-guide|border-crossing-guide|montenegro-driving-guide)$/.test(path)) return 'guide';
  if (/^\/(kotor|budva|tivat|podgorica|perast|herceg-novi|ulcinj|bar|niksic|montenegro)$/.test(path)) return 'location';
  return 'other';
}

// Templates by `${sourceCategory}->${targetCategory}` key.
// Each entry: array of variants, each variant has 7 locale strings.
// {anchor} is the placeholder. Sentences read naturally as a follow-up
// paragraph after the existing intro of the source page.
const T = {
  // ============= BLOG → LOCATION =============
  'blog->location': [
    {
      en: { pre: "If you're heading inland on this route, ", post: " is a natural stop with rental pickup if you'd rather drive a stretch yourself." },
      de: { pre: "Wer auf dieser Strecke ins Landesinnere fährt, findet in ", post: " einen passenden Halt mit Mietwagen-Übernahme, falls man eine Etappe selbst fahren möchte." },
      fr: { pre: "Si vous prenez la route vers l'intérieur, ", post: " est une étape naturelle avec une prise en charge de location de voiture si vous préférez conduire une partie du trajet." },
      it: { pre: "Se vi dirigete verso l'interno su questo percorso, ", post: " è una sosta naturale con possibilità di ritiro auto se preferite guidare un tratto da soli." },
      me: { pre: "Ako se na ovoj ruti uputite u unutrašnjost, ", post: " je prirodno mjesto za zaustavljanje sa preuzimanjem auta ako želite sami voziti dio puta." },
      pl: { pre: "Jeśli kierujecie się w głąb lądu na tej trasie, ", post: " to naturalny przystanek z możliwością odbioru samochodu, jeśli wolicie samodzielnie pokonać odcinek." },
      ru: { pre: "Если вы направляетесь вглубь страны по этому маршруту, ", post: " — естественная остановка с пунктом получения автомобиля, если вы хотите проехать часть пути самостоятельно." },
    },
    {
      en: { pre: "Travelers building this trip from a single base often pair it with ", post: " — short drive, full insurance, no hidden fees." },
      de: { pre: "Wer die Reise von einem festen Standort aus plant, kombiniert sie häufig mit ", post: " — kurze Fahrt, Vollkasko, keine versteckten Kosten." },
      fr: { pre: "Les voyageurs qui organisent ce séjour depuis une base unique l'associent souvent à ", post: " — courte route, assurance complète, sans frais cachés." },
      it: { pre: "Chi pianifica questo viaggio da una base fissa lo abbina spesso a ", post: " — breve tragitto, assicurazione completa, nessun costo nascosto." },
      me: { pre: "Putnici koji organizuju putovanje iz jedne baze često ga kombinuju sa ", post: " — kratka vožnja, puno osiguranje, bez skrivenih troškova." },
      pl: { pre: "Podróżni planujący tę wyprawę z jednej bazy często łączą ją z ", post: " — krótki dojazd, pełne ubezpieczenie, bez ukrytych opłat." },
      ru: { pre: "Путешественники, организующие поездку из одной базы, часто сочетают её с ", post: " — короткая дорога, полная страховка, без скрытых платежей." },
    },
  ],

  // ============= BLOG → AIRPORT =============
  'blog->airport': [
    {
      en: { pre: "Most readers planning this route arrive via ", post: " and pick up the car at arrivals — the drive starts at the gate." },
      de: { pre: "Die meisten Leser, die diese Strecke planen, reisen über ", post: " an und übernehmen den Wagen am Ankunftsbereich — die Fahrt beginnt direkt am Gate." },
      fr: { pre: "La plupart des lecteurs qui planifient cet itinéraire arrivent via ", post: " et récupèrent la voiture à l'arrivée — la route commence à la porte." },
      it: { pre: "La maggior parte dei lettori che pianifica questo percorso arriva tramite ", post: " e ritira l'auto agli arrivi — il viaggio inizia al gate." },
      me: { pre: "Većina čitalaca koji planiraju ovu rutu dolazi preko ", post: " i preuzima auto na izlazu — vožnja počinje odmah na izlazu iz aviona." },
      pl: { pre: "Większość czytelników planujących tę trasę przylatuje przez ", post: " i odbiera samochód po przylocie — droga zaczyna się przy bramce." },
      ru: { pre: "Большинство читателей, планирующих этот маршрут, прилетают через ", post: " и забирают автомобиль на выходе — поездка начинается прямо у гейта." },
    },
    {
      en: { pre: "Booking ", post: " in advance avoids queueing at the counter when you start the trip." },
      de: { pre: "Wer ", post: " im Voraus bucht, vermeidet die Warteschlange am Schalter zu Beginn der Reise." },
      fr: { pre: "Réserver ", post: " à l'avance évite la file d'attente au comptoir au début du voyage." },
      it: { pre: "Prenotare ", post: " in anticipo evita la fila al banco all'inizio del viaggio." },
      me: { pre: "Rezervisanjem ", post: " unaprijed izbjegavate red na šalteru na početku putovanja." },
      pl: { pre: "Rezerwacja ", post: " z wyprzedzeniem pozwala uniknąć kolejki przy kasie na początku podróży." },
      ru: { pre: "Бронирование ", post: " заранее избавит от очереди у стойки в начале поездки." },
    },
  ],

  // ============= LOCATION → AIRPORT =============
  'location->airport': [
    {
      en: { pre: "If you're flying into the country, ", post: " is the closest gateway and a 30-minute drive from the city centre." },
      de: { pre: "Wer ins Land einfliegt, kommt am bequemsten über ", post: " an — der Flughafen liegt etwa 30 Fahrminuten vom Stadtzentrum entfernt." },
      fr: { pre: "Si vous arrivez en avion dans le pays, ", post: " est la porte d'entrée la plus proche, à 30 minutes en voiture du centre-ville." },
      it: { pre: "Se atterrate nel paese, ", post: " è l'ingresso più vicino, a 30 minuti di auto dal centro città." },
      me: { pre: "Ako stižete avionom u zemlju, ", post: " je najbliži ulaz, na 30 minuta vožnje od centra grada." },
      pl: { pre: "Jeśli wlatujecie do kraju, ", post: " to najbliższa brama, 30 minut jazdy od centrum miasta." },
      ru: { pre: "Если вы прилетаете в страну, ", post: " — ближайшие ворота, в 30 минутах езды от центра города." },
    },
  ],

  // ============= AIRPORT → LOCATION =============
  'airport->location': [
    {
      en: { pre: "Many travellers continue from the airport to ", post: " — a short coastal drive that pairs well with the rental." },
      de: { pre: "Viele Reisende fahren vom Flughafen weiter nach ", post: " — eine kurze Küstenstrecke, die ideal zum Mietwagen passt." },
      fr: { pre: "De nombreux voyageurs poursuivent depuis l'aéroport jusqu'à ", post: " — une courte route côtière qui s'accorde bien avec la location." },
      it: { pre: "Molti viaggiatori proseguono dall'aeroporto verso ", post: " — un breve tragitto costiero che si abbina bene al noleggio." },
      me: { pre: "Mnogi putnici nastavljaju sa aerodroma do ", post: " — kratka obalna vožnja koja se odlično uklapa sa rentom." },
      pl: { pre: "Wielu podróżnych kontynuuje z lotniska do ", post: " — krótka trasa wybrzeżem, która dobrze pasuje do wynajmu." },
      ru: { pre: "Многие путешественники продолжают путь из аэропорта до ", post: " — короткий маршрут вдоль побережья, отлично подходит для аренды." },
    },
  ],

  // ============= LOCATION → LOCATION =============
  'location->location': [
    {
      en: { pre: "A short drive away, ", post: " makes a natural day trip — the same rental covers both stops." },
      de: { pre: "Nur eine kurze Fahrt entfernt eignet sich ", post: " gut für einen Tagesausflug — der Mietwagen deckt beide Stationen ab." },
      fr: { pre: "À courte distance, ", post: " se prête à une excursion d'une journée — la même location couvre les deux escales." },
      it: { pre: "A breve distanza, ", post: " è perfetta per una gita giornaliera — lo stesso noleggio copre entrambe le tappe." },
      me: { pre: "Nadomak je ", post: " — odlično mjesto za jednodnevni izlet, isti rent pokriva oba odredišta." },
      pl: { pre: "W niewielkiej odległości, ", post: " to idealna jednodniowa wycieczka — ten sam wynajem obsłuży oba przystanki." },
      ru: { pre: "Совсем рядом ", post: " — отличный вариант для однодневной поездки, та же аренда покрывает оба места." },
    },
  ],

  // ============= GUIDE → LOCATION/AIRPORT =============
  'guide->location': [
    {
      en: { pre: "If you're using this guide to plan a route, ", post: " is one of the destinations most travellers add to the itinerary." },
      de: { pre: "Wer diesen Leitfaden zur Routenplanung nutzt, fügt häufig ", post: " als eines der Ziele zum Reiseplan hinzu." },
      fr: { pre: "Si vous utilisez ce guide pour planifier un itinéraire, ", post: " est l'une des destinations que la plupart des voyageurs ajoutent au programme." },
      it: { pre: "Se utilizzate questa guida per pianificare un percorso, ", post: " è una delle destinazioni che la maggior parte dei viaggiatori aggiunge all'itinerario." },
      me: { pre: "Ako ovaj vodič koristite za planiranje rute, ", post: " je jedna od destinacija koje većina putnika dodaje u plan." },
      pl: { pre: "Jeśli używacie tego przewodnika do planowania trasy, ", post: " to jedno z miejsc, które większość podróżnych dodaje do planu." },
      ru: { pre: "Если вы используете этот путеводитель для планирования маршрута, ", post: " — одно из направлений, которое большинство путешественников добавляет в план." },
    },
  ],
  'guide->airport': [
    {
      en: { pre: "For most international visitors, the journey starts at ", post: " — pick up the car and drive straight to the route described above." },
      de: { pre: "Für die meisten internationalen Reisenden beginnt die Reise an ", post: " — Wagen abholen und direkt auf die oben beschriebene Strecke." },
      fr: { pre: "Pour la plupart des visiteurs internationaux, le voyage commence à ", post: " — récupérez la voiture et prenez directement la route décrite ci-dessus." },
      it: { pre: "Per la maggior parte dei visitatori internazionali, il viaggio inizia a ", post: " — ritirate l'auto e proseguite direttamente sul percorso sopra descritto." },
      me: { pre: "Za većinu stranih posjetilaca putovanje počinje na ", post: " — preuzmite auto i krenite pravo na rutu opisanu iznad." },
      pl: { pre: "Dla większości międzynarodowych gości podróż zaczyna się na ", post: " — odbierzcie samochód i ruszajcie prosto na opisaną wyżej trasę." },
      ru: { pre: "Для большинства иностранных гостей путешествие начинается в ", post: " — заберите автомобиль и отправляйтесь прямо по описанному выше маршруту." },
    },
  ],

  // ============= FALLBACK (any → any) =============
  'fallback': [
    {
      en: { pre: "See our ", post: " page for details and pickup options." },
      de: { pre: "Weitere Details und Abholmöglichkeiten finden Sie auf unserer Seite zu ", post: "." },
      fr: { pre: "Consultez notre page sur ", post: " pour les détails et les options de prise en charge." },
      it: { pre: "Consulta la nostra pagina su ", post: " per dettagli e opzioni di ritiro." },
      me: { pre: "Pogledajte našu stranicu o ", post: " za detalje i opcije preuzimanja." },
      pl: { pre: "Zobacz naszą stronę o ", post: " po szczegóły i opcje odbioru." },
      ru: { pre: "См. нашу страницу о ", post: " для подробностей и вариантов получения." },
    },
  ],
};

// Stable hash so the same (source, target) edge always picks the same template
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Returns { pre, anchor, post } per locale, ready to insert.
// `anchorMatrix` is the per-locale variant matrix from carcam.
// `anchorVariant` is the picked variant ({ label, text }) for THIS edge.
export function buildProseForEdge({ sourcePath, targetPath, anchorVariant, anchorMatrix }) {
  const srcCat = categorise(sourcePath);
  const tgtCat = categorise(targetPath);
  const key = `${srcCat}->${tgtCat}`;
  const variants = T[key] || T.fallback;
  const idx = hashStr(`${sourcePath}|${targetPath}`) % variants.length;
  const tpl = variants[idx];

  const result = {};
  for (const loc of LOCALES) {
    const localeTpl = tpl[loc] || tpl.en;
    // Pick the locale-correct anchor text.
    // Prefer an anchor whose `label` matches the chosen variant; else first.
    const pool = anchorMatrix?.[loc] || anchorMatrix?.en || [];
    const v = pool.find(x => x.label === anchorVariant?.label) || pool[0] || { text: anchorVariant?.text || targetPath.replace(/^\//, '') };
    result[loc] = {
      pre: localeTpl.pre,
      anchor: v.text,
      post: localeTpl.post,
    };
  }
  return result;
}
