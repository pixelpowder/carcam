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
  extras: {
    available: [
      'Winter Pack',
      'Personal Accident Insurance',
      'Theft Protection',
      'Child safety seat (up to 1 year old)',
      'Child safety seat',
      'Child Booster seat',
      'Wireless hotspot on board',
      'SIM-card',
      'Ski rack',
      'Snowboard rack',
      'Roof rack',
      'Electric scooter with charger',
    ],
  },

  // ---------- Features available with rentals ----------
  // These are filterable on the booking widget — meaning many cars in the
  // fleet ship with these by default or as included options. The agent can
  // mention these naturally as positive features (NEVER as guaranteed for
  // every booking — say "available" or "many rentals include").
  availableFeatures: [
    'Free cancellation (on many rentals)',
    'Unlimited mileage (on many rentals)',
    'Second driver included in contract (on many rentals)',
    'City delivery (where offered)',
    'Real photos of the actual car (on many listings)',
    'Guaranteed car model (on selected listings — most are guaranteed-class only)',
  ],

  // ---------- Vehicle classes ----------
  vehicleClasses: ['Economy', 'Standard', 'SUV', 'Lux', 'Convertibles', 'Van'],

  // ---------- Engine + drivetrain ----------
  engineTypes: ['Gasoline', 'Diesel', 'Electric / Hybrid'],
  driveTypes: ['Front wheel', 'Rear wheel', '4 wheel'],
  gearbox: ['Automatic', 'Manual'],

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
