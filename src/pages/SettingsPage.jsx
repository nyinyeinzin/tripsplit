import { useMemo, useState } from "react";
import { LogOut, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { TRIP_NAME, groupSize, tripDateLabel, tripDays } from "../data/tripData";
import CurrencySwitch from "../components/CurrencySwitch";

const emptyPlace = {
  title: "",
  day: 1,
  date: "Jul 17",
  area: "",
  time: "",
  travelFrom: "",
  travelTime: "",
  type: "cafe",
  costTHB: "",
  lat: "",
  lng: "",
  mapsUrl: "",
  photo: "",
  notes: ""
};

const fieldLabels = [
  ["title", "Title"],
  ["day", "Day"],
  ["date", "Date"],
  ["area", "Area"],
  ["time", "Time"],
  ["travelFrom", "Travel from"],
  ["travelTime", "Travel time"],
  ["type", "Type"],
  ["costTHB", "Cost THB"],
  ["lat", "Latitude"],
  ["lng", "Longitude"],
  ["mapsUrl", "Google Maps URL"],
  ["photo", "Photo URL"],
  ["notes", "Notes"]
];

export default function SettingsPage({
  activities,
  isAdmin,
  user,
  currency,
  setCurrency,
  onLogout,
  onAddPlace,
  onEditPlace,
  onDeletePlace,
  onResetLocalData
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);

  const editablePlaces = useMemo(
    () => activities.filter((item) => item.aiAdded || item.customAdded),
    [activities]
  );

  function startAdd() {
    setEditingPlace(null);
    setShowForm(true);
  }

  function startEdit(place) {
    setEditingPlace(place);
    setShowForm(true);
  }

  function confirmReset() {
    const confirmed = window.confirm(
      "This will erase all custom places, deleted items, route overrides, and real spend. This cannot be undone."
    );
    if (confirmed) onResetLocalData();
  }

  return (
    <main className="page page-scroll">
      <header className="page-header settings-header">
        <div>
          <p className="eyebrow">Signed in</p>
          <h1>Settings</h1>
        </div>
        {isAdmin && (
          <button className="icon-action" type="button" onClick={onLogout} aria-label="Log out">
            <LogOut size={19} />
          </button>
        )}
      </header>

      <section className="card account-card">
        <span className="admin-icon"><UserRound size={24} /></span>
        <div>
          <p className="eyebrow accent">Your account</p>
          <h2>{user?.user_metadata?.name || user?.email?.split("@")[0] || "Traveler"}</h2>
          <p>{user?.email}</p>
        </div>
      </section>

      <section className="card settings-placeholder-card">
        <p className="eyebrow accent">Preference</p>
        <h2>Default currency</h2>
        <div className="settings-currency-row">
          <CurrencySwitch currency={currency} setCurrency={setCurrency} label="Default currency" />
        </div>
        <p>Saved on this device and used across Home, Map, and Budget.</p>
      </section>

      {isAdmin && (
        <>
          <section className="card admin-card">
            <div className="admin-row">
              <div>
                <p className="eyebrow accent">Prototype itinerary</p>
                <h2>Manage places</h2>
              </div>
              <button className="add-place-button" type="button" onClick={startAdd}>
                <Plus size={19} />
                Add Place
              </button>
            </div>
          </section>

          {showForm && (
            <PlaceForm
              key={editingPlace?.id || "new-place"}
              initialPlace={editingPlace}
              onCancel={() => {
                setShowForm(false);
                setEditingPlace(null);
              }}
              onSubmit={(place) => {
                if (editingPlace) onEditPlace(editingPlace.id, place);
                else onAddPlace(place);
                setShowForm(false);
                setEditingPlace(null);
              }}
            />
          )}

          <section className="card editable-card">
            <h2>Editable places</h2>
            {editablePlaces.length === 0 && <p>No custom or AI-added places yet.</p>}
            {editablePlaces.map((place) => (
              <div className="editable-row" key={place.id}>
                <div>
                  <strong>{place.title}</strong>
                  <small>Day {place.day} · {place.aiAdded ? "AI added" : "Custom added"}</small>
                </div>
                <div className="editable-actions">
                  <button type="button" onClick={() => startEdit(place)} aria-label={`Edit ${place.title}`}>
                    <Pencil size={17} />
                  </button>
                  <button type="button" onClick={() => onDeletePlace(place.id)} aria-label={`Delete ${place.title}`}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="card settings-placeholder-card">
            <p className="eyebrow accent">Trip info</p>
            <h2>{TRIP_NAME}</h2>
            <div className="trip-info-grid">
              <span><small>Dates</small><strong>{tripDateLabel}</strong></span>
              <span><small>Travelers</small><strong>{groupSize}</strong></span>
            </div>
          </section>

          <section className="card danger-card">
            <h2>Reset local data</h2>
            <p>Erase custom places, deleted items, route overrides, and real spend on this device.</p>
            <button className="danger-outline-button" type="button" onClick={confirmReset}>
              Reset Local Data
            </button>
          </section>
        </>
      )}
    </main>
  );
}

function PlaceForm({ initialPlace, onCancel, onSubmit }) {
  const [form, setForm] = useState(() => placeToForm(initialPlace));

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "day") {
        const match = tripDays.find((item) => item.day === Number(value));
        if (match) next.date = match.date;
      }
      return next;
    });
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(formToPlace(form, initialPlace));
  }

  return (
    <section className="card place-form-card">
      <div className="form-title-row">
        <h2>{initialPlace ? "Edit Place" : "Add Place"}</h2>
        <button className="icon-action" type="button" onClick={onCancel} aria-label="Close form">
          <X size={19} />
        </button>
      </div>
      <form className="place-form" onSubmit={submit}>
        {fieldLabels.map(([field, label]) => (
          <label key={field}>
            <span>{label}</span>
            {field === "day" ? (
              <select value={form.day} onChange={(event) => updateField(field, event.target.value)}>
                {tripDays.map((day) => (
                  <option key={day.day} value={day.day}>Day {day.day} · {day.date}</option>
                ))}
              </select>
            ) : field === "notes" ? (
              <textarea value={form[field]} onChange={(event) => updateField(field, event.target.value)} />
            ) : (
              <input value={form[field]} onChange={(event) => updateField(field, event.target.value)} />
            )}
          </label>
        ))}
        <button className="primary-action" type="submit">{initialPlace ? "Save Changes" : "Add Place"}</button>
      </form>
    </section>
  );
}

function placeToForm(place) {
  if (!place) return emptyPlace;
  return {
    ...emptyPlace,
    ...Object.fromEntries(Object.keys(emptyPlace).map((key) => [key, place[key] ?? ""]))
  };
}

function formToPlace(form, initialPlace) {
  const day = Number(form.day) || 1;
  return {
    ...initialPlace,
    ...form,
    day,
    number: initialPlace?.number,
    costTHB: Number(form.costTHB) || 0,
    lat: form.lat === "" ? null : Number(form.lat),
    lng: form.lng === "" ? null : Number(form.lng),
    aiAdded: initialPlace?.aiAdded || false,
    customAdded: initialPlace?.customAdded || !initialPlace?.aiAdded,
    deletable: true
  };
}
