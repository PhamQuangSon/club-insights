import type { DateRange } from "./time";

export type { DateRange };

// ---------------------------------------------------------------------------
// Rows as stored in SQLite
// ---------------------------------------------------------------------------

export interface ClubRow {
  id: string;
  name: string;
  time_zone: string;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  club_id: string;
  name: string;
  joined_club_at: string;
}

export type SessionStatus = "scheduled" | "cancelled";

export interface SessionRow {
  id: string;
  club_id: string;
  title: string;
  /** Canonical UTC, `YYYY-MM-DDTHH:mm:ssZ`. */
  starts_at: string;
  duration_minutes: number;
  places: number;
  status: SessionStatus;
  /** 1 when the host took attendance at this session. */
  attendance_recorded: 0 | 1;
  /** Monday of the session's week in the club's zone. */
  week_start_local: string;
  /** Session date in the club's zone. */
  date_local: string;
}

export type BookingStatus = "booked" | "cancelled";

export interface BookingRow {
  id: string;
  session_id: string;
  player_id: string;
  booked_at: string;
  status: BookingStatus;
  cancelled_at: string | null;
  /** 1 = attended, 0 = no-show, null = unknown (attendance not taken). Never coerce null to 0. */
  attended: 0 | 1 | null;
}

// ---------------------------------------------------------------------------
// API contract (shared by the web UI and future mobile clients)
// ---------------------------------------------------------------------------

export const METRICS = ["activePlayers", "sessionsHeld", "noShows"] as const;
export type MetricKey = (typeof METRICS)[number];

export interface ApiError {
  error: { code: string; message: string };
}

export interface Club {
  id: string;
  name: string;
  timeZone: string;
  createdAt: string;
  hasData: boolean;
  /** Local date of the first / last session, or null when the club has none. */
  firstSessionDate: string | null;
  lastSessionDate: string | null;
}

export interface ClubsResponse {
  clubs: Club[];
  /** The fixed "now" the dashboard treats as the present, canonical UTC. */
  now: string;
}

export interface MetricValue {
  /** null means unknown (e.g. no attendance taken), never zero. */
  current: number | null;
  previous: number | null;
  delta: number | null;
  /** Fractional change (0.092 = +9.2%); null when previous is 0 or unknown. */
  deltaPct: number | null;
  definition: string;
}

export interface Coverage {
  /** Held sessions where attendance was taken. */
  recorded: number;
  /** All held sessions. */
  held: number;
  /** Confirmed bookings at sessions where attendance was taken. */
  bookingsRecorded: number;
}

export interface NoShowsValue extends MetricValue {
  coverage: { current: Coverage; previous: Coverage };
  /** No-shows / bookingsRecorded; null when nothing was recorded. */
  rate: { current: number | null; previous: number | null };
}

export interface SummaryResponse {
  clubId: string;
  timeZone: string;
  range: DateRange;
  previousRange: DateRange;
  metrics: {
    activePlayers: MetricValue;
    sessionsHeld: MetricValue;
    noShows: NoShowsValue;
  };
}

export interface WeeklyPoint {
  weekStart: string;
  weekEnd: string;
  value: number | null;
  /** Same-position week in the previous period. */
  previousWeekStart: string;
  previousValue: number | null;
  /** True when part of the week is outside the selected range. */
  partial: boolean;
}

export interface WeeklyResponse {
  metric: MetricKey;
  definition: string;
  range: DateRange;
  previousRange: DateRange;
  weeks: WeeklyPoint[];
}

export interface ActivePlayerRow {
  playerId: string;
  name: string;
  sessionsBooked: number;
  attended: number;
  noShows: number;
  /** Bookings at sessions where attendance was not taken. */
  unknown: number;
}

export interface SessionHeldRow {
  sessionId: string;
  title: string;
  startsAt: string;
  dateLocal: string;
  places: number;
  booked: number;
  attendanceRecorded: boolean;
  /** Null when attendance was not taken. */
  attended: number | null;
  noShows: number | null;
}

export interface NoShowRow {
  bookingId: string;
  playerId: string;
  playerName: string;
  sessionId: string;
  sessionTitle: string;
  startsAt: string;
  dateLocal: string;
}

export type DrilldownResponse =
  | { metric: "activePlayers"; total: number; definition: string; range: DateRange; rows: ActivePlayerRow[] }
  | { metric: "sessionsHeld"; total: number; definition: string; range: DateRange; rows: SessionHeldRow[] }
  | { metric: "noShows"; total: number; definition: string; range: DateRange; rows: NoShowRow[] };
