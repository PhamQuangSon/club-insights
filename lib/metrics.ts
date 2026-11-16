/**
 * The metric definitions as plain functions over in-memory rows.
 *
 * These are the reference implementation: the SQL in lib/queries.ts must
 * produce the same numbers, and tests/queries.test.ts checks that it does
 * on the full dataset.
 */
import type { UtcBounds } from "./time";
import type { BookingRow, Coverage, SessionRow } from "./types";

export type MetricSession = Pick<SessionRow, "id" | "starts_at" | "status" | "attendance_recorded">;
export type MetricBooking = Pick<BookingRow, "session_id" | "player_id" | "status" | "attended">;

/**
 * A session "went ahead" (was held) when it was not cancelled, it starts inside
 * the period, and it has already started by `now`.
 */
export function isHeld(session: MetricSession, bounds: UtcBounds, nowIso: string): boolean {
  return (
    session.status === "scheduled" &&
    session.starts_at >= bounds.start &&
    session.starts_at < bounds.end &&
    session.starts_at <= nowIso
  );
}

function heldSessions(sessions: MetricSession[], bounds: UtcBounds, nowIso: string): Map<string, MetricSession> {
  return new Map(sessions.filter((s) => isHeld(s, bounds, nowIso)).map((s) => [s.id, s]));
}

/** Confirmed (not cancelled) bookings at held sessions. */
function confirmedAtHeld(
  sessions: MetricSession[],
  bookings: MetricBooking[],
  bounds: UtcBounds,
  nowIso: string,
): { held: Map<string, MetricSession>; confirmed: MetricBooking[] } {
  const held = heldSessions(sessions, bounds, nowIso);
  const confirmed = bookings.filter((b) => b.status === "booked" && held.has(b.session_id));
  return { held, confirmed };
}

export function computeSessionsHeld(sessions: MetricSession[], bounds: UtcBounds, nowIso: string): number {
  return heldSessions(sessions, bounds, nowIso).size;
}

export function computeActivePlayers(
  sessions: MetricSession[],
  bookings: MetricBooking[],
  bounds: UtcBounds,
  nowIso: string,
): number {
  const { confirmed } = confirmedAtHeld(sessions, bookings, bounds, nowIso);
  return new Set(confirmed.map((b) => b.player_id)).size;
}

export interface NoShowResult {
  /** null = unknown: attendance was not taken at any held session in the period. */
  noShows: number | null;
  coverage: Coverage;
  /** noShows / bookingsRecorded, null when nothing was recorded. */
  rate: number | null;
}

/**
 * Counts only what is known. A booking is a no-show when it is confirmed, its
 * session was held with attendance taken, and it is marked absent (attended = 0).
 * A missing mark (NULL) is unknown, never a no-show.
 */
export function computeNoShows(
  sessions: MetricSession[],
  bookings: MetricBooking[],
  bounds: UtcBounds,
  nowIso: string,
): NoShowResult {
  const { held, confirmed } = confirmedAtHeld(sessions, bookings, bounds, nowIso);
  const recordedSessions = [...held.values()].filter((s) => s.attendance_recorded === 1);
  const recordedIds = new Set(recordedSessions.map((s) => s.id));

  const marked = confirmed.filter((b) => recordedIds.has(b.session_id) && b.attended !== null);
  const absent = marked.filter((b) => b.attended === 0).length;

  const coverage: Coverage = {
    recorded: recordedSessions.length,
    held: held.size,
    bookingsRecorded: marked.length,
  };

  if (coverage.recorded === 0) return { noShows: null, coverage, rate: null };
  return { noShows: absent, coverage, rate: marked.length > 0 ? absent / marked.length : null };
}

export interface Comparison {
  delta: number | null;
  deltaPct: number | null;
}

/** Change from previous to current. No percentage when the base is zero or unknown. */
export function compare(current: number | null, previous: number | null): Comparison {
  if (current === null || previous === null) return { delta: null, deltaPct: null };
  const delta = current - previous;
  return { delta, deltaPct: previous === 0 ? null : delta / previous };
}
