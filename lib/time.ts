import { DateTime } from "luxon";

/**
 * All instants are stored and compared as UTC ISO strings in one canonical
 * format, `YYYY-MM-DDTHH:mm:ssZ`, so plain string comparison is time order.
 * All calendar logic (days, Monday–Sunday weeks) happens in the club's zone.
 */

export const HCM = "Asia/Ho_Chi_Minh";

/** "Now" for this prototype: Monday 5 October 2026, 09:00 in Ho Chi Minh City. */
export const NOW_ISO = "2026-10-05T02:00:00Z";

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DateRange {
  /** First day, inclusive, `YYYY-MM-DD` in the club's zone. */
  from: string;
  /** Last day, inclusive, `YYYY-MM-DD` in the club's zone. */
  to: string;
}

export interface UtcBounds {
  /** Inclusive. */
  start: string;
  /** Exclusive. */
  end: string;
}

function parseUtc(utcIso: string): DateTime {
  const dt = DateTime.fromISO(utcIso, { zone: "utc" });
  if (!dt.isValid) throw new Error(`Invalid UTC timestamp: ${utcIso}`);
  return dt;
}

function parseLocalDate(date: string, zone: string): DateTime {
  const dt = LOCAL_DATE.test(date) ? DateTime.fromISO(date, { zone }) : DateTime.invalid("format");
  if (!dt.isValid) throw new Error(`Invalid date (expected YYYY-MM-DD): ${date}`);
  return dt;
}

/** Plain calendar arithmetic; the zone does not matter for whole days. */
function calendarDate(date: string): DateTime {
  return parseLocalDate(date, "utc");
}

export function isValidLocalDate(date: string): boolean {
  return LOCAL_DATE.test(date) && DateTime.fromISO(date, { zone: "utc" }).isValid;
}

/** Canonical UTC string for an instant: `YYYY-MM-DDTHH:mm:ssZ`. */
export function toUtcIso(dt: DateTime): string {
  return dt.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
}

/** Normalise any ISO timestamp (with or without millis/offset) to the canonical format. */
export function normalizeUtcIso(iso: string): string {
  return toUtcIso(parseUtc(iso));
}

/** Calendar date of an instant in the given zone. */
export function toLocalDate(utcIso: string, zone: string): string {
  return parseUtc(utcIso).setZone(zone).toISODate()!;
}

/** Monday (`YYYY-MM-DD`) of the Monday–Sunday week containing the instant, in the given zone. */
export function getWeekStart(utcIso: string, zone: string): string {
  // Luxon weeks are ISO weeks: they start on Monday.
  return parseUtc(utcIso).setZone(zone).startOf("week").toISODate()!;
}

/** Monday of the week containing a calendar date. */
export function weekStartOfDate(date: string): string {
  return calendarDate(date).startOf("week").toISODate()!;
}

/** Sunday of the week starting on `weekStart`. */
export function weekEndOf(weekStart: string): string {
  return addDays(weekStart, 6);
}

export function addDays(date: string, days: number): string {
  return calendarDate(date).plus({ days }).toISODate()!;
}

/** Number of calendar days in an inclusive range. */
export function rangeLengthDays(range: DateRange): number {
  return calendarDate(range.to).diff(calendarDate(range.from), "days").days + 1;
}

/** Turns an inclusive local-date range into `[start, end)` UTC instants. */
export function rangeToUtcBounds(range: DateRange, zone: string): UtcBounds {
  const start = parseLocalDate(range.from, zone).startOf("day");
  const end = parseLocalDate(range.to, zone).startOf("day").plus({ days: 1 });
  return { start: toUtcIso(start), end: toUtcIso(end) };
}

/** The period of the same length that ends the day before `range.from`. */
export function previousRange(range: DateRange): DateRange {
  const length = rangeLengthDays(range);
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

/** Today's date in the club's zone. */
export function localToday(nowIso: string, zone: string): string {
  return toLocalDate(nowIso, zone);
}

/** The last `weeks` full Monday–Sunday weeks before the week that contains `now`. */
export function lastFullWeeks(weeks: number, nowIso: string, zone: string): DateRange {
  const thisMonday = getWeekStart(nowIso, zone);
  return { from: addDays(thisMonday, -7 * weeks), to: addDays(thisMonday, -1) };
}

export const DEFAULT_WEEKS = 12;

export function defaultRange(nowIso: string, zone: string): DateRange {
  return lastFullWeeks(DEFAULT_WEEKS, nowIso, zone);
}

export type RangePreset = "last4w" | "last12w" | "all";

export interface DataSpan {
  /** Local date of the club's first session. */
  first: string;
  /** Local date of the club's last session. */
  last: string;
}

/**
 * Resolves a preset. "All data" covers whole weeks from the first to the last
 * session; it returns null for a club with no sessions.
 */
export function presetRange(
  preset: RangePreset,
  nowIso: string,
  zone: string,
  span: DataSpan | null,
): DateRange | null {
  switch (preset) {
    case "last4w":
      return lastFullWeeks(4, nowIso, zone);
    case "last12w":
      return lastFullWeeks(12, nowIso, zone);
    case "all":
      return span ? { from: weekStartOfDate(span.first), to: weekEndOf(weekStartOfDate(span.last)) } : null;
  }
}

/** Which preset (if any) a range corresponds to. */
export function matchPreset(range: DateRange, nowIso: string, zone: string, span: DataSpan | null): RangePreset | null {
  const presets: RangePreset[] = ["last4w", "last12w", "all"];
  for (const preset of presets) {
    const r = presetRange(preset, nowIso, zone, span);
    if (r && r.from === range.from && r.to === range.to) return preset;
  }
  return null;
}

export interface WeekSlot {
  weekStart: string;
  weekEnd: string;
  /** True when part of the week falls outside the range. */
  partial: boolean;
}

/** Every Monday–Sunday week that overlaps the range, in order. */
export function weeksInRange(range: DateRange): WeekSlot[] {
  const weeks: WeekSlot[] = [];
  for (let monday = weekStartOfDate(range.from); monday <= range.to; monday = addDays(monday, 7)) {
    const sunday = weekEndOf(monday);
    weeks.push({ weekStart: monday, weekEnd: sunday, partial: monday < range.from || sunday > range.to });
  }
  return weeks;
}
