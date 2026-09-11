# Bali Planner

Mobile-first itinerary planner for a 13-day Bali trip (July 17–29, 6 travelers): day-by-day routes, a Leaflet map with per-day stops, budget tracking with real-spend logging, and an admin-gated Travel AI concierge backed by Google Gemini.

Despite the folder name, this project currently has **no Supabase dependency** — all data lives in `src/data/tripData.js` and on-device `localStorage`.

## Getting started

```bash
npm install
cp .env.example .env   # optional — see below
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run preview        # serve the production build
```

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_GEMINI_API_KEY` | Gemini API key for the Travel AI page. Without it, the AI page explains how to add one. |
| `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` | Admin gate credentials. Defaults to `admin9` / `admin9` when unset. |

## Security notes (read before sharing publicly)

This is a purely client-side app, so two things are true no matter how the code is arranged:

- **The Gemini API key ships to every visitor** — anything prefixed `VITE_` is embedded in the browser bundle. If you deploy this anywhere public, create a restricted key (Google AI Studio → API key → Website restrictions) and consider a quota limit, or route AI calls through a small serverless proxy so the key never reaches the browser.
- **The admin gate is cosmetic.** Credentials and the admin flag live in the bundle/localStorage and can be read or forged by anyone. It hides editing controls from casual users; it does not protect data. Don't reuse a real password.

## Architecture notes

- `src/data/tripData.js` — single source of truth: trip constants, days, activities, routes, admin credentials (env-overridable), shared AI corrections.
- `src/utils/storage.js` — all localStorage keys and JSON helpers in one place. Key strings are versioned (`v05`/`v06`); bump the suffix **only** for breaking shape changes, otherwise returning users lose their saved data.
- `src/utils/budget.js` — per-person cost math. All styling is hand-written CSS in `src/index.css` (Tailwind was removed — no utility classes were in use).
- Currency: amounts are stored in THB and converted for display (THB / IDR / USD) with the fixed rates in `tripData.js`. The selected currency is a per-device preference, changeable on Home, Budget, and Settings.
