import { airbnbs, routeByDay } from "../data/tripData.js";

// Stay-like place types shared by route logic and map markers.
export const STAY_TYPES = ["airbnb", "villa", "airport", "port"];
const stayTypes = new Set(STAY_TYPES);

export function getDefaultRouteIds(day, activities) {
  const baseIds = routeByDay[day] || [];
  const baseSet = new Set(baseIds);
  const customIds = activities
    .filter((item) => item.day === day && (item.aiAdded || item.customAdded) && !baseSet.has(item.id))
    .sort((a, b) => (a.number || 0) - (b.number || 0))
    .map((item) => item.id);

  if (!customIds.length) return baseIds;

  const lastId = baseIds[baseIds.length - 1];
  const lastPlace = findPlace(lastId, activities);

  if (lastPlace && stayTypes.has(lastPlace.type)) {
    return [...baseIds.slice(0, -1), ...customIds, lastId];
  }

  return [...baseIds, ...customIds];
}

export function getRouteIdsForDay(dayMeta, activities, routeOverrides = {}) {
  const defaultIds = getDefaultRouteIds(dayMeta.day, activities);
  const overrideIds = routeOverrides[dayMeta.date];

  if (!Array.isArray(overrideIds) || !overrideIds.length) return defaultIds;

  const validDefaultIds = new Set(defaultIds);
  const ordered = overrideIds.filter((id) => validDefaultIds.has(id));
  const missing = defaultIds.filter((id) => !ordered.includes(id));

  return [...ordered, ...missing];
}

export function getOrderedActivitiesForDay(dayMeta, activities, routeOverrides = {}) {
  const ids = getRouteIdsForDay(dayMeta, activities, routeOverrides);
  const dayActivities = activities.filter((item) => item.day === dayMeta.day);
  const byId = Object.fromEntries(dayActivities.map((item) => [item.id, item]));

  return ids.map((id) => byId[id]).filter(Boolean);
}

export function getRouteStopsForDay(dayMeta, activities, routeOverrides = {}) {
  return getRouteIdsForDay(dayMeta, activities, routeOverrides)
    .map((id) => findPlace(id, activities))
    .filter(Boolean);
}

export function moveEditablePlace(dayMeta, activities, routeOverrides, placeId, direction) {
  const currentIds = getRouteIdsForDay(dayMeta, activities, routeOverrides);
  const editableIds = activities
    .filter((item) => item.day === dayMeta.day && (item.aiAdded || item.customAdded))
    .map((item) => item.id);

  if (!editableIds.includes(placeId)) return routeOverrides;

  const editableInOrder = currentIds.filter((id) => editableIds.includes(id));
  const currentEditableIndex = editableInOrder.indexOf(placeId);
  const nextEditableIndex = currentEditableIndex + direction;

  if (currentEditableIndex < 0 || nextEditableIndex < 0 || nextEditableIndex >= editableInOrder.length) {
    return routeOverrides;
  }

  const swapId = editableInOrder[nextEditableIndex];
  const fromIndex = currentIds.indexOf(placeId);
  const toIndex = currentIds.indexOf(swapId);
  const nextIds = [...currentIds];

  nextIds[fromIndex] = swapId;
  nextIds[toIndex] = placeId;

  return {
    ...routeOverrides,
    [dayMeta.date]: nextIds
  };
}

export function findPlace(id, activities) {
  return airbnbs.find((item) => item.id === id) || activities.find((item) => item.id === id);
}
