# TripSplit

TripSplit is a mobile-first collaborative travel itinerary and shared-expense planner. Its Supabase-backed trip creation, day-by-day stops, private invite links, transport estimates, and shared ledger are available.

## Scaffold status

- React + Vite application with Tailwind/PostCSS ready for incremental adoption
- Supabase browser client configured through environment variables
- App-wide auth session provider (email/password and Google helpers)
- Initial Postgres migration for trips, members, invites, stops, legs, participants, expenses, and splits
- Row-level security policies, authenticated invite acceptance, read-only invite snapshots, and Realtime publication
- Sign-up/sign-in UI (email/password and Google) and a Supabase-backed trip list and create-trip form
- Stop creation, editing, and deletion with trip-day scheduling, notes, and live updates
- Private invite links with optional expiry, read-only previews for guests, and authenticated join-to-edit
- Transport legs between consecutive stops, per-stop attendance, vehicle counts, configurable fares, and manual overrides
- Trip expense ledger with equal or custom splits, balances, and settle-up suggestions
- Optional AI place ideas powered by a server-only Gemini key

After signing in, create a trip by searching or selecting a country, entering the first city, then adding a name, dates, and currency. The trip should appear in Your trips, remain after a refresh, and be visible in the Supabase `trips` and `trip_members` tables. The city and country are stored separately; `destination` remains a display label for existing itinerary and route features. Open it and add a place; edits and deletion should persist after refreshing, and another signed-in trip member should see changes live. Ride capacity defaults to four people and can be changed later in Transport settings. The old Bali prototype files remain in the repository but are no longer rendered by the app.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
npm test               # ledger unit tests
npm run build          # production build in dist/
npm run preview        # serve the production build
```

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL from Supabase Project Settings → API. |
| `VITE_SUPABASE_ANON_KEY` | Publishable/anon browser key. RLS—not secrecy—protects database rows. |
| `ORS_API_KEY` | Server-only OpenRouteService key for Netlify Functions; enables automatic route estimates. |
| `GEMINI_API_KEY` | Server-only Gemini key for AI place suggestions. Optional. |
| `VITE_GEMINI_API_KEY` | Gemini API key for the Travel AI page. Without it, the AI page explains how to add one. |
| `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` | Admin gate credentials. Defaults to `admin9` / `admin9` when unset. |

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and add the project URL and anon key.
3. Apply `supabase/migrations/20260911000000_initial_schema.sql` with the Supabase SQL editor or CLI.
4. For Google sign-in, enable the Google provider in Supabase Auth and add the app URL to the allowed redirect URLs.

Never put the Supabase service-role key in a `VITE_` variable. Only the publishable/anon key belongs in the browser.

Automatic route estimates use a Netlify Function, so run `npx netlify dev` for local end-to-end testing; plain `npm run dev` supports the manual time, distance, and fare fallback. Set `ORS_API_KEY` in Netlify's environment variables when deploying. The function geocodes stop names, asks OpenRouteService for a driving route, and caches the result in `legs` for 24 hours. Set your trip's base fare and per-km rate first. Routing data is an estimate, not a quote.
AI suggestions use a separate Netlify Function and appear only when `GEMINI_API_KEY` is configured. Treat suggested places as ideas, and verify that they exist and are open before traveling.

## Security notes (read before sharing publicly)

This is a purely client-side app, so two things are true no matter how the code is arranged:

- **The Gemini API key ships to every visitor** — anything prefixed `VITE_` is embedded in the browser bundle. If you deploy this anywhere public, create a restricted key (Google AI Studio → API key → Website restrictions) and consider a quota limit, or route AI calls through a small serverless proxy so the key never reaches the browser.
- **The admin gate is cosmetic.** Credentials and the admin flag live in the bundle/localStorage and can be read or forged by anyone. It hides editing controls from casual users; it does not protect data. Don't reuse a real password.

## Architecture notes

- `src/contexts/AuthContext.jsx` — session state and Supabase Auth actions.
- `src/pages/TripHomePage.jsx` — trip list, creation form, and empty itinerary view.
- `src/pages/TripStops.jsx` — day-by-day stop management, roles, and Realtime subscription.
- `src/pages/TripInvite.jsx` and `src/pages/InvitePage.jsx` — share-link creation and guest preview/join flow.
- `src/pages/TripLegs.jsx` and `netlify/functions/estimate-leg.mjs` — transport split UI and server-side route estimates.
- `src/pages/TripExpenses.jsx` — expenses, per-member balances, and suggested transfers.
- `netlify/functions/suggest-places.mjs` — authenticated, server-side AI place ideas.
- `src/lib/supabase.js` — one shared Supabase client, disabled safely until environment variables are configured.
- `supabase/migrations/` — versioned database schema, access policies, invite functions, and Realtime setup.
- `src/data/tripData.js` — legacy prototype data, not used by the current TripSplit screens.
- `src/utils/storage.js` — all localStorage keys and JSON helpers in one place. Key strings are versioned (`v05`/`v06`); bump the suffix **only** for breaking shape changes, otherwise returning users lose their saved data.
- `src/utils/budget.js` — existing per-person cost math. Current styling remains in `src/index.css`; Tailwind is configured for new and migrated components.
- Currency: amounts are stored in THB and converted for display (THB / IDR / USD) with the fixed rates in `tripData.js`. The selected currency is a per-device preference, changeable on Home, Budget, and Settings.
