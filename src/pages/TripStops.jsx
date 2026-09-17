import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const stopFields = "id,trip_id,name,day,scheduled_time,notes,order_index,created_by,created_at";

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

export default function TripStops({ trip, user }) {
  const [stops, setStops] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [day, setDay] = useState(trip.start_date);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const days = tripDays(trip.start_date, trip.end_date);
  const canEdit = role === "owner" || role === "editor";

  const loadStops = useCallback(async () => {
    const { data, error: loadError } = await supabase.from("stops").select(stopFields).eq("trip_id", trip.id).order("day").order("scheduled_time", { nullsFirst: false }).order("order_index").order("created_at");
    if (loadError) setError(loadError.message);
    else { setStops(data ?? []); setError(""); }
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
    const channel = supabase.channel(`stops:${trip.id}`).on("postgres_changes", { event: "*", schema: "public", table: "stops", filter: `trip_id=eq.${trip.id}` }, () => loadStops()).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [trip.id, user.id, loadStops]);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setName("");
    setDay(trip.start_date);
    setTime("");
    setNotes("");
  }

  function editStop(stop) {
    setEditingId(stop.id);
    setShowForm(true);
    setName(stop.name);
    setDay(stop.day);
    setTime(stop.scheduled_time?.slice(0, 5) ?? "");
    setNotes(stop.notes ?? "");
    setError("");
  }

  async function saveStop(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !days.includes(day)) return setError("Enter a place and choose a day within your trip.");
    setSaving(true);
    setError("");
    const values = { name: trimmed, day, scheduled_time: time || null, notes: notes.trim() || null };
    const result = editingId
      ? await supabase.from("stops").update(values).eq("id", editingId).eq("trip_id", trip.id)
      : await supabase.from("stops").insert({ ...values, trip_id: trip.id, created_by: user.id }).select("id").single();
    setSaving(false);
    if (result.error) return setError(result.error.message);
    if (!editingId && result.data?.id) await supabase.from("stop_participants").insert({ stop_id: result.data.id, user_id: user.id });
    resetForm();
    await loadStops();
  }

  async function deleteStop(stop) {
    if (!window.confirm(`Delete “${stop.name}”?`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("stops").delete().eq("id", stop.id).eq("trip_id", trip.id);
    if (deleteError) setError(deleteError.message);
    else await loadStops();
  }

  return <section className="trip-stops" aria-label="Itinerary stops">
    <div className="trip-stops-heading"><div><p className="trips-overline">Day by day</p><h2>Places to visit</h2></div>{canEdit && !showForm && <button className="trip-new-button" type="button" onClick={() => setShowForm(true)}><Plus size={18} /> Add stop</button>}</div>
    {error && <p className="trip-form-error" role="alert">{error}</p>}
    {showForm && <form className="trip-create-form trip-stop-form" onSubmit={saveStop}>
      <h3>{editingId ? "Edit stop" : "Add a place"}</h3>
      <label><span>Place name</span><input required autoFocus maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="Where would you like to go?" /></label>
      <div className="trip-form-pair"><label><span>Day</span><select value={day} onChange={(event) => setDay(event.target.value)}>{days.map((date) => <option key={date} value={date}>{formatDay(date)}</option>)}</select></label><label><span>Time <small>optional</small></span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
      <label><span>Notes <small>optional</small></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tickets, meetup details, ideas…" rows="3" /></label>
      <div className="trip-stop-actions"><button className="trip-create-submit" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add stop"}</button><button type="button" onClick={resetForm}>Cancel</button></div>
    </form>}
    {loading ? <p className="trips-status" role="status">Loading stops…</p> : stops.length === 0 && !showForm ? <div className="trip-next-step"><span><MapPin size={26} /></span><h2>No stops yet</h2><p>{canEdit ? "Add a place to start your day-by-day itinerary." : "No places have been added to this trip yet."}</p></div> : days.map((date, index) => {
      const dayStops = stops.filter((stop) => stop.day === date);
      if (!dayStops.length) return null;
      return <div className="trip-day" key={date}><div className="trip-day-title"><span>Day {index + 1}</span><h3>{formatDay(date)}</h3></div><div className="trip-day-list">{dayStops.map((stop) => <article className="trip-stop-card" key={stop.id}><div className="trip-stop-marker"><MapPin size={18} /></div><div className="trip-stop-body"><strong>{stop.name}</strong>{stop.scheduled_time && <small><Clock3 size={14} /> {stop.scheduled_time.slice(0, 5)}</small>}{stop.notes && <p>{stop.notes}</p>}</div>{canEdit && <div className="trip-stop-controls"><button type="button" aria-label={`Edit ${stop.name}`} onClick={() => editStop(stop)}><Pencil size={16} /></button><button type="button" aria-label={`Delete ${stop.name}`} onClick={() => deleteStop(stop)}><Trash2 size={16} /></button></div>}</article>)}</div></div>;
    })}
    {stops.length > 0 && <p className="trip-stops-footnote"><CalendarDays size={15} /> {stops.length} {stops.length === 1 ? "stop" : "stops"} across your trip</p>}
  </section>;
}
