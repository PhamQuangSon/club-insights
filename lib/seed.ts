import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import Papa from "papaparse";
import { getWeekStart, normalizeUtcIso, toLocalDate } from "./time";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS clubs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  time_zone   TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  id              TEXT PRIMARY KEY,
  club_id         TEXT NOT NULL REFERENCES clubs(id),
  name            TEXT NOT NULL,
  joined_club_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  club_id             TEXT NOT NULL REFERENCES clubs(id),
  title               TEXT NOT NULL,
  starts_at           TEXT NOT NULL,              -- canonical UTC: YYYY-MM-DDTHH:mm:ssZ
  duration_minutes    INTEGER NOT NULL,
  places              INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled')),
  attendance_recorded INTEGER NOT NULL CHECK (attendance_recorded IN (0, 1)),
  week_start_local    TEXT NOT NULL,              -- Monday of the week, club's zone
  date_local          TEXT NOT NULL               -- session date, club's zone
);

CREATE TABLE IF NOT EXISTS bookings (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id),
  player_id     TEXT NOT NULL REFERENCES players(id),
  booked_at     TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('booked', 'cancelled')),
  cancelled_at  TEXT,
  attended      INTEGER CHECK (attended IN (0, 1))  -- NULL = unknown, never coerced to 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_club_start ON sessions (club_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_sessions_club_week  ON sessions (club_id, week_start_local);
CREATE INDEX IF NOT EXISTS idx_bookings_session    ON bookings (session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_player     ON bookings (player_id);
`;

type CsvRow = Record<string, string>;

function readCsv(file: string): CsvRow[] {
  const text = fs.readFileSync(file, "utf8");
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]!;
    throw new Error(`${path.basename(file)} row ${first.row}: ${first.message}`);
  }
  return parsed.data;
}

function required(row: CsvRow, key: string, file: string): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`${file}: missing "${key}" in ${JSON.stringify(row)}`);
  return value;
}

function parseBool(value: string, field: string): 0 | 1 {
  if (value === "true") return 1;
  if (value === "false") return 0;
  throw new Error(`Expected true/false for ${field}, got "${value}"`);
}

/** `attended` is tri-state: empty means unknown and must stay NULL. */
function parseAttended(value: string | undefined): 0 | 1 | null {
  const v = (value ?? "").trim();
  if (v === "") return null;
  return parseBool(v, "attended");
}

function oneOf<T extends string>(value: string, allowed: readonly T[], field: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Unexpected ${field} "${value}" (allowed: ${allowed.join(", ")})`);
}

export interface SeedCounts {
  clubs: number;
  players: number;
  sessions: number;
  bookings: number;
}

export function createSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}

export function clearData(db: Database.Database): void {
  db.exec("DELETE FROM bookings; DELETE FROM sessions; DELETE FROM players; DELETE FROM clubs;");
}

/** Loads the four CSV files into an empty schema, in foreign-key order, in one transaction. */
export function loadCsvData(db: Database.Database, dataDir: string): SeedCounts {
  const clubs = readCsv(path.join(dataDir, "clubs.csv"));
  const players = readCsv(path.join(dataDir, "players.csv"));
  const sessions = readCsv(path.join(dataDir, "sessions.csv"));
  const bookings = readCsv(path.join(dataDir, "bookings.csv"));

  const insertClub = db.prepare("INSERT INTO clubs (id, name, time_zone, created_at) VALUES (?, ?, ?, ?)");
  const insertPlayer = db.prepare("INSERT INTO players (id, club_id, name, joined_club_at) VALUES (?, ?, ?, ?)");
  const insertSession = db.prepare(
    `INSERT INTO sessions (id, club_id, title, starts_at, duration_minutes, places, status,
       attendance_recorded, week_start_local, date_local)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertBooking = db.prepare(
    `INSERT INTO bookings (id, session_id, player_id, booked_at, status, cancelled_at, attended)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const zoneByClub = new Map<string, string>();

  db.transaction(() => {
    for (const r of clubs) {
      const id = required(r, "club_id", "clubs.csv");
      const zone = required(r, "time_zone", "clubs.csv");
      zoneByClub.set(id, zone);
      insertClub.run(id, required(r, "name", "clubs.csv"), zone, required(r, "created_at", "clubs.csv"));
    }

    for (const r of players) {
      insertPlayer.run(
        required(r, "player_id", "players.csv"),
        required(r, "club_id", "players.csv"),
        required(r, "name", "players.csv"),
        required(r, "joined_club_at", "players.csv"),
      );
    }

    for (const r of sessions) {
      const clubId = required(r, "club_id", "sessions.csv");
      const zone = zoneByClub.get(clubId);
      if (!zone) throw new Error(`sessions.csv: unknown club ${clubId}`);
      const startsAt = normalizeUtcIso(required(r, "starts_at", "sessions.csv"));
      insertSession.run(
        required(r, "session_id", "sessions.csv"),
        clubId,
        required(r, "title", "sessions.csv"),
        startsAt,
        Number(required(r, "duration_minutes", "sessions.csv")),
        Number(required(r, "places", "sessions.csv")),
        oneOf(required(r, "status", "sessions.csv"), ["scheduled", "cancelled"] as const, "session status"),
        parseBool(required(r, "attendance_recorded", "sessions.csv"), "attendance_recorded"),
        getWeekStart(startsAt, zone),
        toLocalDate(startsAt, zone),
      );
    }

    for (const r of bookings) {
      const cancelledAt = r.cancelled_at?.trim();
      insertBooking.run(
        required(r, "booking_id", "bookings.csv"),
        required(r, "session_id", "bookings.csv"),
        required(r, "player_id", "bookings.csv"),
        normalizeUtcIso(required(r, "booked_at", "bookings.csv")),
        oneOf(required(r, "status", "bookings.csv"), ["booked", "cancelled"] as const, "booking status"),
        cancelledAt ? normalizeUtcIso(cancelledAt) : null,
        parseAttended(r.attended),
      );
    }
  })();

  return { clubs: clubs.length, players: players.length, sessions: sessions.length, bookings: bookings.length };
}

/** Data-quality notes worth surfacing in the seed log (not errors). */
export function dataQualityReport(db: Database.Database): string[] {
  const one = (sql: string) => (db.prepare(sql).pluck().get() as number) ?? 0;
  const notes: string[] = [];

  const partial = one(`
    SELECT COUNT(*) FROM bookings b JOIN sessions s ON s.id = b.session_id
    WHERE s.attendance_recorded = 1 AND b.status = 'booked' AND b.attended IS NULL`);
  if (partial > 0) notes.push(`${partial} confirmed bookings have no attendance mark at sessions where attendance was taken (counted as unknown).`);

  const strayMarks = one(`
    SELECT COUNT(*) FROM bookings b JOIN sessions s ON s.id = b.session_id
    WHERE s.attendance_recorded = 0 AND b.attended IS NOT NULL`);
  if (strayMarks > 0) notes.push(`${strayMarks} bookings carry an attendance mark at sessions flagged as not recorded (ignored).`);

  const cancelledMarked = one(`SELECT COUNT(*) FROM bookings WHERE status = 'cancelled' AND attended IS NOT NULL`);
  if (cancelledMarked > 0) notes.push(`${cancelledMarked} cancelled bookings carry an attendance mark (ignored).`);

  const crossClub = one(`
    SELECT COUNT(*) FROM bookings b
    JOIN sessions s ON s.id = b.session_id JOIN players p ON p.id = b.player_id
    WHERE p.club_id <> s.club_id`);
  if (crossClub > 0) notes.push(`${crossClub} bookings are by players from another club.`);

  const beforeJoin = one(`
    SELECT COUNT(*) FROM bookings b JOIN players p ON p.id = b.player_id
    WHERE substr(b.booked_at, 1, 10) < p.joined_club_at`);
  if (beforeJoin > 0) notes.push(`${beforeJoin} bookings were made before the player's joined_club_at date (kept as is).`);

  return notes;
}
