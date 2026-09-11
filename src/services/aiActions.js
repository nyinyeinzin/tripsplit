import { groupSize, tripDays } from "../data/tripData.js";

export function applyAIActions(currentActivities, aiResult) {
  const actions = Array.isArray(aiResult?.actions) ? aiResult.actions : [];
  let nextActivities = [...currentActivities];

  actions.forEach((item, index) => {
    const action = item?.action;
    const payload = item?.payload || {};

    if (action === "add_place") {
      nextActivities = addPlace(nextActivities, payload, index);
    }

    if (action === "remove_place") {
      nextActivities = removePlace(nextActivities, payload);
    }

    if (action === "move_place") {
      nextActivities = movePlace(nextActivities, payload);
    }

    if (action === "update_place") {
      nextActivities = updatePlace(nextActivities, payload);
    }
  });

  return renumberAllDays(nextActivities);
}

function addPlace(activities, payload, index) {
  const day = Number(payload.day || payload.place?.day || 1);
  const dayMeta = tripDays.find((item) => item.day === day) || tripDays[0];
  const place = payload.place || {};
  if (activities.some((item) => item.day === day && item.title?.toLowerCase() === String(place.title || "").toLowerCase())) {
    return activities;
  }
  const perPerson = Math.round(place.estimatedCostTHB || place.costPerPersonTHB || 0);

  return [
    ...activities,
    {
      id: place.id || "ai-place-" + Date.now() + "-" + index,
      day,
      date: dayMeta.date,
      number: nextNumberForDay(activities, day),
      title: place.title || "AI-added place",
      area: place.area || dayMeta.area,
      time: place.time || "Custom",
      travelFrom: place.travelFrom || "Previous stop",
      travelTime: place.estimatedDuration || place.travelTime || "Check travel time",
      type: normalizeType(place.type),
      costTHB: Math.round((place.costTHB || perPerson * groupSize) || 0),
      costPerPersonTHB: perPerson,
      groupTotalTHB: Math.round((place.groupTotalTHB || perPerson * groupSize) || 0),
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      mapsUrl: place.mapsUrl || googleMapsSearch(place.title || "Bali place"),
      photo: place.photo || "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80",
      notes: place.notes || "Added by Travel AI.",
      aiAdded: true,
      customAdded: true,
      deletable: true
    }
  ];
}

function removePlace(activities, payload) {
  const index = findEditableIndex(activities, payload.title || payload.id);
  if (index < 0) return activities;
  return activities.filter((_, itemIndex) => itemIndex !== index);
}

function movePlace(activities, payload) {
  const index = findEditableIndex(activities, payload.title || payload.id);
  const day = Number(payload.day);
  const dayMeta = tripDays.find((item) => item.day === day);
  if (index < 0 || !dayMeta) return activities;
  return activities.map((item, itemIndex) => itemIndex === index ? { ...item, day, date: dayMeta.date } : item);
}

function updatePlace(activities, payload) {
  const index = findEditableIndex(activities, payload.title || payload.id);
  if (index < 0) return activities;
  return activities.map((item, itemIndex) => itemIndex === index ? { ...item, ...editableUpdates(payload), id: item.id, deletable: true } : item);
}

function editableUpdates(payload) {
  const updates = {};
  if (payload.time) updates.time = payload.time;
  if (payload.notes) updates.notes = payload.notes;
  if (payload.travelTime) updates.travelTime = payload.travelTime;
  return updates;
}

function findEditableIndex(activities, value = "") {
  const needle = String(value).toLowerCase().trim();
  return activities.findIndex((item) => {
    if (!item.deletable || (!item.aiAdded && !item.customAdded)) return false;
    if (item.id === value) return true;
    return needle && item.title.toLowerCase().includes(needle);
  });
}

function renumberAllDays(activities) {
  const counters = {};
  return activities.map((item) => {
    counters[item.day] = (counters[item.day] || 0) + 1;
    return { ...item, number: counters[item.day] };
  });
}

function nextNumberForDay(activities, day) {
  return Math.max(0, ...activities.filter((item) => item.day === day).map((item) => Number(item.number) || 0)) + 1;
}

function normalizeType(type = "other") {
  if (type === "beach_club") return "food";
  return type;
}

function googleMapsSearch(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query + " Bali");
}
