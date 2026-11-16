import { DateTime } from "luxon";
import type { DateRange } from "./time";

const DAY = (date: string) => DateTime.fromISO(date, { zone: "utc" });

/** "13 Jul – 4 Oct 2026", "29 Dec 2025 – 4 Jan 2026", "5 Jan 2026". */
export function formatDateRange(range: DateRange): string {
  const from = DAY(range.from);
  const to = DAY(range.to);
  if (range.from === range.to) return to.toFormat("d LLL yyyy");
  if (from.year !== to.year) return `${from.toFormat("d LLL yyyy")} – ${to.toFormat("d LLL yyyy")}`;
  if (from.month === to.month) return `${from.toFormat("d")} – ${to.toFormat("d LLL yyyy")}`;
  return `${from.toFormat("d LLL")} – ${to.toFormat("d LLL yyyy")}`;
}

/** "13 Jul" */
export function formatShortDate(date: string): string {
  return DAY(date).toFormat("d LLL");
}

/** "Mon, Jul 13 @5:30 AM" in the club's zone. */
export function formatSessionTime(utcIso: string, zone: string): string {
  return DateTime.fromISO(utcIso, { zone: "utc" }).setZone(zone).toFormat("ccc, LLL d '@'h:mm a");
}

/** "Dec 2025" */
export function formatMonthYear(date: string): string {
  return DAY(date).toFormat("LLL yyyy");
}

/** "Asia/Ho_Chi_Minh" → "Ho Chi Minh City" style label, plus "UTC+7". */
export function describeZone(zone: string, atIso: string): { city: string; offset: string } {
  const city = (zone.split("/").pop() ?? zone).replace(/_/g, " ");
  const offset = DateTime.fromISO(atIso, { zone: "utc" }).setZone(zone).toFormat("'UTC'Z");
  return { city: city === "Ho Chi Minh" ? "Ho Chi Minh City" : city, offset };
}

/** Whole days between a local date and now, for "created 4 days ago". */
export function daysAgo(date: string, nowIso: string, zone: string): number {
  const today = DateTime.fromISO(nowIso, { zone: "utc" }).setZone(zone).startOf("day");
  return Math.round(today.diff(DateTime.fromISO(date, { zone }).startOf("day"), "days").days);
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** 0.0923 → "+9.2%" (signed) or "9.2%". */
export function formatPct(fraction: number, signed = false): string {
  const pct = fraction * 100;
  const digits = Math.abs(pct) >= 10 ? 0 : 1;
  const text = `${Math.abs(pct).toFixed(digits)}%`;
  if (!signed) return text;
  return pct > 0 ? `+${text}` : pct < 0 ? `−${text}` : text;
}

export function plural(n: number, [one, many]: [string, string]): string {
  return n === 1 ? one : many;
}

/** "Saigon Smash Pickleball" → "SS" */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}
