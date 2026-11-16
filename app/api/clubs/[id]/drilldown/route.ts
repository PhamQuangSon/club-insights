import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, parseMetric, parseRange, findClubOr404 } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getDrilldown } from "@/lib/queries";
import { NOW_ISO } from "@/lib/time";
import type { DrilldownResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/clubs/:id/drilldown?from&to&metric=activePlayers|sessionsHeld|noShows (metric required) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const club = findClubOr404((await params).id);
    const query = request.nextUrl.searchParams;
    const range = parseRange(query, club);
    const metric = parseMetric(query);
    return NextResponse.json<DrilldownResponse>(getDrilldown(getDb(), club, range, metric, NOW_ISO));
  } catch (error) {
    return errorResponse(error);
  }
}
