import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Compass, LogOut, MapPin, Plus } from "lucide-react";
import TripStops from "./TripStops";
import TripInvite from "./TripInvite";
import TripLegs from "./TripLegs";
import TripExpenses from "./TripExpenses";
import { countries, findCountry } from "../data/countries";

const currencies = ["THB", "MYR", "IDR", "USD", "EUR", "GBP", "SGD", "JPY", "AUD"];
const emptyForm = { country: "", first_city: "", name: "", start_date: "", end_date: "", currency: "THB", cover_photo_url: "" };

function dayCount(start, end) {
  if (!start || !end) return 0;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
}

function dateLabel(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default function TripHomePage({ user, trips, loading, error, selectedTripId, onSelectTrip, onCreateTrip, onUpdateTrip, onRetry, onSignOut }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const days = dayCount(form.start_date, form.end_date);
  const selectedCountry = findCountry(form.country);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (!selectedCountry) return setFormError("Choose a country from the list. You can type its name to find it.");
    const city = form.first_city.trim();
    if (!city) return setFormError("Enter the first city you will visit.");
    if (`${city}, ${selectedCountry.name}`.length > 160) return setFormError("Use a shorter city name.");
    if (days < 1) return setFormError("End date must be on or after the start date.");
    const cover = form.cover_photo_url.trim();
    if (cover && !/^https:\/\//i.test(cover)) return setFormError("Cover photo URL must start with https://.");
    setSubmitting(true);
    setFormError("");
    try {
      await onCreateTrip({ name: form.name.trim(), destination: `${city}, ${selectedCountry.name}`, destination_country_code: selectedCountry.code, first_city: city, start_date: form.start_date, end_date: form.end_date, currency: form.currency, cover_photo_url: cover || null });
      setForm(emptyForm);
      setCreating(false);
    } catch (createError) {
      setFormError(createError.message || "Could not create this trip. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="trips-page"><div className="trips-wrap">
    <header className="trips-header"><div className="trips-brand"><span><Compass size={23} /></span><strong>TripSplit</strong></div><button className="trips-signout" type="button" onClick={onSignOut}><LogOut size={18} /> Sign out</button></header>
    {selectedTrip ? <section className="trip-detail">
      <button className="trips-back" type="button" onClick={() => onSelectTrip(null)}><ArrowLeft size={18} /> All trips</button>
      {selectedTrip.cover_photo_url && <img className="trip-cover" src={selectedTrip.cover_photo_url} alt="" />}
      <p className="trips-overline">Your itinerary</p><h1>{selectedTrip.name}</h1><p className="trip-destination"><MapPin size={18} /> {selectedTrip.destination}</p>
      <div className="trip-detail-facts"><span><CalendarDays size={19} /> {dateLabel(selectedTrip.start_date)} – {dateLabel(selectedTrip.end_date)} · {dayCount(selectedTrip.start_date, selectedTrip.end_date)} days</span><span>{selectedTrip.currency} trip currency</span></div>
      <TripStops key={selectedTrip.id} trip={selectedTrip} user={user} />
      <TripLegs key={`legs-${selectedTrip.id}`} trip={selectedTrip} user={user} onTripUpdated={onUpdateTrip} />
      <TripExpenses key={`expenses-${selectedTrip.id}`} trip={selectedTrip} user={user} />
      <TripInvite key={`invite-${selectedTrip.id}`} trip={selectedTrip} user={user} />
    </section> : creating ? <section className="trip-create-panel">
      <button className="trips-back" type="button" onClick={() => setCreating(false)}><ArrowLeft size={18} /> Your trips</button><p className="trips-overline">A new adventure</p><h1>Create a trip</h1><p className="trip-create-intro">Choose where and when. You can plan the stops together next.</p>
      <form className="trip-create-form" onSubmit={submit}>
        <label><span>Country</span><input required list="trip-country-options" autoComplete="off" value={form.country} onChange={(event) => { setForm((current) => ({ ...current, country: event.target.value, first_city: "" })); setFormError(""); }} placeholder="Search or choose a country" aria-describedby="country-help" /><small id="country-help">Start typing, or open the list to browse countries.</small></label>
        <datalist id="trip-country-options">{countries.map((country) => <option key={country.code} value={country.name} />)}</datalist>
        {selectedCountry && <label><span>First city</span><input required maxLength={120} value={form.first_city} onChange={(event) => update("first_city", event.target.value)} placeholder={selectedCountry.code === "SG" ? "Singapore" : "Where will you arrive first?"} /></label>}
        <label><span>Trip name</span><input required maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Our next adventure" /></label>
        <div className="trip-form-pair"><label><span>Start date</span><input required type="date" value={form.start_date} onChange={(event) => update("start_date", event.target.value)} /></label><label><span>End date</span><input required type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => update("end_date", event.target.value)} /></label></div>
        {days > 0 && <p className="trip-duration"><CalendarDays size={16} /> {days} {days === 1 ? "day" : "days"} to explore</p>}
        <label><span>Trip currency</span><select value={form.currency} onChange={(event) => update("currency", event.target.value)}>{currencies.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
        <label><span>Cover photo URL <small>optional</small></span><input type="url" value={form.cover_photo_url} onChange={(event) => update("cover_photo_url", event.target.value)} placeholder="https://…" /></label>
        {formError && <p className="trip-form-error" role="alert">{formError}</p>}
        <button className="trip-create-submit" type="submit" disabled={submitting}>{submitting ? "Creating trip…" : "Create trip"}{!submitting && <ArrowRight size={18} />}</button>
      </form>
    </section> : <section className="trips-dashboard">
      <div className="trips-intro"><div><p className="trips-overline">Welcome, {user.user_metadata?.name || user.email?.split("@")[0] || "traveler"}</p><h1>Your trips</h1><p>Make a plan worth sharing.</p></div><button className="trip-new-button" type="button" onClick={() => setCreating(true)}><Plus size={18} /> New trip</button></div>
      {loading ? <p className="trips-status" role="status">Loading your trips…</p> : error ? <div className="trips-status" role="alert"><p>Couldn’t load trips: {error}</p><button type="button" onClick={onRetry}>Try again</button></div> : trips.length === 0 ? <div className="trip-empty"><span><MapPin size={30} /></span><h2>Where to next?</h2><p>Create your first trip, then invite your friends and build the itinerary together.</p><button type="button" onClick={() => setCreating(true)}>Create your first trip <ArrowRight size={18} /></button></div> : <div className="trip-grid">{trips.map((trip) => <button className="trip-list-card" type="button" key={trip.id} onClick={() => onSelectTrip(trip.id)}><span className="trip-list-icon"><Compass size={22} /></span><span className="trip-list-content"><strong>{trip.name}</strong><span><MapPin size={15} /> {trip.destination}</span><small>{dateLabel(trip.start_date)} – {dateLabel(trip.end_date)} · {dayCount(trip.start_date, trip.end_date)} days</small></span><ArrowRight size={20} /></button>)}</div>}
    </section>}
  </div></main>;
}
