import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, parseRange, findClubOr404 } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getSummary } from "@/lib/queries";
import { NOW_ISO } from "@/lib/time";
import type { SummaryResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/clubs/:id/summary?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const club = findClubOr404((await params).id);
    const range = parseRange(request.nextUrl.searchParams, club);
    return NextResponse.json<SummaryResponse>(getSummary(getDb(), club, range, NOW_ISO));
  } catch (error) {
    return errorResponse(error);
  }
}
