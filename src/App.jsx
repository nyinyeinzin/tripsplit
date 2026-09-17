import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import TripHomePage from "./pages/TripHomePage";

const fields = "id,name,destination,start_date,end_date,cover_photo_url,owner_id,default_vehicle_capacity,currency,created_at";

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [error, setError] = useState("");
  const [selectedTripId, setSelectedTripId] = useState(null);

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
    const { data, error: createError } = await supabase.from("trips").insert({ ...values, owner_id: user.id }).select(fields).single();
    if (createError) throw createError;
    setTrips((current) => [data, ...current]);
    setSelectedTripId(data.id);
  }

  if (authLoading) return <main className="auth-page auth-loading" aria-live="polite"><div className="auth-loading-mark">TS</div><p>Opening your trips…</p></main>;
  if (!user) return <AuthPage />;

  return <TripHomePage user={user} trips={trips} loading={loadingTrips} error={error} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} onCreateTrip={createTrip} onRetry={loadTrips} onSignOut={signOut} />;
}
