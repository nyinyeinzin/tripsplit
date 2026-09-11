# TripSplit

TripSplit is a mobile-first collaborative travel itinerary and shared-expense planner. The current UI began as a Bali itinerary prototype; the Supabase foundation is now in place so its local-only data can be migrated feature by feature.

## Scaffold status

- React + Vite application with Tailwind/PostCSS ready for incremental adoption
- Supabase browser client configured through environment variables
- App-wide auth session provider (email/password and Google helpers)
- Initial Postgres migration for trips, members, invites, stops, legs, participants, expenses, and splits
- Row-level security policies, authenticated invite acceptance, read-only invite snapshots, and Realtime publication

The existing screens still read from `src/data/tripData.js` and `localStorage`. Connecting the UI to Auth is the next MVP step.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run preview        # serve the production build
```

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL from Supabase Project Settings → API. |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon browser key. RLS—not secrecy—protects database rows. |
| `VITE_GEMINI_API_KEY` | Gemini API key for the Travel AI page. Without it, the AI page explains how to add one. |
| `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` | Admin gate credentials. Defaults to `admin9` / `admin9` when unset. |

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and add the project URL and anon key.
3. Apply `supabase/migrations/20260911000000_initial_schema.sql` with the Supabase SQL editor or CLI.
4. For Google sign-in, enable the Google provider in Supabase Auth and add the app URL to the allowed redirect URLs.

Never put the Supabase service-role key in a `VITE_` variable. Only the publishable/anon key belongs in the browser.

## Security notes (read before sharing publicly)

This is a purely client-side app, so two things are true no matter how the code is arranged:

- **The Gemini API key ships to every visitor** — anything prefixed `VITE_` is embedded in the browser bundle. If you deploy this anywhere public, create a restricted key (Google AI Studio → API key → Website restrictions) and consider a quota limit, or route AI calls through a small serverless proxy so the key never reaches the browser.
- **The admin gate is cosmetic.** Credentials and the admin flag live in the bundle/localStorage and can be read or forged by anyone. It hides editing controls from casual users; it does not protect data. Don't reuse a real password.

## Architecture notes

- `src/contexts/AuthContext.jsx` — session state and Supabase Auth actions used by the upcoming login UI.
- `src/lib/supabase.js` — one shared Supabase client, disabled safely until environment variables are configured.
- `supabase/migrations/` — versioned database schema, access policies, invite functions, and Realtime setup.
- `src/data/tripData.js` — legacy prototype data that will be replaced incrementally by Supabase queries.
- `src/utils/storage.js` — all localStorage keys and JSON helpers in one place. Key strings are versioned (`v05`/`v06`); bump the suffix **only** for breaking shape changes, otherwise returning users lose their saved data.
- `src/utils/budget.js` — existing per-person cost math. Current styling remains in `src/index.css`; Tailwind is configured for new and migrated components.
- Currency: amounts are stored in THB and converted for display (THB / IDR / USD) with the fixed rates in `tripData.js`. The selected currency is a per-device preference, changeable on Home, Budget, and Settings.
