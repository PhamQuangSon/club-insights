# Club Insights: Developer Guide

> Working notes for developers running and changing the project. The public-facing overview for reviewers is the root `README.md`.

A dashboard that shows a club host how their club is doing: **active players**, **sessions held** and **no-shows** for any date range, compared with the period before it, plus active players week by week. Every number opens the exact sessions or players behind it.

Next.js 15 (App Router) · TypeScript · SQLite (`better-sqlite3`) · Tailwind · Recharts · Vitest

## Run it

Needs Node 20.9 or newer.

```bash
npm install
npm run dev        # seeds db/club-insights.db from data-csv/ on first run, then http://localhost:3000
```

```bash
npm test                 # 54 tests: time zones, metric definitions, SQL vs reference, API data
npm run typecheck
npm run seed -- --force  # rebuild the database from the CSVs
npm run build && npm start
```

"Now" is fixed at **Monday 5 October 2026, 09:00 in Ho Chi Minh City** (`NOW_ISO` in `lib/time.ts`).

## How the numbers are defined

The definitions live in one place (`lib/definitions.ts`), are returned by the API with every number, and are shown under each number on screen.

| Number | Definition |
|---|---|
| **Active players** | Different players with at least one confirmed (not cancelled) booking at a session that went ahead. Someone who played five times counts once. |
| **Sessions held** | Sessions that went ahead: not cancelled, and started by "now". |
| **No-shows** | Confirmed bookings marked absent, counted **only at sessions where attendance was taken**. If no session in the period had attendance taken, the value is `null` and the UI says **Unknown**, never 0. |

Alongside no-shows the dashboard always shows **coverage** (for example, attendance was taken at 33/60 sessions) and the **no-show rate** (no-shows ÷ bookings that have an attendance mark). The count grows with coverage, so the rate is the fairer comparison. The card warns you when coverage differs by 15 points or more between the two periods.

The period before is the same number of days, ending the day before the range starts. Weeks run Monday to Sunday in the club's own time zone.

## Decisions where the brief was silent

1. **Default range: the last 12 full weeks before now** (13 Jul – 4 Oct 2026, compared with 20 Apr – 12 Jul). Now is a Monday, so the current week has nothing in it yet. Presets: last 4 weeks, last 12 weeks, all time, or a custom range (future days are blocked).
2. **Active players are counted from bookings, not attendance.** Attendance was taken at only 104 of 195 sessions, so counting people who were marked present would undercount badly.
3. **Unknown is not zero, everywhere.** This applies to the no-shows card, the weekly series, the session list ("Not recorded") and the player list ("13 not recorded"). In the data, the Tet week of 16 Feb is a real example: one session held, no attendance taken, so no-shows are Unknown.
4. **Time zones are handled once, at seed time.** Each session stores its local date and the Monday of its local week, computed with Luxon from `clubs.time_zone`. SQL never does time-zone maths. This matters for the real data: 39 "Early Bird Monday" sessions start on Sunday 22:30 UTC, which is Monday 05:30 in Ho Chi Minh City.
5. **Cards and drill-downs share the same SQL filter** (`lib/queries.ts`), so a card's number always equals the rows you see when you open it. Tests check this.
6. **Weekly chart: each week is compared with the same days one period earlier.** For whole-week ranges that is the matching Monday–Sunday week. When a range starts or ends mid-week, the edge weeks are striped, only count days inside the range, and are compared with the same number of days.
7. **"Held" also requires the session to have started by now**, so a range that runs into the future doesn't count sessions that haven't happened.
8. **The club and the range live in the URL** (`?club=&from=&to=`), so a view can be shared. Switching club keeps the range.
9. **The new club gets a guide, not "0 0 0".** It explains the three numbers it will show, suggests taking attendance at every session (that's what makes no-shows countable), and links to the example club.
10. **The player drill-down can be sorted by most no-shows**, because the brief says hosts want to know who doesn't show up.
11. **The API works without dates.** If `from`/`to` are missing it uses the default range, so a mobile client needs no date logic. Ranges are capped at 731 days.

## API

All screens read through these JSON endpoints, the same ones a mobile app would use.

| Endpoint | Returns |
|---|---|
| `GET /api/clubs` | Clubs with time zone, creation date, whether they have data, first/last session date, and `now`. |
| `GET /api/clubs/:id/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | The three numbers, previous period, delta, definition; no-shows also include `coverage` and `rate`. |
| `GET /api/clubs/:id/weekly?from&to&metric=activePlayers\|sessionsHeld\|noShows` | One point per Monday–Sunday week, with the comparison days and value. |
| `GET /api/clubs/:id/drilldown?from&to&metric=…` | The rows behind a number; `total` equals the card. |

Dates are calendar days in the club's time zone. Bad input returns `400 { error: { code, message } }`; an unknown club returns `404`.

## Tests

The number most likely to be wrong is no-shows, followed by anything that depends on which week a session falls in.

- `tests/metrics.test.ts`: no-shows on a hand-built fixture. Covers unknown vs real zero, cancelled bookings and sessions, a missing mark at a session where attendance was taken, stray marks, the Sunday→Monday local boundary and sessions after now.
- `tests/time.test.ts`: week bucketing in the club's zone (including the real Sunday 22:30 UTC session), range bounds, previous period, presets.
- `tests/queries.test.ts`: the SQL on the real data. Checks it against numbers computed independently from the CSVs, against the reference functions on 80 ranges, card totals against drill-down rows, and weekly sums against period totals.
- `tests/seed.test.ts`, `tests/format.test.ts`: row counts, NULL kept as NULL, dates always shown in the club's zone.

## Data notes

- 2 clubs, 260 players, 195 sessions, 1,893 bookings. The second club was created on 1 Oct 2026 and has no data.
- 9 sessions are cancelled; none of them have bookings.
- Every session that took attendance has a mark on every confirmed booking. The code still treats a missing mark as unknown.
- 36 bookings were made before the player's `joined_club_at` date. They are kept and counted. The seed log reports them.

## What I'd do next

- **Retention**: new vs returning players per week, and players who stopped coming.
- **Per-session attendance prompts** for hosts, since coverage is what limits the no-show numbers.
- Chart metric switcher (the API already serves all three weekly series) and a CSV export of drill-downs.
- Pagination and caching headers on the API for larger clubs; a precomputed weekly rollup if needed.
- Auth and per-host club access; dark mode; ESLint and Playwright end-to-end tests in CI.

## Deployment (Vercel)

- The Vercel project `club-insights` is connected to the GitHub repo: every push to `main` deploys to production (https://club-insights-orcin.vercel.app).
- `vercel.json` runs `npm run build`, so `prebuild` seeds the database during the build.
- `next.config.ts` ships `db/club-insights.db` with the API functions (`outputFileTracingIncludes`).
- The seed script finishes with `journal_mode = DELETE`, leaving one self-contained file that opens read-only on Vercel's read-only filesystem.
- Data changes reach production only through a new build: change the CSVs, then push.

## Project layout

```
app/api/…          JSON route handlers (the only code that touches the database)
components/        client dashboard (cards, chart, drill-down sheet, empty states)
lib/time.ts        time-zone-aware dates, weeks, ranges
lib/metrics.ts     metric definitions as plain functions (the reference)
lib/queries.ts     SQL for cards, weekly series and drill-downs (shared filters)
lib/seed.ts        schema + CSV loader
data-csv/          source data
docs/screenshots/  images used in the root README
.memory/, .claude/ planning notes and working rules used while building with an AI assistant
```
