/**
 * Integration: the SQL behind the API on the real dataset.
 *  1. Matches numbers computed independently (Python over the raw CSVs).
 *  2. Matches the reference implementation in lib/metrics.ts on many ranges.
 *  3. Every card equals the number of drill-down rows behind it.
 */
import path from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { computeActivePlayers, computeNoShows, computeSessionsHeld } from "@/lib/metrics";
import { getClubRow, getClubs, getDrilldown, getSummary, getWeeklySeries } from "@/lib/queries";
import { createSchema, loadCsvData } from "@/lib/seed";
import { NOW_ISO, addDays, rangeToUtcBounds, type DateRange } from "@/lib/time";
import type { BookingRow, ClubRow, SessionRow } from "@/lib/types";

const db = new Database(":memory:");
let club: ClubRow;
let sessions: SessionRow[];
let bookings: BookingRow[];

beforeAll(() => {
  createSchema(db);
  loadCsvData(db, path.join(process.cwd(), "data-csv"));
  club = getClubRow(db, "club-001")!;
  sessions = db.prepare("SELECT * FROM sessions WHERE club_id = 'club-001'").all() as SessionRow[];
  bookings = db.prepare("SELECT * FROM bookings").all() as BookingRow[];
});

const DEFAULT: DateRange = { from: "2026-07-13", to: "2026-10-04" };
const ALL: DateRange = { from: "2026-01-05", to: "2026-10-04" };

describe("summary matches numbers computed independently from the CSVs", () => {
  it.each([
    // range, active players, sessions held, attendance-taken sessions, no-shows, marked bookings
    [DEFAULT, 180, 60, 33, 40, 425],
    [{ from: "2026-04-20", to: "2026-07-12" }, 104, 58, 34, 26, 343],
    [ALL, 213, 186, 104, 86, 999],
    [{ from: "2026-09-07", to: "2026-10-04" }, 93, 20, 11, 15, 151],
    [{ from: "2026-01-05", to: "2026-01-11" }, 19, 5, 3, 0, 14], // a real zero
    [{ from: "2026-02-16", to: "2026-02-22" }, 6, 1, 0, null, 0], // Tet week: unknown, not zero
  ] as const)("%o", (range, active, held, recorded, noShows, marked) => {
    const { metrics } = getSummary(db, club, range, NOW_ISO);
    expect(metrics.activePlayers.current).toBe(active);
    expect(metrics.sessionsHeld.current).toBe(held);
    expect(metrics.noShows.current).toBe(noShows);
    expect(metrics.noShows.coverage.current).toEqual({ held, recorded, bookingsRecorded: marked });
  });

  it("compares with the previous period of the same length", () => {
    const s = getSummary(db, club, DEFAULT, NOW_ISO);
    expect(s.previousRange).toEqual({ from: "2026-04-20", to: "2026-07-12" });
    expect(s.metrics.activePlayers).toMatchObject({ current: 180, previous: 104, delta: 76 });
    expect(s.metrics.activePlayers.deltaPct).toBeCloseTo(76 / 104);
    expect(s.metrics.noShows.rate.current).toBeCloseTo(40 / 425);
  });
});

describe("SQL agrees with the reference implementation", () => {
  const ranges: DateRange[] = [DEFAULT, ALL];
  // Every single week, plus odd-length windows that start mid-week.
  for (let monday = "2026-01-05"; monday <= "2026-09-28"; monday = addDays(monday, 7)) {
    ranges.push({ from: monday, to: addDays(monday, 6) });
    ranges.push({ from: addDays(monday, 3), to: addDays(monday, 12) });
  }

  it(`for ${ranges.length} ranges`, () => {
    for (const range of ranges) {
      const bounds = rangeToUtcBounds(range, club.time_zone);
      const { metrics } = getSummary(db, club, range, NOW_ISO);
      const ref = computeNoShows(sessions, bookings, bounds, NOW_ISO);
      expect(metrics.activePlayers.current, JSON.stringify(range)).toBe(
        computeActivePlayers(sessions, bookings, bounds, NOW_ISO),
      );
      expect(metrics.sessionsHeld.current, JSON.stringify(range)).toBe(computeSessionsHeld(sessions, bounds, NOW_ISO));
      expect(metrics.noShows.current, JSON.stringify(range)).toBe(ref.noShows);
      expect(metrics.noShows.coverage.current, JSON.stringify(range)).toEqual(ref.coverage);
    }
  });
});

describe("every card equals the rows behind it", () => {
  it.each([DEFAULT, ALL, { from: "2026-01-05", to: "2026-01-11" }, { from: "2026-03-04", to: "2026-03-17" }])(
    "%o",
    (range) => {
      const { metrics } = getSummary(db, club, range, NOW_ISO);
      for (const metric of ["activePlayers", "sessionsHeld", "noShows"] as const) {
        expect(getDrilldown(db, club, range, metric, NOW_ISO).total, metric).toBe(metrics[metric].current ?? 0);
      }
    },
  );

  it("session rows add up to the no-show card and keep unknown attendance as null", () => {
    const rows = getDrilldown(db, club, DEFAULT, "sessionsHeld", NOW_ISO);
    if (rows.metric !== "sessionsHeld") throw new Error("wrong metric");
    const recorded = rows.rows.filter((r) => r.attendanceRecorded);
    expect(recorded).toHaveLength(33);
    expect(recorded.reduce((sum, r) => sum + (r.noShows ?? 0), 0)).toBe(40);
    expect(rows.rows.filter((r) => !r.attendanceRecorded).every((r) => r.noShows === null && r.attended === null)).toBe(
      true,
    );
  });
});

describe("weekly series", () => {
  it("has one point per Monday–Sunday week and adds up to the period totals", () => {
    const held = getWeeklySeries(db, club, DEFAULT, "sessionsHeld", NOW_ISO);
    expect(held.weeks).toHaveLength(12);
    expect(held.weeks[0]).toMatchObject({ weekStart: "2026-07-13", weekEnd: "2026-07-19", previousWeekStart: "2026-04-20" });
    expect(held.weeks.reduce((sum, w) => sum + (w.value ?? 0), 0)).toBe(60);
    expect(held.weeks.reduce((sum, w) => sum + (w.previousValue ?? 0), 0)).toBe(58);

    const noShows = getWeeklySeries(db, club, DEFAULT, "noShows", NOW_ISO);
    expect(noShows.weeks.reduce((sum, w) => sum + (w.value ?? 0), 0)).toBe(40);
  });

  it("weekly active players equal the single-week card", () => {
    const series = getWeeklySeries(db, club, ALL, "activePlayers", NOW_ISO);
    for (const w of series.weeks) {
      const card = getSummary(db, club, { from: w.weekStart, to: w.weekEnd }, NOW_ISO);
      expect(w.value, w.weekStart).toBe(card.metrics.activePlayers.current);
    }
  });

  it("marks weeks without attendance as unknown for no-shows", () => {
    const series = getWeeklySeries(db, club, { from: "2026-02-09", to: "2026-02-22" }, "noShows", NOW_ISO);
    expect(series.weeks.find((w) => w.weekStart === "2026-02-16")?.value).toBeNull();
  });
});

describe("clubs", () => {
  it("reports data span and the empty new club", () => {
    expect(getClubs(db)).toEqual([
      expect.objectContaining({ id: "club-001", hasData: true, firstSessionDate: "2026-01-05", lastSessionDate: "2026-10-04" }),
      expect.objectContaining({ id: "club-002", hasData: false, firstSessionDate: null, lastSessionDate: null }),
    ]);
  });

  it("returns zeros and unknown no-shows for the empty club", () => {
    const empty = getClubRow(db, "club-002")!;
    const { metrics } = getSummary(db, empty, DEFAULT, NOW_ISO);
    expect(metrics.activePlayers.current).toBe(0);
    expect(metrics.sessionsHeld.current).toBe(0);
    expect(metrics.noShows.current).toBeNull();
  });
});
