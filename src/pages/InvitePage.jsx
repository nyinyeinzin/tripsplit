import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Compass, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import AuthPage from "./AuthPage";

export default function InvitePage({ tripId, token, user, onJoined }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase || !/^[0-9a-f-]{36}$/i.test(token)) {
      setError("This invite link is invalid.");
      setLoading(false);
      return undefined;
    }
    supabase.rpc("get_trip_invite_snapshot", { invite_token: token }).then(({ data, error: loadError }) => {
      if (!active) return;
      if (loadError) setError(loadError.message);
      else if (!data?.trip || data.trip.id !== tripId) setError("This invite is invalid or expired.");
      else setSnapshot(data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [tripId, token]);

  async function joinTrip() {
    setJoining(true);
    setError("");
    const { data, error: joinError } = await supabase.rpc("accept_trip_invite", { invite_token: token });
    setJoining(false);
    if (joinError) return setError(joinError.message);
    if (data !== tripId) return setError("This invite does not match the trip.");
    onJoined(data);
  }

  return <main className="trips-page"><div className="trips-wrap"><header className="trips-header"><div className="trips-brand"><span><Compass size={23} /></span><strong>TripSplit</strong></div></header>
    {loading ? <p className="trips-status">Opening invite…</p> : !snapshot ? <div className="trip-empty"><h1>Invite unavailable</h1><p>{error}</p><a href="/" onClick={() => window.sessionStorage.removeItem("tripsplit-pending-invite")}>Go to TripSplit</a></div> : <section className="trip-invite-preview"><p className="trips-overline">You’re invited</p><h1>{snapshot.trip.name}</h1><p className="trip-destination"><MapPin size={18} /> {snapshot.trip.destination}</p><p className="trip-preview-dates"><CalendarDays size={18} /> {snapshot.trip.start_date} – {snapshot.trip.end_date}</p><h2>The plan so far</h2>{snapshot.stops?.length ? <div className="trip-preview-stops">{snapshot.stops.map((stop) => <div key={stop.id}><strong>{stop.name}</strong><small>{stop.day}</small></div>)}</div> : <p>No stops have been added yet.</p>}
      {user ? <button className="trip-create-submit" type="button" disabled={joining} onClick={joinTrip}>{joining ? "Joining…" : "Join this trip to edit"}<ArrowRight size={18} /></button> : <><p className="trip-preview-signin">Sign in or create an account to join and edit. You can preview the itinerary without an account.</p><AuthPage embedded /></>}
      {error && <p className="trip-form-error" role="alert">{error}</p>}
    </section>}
  </div></main>;
}
