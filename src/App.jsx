import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import InvitePage from "./pages/InvitePage";
import TripHomePage from "./pages/TripHomePage";

const fields = "id,name,destination,destination_country_code,first_city,start_date,end_date,cover_photo_url,owner_id,default_vehicle_capacity,currency,transport_base_fare,transport_per_km_rate,created_at";
const pendingInvitePath = window.location.pathname === "/" ? window.sessionStorage.getItem("tripsplit-pending-invite") : null;
const inviteUrl = new URL(pendingInvitePath || window.location.pathname + window.location.search, window.location.origin);
const inviteMatch = inviteUrl.pathname.match(/^\/trip\/([0-9a-f-]{36})\/?$/i);
const initialInvite = inviteMatch && inviteUrl.searchParams.get("invite")
  ? { tripId: inviteMatch[1], token: inviteUrl.searchParams.get("invite") }
  : null;

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [error, setError] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [invite, setInvite] = useState(initialInvite);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    setLoadingTrips(true);
    setError("");
    const { data, error: loadError } = await supabase.from("trips").select(fields).order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else setTrips(data ?? []);
    setLoadingTrips(false);
  }, [user]);

  useEffect(() => {
    if (user) loadTrips();
    else { setTrips([]); setSelectedTripId(null); }
  }, [user, loadTrips]);

  async function createTrip(values) {
    const id = crypto.randomUUID();
    const { error: createError } = await supabase.from("trips").insert({ id, ...values, owner_id: user.id });
    if (createError) throw createError;
    const { data, error: readError } = await supabase.from("trips").select(fields).eq("id", id).single();
    if (readError) {
      await loadTrips();
      throw new Error("Trip was saved, but couldn't be opened. Refresh the page before trying again.");
    }
    setTrips((current) => [data, ...current]);
    setSelectedTripId(data.id);
  }

  async function updateTrip(tripId, changes) {
    const { data, error: updateError } = await supabase.from("trips").update(changes).eq("id", tripId).select(fields).single();
    if (updateError) throw updateError;
    setTrips((current) => current.map((trip) => trip.id === tripId ? data : trip));
  }

  async function finishInvite(tripId) {
    window.sessionStorage.removeItem("tripsplit-pending-invite");
    window.history.replaceState({}, "", "/");
    setInvite(null);
    await loadTrips();
    setSelectedTripId(tripId);
  }

  if (authLoading) return <main className="auth-page auth-loading" aria-live="polite"><div className="auth-loading-mark">TS</div><p>Opening your trips…</p></main>;
  if (invite) return <InvitePage tripId={invite.tripId} token={invite.token} user={user} onJoined={finishInvite} />;
  if (!user) return <AuthPage />;

  return <TripHomePage user={user} trips={trips} loading={loadingTrips} error={error} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} onCreateTrip={createTrip} onUpdateTrip={updateTrip} onRetry={loadTrips} onSignOut={signOut} />;
}
