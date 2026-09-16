import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNavigation from "./components/BottomNavigation";
import SmartAddPlace from "./components/SmartAddPlace";
import { activities as baseActivities, airbnbs, groupSize, tripDays } from "./data/tripData";
import { useAuth } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import BudgetPage from "./pages/BudgetPage";
import AIPage from "./pages/AIPage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import { enrichPlaceInput } from "./services/placeEnrichment";
import { getRouteIdsForDay, moveEditablePlace } from "./utils/routes";
import { STORAGE_KEYS, readStoredJson, removeStoredKey, writeStoredJson } from "./utils/storage";

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [customPlaces, setCustomPlaces] = useState(() => readStoredJson(STORAGE_KEYS.customPlaces, []));
  const [deletedPlaceIds, setDeletedPlaceIds] = useState(() => readStoredJson(STORAGE_KEYS.deletedPlaceIds, []));
  const [routeOverrides, setRouteOverrides] = useState(() => readStoredJson(STORAGE_KEYS.routeOverrides, {}));
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [currency, setCurrency] = useState(() => readStoredJson(STORAGE_KEYS.currency, "THB"));
  const [lastAiBatchIds, setLastAiBatchIds] = useState([]);
  const [lastAiSnapshot, setLastAiSnapshot] = useState(null);

  const activities = useMemo(() => {
    const deleted = new Set(deletedPlaceIds);
    return [...baseActivities, ...customPlaces].filter((item) => !deleted.has(item.id));
  }, [customPlaces, deletedPlaceIds]);

  const placesById = useMemo(() => {
    const airbnbMap = Object.fromEntries(airbnbs.map((item) => [item.id, item]));
    const activityMap = Object.fromEntries(activities.map((item) => [item.id, item]));
    return { ...airbnbMap, ...activityMap };
  }, [activities]);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.customPlaces, customPlaces);
  }, [customPlaces]);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.deletedPlaceIds, deletedPlaceIds);
  }, [deletedPlaceIds]);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.routeOverrides, routeOverrides);
  }, [routeOverrides]);

  useEffect(() => {
    writeStoredJson(STORAGE_KEYS.currency, currency);
  }, [currency]);

  // Stable handlers: MapPage rebuilds every marker when these change identity,
  // so they must not be re-created on unrelated re-renders.
  const handleMapSelectDay = useCallback((day) => {
    setSelectedDay(day);
    setSelectedPlace(null);
  }, []);

  const handleMapSelectPlace = useCallback((place) => {
    setSelectedPlace(place);
    if (place?.day) setSelectedDay(place.day);
  }, []);

  const handleMapClosePlace = useCallback(() => setSelectedPlace(null), []);

  function openPlaceOnMap(placeOrId, day) {
    const place = typeof placeOrId === "string" ? placesById[placeOrId] : placeOrId;
    if (!place) return;
    setSelectedPlace(place);
    setSelectedDay(day || place.day || selectedDay);
    setActiveTab("map");
  }

  function addPlaces(newPlaces) {
    const existing = [...baseActivities, ...customPlaces];
    const batch = (Array.isArray(newPlaces) ? newPlaces : [newPlaces]).map((place, index) => ({
      ...place,
      id: place.id || "custom-" + Date.now() + "-" + index,
      number: place.number || nextNumberForDay(existing, place.day),
      deletable: true
    }));
    setCustomPlaces((current) => [...current, ...batch]);
    setDeletedPlaceIds((current) => current.filter((id) => !batch.some((place) => place.id === id)));
    return batch;
  }

  function addSmartPlace(input) {
    const dayMeta = tripDays.find((day) => day.day === Number(input.day));
    if (!dayMeta) return false;

    const enriched = enrichPlaceInput(input);
    const existing = [...baseActivities, ...customPlaces];
    const nextNumber = nextNumberForDay(existing, dayMeta.day);
    const perPersonCost = Math.round(enriched.estimatedCostTHB || 0);
    const place = {
      id: "smart-" + Date.now(),
      day: dayMeta.day,
      date: dayMeta.date,
      number: nextNumber,
      title: enriched.title,
      area: enriched.area,
      time: "Custom",
      travelFrom: "Previous stop",
      travelTime: enriched.estimatedDuration,
      type: enriched.type,
      costPerPersonTHB: perPersonCost,
      costTHB: perPersonCost * groupSize,
      groupTotalTHB: perPersonCost * groupSize,
      lat: enriched.lat,
      lng: enriched.lng,
      mapsUrl: enriched.mapsUrl,
      photo: enriched.photo,
      notes: enriched.notes,
      aiAdded: false,
      customAdded: true,
      deletable: true
    };

    setCustomPlaces((current) => [...current, place]);
    setDeletedPlaceIds((current) => current.filter((id) => id !== place.id));
    insertSmartPlaceInRoute(dayMeta, place, input.note, [...activities, place]);
    setSelectedDay(dayMeta.day);
    return place;
  }

  function applyAIActivities(updatedActivities, aiResult) {
    // Snapshot both lists so Undo can fully revert an AI action, including
    // the route reorder it may have performed.
    setLastAiSnapshot({ customPlaces, routeOverrides });
    const nextCustomPlaces = updatedActivities.filter((item) => item.aiAdded || item.customAdded);
    setCustomPlaces(nextCustomPlaces);
    setDeletedPlaceIds((current) => current.filter((id) => nextCustomPlaces.some((place) => place.id === id)));
    setLastAiBatchIds(nextCustomPlaces.filter((place) => place.aiAdded).map((place) => place.id));
    updateRoutesForAIResult(aiResult, updatedActivities);

    const firstAdded = nextCustomPlaces.find((place) => !customPlaces.some((current) => current.id === place.id));
    if (firstAdded?.day) setSelectedDay(firstAdded.day);
  }

  function editPlace(id, updates) {
    const target = activities.find((item) => item.id === id);
    if (!target || (!target.aiAdded && !target.customAdded)) return false;

    const resolvedUpdates = { ...updates };
    // Moving a place to another day must not carry the old day's stop number,
    // otherwise two stops can end up with the same marker number.
    if (updates.day != null && Number(updates.day) !== target.day && updates.number == null) {
      const others = activities.filter((item) => item.id !== id);
      resolvedUpdates.number = nextNumberForDay(others, Number(updates.day));
    }

    setCustomPlaces((current) =>
      current.map((item) => (item.id === id ? { ...item, ...resolvedUpdates, id, deletable: true } : item))
    );
    if (selectedPlace?.id === id) {
      setSelectedPlace((current) => ({ ...current, ...resolvedUpdates, id, deletable: true }));
    }
    return true;
  }

  function undoLastAiBatch() {
    if (lastAiSnapshot) {
      const restoredIds = new Set(lastAiSnapshot.customPlaces.map((item) => item.id));
      setCustomPlaces(lastAiSnapshot.customPlaces);
      setRouteOverrides(lastAiSnapshot.routeOverrides);
      setDeletedPlaceIds((current) => current.filter((id) => restoredIds.has(id)));
      setLastAiSnapshot(null);
      setLastAiBatchIds([]);
      return;
    }
    if (!lastAiBatchIds.length) return;
    setCustomPlaces((current) => current.filter((item) => !lastAiBatchIds.includes(item.id)));
    setDeletedPlaceIds((current) => [...new Set([...current, ...lastAiBatchIds])]);
    if (selectedPlace && lastAiBatchIds.includes(selectedPlace.id)) setSelectedPlace(null);
    setLastAiBatchIds([]);
  }

  function deletePlace(id) {
    const target = activities.find((item) => item.id === id);
    if (!target || (!target.aiAdded && !target.customAdded)) return false;
    setCustomPlaces((current) => current.filter((item) => item.id !== id));
    setDeletedPlaceIds((current) => [...new Set([...current, id])]);
    if (selectedPlace?.id === id) setSelectedPlace(null);
    setLastAiBatchIds((current) => current.filter((itemId) => itemId !== id));
    return true;
  }

  function movePlace(dayMeta, placeId, direction) {
    setRouteOverrides((current) => moveEditablePlace(dayMeta, activities, current, placeId, direction));
  }

  function insertSmartPlaceInRoute(dayMeta, place, note, nextActivities) {
    const targetName = getAfterTarget(note);

    setRouteOverrides((current) => {
      const currentIds = getRouteIdsForDay(dayMeta, nextActivities, current);
      const withoutPlace = currentIds.filter((id) => id !== place.id);
      const targetIndex = targetName ? withoutPlace.findIndex((id) => {
        const match = findPlaceForSmartRoute(id, nextActivities);
        return match?.title?.toLowerCase().includes(targetName);
      }) : -1;
      const insertIndex = targetIndex >= 0 ? targetIndex + 1 : appendIndexForDay(withoutPlace, nextActivities);

      const nextIds = [...withoutPlace];
      nextIds.splice(insertIndex, 0, place.id);
      return { ...current, [dayMeta.date]: nextIds };
    });
  }

  function updateRoutesForAIResult(aiResult, nextActivities) {
    const addActions = (aiResult?.actions || []).filter((item) => item.action === "add_place");
    addActions.forEach((action) => {
      const payload = action.payload || {};
      const placeTitle = payload.place?.title;
      const place = nextActivities.find((item) => item.title === placeTitle && item.aiAdded);
      const dayMeta = tripDays.find((day) => day.day === Number(payload.day || place?.day));
      if (!place || !dayMeta) return;
      insertSmartPlaceInRoute(dayMeta, place, payload.insertAfter || "", nextActivities);
    });
  }

  function resetLocalData() {
    removeStoredKey(STORAGE_KEYS.customPlaces);
    removeStoredKey(STORAGE_KEYS.deletedPlaceIds);
    removeStoredKey(STORAGE_KEYS.realSpend);
    removeStoredKey(STORAGE_KEYS.routeOverrides);
    window.location.reload();
  }

  if (authLoading) {
    return (
      <main className="auth-page auth-loading" aria-live="polite">
        <div className="auth-loading-mark">TS</div>
        <p>Opening your trips…</p>
      </main>
    );
  }

  if (!user) return <AuthPage />;

  const isAdmin = true;

  return (
    <div className="app-shell">
      {activeTab === "home" && (
        <HomePage
          activities={activities}
          currency={currency}
          setCurrency={setCurrency}
          onOpenPlace={openPlaceOnMap}
          onDeletePlace={deletePlace}
          isAdmin={isAdmin}
          routeOverrides={routeOverrides}
          onMovePlace={movePlace}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      )}
      {activeTab === "map" && (
        <MapPage
          activities={activities}
          selectedPlace={selectedPlace}
          selectedDay={selectedDay}
          onSelectDay={handleMapSelectDay}
          onSelectPlace={handleMapSelectPlace}
          onClosePlace={handleMapClosePlace}
          currency={currency}
          routeOverrides={routeOverrides}
          isAdmin={isAdmin}
          onMovePlace={movePlace}
        />
      )}
      {activeTab === "budget" && <BudgetPage activities={activities} currency={currency} setCurrency={setCurrency} />}
      {isAdmin && activeTab === "ai" && <AIPage activities={activities} currency={currency} onApplyAIActivities={applyAIActivities} onUndoAI={undoLastAiBatch} canUndo={lastAiBatchIds.length > 0 || Boolean(lastAiSnapshot)} />}
      {activeTab === "settings" && (
        <SettingsPage
          activities={activities}
          isAdmin={isAdmin}
          user={user}
          currency={currency}
          setCurrency={setCurrency}
          onLogout={signOut}
          onAddPlace={(place) => addPlaces({ ...place, customAdded: true, aiAdded: false, deletable: true })}
          onEditPlace={editPlace}
          onDeletePlace={deletePlace}
          onResetLocalData={resetLocalData}
        />
      )}
      {/* Hidden on the AI tab so the FAB doesn't overlap the chat composer. */}
      {activeTab !== "ai" && <SmartAddPlace onAddPlace={addSmartPlace} />}
      <BottomNavigation activeTab={activeTab} onChange={setActiveTab} isAdmin={isAdmin} />
    </div>
  );
}

function getAfterTarget(note = "") {
  const match = String(note).toLowerCase().match(/\bafter\s+(.+)/);
  return match?.[1]?.trim() || "";
}

function appendIndexForDay(routeIds, activities) {
  const lastPlace = findPlaceForSmartRoute(routeIds[routeIds.length - 1], activities);
  if (lastPlace && ["airbnb", "villa", "airport", "port"].includes(lastPlace.type)) {
    return Math.max(routeIds.length - 1, 0);
  }
  return routeIds.length;
}

function findPlaceForSmartRoute(id, activities) {
  return activities.find((item) => item.id === id) || airbnbs.find((item) => item.id === id);
}

function nextNumberForDay(activities, day) {
  return Math.max(
    0,
    ...activities
      .filter((item) => item.day === Number(day))
      .map((item) => Number(item.number) || 0)
  ) + 1;
}
