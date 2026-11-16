/**
 * SQL for every number and list the API serves.
 *
 * Cards and drill-downs share the same WHERE fragments below, so the count on
 * a card always equals the number of rows behind it. The logic mirrors the
 * reference implementation in lib/metrics.ts; tests/queries.test.ts checks
 * they agree on the full dataset.
 */
import type Database from "better-sqlite3";
import { METRIC_COPY } from "./definitions";
import { compare } from "./metrics";
import { addDays, previousRange, rangeLengthDays, rangeToUtcBounds, weeksInRange, type DateRange } from "./time";
import type {
  ActivePlayerRow,
  Club,
  ClubRow,
  Coverage,
  DrilldownResponse,
  MetricKey,
  NoShowRow,
  SessionHeldRow,
  SummaryResponse,
  WeeklyPoint,
  WeeklyResponse,
} from "./types";

type Db = Database.Database;

interface PeriodParams {
  clubId: string;
  start: string;
  end: string;
  now: string;
}

// ---------------------------------------------------------------------------
// Shared definitions (alias `s` = sessions, `b` = bookings)
// ---------------------------------------------------------------------------

/** Session went ahead: not cancelled, starts in [start, end), already started by now. */
const HELD = `s.club_id = @clubId AND s.status = 'scheduled'
  AND s.starts_at >= @start AND s.starts_at < @end AND s.starts_at <= @now`;

/** Booking was not cancelled. */
const CONFIRMED = `b.status = 'booked'`;

/** Attendance was taken at the session and this booking has a mark. */
const MARKED = `s.attendance_recorded = 1 AND b.attended IS NOT NULL`;

/** Known no-show: attendance taken and the booking is marked absent. */
const NO_SHOW = `s.attendance_recorded = 1 AND b.attended = 0`;

/** Present: attendance taken and the booking is marked present. */
const PRESENT = `s.attendance_recorded = 1 AND b.attended = 1`;

const FROM_CONFIRMED = `FROM bookings b JOIN sessions s ON s.id = b.session_id WHERE ${HELD} AND ${CONFIRMED}`;

function periodParams(club: ClubRow, range: DateRange, nowIso: string): PeriodParams {
  const { start, end } = rangeToUtcBounds(range, club.time_zone);
  return { clubId: club.id, start, end, now: nowIso };
}

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

export function getClubRow(db: Db, clubId: string): ClubRow | undefined {
  return db.prepare("SELECT id, name, time_zone, created_at FROM clubs WHERE id = ?").get(clubId) as ClubRow | undefined;
}

export function getClubs(db: Db): Club[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.time_zone, c.created_at,
              MIN(s.date_local) AS first_date, MAX(s.date_local) AS last_date
       FROM clubs c
       LEFT JOIN sessions s ON s.club_id = c.id AND s.status = 'scheduled'
       GROUP BY c.id
       ORDER BY c.created_at, c.name`,
    )
    .all() as (ClubRow & { first_date: string | null; last_date: string | null })[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    timeZone: r.time_zone,
    createdAt: r.created_at,
    hasData: r.first_date !== null,
    firstSessionDate: r.first_date,
    lastSessionDate: r.last_date,
  }));
}

// ---------------------------------------------------------------------------
// Period totals
// ---------------------------------------------------------------------------

export interface PeriodMetrics {
  activePlayers: number;
  sessionsHeld: number;
  noShows: number | null;
  coverage: Coverage;
  rate: number | null;
}

export function getPeriodMetrics(db: Db, p: PeriodParams): PeriodMetrics {
  const sessions = db
    .prepare(
      `SELECT COUNT(*) AS held, COALESCE(SUM(s.attendance_recorded), 0) AS recorded
       FROM sessions s WHERE ${HELD}`,
    )
    .get(p) as { held: number; recorded: number };

  const bookings = db
    .prepare(
      `SELECT COUNT(DISTINCT b.player_id) AS players,
              COALESCE(SUM(CASE WHEN ${MARKED} THEN 1 ELSE 0 END), 0) AS marked,
              COALESCE(SUM(CASE WHEN ${NO_SHOW} THEN 1 ELSE 0 END), 0) AS absent
       ${FROM_CONFIRMED}`,
    )
    .get(p) as { players: number; marked: number; absent: number };

  const coverage: Coverage = { held: sessions.held, recorded: sessions.recorded, bookingsRecorded: bookings.marked };
  const known = coverage.recorded > 0;

  return {
    activePlayers: bookings.players,
    sessionsHeld: sessions.held,
    noShows: known ? bookings.absent : null,
    coverage,
    rate: known && bookings.marked > 0 ? bookings.absent / bookings.marked : null,
  };
}

export function getSummary(db: Db, club: ClubRow, range: DateRange, nowIso: string): SummaryResponse {
  const prevRange = previousRange(range);
  const cur = getPeriodMetrics(db, periodParams(club, range, nowIso));
  const prev = getPeriodMetrics(db, periodParams(club, prevRange, nowIso));

  return {
    clubId: club.id,
    timeZone: club.time_zone,
    range,
    previousRange: prevRange,
    metrics: {
      activePlayers: {
        current: cur.activePlayers,
        previous: prev.activePlayers,
        ...compare(cur.activePlayers, prev.activePlayers),
        definition: METRIC_COPY.activePlayers.definition,
      },
      sessionsHeld: {
        current: cur.sessionsHeld,
        previous: prev.sessionsHeld,
        ...compare(cur.sessionsHeld, prev.sessionsHeld),
        definition: METRIC_COPY.sessionsHeld.definition,
      },
      noShows: {
        current: cur.noShows,
        previous: prev.noShows,
        ...compare(cur.noShows, prev.noShows),
        definition: METRIC_COPY.noShows.definition,
        coverage: { current: cur.coverage, previous: prev.coverage },
        rate: { current: cur.rate, previous: prev.rate },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Week by week
// ---------------------------------------------------------------------------

/**
 * One value per local week (week_start_local is computed at seed time in the
 * club's zone). The period's WHERE clips partial edge weeks to the range.
 */
function weeklyValues(db: Db, metric: MetricKey, p: PeriodParams): Map<string, number | null> {
  const values = new Map<string, number | null>();

  if (metric === "sessionsHeld") {
    const rows = db
      .prepare(`SELECT s.week_start_local AS week, COUNT(*) AS n FROM sessions s WHERE ${HELD} GROUP BY 1`)
      .all(p) as { week: string; n: number }[];
    for (const r of rows) values.set(r.week, r.n);
  } else if (metric === "activePlayers") {
    const rows = db
      .prepare(`SELECT s.week_start_local AS week, COUNT(DISTINCT b.player_id) AS n ${FROM_CONFIRMED} GROUP BY 1`)
      .all(p) as { week: string; n: number }[];
    for (const r of rows) values.set(r.week, r.n);
  } else {
    // Weeks without any held session that took attendance stay unknown (null).
    const recordedWeeks = db
      .prepare(`SELECT DISTINCT s.week_start_local AS week FROM sessions s WHERE ${HELD} AND s.attendance_recorded = 1`)
      .pluck()
      .all(p) as string[];
    for (const week of recordedWeeks) values.set(week, 0);
    const rows = db
      .prepare(`SELECT s.week_start_local AS week, COUNT(*) AS n ${FROM_CONFIRMED} AND ${NO_SHOW} GROUP BY 1`)
      .all(p) as { week: string; n: number }[];
    for (const r of rows) values.set(r.week, r.n);
  }

  return values;
}

function metricValue(m: PeriodMetrics, metric: MetricKey): number | null {
  return metric === "activePlayers" ? m.activePlayers : metric === "sessionsHeld" ? m.sessionsHeld : m.noShows;
}

export function getWeeklySeries(
  db: Db,
  club: ClubRow,
  range: DateRange,
  metric: MetricKey,
  nowIso: string,
): WeeklyResponse {
  const prevRange = previousRange(range);
  const shift = rangeLengthDays(range);
  const current = weeklyValues(db, metric, periodParams(club, range, nowIso));
  const empty: number | null = metric === "noShows" ? null : 0;

  const weeks: WeeklyPoint[] = weeksInRange(range).map((w) => {
    // Compare like with like: the days of this week inside the range, one period earlier.
    // For whole-week ranges that is exactly the matching Monday–Sunday week.
    const days = { from: w.weekStart < range.from ? range.from : w.weekStart, to: w.weekEnd > range.to ? range.to : w.weekEnd };
    const previous = { from: addDays(days.from, -shift), to: addDays(days.to, -shift) };
    return {
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      value: current.has(w.weekStart) ? current.get(w.weekStart)! : empty,
      previous,
      previousValue: metricValue(getPeriodMetrics(db, periodParams(club, previous, nowIso)), metric),
      partial: w.partial,
    };
  });

  return { metric, definition: METRIC_COPY[metric].definition, range, previousRange: prevRange, weeks };
}

// ---------------------------------------------------------------------------
// Drill-downs (same WHERE as the cards)
// ---------------------------------------------------------------------------

export function getActivePlayersRows(db: Db, p: PeriodParams): ActivePlayerRow[] {
  return db
    .prepare(
      `SELECT p.id AS playerId, p.name AS name,
              COUNT(*) AS sessionsBooked,
              SUM(CASE WHEN ${PRESENT} THEN 1 ELSE 0 END) AS attended,
              SUM(CASE WHEN ${NO_SHOW} THEN 1 ELSE 0 END) AS noShows,
              SUM(CASE WHEN ${MARKED} THEN 0 ELSE 1 END) AS unknown
       FROM bookings b
       JOIN sessions s ON s.id = b.session_id
       JOIN players p ON p.id = b.player_id
       WHERE ${HELD} AND ${CONFIRMED}
       GROUP BY p.id
       ORDER BY sessionsBooked DESC, p.name`,
    )
    .all(p) as ActivePlayerRow[];
}

export function getSessionsHeldRows(db: Db, p: PeriodParams): SessionHeldRow[] {
  const rows = db
    .prepare(
      `SELECT s.id AS sessionId, s.title, s.starts_at AS startsAt, s.date_local AS dateLocal, s.places,
              s.attendance_recorded AS recorded,
              COUNT(b.id) AS booked,
              SUM(CASE WHEN ${PRESENT} THEN 1 ELSE 0 END) AS attended,
              SUM(CASE WHEN ${NO_SHOW} THEN 1 ELSE 0 END) AS noShows
       FROM sessions s
       LEFT JOIN bookings b ON b.session_id = s.id AND ${CONFIRMED}
       WHERE ${HELD}
       GROUP BY s.id
       ORDER BY s.starts_at DESC`,
    )
    .all(p) as (Omit<SessionHeldRow, "attendanceRecorded" | "attended" | "noShows"> & {
    recorded: 0 | 1;
    attended: number | null;
    noShows: number | null;
  })[];

  return rows.map(({ recorded, attended, noShows, ...r }) => ({
    ...r,
    attendanceRecorded: recorded === 1,
    attended: recorded === 1 ? (attended ?? 0) : null,
    noShows: recorded === 1 ? (noShows ?? 0) : null,
  }));
}

export function getNoShowRows(db: Db, p: PeriodParams): NoShowRow[] {
  return db
    .prepare(
      `SELECT b.id AS bookingId, p.id AS playerId, p.name AS playerName,
              s.id AS sessionId, s.title AS sessionTitle, s.starts_at AS startsAt, s.date_local AS dateLocal
       FROM bookings b
       JOIN sessions s ON s.id = b.session_id
       JOIN players p ON p.id = b.player_id
       WHERE ${HELD} AND ${CONFIRMED} AND ${NO_SHOW}
       ORDER BY s.starts_at DESC, p.name`,
    )
    .all(p) as NoShowRow[];
}

export function getDrilldown(
  db: Db,
  club: ClubRow,
  range: DateRange,
  metric: MetricKey,
  nowIso: string,
): DrilldownResponse {
  const p = periodParams(club, range, nowIso);
  const definition = METRIC_COPY[metric].definition;
  switch (metric) {
    case "activePlayers": {
      const rows = getActivePlayersRows(db, p);
      return { metric, total: rows.length, definition, range, rows };
    }
    case "sessionsHeld": {
      const rows = getSessionsHeldRows(db, p);
      return { metric, total: rows.length, definition, range, rows };
    }
    case "noShows": {
      const rows = getNoShowRows(db, p);
      return { metric, total: rows.length, definition, range, rows };
    }
  }
}
