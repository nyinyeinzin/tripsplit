export const TRIP_NAME = "Bali Planner";
export const tripDateLabel = "July 17-29";
export const groupSize = 6;
export const USD_THB = 32.5;
export const perPersonBudgetTHB = 20000;

// Shared facts about the plan that both the AI system prompt and the AI trip
// context must agree on — edit here only.
export const tripCorrections = [
  "Day 8 must return to Uluwatu Airbnb to collect luggage before going to Kuta Villa.",
  "Day 10 route is Airbnb -> Sanur Port -> Nusa Penida -> Sanur Port -> Airbnb.",
  "Day 12 route is Airbnb -> Lovina -> Airbnb, using 2 Grab cars for 6 travelers.",
  "Long Grab or private car rides need 2 cars for the group."
];

export const exchange = {
  idrToThb: 0.0022,
  usdToThb: USD_THB
};

const photos = {
  airport: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1000&q=80",
  villa: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1000&q=80",
  ubud: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80",
  temple: "https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1000&q=80",
  cafe: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
  club: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1000&q=80",
  nusa: "https://images.unsplash.com/photo-1570789210967-2cac24afeb00?auto=format&fit=crop&w=1000&q=80",
  dolphin: "https://images.unsplash.com/photo-1518378188025-22bd89516ee2?auto=format&fit=crop&w=1000&q=80"
};

function usdPerPerson(usd) {
  // Derive the group total from the rounded per-person price so the fields
  // always satisfy groupTotal = perPerson x groupSize (no rounding drift).
  const perPersonTHB = Math.round(usd * USD_THB);
  const groupTotalTHB = perPersonTHB * groupSize;
  return {
    costUSD: usd,
    costPerPersonUSD: usd,
    costPerPersonTHB: perPersonTHB,
    groupTotalTHB,
    costTHB: groupTotalTHB
  };
}

function groupEstimate(thb, extra = {}) {
  return {
    costTHB: thb,
    groupTotalTHB: thb,
    ...extra
  };
}

export const airbnbs = [
  {
    id: "airport-dps",
    title: "DPS Airport",
    area: "Denpasar",
    type: "airport",
    lat: -8.7467,
    lng: 115.1668,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=I+Gusti+Ngurah+Rai+International+Airport",
    photo: photos.airport,
    notes: "Arrival and departure airport for the Bali trip."
  },
  {
    id: "ubud-airbnb",
    title: "Ubud Airbnb",
    area: "Ubud",
    type: "airbnb",
    lat: -8.4249593,
    lng: 115.226509,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Ubud+Bali+villa",
    photo: photos.villa,
    notes: "Stay base for July 17-21."
  },
  {
    id: "uluwatu-airbnb",
    title: "Uluwatu Airbnb",
    area: "Uluwatu",
    type: "airbnb",
    lat: -8.8232,
    lng: 115.1192,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Uluwatu+Bali+villa",
    photo: photos.villa,
    notes: "Stay base for July 21-24. Day 8 returns here to collect luggage before Kuta."
  },
  {
    id: "kuta-villa",
    title: "Kuta Villa",
    area: "Kuta",
    type: "villa",
    lat: -8.7185,
    lng: 115.1686,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kuta+Bali+villa",
    photo: photos.villa,
    notes: "SLY pre-birthday villa for the night of July 24."
  },
  {
    id: "north-kuta-airbnb",
    title: "North Kuta Airbnb",
    area: "Canggu",
    type: "airbnb",
    lat: -8.6503,
    lng: 115.1385,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=North+Kuta+Canggu+villa",
    photo: photos.villa,
    notes: "Stay base for July 25-29."
  },
  {
    id: "sanur-port",
    title: "Sanur Port",
    area: "Sanur",
    type: "port",
    lat: -8.7076,
    lng: 115.2635,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Sanur+Port+Bali",
    photo: photos.beach,
    notes: "Ferry connection point for the Nusa Penida day tour."
  }
];

// stayId = where the group wakes up that morning (the stay they start the day at).
export const tripDays = [
  { day: 1, date: "Jul 17", area: "Ubud", title: "Arrive & check in", stayId: "ubud-airbnb" },
  { day: 2, date: "Jul 18", area: "Ubud", title: "Cretya Ubud + ATV", stayId: "ubud-airbnb" },
  { day: 3, date: "Jul 19", area: "Ubud", title: "Tirta Empul + Ubud town", stayId: "ubud-airbnb" },
  { day: 4, date: "Jul 20", area: "Ubud", title: "Sunrise Jeep + Kintamani", stayId: "ubud-airbnb" },
  { day: 5, date: "Jul 21", area: "Uluwatu", title: "Transfer to Uluwatu", stayId: "ubud-airbnb" },
  { day: 6, date: "Jul 22", area: "Uluwatu", title: "Oneeighty + Savaya", stayId: "uluwatu-airbnb" },
  { day: 7, date: "Jul 23", area: "Uluwatu", title: "Cafes, cliff, temple", stayId: "uluwatu-airbnb" },
  { day: 8, date: "Jul 24", area: "Uluwatu / Kuta", title: "Beach clubs + Kuta Villa", stayId: "uluwatu-airbnb" },
  { day: 9, date: "Jul 25", area: "Canggu", title: "Move to North Kuta", stayId: "kuta-villa" },
  { day: 10, date: "Jul 26", area: "Nusa Penida", title: "East Nusa Penida tour", stayId: "north-kuta-airbnb" },
  { day: 11, date: "Jul 27", area: "Canggu", title: "Cafe hopping + Finns", stayId: "north-kuta-airbnb" },
  { day: 12, date: "Jul 28", area: "Lovina", title: "Dolphin day trip", stayId: "north-kuta-airbnb" },
  { day: 13, date: "Jul 29", area: "Airport", title: "Departure", stayId: "north-kuta-airbnb" }
];

export const activities = [
  { id: "d1-airport-transfer", day: 1, date: "Jul 17", number: 1, title: "Airport transfer to Ubud Airbnb", area: "Ubud", time: "Arrival", travelFrom: "DPS Airport", travelTime: "1.5-2.5 hr drive", type: "transport", ...groupEstimate(1800, { cars: 2, perCarTHB: 900 }), lat: -8.4249593, lng: 115.226509, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=I+Gusti+Ngurah+Rai+International+Airport&destination=Ubud+Bali", photo: photos.villa, notes: "Added from route correction. Estimate uses 2 cars for 6 travelers.", aiAdded: false, deletable: false },
  { id: "d1-checkin", day: 1, date: "Jul 17", number: 2, title: "Arrive & check in", area: "Ubud", time: "Check-in", travelFrom: "Airport transfer", travelTime: "At the stay", type: "lodging", costTHB: 0, lat: -8.4249593, lng: 115.226509, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Ubud+Bali+villa", photo: photos.villa, notes: "Settle into the Ubud stay.", aiAdded: false, deletable: false },
  { id: "d1-warung-dinner", day: 1, date: "Jul 17", number: 3, title: "Dinner at local warung", area: "Ubud", time: "5:00 PM", travelFrom: "Ubud Airbnb", travelTime: "Bike or short local ride", type: "food", ...groupEstimate(1200), lat: -8.5069, lng: 115.2625, mapsUrl: "https://www.google.com/maps/search/?api=1&query=local+warung+Ubud", photo: photos.cafe, notes: "Original plan: dinner at local warung. Includes a local transport estimate if not walkable.", aiAdded: false, deletable: false },

  { id: "d2-cretya-atv", day: 2, date: "Jul 18", number: 1, title: "Cretya Ubud and ATV Quad Bike Adventure", area: "Ubud", time: "8:00 AM-6:00 PM", travelFrom: "Ubud Airbnb", travelTime: "Transfers included", type: "tour", ...usdPerPerson(55.54), lat: -8.4316, lng: 115.2797, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cretya+Ubud", photo: photos.ubud, notes: "Klook tour with transfers. Price from source: RM 227 = 55.54 USD per pax.", aiAdded: false, deletable: false },

  { id: "tirta-empul", day: 3, date: "Jul 19", number: 1, title: "Pura Tirta Empul", area: "Ubud", time: "9:00 AM", travelFrom: "Ubud Airbnb", travelTime: "35-45 min from Airbnb", type: "temple", costTHB: 165 * groupSize, costPerPersonTHB: 165, groupTotalTHB: 990, lat: -8.4153, lng: 115.3152, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pura+Tirta+Empul+Bali", photo: photos.temple, notes: "Go here first. Rent bike. Sarong required; bring dry clothes if doing purification.", aiAdded: false, deletable: false },
  { id: "ubud-cafes", day: 3, date: "Jul 19", number: 2, title: "Ubud town cafes", area: "Ubud", time: "11:30 AM", travelFrom: "Pura Tirta Empul", travelTime: "30-40 min from Tirta Empul", type: "cafe", costTHB: 300 * groupSize, costPerPersonTHB: 300, groupTotalTHB: 1800, lat: -8.508, lng: 115.2635, mapsUrl: "https://www.google.com/maps/search/?api=1&query=cafes+in+Ubud", photo: photos.cafe, notes: "Search for cafes in Ubud after Tirta Empul.", aiAdded: false, deletable: false },
  { id: "dewi-sita-shops", day: 3, date: "Jul 19", number: 3, title: "Jl. Dewi Sita shops", area: "Ubud", time: "1:30 PM", travelFrom: "Ubud town cafes", travelTime: "5-10 min by bike", type: "shopping", costTHB: 0, lat: -8.5082, lng: 115.2639, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Jalan+Dewi+Sita+Ubud", photo: photos.ubud, notes: "Shopping browse; purchases excluded from budget for now.", aiAdded: false, deletable: false },

  { id: "d4-sunrise-jeep", day: 4, date: "Jul 20", number: 1, title: "Private Sunrise Jeep Tour", area: "Kintamani", time: "Early morning", travelFrom: "Ubud Airbnb", travelTime: "Round-trip transfers included", type: "tour", ...usdPerPerson(32.19), lat: -8.2389, lng: 115.3775, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mount+Batur+sunrise+jeep+tour", photo: photos.ubud, notes: "Private sunrise jeep tour with round-trip transfers. Price from source: RM 131.75 = 32.19 USD per pax.", aiAdded: false, deletable: false },
  { id: "d4-akasa-coffee", day: 4, date: "Jul 20", number: 2, title: "Akasa Specialty Coffee", area: "Kintamani", time: "After sunrise", travelFrom: "Jeep tour", travelTime: "10-20 min by bike or tour transfer", type: "cafe", costTHB: 300 * groupSize, costPerPersonTHB: 300, groupTotalTHB: 1800, lat: -8.244, lng: 115.344, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Akasa+Specialty+Coffee+Kintamani", photo: photos.cafe, notes: "Coffee stop in Kintamani after the sunrise route.", aiAdded: false, deletable: false },

  { id: "d5-checkout-ubud", day: 5, date: "Jul 21", number: 1, title: "Check out Ubud", area: "Ubud", time: "9:00 AM", travelFrom: "Ubud Airbnb", travelTime: "Start", type: "lodging", costTHB: 0, lat: -8.4249593, lng: 115.226509, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Ubud+Bali+villa", photo: photos.villa, notes: "Check out before transferring to Uluwatu.", aiAdded: false, deletable: false },
  { id: "d5-ubud-uluwatu-transfer", day: 5, date: "Jul 21", number: 2, title: "Drive to Uluwatu Airbnb", area: "Uluwatu", time: "After checkout", travelFrom: "Ubud Airbnb", travelTime: "1.5-3 hr depending on traffic", type: "transport", ...groupEstimate(2200, { cars: 2, perCarTHB: 1100 }), lat: -8.8232, lng: 115.1192, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Ubud+Bali&destination=Uluwatu+Bali", photo: photos.villa, notes: "Long transfer estimate uses 2 cars for 6 travelers.", aiAdded: false, deletable: false },
  { id: "d5-lunch", day: 5, date: "Jul 21", number: 3, title: "Lunch", area: "Uluwatu", time: "Midday", travelFrom: "Uluwatu Airbnb", travelTime: "10-20 min by bike or Grab", type: "food", ...groupEstimate(1800), lat: -8.8232, lng: 115.1192, mapsUrl: "https://www.google.com/maps/search/?api=1&query=lunch+Uluwatu", photo: photos.cafe, notes: "Lunch after Uluwatu check-in.", aiAdded: false, deletable: false },
  { id: "d5-beach", day: 5, date: "Jul 21", number: 4, title: "Dreamland / Thomas / Padang Padang Beach", area: "Uluwatu", time: "3:00-4:00 PM", travelFrom: "Lunch", travelTime: "15-25 min", type: "beach", costTHB: 0, lat: -8.8038, lng: 115.1025, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Padang+Padang+Beach+Bali", photo: photos.beach, notes: "Choose one beach depending on weather and group energy.", aiAdded: false, deletable: false },
  { id: "d5-single-fin", day: 5, date: "Jul 21", number: 5, title: "Single Fin Sunset Bar dinner", area: "Uluwatu", time: "5:30 PM", travelFrom: "Beach", travelTime: "10-20 min", type: "food", ...groupEstimate(3600), lat: -8.8136, lng: 115.087, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Single+Fin+Uluwatu", photo: photos.club, notes: "Sunset dinner. Rent bike for July 21-24.", aiAdded: false, deletable: false },

  { id: "d6-oneeighty", day: 6, date: "Jul 22", number: 1, title: "Oneeighty day club", area: "Uluwatu", time: "Lunch/brunch", travelFrom: "Uluwatu Airbnb", travelTime: "15-25 min", type: "food", ...groupEstimate(4200), lat: -8.8415, lng: 115.0909, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Oneeighty+Bali", photo: photos.club, notes: "Relaxed morning, then lunch/brunch/chill at Oneeighty.", aiAdded: false, deletable: false },
  { id: "d6-savaya", day: 6, date: "Jul 22", number: 2, title: "Savaya Beach Club", area: "Uluwatu", time: "4:00 PM-night", travelFrom: "Oneeighty", travelTime: "10-20 min", type: "food", ...groupEstimate(5400), lat: -8.8432, lng: 115.1556, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Savaya+Bali", photo: photos.club, notes: "Dinner and night plan. Reservation needed.", aiAdded: false, deletable: false },

  { id: "d7-cafe-hopping", day: 7, date: "Jul 23", number: 1, title: "Cafe hopping", area: "Uluwatu", time: "Morning", travelFrom: "Uluwatu Airbnb", travelTime: "10-20 min by bike or Grabs", type: "cafe", ...groupEstimate(1800), lat: -8.8232, lng: 115.1192, mapsUrl: "https://www.google.com/maps/search/?api=1&query=cafes+Uluwatu", photo: photos.cafe, notes: "Morning cafe hopping in Uluwatu.", aiAdded: false, deletable: false },
  { id: "d7-karang-boma", day: 7, date: "Jul 23", number: 2, title: "Karang Boma Cliff", area: "Uluwatu", time: "Afternoon", travelFrom: "Cafe hopping", travelTime: "20-30 min", type: "sightseeing", costTHB: 0, lat: -8.8434, lng: 115.0824, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Karang+Boma+Cliff", photo: photos.beach, notes: "Cliff viewpoint stop.", aiAdded: false, deletable: false },
  { id: "d7-percent-cafe", day: 7, date: "Jul 23", number: 3, title: "Percent Cafe", area: "Uluwatu", time: "Afternoon", travelFrom: "Karang Boma Cliff", travelTime: "15-25 min", type: "cafe", ...groupEstimate(1500), lat: -8.827, lng: 115.128, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Percent+Cafe+Uluwatu", photo: photos.cafe, notes: "Cafe stop from original plan.", aiAdded: false, deletable: false },
  { id: "d7-jimmy-beach", day: 7, date: "Jul 23", number: 4, title: "Jimmy Beach Cafe", area: "Uluwatu", time: "Late afternoon", travelFrom: "Percent Cafe", travelTime: "10-20 min", type: "cafe", ...groupEstimate(1800), lat: -8.8118, lng: 115.089, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Jimmy+Beach+Cafe+Uluwatu", photo: photos.cafe, notes: "Cafe stop from original plan.", aiAdded: false, deletable: false },
  { id: "d7-uluwatu-temple", day: 7, date: "Jul 23", number: 5, title: "Uluwatu Temple", area: "Uluwatu", time: "5:00 PM", travelFrom: "Jimmy Beach Cafe", travelTime: "10-15 min", type: "temple", costTHB: 165 * groupSize, costPerPersonTHB: 165, groupTotalTHB: 990, lat: -8.8291, lng: 115.0849, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Uluwatu+Temple", photo: photos.temple, notes: "Temple visit at 5 PM.", aiAdded: false, deletable: false },

  { id: "d8-checkout-uluwatu", day: 8, date: "Jul 24", number: 1, title: "Check out Uluwatu Airbnb", area: "Uluwatu", time: "12:00 PM", travelFrom: "Uluwatu Airbnb", travelTime: "Start", type: "lodging", costTHB: 0, lat: -8.8232, lng: 115.1192, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Uluwatu+Bali+villa", photo: photos.villa, notes: "Ask host to keep luggage after checkout.", aiAdded: false, deletable: false },
  { id: "d8-sundays", day: 8, date: "Jul 24", number: 2, title: "Lunch at Sundays Beach Club", area: "Uluwatu", time: "Lunch", travelFrom: "Uluwatu Airbnb", travelTime: "20-35 min", type: "food", ...groupEstimate(4800), lat: -8.8485, lng: 115.1439, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Sundays+Beach+Club+Bali", photo: photos.club, notes: "Lunch beach club stop.", aiAdded: false, deletable: false },
  { id: "d8-melasti", day: 8, date: "Jul 24", number: 3, title: "Melasti Beach", area: "Uluwatu", time: "3:00-4:00 PM", travelFrom: "Sundays Beach Club", travelTime: "15-25 min", type: "beach", costTHB: 0, lat: -8.8491, lng: 115.1593, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Melasti+Beach+Bali", photo: photos.beach, notes: "Beach stop before sunset dinner.", aiAdded: false, deletable: false },
  { id: "d8-klive", day: 8, date: "Jul 24", number: 4, title: "Klive Beach Club sunset dinner", area: "Uluwatu", time: "Sunset dinner", travelFrom: "Melasti Beach", travelTime: "10-20 min", type: "food", ...groupEstimate(4200), lat: -8.846, lng: 115.16, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Klive+Beach+Club+Bali", photo: photos.club, notes: "Leave Klive by 6:30 PM.", aiAdded: false, deletable: false },
  { id: "d8-return-luggage", day: 8, date: "Jul 24", number: 5, title: "Return to Uluwatu Airbnb for luggage", area: "Uluwatu", time: "After 6:30 PM", travelFrom: "Klive Beach Club", travelTime: "20-35 min", type: "transport", costTHB: 0, lat: -8.8232, lng: 115.1192, mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=Uluwatu+Bali+villa", photo: photos.villa, notes: "Important correction: collect luggage before going to Kuta Villa.", aiAdded: false, deletable: false },
  { id: "d8-car-to-kuta", day: 8, date: "Jul 24", number: 6, title: "Book car to Kuta Villa", area: "Kuta", time: "Around 8:00 PM", travelFrom: "Uluwatu Airbnb", travelTime: "45-90 min", type: "transport", ...groupEstimate(1600, { cars: 2, perCarTHB: 800 }), lat: -8.7185, lng: 115.1686, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Uluwatu+Bali&destination=Kuta+Bali", photo: photos.villa, notes: "2 cars for 6 travelers. Check in at Kuta Villa for SLY pre-birthday.", aiAdded: false, deletable: false },

  { id: "d9-checkout-kuta", day: 9, date: "Jul 25", number: 1, title: "Check out Kuta Villa", area: "Kuta", time: "12:00 PM", travelFrom: "Kuta Villa", travelTime: "Start", type: "lodging", costTHB: 0, lat: -8.7185, lng: 115.1686, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kuta+Bali+villa", photo: photos.villa, notes: "Check out Kuta Villa at noon.", aiAdded: false, deletable: false },
  { id: "d9-transfer-north-kuta", day: 9, date: "Jul 25", number: 2, title: "Check in North Kuta Airbnb", area: "Canggu", time: "Afternoon", travelFrom: "Kuta Villa", travelTime: "35-70 min", type: "transport", ...groupEstimate(1000, { cars: 2, perCarTHB: 500 }), lat: -8.6503, lng: 115.1385, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Kuta+Bali&destination=North+Kuta+Bali", photo: photos.villa, notes: "Move to North Kuta Airbnb and rent bike.", aiAdded: false, deletable: false },
  { id: "d9-echo-beach", day: 9, date: "Jul 25", number: 3, title: "Echo Beach sunset", area: "Canggu", time: "5:00 PM", travelFrom: "North Kuta Airbnb", travelTime: "10-25 min", type: "beach", costTHB: 0, lat: -8.6541, lng: 115.1262, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Echo+Beach+Canggu", photo: photos.beach, notes: "Sunset at Echo Beach.", aiAdded: false, deletable: false },

  { id: "d10-grab-to-sanur", day: 10, date: "Jul 26", number: 1, title: "Grab to Sanur Port", area: "Sanur", time: "Morning", travelFrom: "North Kuta Airbnb", travelTime: "45-75 min", type: "transport", ...groupEstimate(1200, { cars: 2, perCarTHB: 600 }), lat: -8.7076, lng: 115.2635, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=North+Kuta+Bali&destination=Sanur+Port+Bali", photo: photos.beach, notes: "Route correction: Airbnb to Sanur Port before Nusa Penida. 2 Grab cars.", aiAdded: false, deletable: false },
  { id: "d10-nusa-penida", day: 10, date: "Jul 26", number: 2, title: "East Nusa Penida Tour + Guide/Photographer", area: "Nusa Penida", time: "Day tour", travelFrom: "Sanur Port", travelTime: "Boat + tour route", type: "tour", ...usdPerPerson(70), lat: -8.7278, lng: 115.5444, mapsUrl: "https://www.google.com/maps/search/?api=1&query=East+Nusa+Penida+Tour", photo: photos.nusa, notes: "Price from source: 70 USD per pax.", aiAdded: false, deletable: false },
  { id: "d10-return-sanur", day: 10, date: "Jul 26", number: 3, title: "Return to Sanur Port", area: "Sanur", time: "Evening", travelFrom: "Nusa Penida", travelTime: "Boat back", type: "transport", costTHB: 0, lat: -8.7076, lng: 115.2635, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Sanur+Port+Bali", photo: photos.beach, notes: "Route correction: Nusa Penida returns via Sanur Port.", aiAdded: false, deletable: false },
  { id: "d10-grab-back-airbnb", day: 10, date: "Jul 26", number: 4, title: "Grab back to North Kuta Airbnb", area: "Canggu", time: "Evening", travelFrom: "Sanur Port", travelTime: "45-75 min", type: "transport", ...groupEstimate(1200, { cars: 2, perCarTHB: 600 }), lat: -8.6503, lng: 115.1385, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Sanur+Port+Bali&destination=North+Kuta+Bali", photo: photos.villa, notes: "Return transfer with 2 Grab cars.", aiAdded: false, deletable: false },

  { id: "d11-miel", day: 11, date: "Jul 27", number: 1, title: "MIEL Specialty Coffee breakfast", area: "Canggu", time: "8:00 AM", travelFrom: "North Kuta Airbnb", travelTime: "10-20 min", type: "cafe", ...groupEstimate(1800), lat: -8.6475, lng: 115.1384, mapsUrl: "https://www.google.com/maps/search/?api=1&query=MIEL+Specialty+Coffee+Canggu", photo: photos.cafe, notes: "Morning cafe hopping optional.", aiAdded: false, deletable: false },
  { id: "d11-blou", day: 11, date: "Jul 27", number: 2, title: "Blou Cafe brunch", area: "Canggu", time: "9:00 AM", travelFrom: "MIEL Specialty Coffee", travelTime: "10-20 min", type: "cafe", ...groupEstimate(1800), lat: -8.6509, lng: 115.1346, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Blou+Cafe+Canggu", photo: photos.cafe, notes: "Brunch stop from original plan.", aiAdded: false, deletable: false },
  { id: "d11-finns", day: 11, date: "Jul 27", number: 3, title: "Finns Beach Club", area: "Canggu", time: "3:00 PM", travelFrom: "Blou Cafe", travelTime: "10-20 min", type: "food", ...groupEstimate(5400), lat: -8.6653, lng: 115.1365, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Finns+Beach+Club+Bali", photo: photos.club, notes: "Need reservation.", aiAdded: false, deletable: false },

  { id: "d12-grab-to-lovina", day: 12, date: "Jul 28", number: 1, title: "2 Grab cars to Lovina", area: "Lovina", time: "3:30 AM", travelFrom: "North Kuta Airbnb", travelTime: "2.5-3.5 hr", type: "transport", ...groupEstimate(3200, { cars: 2, perCarTHB: 1600 }), lat: -8.1619, lng: 115.025, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=North+Kuta+Bali&destination=Lovina+Bali", photo: photos.dolphin, notes: "Route correction: Airbnb to Lovina with 2 Grab cars. Tour transport not included.", aiAdded: false, deletable: false },
  { id: "d12-dolphin", day: 12, date: "Jul 28", number: 2, title: "Swimming with Dolphin + Snorkeling Coral Reef", area: "Lovina", time: "Morning", travelFrom: "Lovina", travelTime: "Boat package", type: "tour", ...usdPerPerson(20), lat: -8.1619, lng: 115.025, mapsUrl: "https://www.google.com/maps/search/?api=1&query=Lovina+dolphin+snorkeling", photo: photos.dolphin, notes: "Price from source: 20 USD per pax. No transportation included.", aiAdded: false, deletable: false },
  { id: "d12-grab-back-canggu", day: 12, date: "Jul 28", number: 3, title: "2 Grab cars back to North Kuta Airbnb", area: "Canggu", time: "After tour", travelFrom: "Lovina", travelTime: "2.5-3.5 hr", type: "transport", ...groupEstimate(3200, { cars: 2, perCarTHB: 1600 }), lat: -8.6503, lng: 115.1385, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=Lovina+Bali&destination=North+Kuta+Bali", photo: photos.villa, notes: "Return to North Kuta Airbnb with 2 Grab cars.", aiAdded: false, deletable: false },

  { id: "d13-airport-transfer", day: 13, date: "Jul 29", number: 1, title: "Airport departure transfer", area: "Airport", time: "9:00 AM", travelFrom: "North Kuta Airbnb", travelTime: "45-90 min", type: "transport", ...groupEstimate(1200, { cars: 2, perCarTHB: 600 }), lat: -8.7467, lng: 115.1668, mapsUrl: "https://www.google.com/maps/dir/?api=1&origin=North+Kuta+Bali&destination=I+Gusti+Ngurah+Rai+International+Airport", photo: photos.airport, notes: "Transfer from North Kuta Airbnb to airport with 2 cars.", aiAdded: false, deletable: false }
];

export const routeByDay = {
  1: ["airport-dps", "d1-airport-transfer", "d1-checkin", "d1-warung-dinner", "ubud-airbnb"],
  2: ["ubud-airbnb", "d2-cretya-atv", "ubud-airbnb"],
  3: ["ubud-airbnb", "tirta-empul", "ubud-cafes", "dewi-sita-shops", "ubud-airbnb"],
  4: ["ubud-airbnb", "d4-sunrise-jeep", "d4-akasa-coffee", "ubud-airbnb"],
  5: ["ubud-airbnb", "d5-checkout-ubud", "d5-ubud-uluwatu-transfer", "uluwatu-airbnb", "d5-lunch", "d5-beach", "d5-single-fin", "uluwatu-airbnb"],
  6: ["uluwatu-airbnb", "d6-oneeighty", "d6-savaya", "uluwatu-airbnb"],
  7: ["uluwatu-airbnb", "d7-cafe-hopping", "d7-karang-boma", "d7-percent-cafe", "d7-jimmy-beach", "d7-uluwatu-temple", "uluwatu-airbnb"],
  8: ["uluwatu-airbnb", "d8-checkout-uluwatu", "d8-sundays", "d8-melasti", "d8-klive", "d8-return-luggage", "uluwatu-airbnb", "d8-car-to-kuta", "kuta-villa"],
  9: ["kuta-villa", "d9-checkout-kuta", "d9-transfer-north-kuta", "north-kuta-airbnb", "d9-echo-beach", "north-kuta-airbnb"],
  10: ["north-kuta-airbnb", "d10-grab-to-sanur", "sanur-port", "d10-nusa-penida", "d10-return-sanur", "sanur-port", "d10-grab-back-airbnb", "north-kuta-airbnb"],
  11: ["north-kuta-airbnb", "d11-miel", "d11-blou", "d11-finns", "north-kuta-airbnb"],
  12: ["north-kuta-airbnb", "d12-grab-to-lovina", "d12-dolphin", "d12-grab-back-canggu", "north-kuta-airbnb"],
  13: ["north-kuta-airbnb", "d13-airport-transfer", "airport-dps"]
};

// Admin gate for the reorder/settings UI. Client-side checks are cosmetic only —
// anything bundled for the browser can be read by visitors, so never reuse a
// real password here. Override via VITE_ADMIN_USERNAME / VITE_ADMIN_PASSWORD
// in a local .env file.
const envVars = (typeof import.meta !== "undefined" && import.meta.env) || {};
export const adminCredentials = {
  username: envVars.VITE_ADMIN_USERNAME || "admin9",
  password: envVars.VITE_ADMIN_PASSWORD || "admin9"
};


