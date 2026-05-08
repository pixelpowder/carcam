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
  // Full list of pickup/drop-off points the booking system offers.
  // Three airports (TGD/TIV/DBV) plus a wide list of Montenegro towns
  // and resorts. The "popular" list at top of the booking widget is just
  // a UX shortcut — all listed locations are real, working pickup points.
  pickupLocations: {
    airports: [
      { name: 'Podgorica Airport', code: 'TGD' },
      { name: 'Tivat Airport', code: 'TIV' },
      { name: 'Dubrovnik Airport', code: 'DBV' },  // Croatia, used for Bay of Kotor arrivals
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

  // ---------- Optional extras ----------
  extras: {
    available: [
      'TODO: child seats',
      'TODO: booster seats',
      'TODO: additional driver',
      'TODO: GPS / sat-nav',
      'TODO: snow chains (winter)',
      'TODO: cross-border permission',
    ],
    // Any extras that are FREE? Useful info to mention naturally.
    freeWithEveryRental: [
      // 'TODO: e.g. unlimited mileage',
      // 'TODO: standard insurance package',
      // 'TODO: airport meet-and-greet',
    ],
  },

  // ---------- Driver / payment requirements ----------
  requirements: {
    minimumAge: 'TODO: e.g. 21',
    youngDriverFeeAge: 'TODO: e.g. under 25 (if applicable)',
    licenceHeldYears: 'TODO: e.g. 1 or 2',
    documentationNeeded: [
      'driving licence',
      'passport / national ID',
      'credit card in main driver name',
    ],
    deposit: 'TODO: e.g. credit card pre-authorisation, no cash',
  },

  // ---------- Cross-border policy ----------
  crossBorder: {
    allowed: ['Croatia', 'Bosnia and Herzegovina', 'Serbia', 'Albania'],
    notAllowed: ['Kosovo (most suppliers)'],
    requiresPermission: true,
    fee: 'TODO: e.g. flat fee charged at pickup, or included in some plans',
  },

  // ---------- Cancellation + payment ----------
  booking: {
    paymentAtBooking: 'TODO: e.g. 15% deposit / full payment / no payment until pickup',
    paymentAtPickup: 'TODO: e.g. balance + deposit',
    freeCancellation: 'TODO: e.g. 48 hours before pickup',
    currency: 'EUR (or local equivalent)',
  },

  // ---------- One-way rentals ----------
  oneWay: {
    allowed: true,
    feeStructure: 'TODO: e.g. flat fee, varies by route, free between airports in same country',
    commonRoutes: [
      // 'TivatAirport ↔ PodgoricaAirport',
      // 'PodgoricaAirport ↔ DubrovnikAirport',
    ],
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
