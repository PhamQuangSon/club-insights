import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "./db";
import { getClubRow } from "./queries";
import { defaultRange, isValidLocalDate, NOW_ISO, rangeLengthDays, type DateRange } from "./time";
import { METRICS, type ApiError, type ClubRow, type MetricKey } from "./types";

/** Longest range the API accepts, to keep responses small. */
export const MAX_RANGE_DAYS = 731;

const localDate = z
  .string()
  .refine(isValidLocalDate, { message: "must be a real date in YYYY-MM-DD format (club time zone)" });

const bothValid = (q: { from?: string; to?: string }): q is { from: string; to: string } =>
  q.from !== undefined && q.to !== undefined && isValidLocalDate(q.from) && isValidLocalDate(q.to);

// Zod keeps running object-level checks after a field fails, so each check
// only looks at ranges whose dates are both valid.
const rangeQuery = z
  .object({ from: localDate.optional(), to: localDate.optional() })
  .refine((q) => (q.from === undefined) === (q.to === undefined), { message: "pass both from and to, or neither" })
  .refine((q) => !bothValid(q) || q.from <= q.to, { message: "from must be on or before to" })
  .refine((q) => !bothValid(q) || rangeLengthDays(q) <= MAX_RANGE_DAYS, {
    message: `range can be at most ${MAX_RANGE_DAYS} days`,
  });

const metricParam = z.enum(METRICS, { message: `metric must be one of: ${METRICS.join(", ")}` });

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong." } }, { status: 500 });
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}

export function findClubOr404(clubId: string): ClubRow {
  const club = getClubRow(getDb(), clubId);
  if (!club) throw new HttpError(404, "club_not_found", `No club with id "${clubId}".`);
  return club;
}

/** `from`/`to` are optional; without them the API uses the default range (last 12 full weeks). */
export function parseRange(params: URLSearchParams, club: ClubRow): DateRange {
  const parsed = rangeQuery.safeParse({ from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
  if (!parsed.success) throw new HttpError(400, "invalid_range", formatZodError(parsed.error));
  const { from, to } = parsed.data;
  return from && to ? { from, to } : defaultRange(NOW_ISO, club.time_zone);
}

export function parseMetric(params: URLSearchParams, fallback?: MetricKey): MetricKey {
  const raw = params.get("metric") ?? fallback;
  const parsed = metricParam.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid_metric", formatZodError(parsed.error));
  return parsed.data;
}
