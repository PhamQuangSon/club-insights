/**
 * The numbers most likely to be wrong: no-shows (unknown is not zero) and
 * anything that depends on which local week / period a session falls in.
 */
import { describe, expect, it } from "vitest";
import {
  compare,
  computeActivePlayers,
  computeNoShows,
  computeSessionsHeld,
  type MetricBooking,
  type MetricSession,
} from "@/lib/metrics";
import { HCM, NOW_ISO, rangeToUtcBounds } from "@/lib/time";

// One local week: Mon 9 – Sun 15 March 2026 in Ho Chi Minh City (UTC+7).
const WEEK = rangeToUtcBounds({ from: "2026-03-09", to: "2026-03-15" }, HCM);

const s = (
  id: string,
  starts_at: string,
  attendance_recorded: 0 | 1,
  status: MetricSession["status"] = "scheduled",
): MetricSession => ({ id, starts_at, attendance_recorded, status });

const b = (
  session_id: string,
  player_id: string,
  attended: MetricBooking["attended"],
  status: MetricBooking["status"] = "booked",
): MetricBooking => ({ session_id, player_id, attended, status });

const sessions: MetricSession[] = [
  s("A", "2026-03-10T12:00:00Z", 1), // attendance taken: 1 present, 2 absent
  s("B", "2026-03-11T12:00:00Z", 0), // attendance NOT taken
  s("C", "2026-03-12T12:00:00Z", 1), // one cancelled booking + 3 present
  s("D", "2026-03-13T12:00:00Z", 0, "cancelled"), // cancelled session
  s("E", "2026-03-08T22:30:00Z", 1), // Sun 22:30 UTC = Mon 05:30 local → inside this week
  s("E0", "2026-03-08T16:30:00Z", 1), // Sun 23:30 local → previous week
  s("F", "2026-03-15T16:59:00Z", 0), // Sun 23:59 local → last minute of this week
  s("G", "2026-03-14T00:00:00Z", 1), // attendance taken but one mark missing
];

const bookings: MetricBooking[] = [
  b("A", "p1", 1),
  b("A", "p2", 0),
  b("A", "p3", 0),
  b("B", "p1", null),
  b("B", "p4", null),
  b("B", "p5", null),
  b("C", "p6", null, "cancelled"),
  b("C", "p1", 1),
  b("C", "p7", 1),
  b("C", "p8", 1),
  b("D", "p9", null),
  b("E", "p10", 0),
  b("E0", "p11", 0),
  b("F", "p12", null),
  b("G", "p13", 1),
  b("G", "p14", null),
];

describe("computeNoShows", () => {
  const result = computeNoShows(sessions, bookings, WEEK, NOW_ISO);

  it("counts only confirmed bookings marked absent at sessions where attendance was taken", () => {
    // A: p2, p3. E: p10. Nothing from B (unknown), C (cancelled booking), D (cancelled session), E0 (other week).
    expect(result.noShows).toBe(3);
  });

  it("does not treat unknown attendance as zero: B, F and G's missing mark are left out of the base", () => {
    expect(result.coverage).toEqual({
      held: 6, // A B C E F G
      recorded: 4, // A C E G
      bookingsRecorded: 8, // A×3 + C×3 + E×1 + G×1 (p14 has no mark)
    });
    expect(result.rate).toBeCloseTo(3 / 8);
  });

  it("returns null, not 0, when no held session had attendance taken", () => {
    const onlyB = rangeToUtcBounds({ from: "2026-03-11", to: "2026-03-11" }, HCM);
    const r = computeNoShows(sessions, bookings, onlyB, NOW_ISO);
    expect(r.coverage).toEqual({ held: 1, recorded: 0, bookingsRecorded: 0 });
    expect(r.noShows).toBeNull();
    expect(r.rate).toBeNull();
  });

  it("returns a real 0 when attendance was taken and everyone came", () => {
    const onlyC = rangeToUtcBounds({ from: "2026-03-12", to: "2026-03-12" }, HCM);
    expect(computeNoShows(sessions, bookings, onlyC, NOW_ISO).noShows).toBe(0);
  });

  it("never counts a cancelled booking as a no-show, even if it carries a mark", () => {
    const weird = [...bookings, b("A", "p99", 0, "cancelled")];
    expect(computeNoShows(sessions, weird, WEEK, NOW_ISO).noShows).toBe(3);
  });

  it("ignores stray marks at sessions where attendance is flagged as not taken", () => {
    const weird = [...bookings, b("B", "p98", 0)];
    expect(computeNoShows(sessions, weird, WEEK, NOW_ISO).noShows).toBe(3);
  });
});

describe("computeSessionsHeld", () => {
  it("excludes cancelled sessions and uses local week boundaries", () => {
    expect(computeSessionsHeld(sessions, WEEK, NOW_ISO)).toBe(6);
  });

  it("does not count sessions that have not started yet", () => {
    const week = rangeToUtcBounds({ from: "2026-10-05", to: "2026-10-11" }, HCM);
    const upcoming = [s("now", NOW_ISO, 0), s("later", "2026-10-05T03:00:00Z", 0)];
    expect(computeSessionsHeld(upcoming, week, NOW_ISO)).toBe(1);
  });
});

describe("computeActivePlayers", () => {
  it("counts each player once, ignores cancelled bookings, cancelled sessions and other weeks", () => {
    // p1 booked three sessions → 1. p6 (cancelled booking), p9 (cancelled session), p11 (previous week) excluded.
    // p1 p2 p3 p4 p5 p7 p8 p10 p12 p13 p14 = 11, including players at sessions without attendance.
    expect(computeActivePlayers(sessions, bookings, WEEK, NOW_ISO)).toBe(11);
  });

  it("ignores bookings for sessions after now", () => {
    const week = rangeToUtcBounds({ from: "2026-10-05", to: "2026-10-11" }, HCM);
    const later = [s("later", "2026-10-06T12:00:00Z", 0)];
    expect(computeActivePlayers(later, [b("later", "p1", null)], week, NOW_ISO)).toBe(0);
  });
});

describe("compare", () => {
  it("returns delta and fractional change", () => {
    expect(compare(110, 100)).toEqual({ delta: 10, deltaPct: 0.1 });
    expect(compare(90, 100)).toEqual({ delta: -10, deltaPct: -0.1 });
  });

  it("does not divide by zero or compare against unknown", () => {
    expect(compare(5, 0)).toEqual({ delta: 5, deltaPct: null });
    expect(compare(5, null)).toEqual({ delta: null, deltaPct: null });
    expect(compare(null, 3)).toEqual({ delta: null, deltaPct: null });
  });
});
