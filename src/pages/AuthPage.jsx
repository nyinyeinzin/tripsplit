import { useState } from "react";
import { ArrowRight, Compass, LoaderCircle, LockKeyhole, Mail, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function AuthPage({ embedded = false }) {
  const { configured, signInWithGoogle, signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        if (embedded) window.sessionStorage.setItem("tripsplit-pending-invite", window.location.pathname + window.location.search);
        const { data, error: signUpError } = await signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { name: form.name.trim() },
            emailRedirectTo: window.location.origin
          }
        });
        if (signUpError) throw signUpError;
        if (!data.session) setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error: signInError } = await signInWithPassword({
          email: form.email.trim(),
          password: form.password
        });
        if (signInError) throw signInError;
      }
    } catch (requestError) {
      setError(requestError.message || "We couldn't complete that request. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    setSubmitting(true);
    setError("");
    if (embedded) window.sessionStorage.setItem("tripsplit-pending-invite", window.location.pathname + window.location.search);
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) {
      setError(oauthError.message);
      setSubmitting(false);
    }
  }

  if (!configured) {
    return (
      <main className="auth-page">
        <section className="auth-card auth-config-error">
          <span className="auth-logo"><Compass size={27} /></span>
          <h1>Connect Supabase</h1>
          <p>Add your Supabase URL and publishable key to the local <code>.env</code> file, then restart the app.</p>
        </section>
      </main>
    );
  }

  const Wrapper = embedded ? "div" : "main";
  return (
    <Wrapper className={`auth-page${embedded ? " auth-embedded" : ""}`}>
      <section className="auth-shell">
        <div className="auth-story">
          <div>
            <span className="auth-logo"><Compass size={27} /></span>
            <strong className="auth-brand">TripSplit</strong>
          </div>
          <div className="auth-story-copy">
            <p className="eyebrow auth-eyebrow">Plan together. Travel lighter.</p>
            <h1>One trip,<br />everyone in sync.</h1>
            <p>Build the itinerary, coordinate rides, and keep shared costs clear from the first idea to settle-up.</p>
          </div>
          <div className="auth-feature-row">
            <span><Users size={18} /> Live group planning</span>
            <span><Compass size={18} /> Smarter routes</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-mode-tabs" role="tablist" aria-label="Account action">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
          </div>

          <div className="auth-form-heading">
            <h2>{mode === "signin" ? "Welcome back" : "Start planning"}</h2>
            <p>{mode === "signin" ? "Open your trips and pick up where you left off." : "Create an account to plan and split trips with friends."}</p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "signup" && (
              <label>
                <span>Name</span>
                <div className="auth-input"><Users size={18} /><input required value={form.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" placeholder="Your name" /></div>
              </label>
            )}
            <label>
              <span>Email</span>
              <div className="auth-input"><Mail size={18} /><input required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" placeholder="you@example.com" /></div>
            </label>
            <label>
              <span>Password</span>
              <div className="auth-input"><LockKeyhole size={18} /><input required minLength={6} type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" /></div>
            </label>

            {error && <p className="auth-alert error" role="alert">{error}</p>}
            {message && <p className="auth-alert success" role="status">{message}</p>}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={19} /> : <>{mode === "signin" ? "Sign in" : "Create account"}<ArrowRight size={19} /></>}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <button className="google-button" type="button" onClick={continueWithGoogle} disabled={submitting}>
            <span className="google-mark">G</span>
            Continue with Google
          </button>
          <p className="auth-terms">By continuing, you agree to use TripSplit responsibly with your travel group.</p>
        </div>
      </section>
    </Wrapper>
  );
}
