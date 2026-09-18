import { useCallback, useEffect, useRef, useState } from "react";
import { CarFront, Clock3, MapPin, Route, Users } from "lucide-react";
import { supabase } from "../lib/supabase";
import { orderStops } from "../utils/schedule";

const money = (value, currency) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) + ` ${currency}`;

export default function TripLegs({ trip, user, onTripUpdated }) {
  const [stops, setStops] = useState([]);
  const [legs, setLegs] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [role, setRole] = useState(null);
  const [fare, setFare] = useState({ base: String(trip.transport_base_fare ?? 0), perKm: String(trip.transport_per_km_rate ?? 0), capacity: String(trip.default_vehicle_capacity ?? 4) });
  const [editing, setEditing] = useState(null);
  const [manual, setManual] = useState({ minutes: "", distance: "", cost: "", mode: "driving" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const autoAttempted = useRef(new Set());
  const lastAutoCall = useRef(0);
  const canEdit = role === "owner" || role === "editor";

  const load = useCallback(async () => {
    const [stopResult, legResult, participantResult, memberResult] = await Promise.all([
      supabase.from("stops").select("id,name,day,order_index,created_at").eq("trip_id", trip.id),
      supabase.from("legs").select("id,from_stop_id,to_stop_id,estimated_minutes,estimated_distance_km,estimated_cost,computed_at,travel_mode,is_manual_override").eq("trip_id", trip.id),
      supabase.from("stop_participants").select("id,stop_id,user_id").in("stop_id", (await supabase.from("stops").select("id").eq("trip_id", trip.id)).data?.map((stop) => stop.id) || ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("trip_members").select("user_id,role").eq("trip_id", trip.id)
    ]);
    const problem = [stopResult, legResult, participantResult, memberResult].find((item) => item.error)?.error;
    if (problem) return setError(problem.message);
    setStops((stopResult.data ?? []).sort(orderStops));
    setLegs(legResult.data ?? []);
    setParticipants(participantResult.data ?? []);
    setMembers(memberResult.data ?? []);
    const own = memberResult.data?.find((member) => member.user_id === user.id);
    setRole(own?.role ?? "viewer");
    if (memberResult.data?.length) {
      const { data } = await supabase.from("profiles").select("id,name,email").in("id", memberResult.data.map((member) => member.user_id));
      setProfiles(data ?? []);
    }
    setError("");
  }, [trip.id, user.id]);

  useEffect(() => {
    load();
    const channel = supabase.channel(`legs:${trip.id}`).on("postgres_changes", { event: "*", schema: "public", table: "stops", filter: `trip_id=eq.${trip.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "legs", filter: `trip_id=eq.${trip.id}` }, load).on("postgres_changes", { event: "*", schema: "public", table: "stop_participants" }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trip.id, load]);

  useEffect(() => {
    if (!canEdit || stops.length < 2) return undefined;
    let active = true;
    async function estimateMissing() {
      try {
        const probe = await fetch("/.netlify/functions/estimate-leg");
        if (!probe.ok || !(await probe.json()).available) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) return;
        for (let i = 1; i < stops.length && active; i++) {
          const from = stops[i - 1], to = stops[i];
          if (from.day !== to.day) continue;
          const key = `${from.id}:${to.id}`;
          if (legs.some((leg) => leg.from_stop_id === from.id && leg.to_stop_id === to.id) || autoAttempted.current.has(key)) continue;
          autoAttempted.current.add(key);
          const wait = Math.max(0, 1000 - (Date.now() - lastAutoCall.current));
          if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
          if (!active) break;
          lastAutoCall.current = Date.now();
          const response = await fetch("/.netlify/functions/estimate-leg", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ tripId: trip.id, fromStopId: from.id, toStopId: to.id }) });
          if (response.ok) { await load(); break; }
        }
      } catch { /* Manual entry remains available when the function is offline. */ }
    }
    estimateMissing();
    return () => { active = false; };
  }, [canEdit, stops, legs, trip.id, load]);

  async function saveFare(event) {
    event.preventDefault();
    const base = Number(fare.base), perKm = Number(fare.perKm), capacity = Number(fare.capacity);
    if (!Number.isFinite(base) || !Number.isFinite(perKm) || base < 0 || perKm < 0 || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) return setError("Enter non-negative fares and a vehicle capacity between 1 and 50.");
    setBusy("fare"); setError("");
    try {
      await onTripUpdated(trip.id, { transport_base_fare: base, transport_per_km_rate: perKm, default_vehicle_capacity: capacity });
      const updates = legs.filter((leg) => leg.estimated_distance_km != null).map((leg) => supabase.from("legs").update({ estimated_cost: Math.round((base + Number(leg.estimated_distance_km) * perKm) * 100) / 100 }).eq("id", leg.id));
      const results = await Promise.all(updates);
      const problem = results.find((result) => result.error)?.error;
      if (problem) throw problem;
      await load();
    }
    catch (saveError) { setError(saveError.message); }
    setBusy("");
  }

  async function estimate(from, to) {
    setBusy(`${from.id}:${to.id}`); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/.netlify/functions/estimate-leg", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` }, body: JSON.stringify({ tripId: trip.id, fromStopId: from.id, toStopId: to.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not estimate this route.");
      await load();
    } catch (estimateError) { setError(estimateError.message + " You can enter the route details manually."); }
    setBusy("");
  }

  function openManual(from, to, leg) {
    setEditing(`${from.id}:${to.id}`);
    setManual({ minutes: String(leg?.estimated_minutes ?? ""), distance: String(leg?.estimated_distance_km ?? ""), cost: String(leg?.estimated_cost ?? ""), mode: leg?.travel_mode ?? "driving" });
    setError("");
  }

  async function saveManual(event, from, to, participantCount) {
    event.preventDefault();
    const minutes = Number(manual.minutes), distance = Number(manual.distance), cost = Number(manual.cost);
    if ([minutes, distance, cost].some((value) => !Number.isFinite(value) || value < 0) || !Number.isInteger(minutes)) return setError("Enter valid, non-negative travel time, distance, and fare.");
    setBusy("manual"); setError("");
    const { error: saveError } = await supabase.from("legs").upsert({ trip_id: trip.id, from_stop_id: from.id, to_stop_id: to.id, estimated_minutes: minutes, estimated_distance_km: distance, estimated_cost: cost, travel_mode: manual.mode, is_manual_override: true, num_vehicles: Math.ceil(participantCount / trip.default_vehicle_capacity), computed_at: null }, { onConflict: "trip_id,from_stop_id,to_stop_id" });
    setBusy("");
    if (saveError) return setError(saveError.message);
    setEditing(null);
    await load();
  }

  async function toggleGoing(to) {
    const existing = participants.find((person) => person.stop_id === to.id && person.user_id === user.id);
    setBusy(`going:${to.id}`); setError("");
    const result = existing ? await supabase.from("stop_participants").delete().eq("id", existing.id) : await supabase.from("stop_participants").insert({ stop_id: to.id, user_id: user.id });
    setBusy("");
    if (result.error) setError(result.error.message);
    else await load();
  }

  const pairs = stops.slice(1).map((to, index) => [stops[index], to]).filter(([from, to]) => from.day === to.day);
  return <section className="trip-legs"><div className="trip-stops-heading"><div><p className="trips-overline">Getting around</p><h2>Transport & shared fares</h2></div></div>
    {canEdit && <form className="trip-fare-settings" onSubmit={saveFare}><p>Optional ride settings. A trip starts with 4 people per car; change this if your group uses a van or another vehicle. Fare per vehicle = base fare + distance × per-km rate.</p><div className="trip-fare-fields"><label>People per vehicle <input type="number" min="1" max="50" step="1" value={fare.capacity} onChange={(event) => setFare({ ...fare, capacity: event.target.value })} /></label><label>Base fare ({trip.currency}) <input type="number" min="0" step="0.01" value={fare.base} onChange={(event) => setFare({ ...fare, base: event.target.value })} /></label><label>Per km ({trip.currency}) <input type="number" min="0" step="0.01" value={fare.perKm} onChange={(event) => setFare({ ...fare, perKm: event.target.value })} /></label><button type="submit" disabled={busy === "fare"}>Save ride settings</button></div></form>}
    {error && <p className="trip-form-error" role="alert">{error}</p>}
    {!pairs.length ? <p className="trips-status">Add at least two stops to see transport between them.</p> : pairs.map(([from, to]) => {
      const key = `${from.id}:${to.id}`;
      const leg = legs.find((item) => item.from_stop_id === from.id && item.to_stop_id === to.id);
      const going = participants.filter((item) => item.stop_id === to.id);
      const count = going.length;
      const vehicles = Math.ceil(count / trip.default_vehicle_capacity);
      const total = vehicles * Number(leg?.estimated_cost ?? 0);
      const ownGoing = going.some((item) => item.user_id === user.id);
      return <article className="trip-leg-card" key={key}><div className="trip-leg-route"><span><Route size={18} /></span><div><strong>{from.name} → {to.name}</strong><small>{to.day}</small></div></div>
        <div className="trip-leg-metrics"><span><Clock3 size={16} /> {leg?.estimated_minutes != null ? `${leg.estimated_minutes} min ${leg.travel_mode}` : "Time unknown"}</span><span><MapPin size={16} /> {leg?.estimated_distance_km != null ? `${leg.estimated_distance_km} km` : "Distance unknown"}</span>{leg?.is_manual_override && <span>Manual estimate</span>}</div>
        <div className="trip-leg-going"><div><Users size={16} /> Going to {to.name}: {count ? going.map((item) => profiles.find((profile) => profile.id === item.user_id)?.name || (item.user_id === user.id ? "You" : "Member")).join(", ") : "Nobody yet"}</div><button type="button" disabled={busy === `going:${to.id}`} onClick={() => toggleGoing(to)}>{ownGoing ? "I’m not going" : "I’m going"}</button></div>
        <p className="trip-leg-breakdown"><CarFront size={17} /> {count} {count === 1 ? "person" : "people"} → {vehicles} {vehicles === 1 ? "vehicle" : "vehicles"} → {leg?.estimated_cost != null && count ? money(total / count, trip.currency) + "/person" : "fare pending"}</p>
        {canEdit && <div className="trip-leg-actions"><button type="button" disabled={busy === key} onClick={() => estimate(from, to)}>{busy === key ? "Estimating…" : "Estimate route"}</button><button type="button" onClick={() => openManual(from, to, leg)}>Enter manually</button></div>}
        {editing === key && <form className="trip-leg-manual" onSubmit={(event) => saveManual(event, from, to, count)}><label>Travel mode <select value={manual.mode} onChange={(event) => setManual({ ...manual, mode: event.target.value })}><option value="driving">Driving</option><option value="walking">Walking</option><option value="cycling">Cycling</option><option value="transit">Transit</option><option value="other">Other</option></select></label><label>Minutes <input required type="number" min="0" step="1" value={manual.minutes} onChange={(event) => setManual({ ...manual, minutes: event.target.value })} /></label><label>Distance (km) <input required type="number" min="0" step="0.01" value={manual.distance} onChange={(event) => setManual({ ...manual, distance: event.target.value })} /></label><label>Fare per vehicle ({trip.currency}) <input required type="number" min="0" step="0.01" value={manual.cost} onChange={(event) => setManual({ ...manual, cost: event.target.value })} /></label><button type="submit" disabled={busy === "manual"}>Save estimate</button><button type="button" onClick={() => setEditing(null)}>Cancel</button></form>}
      </article>;
    })}
  </section>;
}
