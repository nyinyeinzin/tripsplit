export const categories = ["accommodation", "food", "attraction", "nightlife", "transport", "shopping", "other"];

export const defaultDuration = {
  accommodation: 30,
  food: 90,
  attraction: 120,
  nightlife: 120,
  transport: 30,
  shopping: 90,
  other: 60,
};

export function orderStops(a, b) {
  return a.day.localeCompare(b.day) || a.order_index - b.order_index || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

function minutesFromTime(time) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatScheduleTime(minutes) {
  const dayOffset = Math.floor(minutes / 1440);
  const clock = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}${dayOffset ? ` (+${dayOffset} day${dayOffset === 1 ? "" : "s"})` : ""}`;
}

export function buildDaySchedule(dayStops, legs, dayStartTime = "09:00") {
  const ordered = [...dayStops].sort(orderStops);
  const legByPair = new Map(legs.map((leg) => [`${leg.from_stop_id}:${leg.to_stop_id}`, leg]));
  let nextMinutes = minutesFromTime(dayStartTime);
  return ordered.map((stop, index) => {
    const prior = ordered[index - 1];
    const leg = prior ? legByPair.get(`${prior.id}:${stop.id}`) : null;
    const travelMinutes = prior ? Math.max(0, Number(leg?.estimated_minutes) || 0) : 0;
    nextMinutes += travelMinutes;
    const arrivalMinutes = nextMinutes;
    nextMinutes += Number(stop.estimated_duration_minutes) || defaultDuration[stop.category] || 60;
    return { ...stop, arrivalTime: formatScheduleTime(arrivalMinutes), departureTime: formatScheduleTime(nextMinutes), travelFromPrev: prior ? { mode: leg?.travel_mode ?? "driving", distanceKm: leg?.estimated_distance_km ?? null, estimatedMinutes: leg?.estimated_minutes ?? null, isManualOverride: Boolean(leg?.is_manual_override) } : null };
  });
}
