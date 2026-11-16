import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getClubs } from "@/lib/queries";
import { NOW_ISO } from "@/lib/time";
import type { ClubsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json<ClubsResponse>({ clubs: getClubs(getDb()), now: NOW_ISO });
  } catch (error) {
    return errorResponse(error);
  }
}
