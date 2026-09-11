// Single source of truth for localStorage access.
// NOTE: key strings are versioned on purpose — bump the suffix only when the
// stored shape changes incompatibly, otherwise returning users lose their data.
export const STORAGE_KEYS = {
  customPlaces: "baliPlanner.customPlaces.v05",
  deletedPlaceIds: "baliPlanner.deletedPlaceIds.v05",
  adminSession: "baliPlanner.adminSession.v05",
  routeOverrides: "baliPlanner.routeOverrides.v06",
  realSpend: "baliPlanner.realSpend.v06",
  aiChat: "baliPlanner.aiChat.v06",
  currency: "baliPlanner.currency.v01"
};

export function readStoredJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the app keeps working in memory.
  }
}

export function removeStoredKey(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore — nothing else to do.
  }
}
