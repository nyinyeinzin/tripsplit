import { useEffect, useState } from "react";
import { Copy, Link2, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function TripInvite({ trip, user }) {
  const [role, setRole] = useState(null);
  const [link, setLink] = useState("");
  const [expires, setExpires] = useState("7");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    supabase.from("trip_members").select("role").eq("trip_id", trip.id).eq("user_id", user.id).single().then(({ data }) => {
      if (active) setRole(data?.role ?? "viewer");
    });
    return () => { active = false; };
  }, [trip.id, user.id]);

  if (role !== "owner" && role !== "editor") return null;

  async function createInvite() {
    setBusy(true);
    setMessage("");
    const expires_at = expires === "never" ? null : new Date(Date.now() + Number(expires) * 86400000).toISOString();
    const { data, error } = await supabase.from("trip_invites").insert({ trip_id: trip.id, created_by: user.id, expires_at }).select("token").single();
    setBusy(false);
    if (error) return setMessage(error.message);
    const inviteUrl = `${window.location.origin}/trip/${trip.id}?invite=${data.token}`;
    setLink(inviteUrl);
    try { await navigator.clipboard.writeText(inviteUrl); setMessage("Link created and copied."); }
    catch { setMessage("Link created. Copy it below."); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setMessage("Link copied."); }
    catch { setMessage("Select the link below to copy it."); }
  }

  return <section className="trip-invite"><div className="trip-invite-heading"><span><Users size={21} /></span><div><h2>Plan with friends</h2><p>Anyone with the link can preview this trip. They can sign in and join to edit.</p></div></div>
    <div className="trip-invite-controls"><label>Link expires <select value={expires} onChange={(event) => setExpires(event.target.value)}><option value="7">In 7 days</option><option value="30">In 30 days</option><option value="never">Never</option></select></label><button type="button" disabled={busy} onClick={createInvite}><Link2 size={17} /> {busy ? "Creating…" : "Create invite link"}</button></div>
    {link && <div className="trip-invite-link"><input aria-label="Invite link" readOnly value={link} onFocus={(event) => event.target.select()} /><button type="button" onClick={copyLink} aria-label="Copy invite link"><Copy size={18} /></button></div>}
    {message && <p className="trip-invite-message" role="status">{message}</p>}
  </section>;
}
