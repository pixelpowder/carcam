// Service Knowledge — verified facts about the car-rental booking service
// behind montenegrocarhire.com / kotorcarhire.com / budvacarhire.com /
// tivatcarhire.com / hercegnovicarhire.com / ulcinjcarhire.com /
// podgoricacarhire.com / kotorcarrental.com.
//
// All these sites use the same affiliate booking system. (Northern Ireland
// Car Hire is a separate affiliate — exclude from this knowledge file.)
//
// PURPOSE: feed this into the section-rewrite + auto-rewrite prompts as
// REFERENCE MATERIAL. The agent should:
//   - Use these facts when the rewrite NATURALLY discusses insurance,
//     extras, deposits, age limits, etc.
//   - NOT force these details into prose that wasn't already heading there.
//   - Treat anything NOT in this file as "unknown" — refuse to fabricate.
//
// EDIT THIS FILE: replace any "TODO" entries with the real facts. The agent
// will quote/paraphrase from here verbatim — bad data here = bad rewrites.

export const SERVICE_KNOWLEDGE = {
  // ---------- Brand + booking system ----------
  brand: 'Montenegro Car Hire',
  domains: [
    'montenegrocarhire.com',
    'kotorcarhire.com',
    'budvacarhire.com',
    'tivatcarhire.com',
    'hercegnovicarhire.com',
    'ulcinjcarhire.com',
    'podgoricacarhire.com',
    'kotorcarrental.com',
  ],
  // The underlying booking platform — used in disclosure language only.
  // TODO: confirm — Discover Cars? Rentalcars.com? Direct supplier? RentalCover?
  bookingSystem: 'TODO_AFFILIATE_NAME',

  // ---------- Pickup / drop-off locations ----------
  // Full list of pickup/drop-off points the MAIN affiliate booking system
  // offers. Two Montenegro airports (TGD, TIV) plus a wide list of Montenegro
  // towns and resorts. The "popular" list at top of the booking widget is
  // just a UX shortcut — all listed locations are real, working pickup points.
  pickupLocations: {
    airports: [
      { name: 'Podgorica Airport', code: 'TGD' },
      { name: 'Tivat Airport', code: 'TIV' },
      // Dubrovnik Airport (DBV) is NOT bookable through the main affiliate.
      // For Bay of Kotor arrivals coming via Dubrovnik, see `dubrovnikAirport`
      // section below — handled via a different provider, contact-us flow.
    ],
    // Marked as "popular" in the booking widget
    popularCities: ['Budva', 'Podgorica', 'Tivat'],
    // All Montenegro towns/resorts with pickup. Each has at minimum a
    // rental-office or hotel/delivery option — agent should treat the
    // bare city name as "pickup available there" without inventing the
    // specific desk type unless we add it later.
    cities: [
      'Bar', 'Bečići', 'Bijela', 'Budva', 'Buljarica',
      'Djenovici', 'Dobre Vode', 'Herceg-Novi', 'Igalo',
      'Kolašin', 'Kotor', 'Krasici', 'Luštica Bay',
      'Nikšić', 'Orahovac', 'Perast', 'Petrovac',
      'Podgorica', 'Prčanj', 'Pržno', 'Radovici',
      'Rafailovići', 'Reževići', 'Risan', 'Rose',
      'Sutomore', 'Sveti Stefan', 'Tivat', 'Ulcinj', 'Žabljak',
    ],
    // Specific named pickup points known per city (only fill in where
    // confirmed — agent shouldn't invent specific hotels/malls).
    namedPointsByCity: {
      Podgorica: [
        { name: 'Podgorica Airport', type: 'airport' },
        { name: 'Rental office', type: 'office' },
        { name: 'City delivery', type: 'delivery', note: 'delivered to your address in town' },
        { name: 'Hotel Hilton Crna Gora', type: 'hotel' },
        { name: 'Mall of Montenegro', type: 'mall' },
        { name: 'Big Fashion Mall', type: 'mall' },
        { name: 'Railway Station', type: 'station' },
        { name: 'Hotel Podgorica', type: 'hotel' },
      ],
      // TODO: same level of detail for Kotor, Tivat, Budva, Herceg-Novi
      // when user provides — for now leave empty and agent uses bare city name.
    },
  },

  // ---------- Dubrovnik Airport (DBV) — separate provider ----------
  // The main affiliate does NOT book Dubrovnik Airport rentals. DBV
  // pickup uses a different provider; bookings handled via contact-us.
  // The site (e.g. /dubrovnik-airport page) still talks about driving
  // from Dubrovnik to the Bay of Kotor — that's fine. But when the
  // rewrite naturally reaches "and you can pick up your car here," the
  // agent must NOT claim the standard booking flow. Point users at the
  // contact form instead.
  dubrovnikAirport: {
    bookableThroughMainAffiliate: false,
    fallback: 'contact-us / inquiry — handled by a different provider',
    promptGuidance: 'When mentioning DBV pickup, phrase as "contact us for Dubrovnik Airport rental availability" or similar — never as a standard booking.',
  },

  // ---------- Insurance tiers ----------
  // Four tiers offered at booking. NEVER mention prices in body copy —
  // pricing varies and isn't fixed. Mention COVERAGE only.
  // Abbreviations: TPL = third-party liability (damage to other vehicles).
  // CDW = collision damage waiver. SuperCDW = enhanced CDW with limited driver liability.
  insurance: {
    pricingPolicy: 'NEVER quote prices in rewrites — rates vary by car class, season, and dates',
    tiers: [
      {
        name: 'Full Coverage Plus',
        recommended: true,
        deposit: 'No deposit',
        coverage: [
          'Full damage coverage',
          'No driver liability for accident-related damage',
        ],
      },
      {
        name: 'Full Coverage',
        deposit: '100€ deposit',
        coverage: [
          'Full coverage with limited driver liability (SuperCDW)',
          'Coverage for collision damage caused to other vehicles (TPL)',
        ],
      },
      {
        name: 'Basic Coverage',
        deposit: '100€ deposit',
        coverage: [
          'Limited collision coverage (CDW)',
          'Coverage for collision damage caused to other vehicles (TPL)',
        ],
        excludes: ['Glass and wheel damage'],
      },
      {
        name: 'Minimum Coverage',
        deposit: '100€ deposit',
        cost: 'Free of charge',
        coverage: [
          'Coverage for collision damage caused to other vehicles (TPL)',
        ],
        excludes: ['Collision damage', 'Glass and wheel damage'],
      },
    ],
  },

  // ---------- Optional extras (paid add-ons) ----------
  // Real list of paid add-ons offered at booking. NEVER mention prices.
  // Where a description is shown in the booking widget tooltip, capture it
  // verbatim so the agent can paraphrase accurately.
  extras: {
    available: [
      { name: 'Winter Pack', description: null },
      {
        name: 'Personal Accident Insurance',
        description: 'The insurance company covers the damage caused to the health of passengers in case of an accident while driving a rental car.',
      },
      { name: 'Theft Protection', description: null },
      {
        name: 'Child safety seat (up to 1 year old)',
        description: 'Group 0+ child safety seat. Children of approximately 0-1.5 years of age with body weight of 0-10 kg.',
        category: 'child-seat',
      },
      {
        name: 'Child safety seat',
        description: null, // standard age-range child seat (between infant and booster)
        category: 'child-seat',
      },
      {
        name: 'Child Booster seat',
        description: 'Group 3 child safety seat. Backless. Children of approximately 5 years of age and from 135 cm tall.',
        category: 'child-seat',
      },
      { name: 'Wireless hotspot on board', description: null },
      { name: 'SIM-card', description: null },
      { name: 'Ski rack', description: null },
      { name: 'Snowboard rack', description: null },
      { name: 'Roof rack', description: null },
      { name: 'Electric scooter with charger', description: null },
    ],
  },

  // ---------- Features available with rentals ----------
  // These are filterable on the booking widget — meaning many cars in the
  // fleet ship with these by default or as included options. The agent can
  // mention these naturally as positive features (NEVER as guaranteed for
  // every booking — say "available" or "many rentals include").
  availableFeatures: [
    'Free cancellation (on many rentals — full refund if cancelled more than 24h before pickup)',
    'Unlimited mileage (no mileage cap on rentals)',
    'Second driver, free of charge (must meet same age + experience as main driver; bring their licence + passport)',
    'City delivery (where offered)',
    'Real photos of the actual car (on many listings)',
    'Guaranteed car model (on selected listings — most are guaranteed-class only)',
  ],
  // Second-driver verbatim policy (paraphrased from booking widget)
  secondDriver: {
    cost: 'Free of charge',
    requirements: 'Same age and driving experience as the main driver per standard terms.',
    documentsNeeded: ['driver\'s license of second driver', 'passport of second driver'],
    note: 'Adding a second driver requires drawing them into the rental agreement at pickup.',
  },

  // ---------- Vehicle classes ----------
  // Inventory tier: how many cars are in this class. 'rare' classes
  // (Convertibles, Lux) shouldn't be promised generically — agent should
  // qualify with "selection available" or similar.
  vehicleClasses: [
    { name: 'Economy', count: 249, tier: 'common' },
    { name: 'Standard', count: 194, tier: 'common' },
    { name: 'SUV', count: 130, tier: 'common' },
    { name: 'Van', count: 90, tier: 'moderate' },
    { name: 'Lux', count: 80, tier: 'moderate' },
    { name: 'Convertibles', count: 34, tier: 'rare' },
  ],

  // ---------- Engine + drivetrain ----------
  // Inventory skew: mostly Diesel/Gasoline, very little electric.
  // Mostly front-wheel drive — RWD is rare, 4WD on a small share (mostly SUVs).
  engineTypes: [
    { name: 'Diesel', count: 373, tier: 'common' },
    { name: 'Gasoline', count: 279, tier: 'common' },
    { name: 'Electric / Hybrid', count: 48, tier: 'rare' },
  ],
  driveTypes: [
    { name: 'Front wheel', count: 558, tier: 'common' },
    { name: '4 wheel', count: 60, tier: 'moderate' },
    { name: 'Rear wheel', count: 23, tier: 'rare' },
  ],
  gearbox: [
    { name: 'Automatic', count: 533, tier: 'common' },
    { name: 'Manual', count: 120, tier: 'moderate' },
  ],

  // ---------- Vehicle brands offered ----------
  // For "what kind of cars" type prose. Don't promise a specific brand
  // unless the booking shows availability.
  vehicleBrands: [
    'Alfa Romeo', 'Audi', 'BMW', 'Chery', 'Chevrolet', 'Citroen',
    'Dacia', 'Fiat', 'Ford', 'Hyundai', 'Kia', 'Land Rover',
    'Maserati', 'Mazda', 'Mercedes', 'MG', 'Mini', 'Nissan',
    'Opel', 'Peugeot', 'Porsche', 'Renault', 'SEAT', 'Skoda',
    'Suzuki', 'Toyota', 'Volkswagen', 'Volvo',
  ],

  // ---------- Payment + deposit ----------
  paymentOptions: {
    rentPaymentAccepted: ['Cash', 'Card', 'Crypto', 'No-credit-card option available'],
    depositOptions: [
      'No deposit (selected listings)',
      'No deposit (paid service)',
      'Cash deposit',
      'Credit card pre-authorisation',
      'Debit card',
      'Crypto',
    ],
    refundableDeposit: {
      typicalAmount: '150€ on many listings (varies per car — never quote a specific amount in body copy)',
      refundTiming: 'Immediate refund after drop-off',
      acceptedFor: ['Cash', 'Visa (credit/debit)', 'MasterCard (credit/debit)', 'American Express (credit/debit)'],
    },
  },

  // ---------- Booking flow ----------
  // Two confirmation modes a car can be listed under. Useful so the agent
  // doesn't promise instant confirmation on every booking.
  bookingFlow: {
    instantBooking: 'Cars marked with the instant-booking icon are confirmed immediately at checkout.',
    onRequest: 'Cars without the icon are booked "on request" — the system processes the request automatically within a few minutes. The customer is notified by email; if the car is unavailable, alternatives are offered.',
    promptGuidance: 'When discussing booking confirmation, don\'t imply every booking is instant. Many listings are instant, some are on-request — match the original prose if it specified, otherwise stay generic.',
  },

  // ---------- Cross-border policy ----------
  // Three tiers offered as add-ons at booking, depending on countries visited.
  crossBorder: {
    requiresPermission: true,
    feeTiers: [
      'Crossborder fee to neighbouring countries (excludes Albania and Kosovo)',
      'Crossborder fee to neighbouring countries (includes Albania and Kosovo)',
      'Crossborder fee to neighbouring and distant countries',
    ],
    note: 'Specific fee amount varies — never quote a price. Just mention the appropriate tier when relevant.',
  },

  // ---------- Driver / documentation requirements ----------
  requirements: {
    standardAgeRange: '21–70 years',
    minimumAge: 21,
    minimumAgeException: 'Drivers 18+ available on certain vehicles — booking widget shows which',
    maximumAge: 70,
    olderDriverException: 'Drivers over 70 may be accommodated — see "Other age?" option at booking',
    licenceHeldYears: 1,
    licenceHeldYearsNote: 'Some specific vehicles may require longer (e.g. premium classes — booking widget shows per-listing)',
    mileageLimit: 'No mileage limit (unlimited mileage on rentals)',
    documentationNeeded: [
      'driving licence',
      'passport / national ID',
      'credit card in main driver name (unless no-credit-card option chosen)',
    ],
  },

  // ---------- Booking + cancellation ----------
  booking: {
    advancePayment: 'A small advance payment is taken at booking; balance settled at pickup.',
    cancellation: {
      freeCancellationWindow: 'More than 24 hours before pickup',
      policy: 'Full refund of advance payment if cancelled more than 24 hours before receiving the car. Cancellations within 24 hours of pickup are non-refundable.',
    },
  },

  // ---------- One-way rentals ----------
  oneWay: {
    allowed: true,
    note: 'Routes between Montenegro pickup points are commonly available; cross-border one-way (e.g. to Dubrovnik Airport) may carry an extra fee. Don\'t quote a price.',
  },

  // ---------- Practical / driving notes (Montenegro-specific) ----------
  // Things the agent can use when topic comes up, without fabricating.
  driving: {
    sideOfRoad: 'right',
    speedLimitsKmh: { urban: 50, ruralOpen: 80, motorway: 130 },
    tollRoads: 'TODO: e.g. Sozina tunnel, Smokovac–Mateševo motorway section',
    fuelTypes: ['petrol (95)', 'diesel'],
  },
};

// Compact summary for inclusion in agent system prompts. Just the field
// names + values, no commentary. The agent treats this as reference data
// it can paraphrase from when relevant.
export function knowledgeForPrompt() {
  return JSON.stringify(SERVICE_KNOWLEDGE, null, 2);
}
