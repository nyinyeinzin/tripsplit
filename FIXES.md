# Consistency & design-flaw fixes — 2026-08-24

Full audit of the codebase. All fixes verified with a static import/export check across all 19 source files plus 23 unit tests over the data, budget, currency, route, AI-action, and enrichment logic.

## Bugs fixed

1. **Trip context crash risk** — `tripContext.js` referenced an import that had been dropped (`baseAirbnbs`); restored.
2. **Currency reset on reload** — the selected currency was component state only; now persisted per device and restored on load (new `baliPlanner.currency.v01` key).
3. **Settings "Default currency" was a dead placeholder** — replaced with a working selector available to everyone; the fake "coming in the next settings pass" copy is gone.
4. **Small IDR spend amounts silently rejected** — the budget form validated the *THB-converted* amount, so anything under ~455 IDR rounded to 0 and was dropped. Now validates the entered amount.
5. **Map camera jump on marker tap** — `fitBounds` re-ran on every selection change; now only re-fits when the day/route actually changes.
6. **Marker churn on unrelated re-renders** — MapPage's marker effect depended on inline arrow-function props from App (new identity every render); those handlers are now `useCallback`-stable.
7. **AI Undo didn't revert route reorders** — the AI can insert places mid-route; undo now snapshots and restores `routeOverrides` together with places.
8. **Stale stop numbers when editing a place's day** — moving a place to another day kept the old day's number, producing duplicate marker numbers; `editPlace` now reassigns the number.
9. **Bottom nav gap for non-admins** — CSS hardcoded 5 columns but viewers see 4 tabs; column count now follows visible tabs.
10. **Add-place FAB overlapped the AI chat composer** — FAB is hidden on the AI tab.
11. **Broken favicon/apple-touch-icon links** — referenced files didn't exist (404s). Added `public/favicon.svg` + generated `favicon.png` and `apple-touch-icon.png`.
12. **OSM attribution was disabled** — OpenStreetMap tile usage requires visible credit; re-enabled with a compact style.
13. **Rounding drift in USD-priced tours** — `groupTotalTHB` was rounded independently of `costPerPersonTHB`, so group ≠ per-person × 6 by 1 THB (e.g. Day 4 jeep tour). Group totals are now derived from the rounded per-person price.
14. **Pinch-zoom was blocked** — `maximum-scale=1, user-scalable=no` removed from the viewport meta (accessibility, WCAG 1.4.4); viewport also collapsed to a clean single line.

## Inconsistencies cleaned up

15. **localStorage access centralized** in `src/utils/storage.js` — keys were scattered and `realSpend` key was defined twice (App + BudgetPage). Existing versioned key strings are unchanged, so saved data survives.
16. **Trip facts had 3 sources of truth** — dates/name/corrections were hardcoded in HomePage, tripContext, and the AI prompt; now single constants in `tripData.js` (`TRIP_NAME`, `tripDateLabel`, `tripCorrections`).
17. **Duplicated currency toggles unified** — HomePage and BudgetPage had two different-styled `CurrencySwitch` components; one shared component now serves Home, Budget, and Settings (`.segmented` CSS removed).
18. **Duplicated helpers consolidated** — `getDisplayCost` (HomePage) now uses `budget.getPerPersonCost`; `STAY_TYPES` shared by routes + map; `nextNumberForDay` duplication documented; smart-add cost fields derived once.
19. **Dead code removed** — `addAiPlaces` (App), `getBookedTourActual` (budget), `routeDay3` (tripData), `isMapPlace` (MapPage), ~30 lines of dead CSS (`.setting-row`, `.sheet-grid`, `.sheet-info-wide`, `.summary-card`/`.budget-summary-grid`, `.settings-pill-row`, `.settings-card`), and non-standard font weights normalized to standard steps.
20. **Permissions copy made honest** — Settings claimed "Editing is locked for viewers" while viewers could add/delete places (kept open by choice); copy now states what admins actually gate (reordering + settings). Delete buttons are consistent between row and detail views.

## Structural / security changes

21. **Tailwind removed** — installed and configured but zero utility classes were used anywhere; all styling is the hand-written CSS in `index.css`, which duplicated Tailwind's palette. `tailwind.config.js`, `postcss.config.js`, and the `tailwindcss`/`postcss`/`autoprefixer` devDeps are gone (76 packages).
22. **Admin credentials env-overridable** — `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` (defaults `admin9`/`admin9`), documented in README + `.env.example`. Note: client-side gates are cosmetic; README says so explicitly.
23. **Gemini API key guidance** — the key is inherently embedded client-side (`VITE_`); README documents restricting the key and/or proxying.
24. **AI chat history capped** at 60 stored messages (previously grew unbounded in localStorage).
25. **Docs added** — `README.md` (setup, env vars, security notes, architecture) and `.gitignore`.

## ⚠️ One step needed on your Mac

The sandbox can't run the build toolchain (no registry access for Linux binaries), so `dist/` still contains the **pre-fix build**. Run:

```bash
npm install && npm run build
```
