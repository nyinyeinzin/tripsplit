import { createClient } from "@supabase/supabase-js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

async function geocode(name, destination, apiKey) {
  const url = new URL("https://api.heigit.org/pelias/v1/search");
  url.searchParams.set("text", `${name}, ${destination}`);
  url.searchParams.set("size", "1");
  const response = await fetch(url, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("Place lookup is unavailable. Add the coordinates manually or enter a route estimate.");
  const result = await response.json();
  const coordinates = result.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error(`Could not locate ${name}. Add its coordinates manually.`);
  return { lng: coordinates[0], lat: coordinates[1] };
}

export default async function estimateLeg(request) {
  if (request.method === "GET") return json({ available: Boolean(process.env.ORS_API_KEY && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in to estimate a route." }, 401);
  const apiKey = process.env.ORS_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey || !supabaseUrl || !supabaseKey) return json({ error: "Automatic routes are not configured yet. Enter the travel estimate manually." }, 503);

  let input;
  try { input = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const { tripId, fromStopId, toStopId } = input;
  if (![tripId, fromStopId, toStopId].every((value) => typeof value === "string" && uuid.test(value)) || fromStopId === toStopId) return json({ error: "Invalid trip or stops." }, 400);

  const db = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Your session expired. Sign in again." }, 401);

  const { data: membership } = await db.from("trip_members").select("role").eq("trip_id", tripId).eq("user_id", auth.user.id).single();
  if (!membership || !["owner", "editor"].includes(membership.role)) return json({ error: "Only trip editors can estimate routes." }, 403);

  const { data: cached } = await db.from("legs").select("id,estimated_minutes,estimated_distance_km,estimated_cost,num_vehicles,computed_at").eq("trip_id", tripId).eq("from_stop_id", fromStopId).eq("to_stop_id", toStopId).maybeSingle();
  if (cached?.computed_at && Date.now() - Date.parse(cached.computed_at) < 86400000) return json({ leg: cached, cached: true });

  const [{ data: trip }, { data: stops }] = await Promise.all([
    db.from("trips").select("destination,transport_base_fare,transport_per_km_rate").eq("id", tripId).single(),
    db.from("stops").select("id,name,lat,lng,day").eq("trip_id", tripId).in("id", [fromStopId, toStopId])
  ]);
  if (!trip || stops?.length !== 2) return json({ error: "Could not find both stops in this trip." }, 404);
  if (stops[0].day !== stops[1].day) return json({ error: "Routes must connect stops on the same day." }, 400);

  try {
    const points = [];
    for (const stopId of [fromStopId, toStopId]) {
      const stop = stops.find((item) => item.id === stopId);
      const point = stop.lat != null && stop.lng != null ? { lat: stop.lat, lng: stop.lng } : await geocode(stop.name, trip.destination, apiKey);
      points.push([point.lng, point.lat]);
      if (stop.lat == null || stop.lng == null) await db.from("stops").update(point).eq("id", stopId).eq("trip_id", tripId);
    }
    const routeResponse = await fetch("https://api.heigit.org/openrouteservice/v2/directions/driving-car/json", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: points, instructions: false }),
      signal: AbortSignal.timeout(12000)
    });
    if (!routeResponse.ok) throw new Error("Routing service is unavailable. Enter time and fare manually.");
    const route = await routeResponse.json();
    const summary = route.routes?.[0]?.summary;
    if (!Number.isFinite(summary?.distance) || !Number.isFinite(summary?.duration)) throw new Error("No drivable route was found. Enter an estimate manually.");
    const distance = Math.round(summary.distance / 10) / 100;
    const fare = Math.round((Number(trip.transport_base_fare) + distance * Number(trip.transport_per_km_rate)) * 100) / 100;
    const { data: leg, error: saveError } = await db.from("legs").upsert({ trip_id: tripId, from_stop_id: fromStopId, to_stop_id: toStopId, estimated_minutes: Math.ceil(summary.duration / 60), estimated_distance_km: distance, estimated_cost: fare, travel_mode: "driving", is_manual_override: false, num_vehicles: cached?.num_vehicles ?? 1, computed_at: new Date().toISOString() }, { onConflict: "trip_id,from_stop_id,to_stop_id" }).select("id,estimated_minutes,estimated_distance_km,estimated_cost,num_vehicles,computed_at").single();
    if (saveError) throw new Error(saveError.message);
    return json({ leg, cached: false });
  } catch (error) {
    return json({ error: error.message || "Could not estimate this route. Enter values manually." }, 502);
  }
}
