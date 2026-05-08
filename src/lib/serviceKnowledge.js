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

  // ---------- Pickup / drop-off locations (Montenegro) ----------
  // Only these locations have real pickup desks. Other Montenegro cities
  // (Budva, Herceg Novi, Ulcinj, Bar, Podgorica city, Niksic, Perast)
  // do NOT have local desks — visitors there pick up at the nearest
  // airport or Kotor/Tivat town.
  pickupLocations: [
    { name: 'Podgorica Airport', code: 'TGD', desk: 'on-airport' },
    { name: 'Tivat Airport', code: 'TIV', desk: 'on-airport' },
    { name: 'Dubrovnik Airport', code: 'DBV', desk: 'on-airport' },  // not Montenegro but commonly used for Bay of Kotor
    { name: 'Kotor (town)', desk: 'in-town' },
    { name: 'Tivat (town)', desk: 'in-town' },
  ],
  // Cities WITHOUT a local pickup desk — agent should never claim a pickup
  // exists in these places. If the topic comes up, the natural option is
  // the nearest airport or Kotor/Tivat.
  noLocalPickup: ['Budva', 'Herceg Novi', 'Ulcinj', 'Bar', 'Podgorica (town)', 'Niksic', 'Perast'],

  // ---------- Insurance options ----------
  // What's INCLUDED vs available as upgrade. Agent should never say
  // "insurance is included" generically — it's specific to plan.
  insurance: {
    includedInBaseRate: [
      'TODO: e.g. CDW (collision damage waiver) with excess',
      'TODO: third-party liability',
      'TODO: theft protection',
    ],
    optionalUpgrades: [
      'TODO: e.g. Full coverage / zero excess',
      'TODO: glass + tyres',
      'TODO: personal accident',
    ],
    excessAmount: 'TODO: e.g. €500-1500 depending on car class',
    excessCurrency: 'EUR',
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
