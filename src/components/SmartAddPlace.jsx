import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { tripDays } from "../data/tripData";

export default function SmartAddPlace({ onAddPlace }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ day: 1, place: "", note: "" });
  const [error, setError] = useState("");

  // Escape closes the sheet, as the backdrop click does.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    if (!form.place.trim()) {
      setError("Add a place name or Google Maps URL");
      return;
    }
    const added = onAddPlace({ ...form, day: Number(form.day) });
    if (!added) {
      setError("Could not add this place");
      return;
    }
    setForm({ day: Number(form.day), place: "", note: "" });
    setOpen(false);
  }

  return (
    <>
      <button className="smart-add-fab" type="button" onClick={() => setOpen(true)} aria-label="Add place">
        <Plus size={26} />
      </button>

      {open && (
        <div className="smart-add-layer" role="presentation">
          <button className="smart-add-backdrop" type="button" aria-label="Close add place" onClick={() => setOpen(false)} />
          <section className="smart-add-sheet" aria-label="Add place sheet">
            <div className="sheet-grabber" />
            <button className="sheet-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={19} />
            </button>
            <div className="smart-add-title">
              <p className="eyebrow accent">Smart Trip Editor</p>
              <h2>Add Place</h2>
            </div>
            <form className="smart-add-form" onSubmit={submit}>
              <label>
                <span>Day</span>
                <select value={form.day} onChange={(event) => update("day", event.target.value)}>
                  {tripDays.map((day) => (
                    <option key={day.day} value={day.day}>Day {day.day} - {day.date}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Place name or Google Maps URL</span>
                <input value={form.place} onChange={(event) => update("place", event.target.value)} placeholder="Savaya Beach Club" />
              </label>
              <label>
                <span>Optional note</span>
                <input value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="After lunch" />
              </label>
              {error && <small className="form-error">{error}</small>}
              <button className="primary-action" type="submit">Add Place</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
