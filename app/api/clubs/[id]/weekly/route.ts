import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, parseMetric, parseRange, findClubOr404 } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getWeeklySeries } from "@/lib/queries";
import { NOW_ISO } from "@/lib/time";
import type { WeeklyResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/clubs/:id/weekly?from&to&metric=activePlayers|sessionsHeld|noShows (default activePlayers) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const club = findClubOr404((await params).id);
    const query = request.nextUrl.searchParams;
    const range = parseRange(query, club);
    const metric = parseMetric(query, "activePlayers");
    return NextResponse.json<WeeklyResponse>(getWeeklySeries(getDb(), club, range, metric, NOW_ISO));
  } catch (error) {
    return errorResponse(error);
  }
}
