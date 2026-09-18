import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Clock3, MapPin, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { buildDaySchedule, categories, defaultDuration, orderStops } from "../utils/schedule";

const stopFields = "id,trip_id,name,day,notes,order_index,created_by,created_at,address,place_id,category,estimated_duration_minutes,is_anchor,photo_url,estimated_cost,opening_hours";

function formatDay(day) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

function tripDays(start, end) {
  const days = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export default function TripStops({ trip, user, onTripUpdated }) {
  const [stops, setStops] = useState([]);
  const [legs, setLegs] = useState([]);
  const [daySettings, setDaySettings] = useState({});
  const [dayDrafts, setDayDrafts] = useState({});
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [day, setDay] = useState(trip.start_date);
  const [category, setCategory] = useState("other");
  const [duration, setDuration] = useState(60);
  const [isAnchor, setIsAnchor] = useState(false);
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [cost, setCost] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingDay, setSavingDay] = useState("");
  const [homeBase, setHomeBase] = useState({ lat: trip.home_base_lat ?? "", lng: trip.home_base_lng ?? "" });
  const [savingHomeBase, setSavingHomeBase] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiDay, setAiDay] = useState(trip.start_date);
  const [ideas, setIdeas] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const days = tripDays(trip.start_date, trip.end_date);
  const canEdit = role === "owner" || role === "editor";

  const loadStops = useCallback(async () => {
    const [stopResult, legResult, dayResult] = await Promise.all([
      supabase.from("stops").select(stopFields).eq("trip_id", trip.id).order("day").order("order_index").order("created_at"),
      supabase.from("legs").select("from_stop_id,to_stop_id,estimated_minutes,estimated_distance_km,travel_mode,is_manual_override").eq("trip_id", trip.id),
      supabase.from("trip_days").select("date,day_start_time").eq("trip_id", trip.id)
    ]);
    const loadError = stopResult.error || legResult.error || dayResult.error;
    if (loadError) setError(loadError.message);
    else {
      setStops((stopResult.data ?? []).sort(orderStops));
      setLegs(legResult.data ?? []);
      const settings = Object.fromEntries((dayResult.data ?? []).map((item) => [item.date, item.day_start_time.slice(0, 5)]));
      setDaySettings(settings);
      setDayDrafts(settings);
      setError("");
    }
    setLoading(false);
  }, [trip.id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from("trip_members").select("role").eq("trip_id", trip.id).eq("user_id", user.id).single().then(({ data, error: memberError }) => {
      if (active) {
        setRole(memberError ? "viewer" : data.role);
        if (memberError) setError(memberError.message);
      }
    });
    loadStops();
    const channel = supabase.channel(`stops:${trip.id}`).on("postgres_changes", { event: "*", schema: "public", table: "stops", filter: `trip_id=eq.${trip.id}` }, () => loadStops()).on("postgres_changes", { event: "*", schema: "public", table: "trip_days", filter: `trip_id=eq.${trip.id}` }, () => loadStops()).on("postgres_changes", { event: "*", schema: "public", table: "legs", filter: `trip_id=eq.${trip.id}` }, () => loadStops()).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [trip.id, user.id, loadStops]);

  useEffect(() => {
    fetch("/.netlify/functions/suggest-places").then((response) => response.ok ? response.json() : null).then((data) => setAiAvailable(Boolean(data?.available))).catch(() => setAiAvailable(false));
  }, []);

  async function suggestPlaces() {
    setAiBusy(true); setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/.netlify/functions/suggest-places", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` }, body: JSON.stringify({ tripId: trip.id, day: aiDay }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not suggest places.");
      setIdeas(result.suggestions);
    } catch (suggestError) { setError(suggestError.message); }
    setAiBusy(false);
  }

  async function addIdea(idea) {
    setAiBusy(true); setError("");
    const nextOrder = Math.max(-1, ...stops.filter((stop) => stop.day === aiDay).map((stop) => stop.order_index)) + 1;
    const { data, error: addError } = await supabase.from("stops").insert({ trip_id: trip.id, created_by: user.id, name: idea.name, day: aiDay, order_index: nextOrder }).select("id").single();
    if (addError) setError(addError.message);
    else {
      await supabase.from("stop_participants").insert({ stop_id: data.id, user_id: user.id });
      setIdeas((current) => current.filter((item) => item.name !== idea.name));
      await loadStops();
    }
    setAiBusy(false);
  }

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setName("");
    setDay(trip.start_date);
    setCategory("other");
    setDuration(60);
    setIsAnchor(false);
    setAddress("");
    setPhotoUrl("");
    setCost("");
    setOpeningHours("");
    setNotes("");
  }

  function editStop(stop) {
    setEditingId(stop.id);
    setShowForm(true);
    setName(stop.name);
    setDay(stop.day);
    setCategory(stop.category ?? "other");
    setDuration(stop.estimated_duration_minutes ?? 60);
    setIsAnchor(Boolean(stop.is_anchor));
    setAddress(stop.address ?? "");
    setPhotoUrl(stop.photo_url ?? "");
    setCost(stop.estimated_cost ?? "");
    setOpeningHours(stop.opening_hours ?? "");
    setNotes(stop.notes ?? "");
    setError("");
  }

  async function saveStop(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !days.includes(day)) return setError("Enter a place and choose a day within your trip.");
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return setError("Duration must be between 1 and 1440 minutes.");
    if (cost !== "" && (!Number.isFinite(Number(cost)) || Number(cost) < 0)) return setError("Cost must be zero or more.");
    setSaving(true);
    setError("");
    const nameChanged = editingId && stops.find((stop) => stop.id === editingId)?.name !== trimmed;
    const original = stops.find((stop) => stop.id === editingId);
    const nextOrder = Math.max(-1, ...stops.filter((stop) => stop.day === day).map((stop) => stop.order_index)) + 1;
    const values = { name: trimmed, day, order_index: original?.day === day ? original.order_index : nextOrder, scheduled_time: null, category, estimated_duration_minutes: minutes, is_anchor: isAnchor, address: address.trim() || null, photo_url: photoUrl.trim() || null, estimated_cost: cost === "" ? null : Number(cost), opening_hours: openingHours.trim() || null, notes: notes.trim() || null, ...(nameChanged ? { lat: null, lng: null, place_id: null } : {}) };
    const result = editingId
      ? await supabase.from("stops").update(values).eq("id", editingId).eq("trip_id", trip.id)
      : await supabase.from("stops").insert({ ...values, trip_id: trip.id, created_by: user.id }).select("id").single();
    setSaving(false);
    if (result.error) return setError(result.error.message);
    if (!editingId && result.data?.id) await supabase.from("stop_participants").insert({ stop_id: result.data.id, user_id: user.id });
    let routeClearFailed = false;
    if (nameChanged) {
      const [outgoing, incoming] = await Promise.all([
        supabase.from("legs").delete().eq("trip_id", trip.id).eq("from_stop_id", editingId),
        supabase.from("legs").delete().eq("trip_id", trip.id).eq("to_stop_id", editingId)
      ]);
      routeClearFailed = Boolean(outgoing.error || incoming.error);
    }
    resetForm();
    await loadStops();
    if (routeClearFailed) setError("Place saved, but its old route estimate could not be cleared. Please enter a fresh estimate.");
  }

  async function deleteStop(stop) {
    if (!window.confirm(`Delete “${stop.name}”?`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("stops").delete().eq("id", stop.id).eq("trip_id", trip.id);
    if (deleteError) setError(deleteError.message);
    else await loadStops();
  }

  async function saveDayStart(date) {
    const value = dayDrafts[date] || "09:00";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return setError("Choose a valid day start time.");
    setSavingDay(date); setError("");
    const { error: saveError } = await supabase.from("trip_days").upsert({ trip_id: trip.id, date, day_start_time: value }, { onConflict: "trip_id,date" });
    setSavingDay("");
    if (saveError) setError(saveError.message);
    else await loadStops();
  }

  async function saveHomeBase(event) {
    event.preventDefault();
    const { lat, lng } = homeBase;
    if ((lat === "") !== (lng === "")) return setError("Enter both hotel coordinates, or leave both blank.");
    if (lat !== "" && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Number(lat) < -90 || Number(lat) > 90 || Number(lng) < -180 || Number(lng) > 180)) return setError("Enter valid latitude and longitude.");
    setSavingHomeBase(true); setError("");
    try { await onTripUpdated(trip.id, { home_base_lat: lat === "" ? null : Number(lat), home_base_lng: lng === "" ? null : Number(lng) }); }
    catch (saveError) { setError(saveError.message); }
    setSavingHomeBase(false);
  }

  async function moveStop(dayStops, index, direction) {
    const stop = dayStops[index];
    const neighbor = dayStops[index + direction];
    if (!neighbor || stop.is_anchor || neighbor.is_anchor) return;
    setError("");
    const first = await supabase.from("stops").update({ order_index: neighbor.order_index }).eq("id", stop.id).eq("trip_id", trip.id);
    if (first.error) return setError(first.error.message);
    const second = await supabase.from("stops").update({ order_index: stop.order_index }).eq("id", neighbor.id).eq("trip_id", trip.id);
    if (second.error) setError("The second order change failed. Refresh and try again.");
    await loadStops();
  }

  return <section className="trip-stops" aria-label="Itinerary stops">
    <div className="trip-stops-heading"><div><p className="trips-overline">Day by day</p><h2>Places to visit</h2></div>{canEdit && !showForm && <button className="trip-new-button" type="button" onClick={() => setShowForm(true)}><Plus size={18} /> Add stop</button>}</div>
    {error && <p className="trip-form-error" role="alert">{error}</p>}
    {canEdit && <details className="trip-home-base"><summary>Hotel / home base coordinates (optional)</summary><form onSubmit={saveHomeBase}><p>For future routes from your hotel. Your day schedule currently starts at the first stop.</p><label>Latitude <input type="number" min="-90" max="90" step="any" value={homeBase.lat} onChange={(event) => setHomeBase({ ...homeBase, lat: event.target.value })} /></label><label>Longitude <input type="number" min="-180" max="180" step="any" value={homeBase.lng} onChange={(event) => setHomeBase({ ...homeBase, lng: event.target.value })} /></label><button type="submit" disabled={savingHomeBase}>{savingHomeBase ? "Saving…" : "Save home base"}</button></form></details>}
    {showForm && <form className="trip-create-form trip-stop-form" onSubmit={saveStop}>
      <h3>{editingId ? "Edit stop" : "Add a place"}</h3>
      <label><span>Place name</span><input required autoFocus maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Where would you like to go?" /></label>
      <label><span>Day</span><select value={day} onChange={(event) => setDay(event.target.value)}>{days.map((date) => <option key={date} value={date}>{formatDay(date)}</option>)}</select></label>
      <div className="trip-form-pair"><label><span>Category</span><select value={category} onChange={(event) => { const next = event.target.value; setCategory(next); setDuration(defaultDuration[next]); }}>{categories.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label><label><span>Duration (minutes)</span><input required type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} /></label></div>
      <label className="trip-anchor-toggle"><input type="checkbox" checked={isAnchor} onChange={(event) => setIsAnchor(event.target.checked)} /><span>Keep this stop in its current order</span></label>
      <details className="trip-stop-extras"><summary>More stop details (optional)</summary><div><label><span>Address</span><input value={address} onChange={(event) => setAddress(event.target.value)} /></label><label><span>Photo URL</span><input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://…" /></label><label><span>Estimated cost ({trip.currency})</span><input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} /></label><label><span>Opening hours</span><input value={openingHours} onChange={(event) => setOpeningHours(event.target.value)} placeholder="e.g. 09:00–18:00" /></label></div></details>
      <label><span>Notes <small>optional</small></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tickets, meetup details, ideas…" rows="3" /></label>
      <div className="trip-stop-actions"><button className="trip-create-submit" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add stop"}</button><button type="button" onClick={resetForm}>Cancel</button></div>
    </form>}
    {canEdit && aiAvailable && <div className="trip-ai-ideas"><div><Sparkles size={20} /><div><h3>Need ideas?</h3><p>Ask AI for places in {trip.destination}. Check details before you go.</p></div></div><div className="trip-ai-controls"><select aria-label="Suggestion day" value={aiDay} onChange={(event) => setAiDay(event.target.value)}>{days.map((date) => <option key={date} value={date}>{formatDay(date)}</option>)}</select><button type="button" disabled={aiBusy} onClick={suggestPlaces}>{aiBusy ? "Thinking…" : "Suggest places"}</button></div>{ideas.length > 0 && <div className="trip-ai-list">{ideas.map((idea) => <article key={idea.name}><div><strong>{idea.name}</strong><p>{idea.reason}</p></div><button type="button" disabled={aiBusy} onClick={() => addIdea(idea)} aria-label={`Add ${idea.name}`}><Plus size={18} /></button></article>)}</div>}</div>}
    {loading ? <p className="trips-status" role="status">Loading stops…</p> : days.map((date, index) => {
      const dayStops = stops.filter((stop) => stop.day === date).sort(orderStops);
      const schedule = buildDaySchedule(dayStops, legs, daySettings[date] || "09:00");
      return <div className="trip-day" key={date}><div className="trip-day-title"><span>Day {index + 1}</span><h3>{formatDay(date)}</h3></div><div className="trip-day-start"><label>Day starts <input type="time" disabled={!canEdit} value={dayDrafts[date] || "09:00"} onChange={(event) => setDayDrafts((current) => ({ ...current, [date]: event.target.value }))} /></label>{canEdit && (dayDrafts[date] || "09:00") !== (daySettings[date] || "09:00") && <button type="button" disabled={savingDay === date} onClick={() => saveDayStart(date)}>{savingDay === date ? "Saving…" : "Save start time"}</button>}</div><div className="trip-day-list">{schedule.length === 0 ? <p className="trip-day-empty">No stops planned yet.</p> : schedule.map((stop, stopIndex) => <article className="trip-stop-card" key={stop.id}><div className="trip-stop-marker"><MapPin size={18} /></div><div className="trip-stop-body"><strong>{stop.name}{stop.is_anchor ? " · Pinned" : ""}</strong><small><Clock3 size={14} /> {stop.arrivalTime}–{stop.departureTime} · {stop.estimated_duration_minutes} min</small>{stop.travelFromPrev && <small>{stop.travelFromPrev.estimatedMinutes == null ? "Travel time not estimated · schedule may shift" : `${stop.travelFromPrev.estimatedMinutes} min ${stop.travelFromPrev.mode} from previous stop`}</small>}{stop.address && <p>{stop.address}</p>}{stop.notes && <p>{stop.notes}</p>}</div>{canEdit && <div className="trip-stop-controls"><button type="button" disabled={stopIndex === 0 || stop.is_anchor || schedule[stopIndex - 1]?.is_anchor} aria-label={`Move ${stop.name} earlier`} onClick={() => moveStop(dayStops, stopIndex, -1)}><ArrowUp size={16} /></button><button type="button" disabled={stopIndex === schedule.length - 1 || stop.is_anchor || schedule[stopIndex + 1]?.is_anchor} aria-label={`Move ${stop.name} later`} onClick={() => moveStop(dayStops, stopIndex, 1)}><ArrowDown size={16} /></button><button type="button" aria-label={`Edit ${stop.name}`} onClick={() => editStop(stop)}><Pencil size={16} /></button><button type="button" aria-label={`Delete ${stop.name}`} onClick={() => deleteStop(stop)}><Trash2 size={16} /></button></div>}</article>)}</div></div>;
    })}
    {stops.length > 0 && <p className="trip-stops-footnote"><CalendarDays size={15} /> {stops.length} {stops.length === 1 ? "stop" : "stops"} across your trip</p>}
  </section>;
}
