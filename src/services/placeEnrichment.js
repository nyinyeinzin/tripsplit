const fallbackPhotos = {
  cafe: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
  temple: "https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=1000&q=80",
  club: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1000&q=80",
  place: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80"
};

const localPlaces = [
  { keys: ["savaya", "savaya beach club"], title: "Savaya Beach Club", area: "Uluwatu", type: "food", estimatedCostTHB: 900, estimatedDuration: "2-4 hr", lat: -8.8432, lng: 115.1556, photo: fallbackPhotos.club },
  { keys: ["oneeighty", "one eighty"], title: "Oneeighty day club", area: "Uluwatu", type: "food", estimatedCostTHB: 700, estimatedDuration: "2-3 hr", lat: -8.8415, lng: 115.0909, photo: fallbackPhotos.club },
  { keys: ["tirta empul", "pura tirta empul"], title: "Pura Tirta Empul", area: "Ubud", type: "temple", estimatedCostTHB: 165, estimatedDuration: "1-1.5 hr", lat: -8.4153, lng: 115.3152, photo: fallbackPhotos.temple },
  { keys: ["ubud cafe", "ubud cafes", "cafe in ubud"], title: "Ubud cafe stop", area: "Ubud", type: "cafe", estimatedCostTHB: 300, estimatedDuration: "1-1.5 hr", lat: -8.508, lng: 115.2635, photo: fallbackPhotos.cafe },
  { keys: ["single fin"], title: "Single Fin Sunset Bar", area: "Uluwatu", type: "food", estimatedCostTHB: 600, estimatedDuration: "2 hr", lat: -8.8136, lng: 115.087, photo: fallbackPhotos.club },
  { keys: ["uluwatu temple"], title: "Uluwatu Temple", area: "Uluwatu", type: "temple", estimatedCostTHB: 165, estimatedDuration: "1-1.5 hr", lat: -8.8291, lng: 115.0849, photo: fallbackPhotos.temple },
  { keys: ["finns", "finns beach club"], title: "Finns Beach Club", area: "Canggu", type: "food", estimatedCostTHB: 900, estimatedDuration: "3-4 hr", lat: -8.6653, lng: 115.1365, photo: fallbackPhotos.club },
  { keys: ["miel"], title: "MIEL Specialty Coffee", area: "Canggu", type: "cafe", estimatedCostTHB: 300, estimatedDuration: "1 hr", lat: -8.6475, lng: 115.1384, photo: fallbackPhotos.cafe },
  { keys: ["blou"], title: "Blou Cafe", area: "Canggu", type: "cafe", estimatedCostTHB: 300, estimatedDuration: "1 hr", lat: -8.6509, lng: 115.1346, photo: fallbackPhotos.cafe },
  { keys: ["lovina"], title: "Lovina", area: "Lovina", type: "tour", estimatedCostTHB: 650, estimatedDuration: "Half day", lat: -8.1619, lng: 115.025, photo: fallbackPhotos.beach },
  { keys: ["melasti"], title: "Melasti Beach", area: "Uluwatu", type: "beach", estimatedCostTHB: 0, estimatedDuration: "1-2 hr", lat: -8.8491, lng: 115.1593, photo: fallbackPhotos.beach },
  { keys: ["padang padang", "dreamland", "thomas beach"], title: "Uluwatu beach stop", area: "Uluwatu", type: "beach", estimatedCostTHB: 0, estimatedDuration: "1-2 hr", lat: -8.8038, lng: 115.1025, photo: fallbackPhotos.beach }
];

export function enrichPlaceInput(input) {
  const rawPlace = (input.place || "").trim();
  const placeName = titleFromInput(rawPlace);
  const normalized = normalize(placeName);
  const match = localPlaces.find((place) => place.keys.some((key) => normalized.includes(normalize(key))));
  const enriched = match || guessPlace(placeName);

  return {
    title: enriched.title,
    area: enriched.area,
    type: enriched.type,
    estimatedCostTHB: enriched.estimatedCostTHB,
    estimatedDuration: enriched.estimatedDuration,
    mapsUrl: rawPlace.startsWith("http") ? rawPlace : googleMapsSearch(enriched.title + " " + enriched.area + " Bali"),
    photo: enriched.photo,
    notes: input.note?.trim() || "Added with Smart Trip Editor.",
    lat: enriched.lat ?? null,
    lng: enriched.lng ?? null
  };
}

function titleFromInput(value) {
  if (!value) return "Custom place";
  if (!value.startsWith("http")) return value;

  try {
    const url = new URL(value);
    const query = url.searchParams.get("query") || url.searchParams.get("q");
    if (query) return decodeURIComponent(query).replace(/\+/g, " ");
    const placePart = url.pathname.split("/place/")[1]?.split("/")[0];
    if (placePart) return decodeURIComponent(placePart).replace(/\+/g, " ");
  } catch {
    return "Google Maps place";
  }

  return "Google Maps place";
}

function guessPlace(title) {
  const lower = normalize(title);
  const type = lower.includes("cafe") || lower.includes("coffee") ? "cafe" : lower.includes("beach") ? "beach" : lower.includes("temple") ? "temple" : "other";
  const area = lower.includes("canggu") || lower.includes("kuta") ? "Canggu" : lower.includes("uluwatu") ? "Uluwatu" : lower.includes("ubud") ? "Ubud" : "Bali";
  const estimatedCostTHB = type === "beach" ? 0 : type === "temple" ? 165 : type === "cafe" ? 300 : 400;

  return {
    title: title || "Custom place",
    area,
    type,
    estimatedCostTHB,
    estimatedDuration: "1-2 hr",
    photo: fallbackPhotos[type] || fallbackPhotos.place,
    lat: null,
    lng: null
  };
}

function googleMapsSearch(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}
