"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { defaultRange, isValidLocalDate, type DateRange } from "@/lib/time";
import type { Club } from "@/lib/types";

/**
 * Dashboard state lives in the URL (?club=&from=&to=) so a view can be shared
 * or bookmarked. Missing or invalid values fall back to sensible defaults.
 */
export function useDashboardUrl(clubs: Club[] | undefined, nowIso: string | undefined) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const clubParam = params.get("club");
  const fromParam = params.get("from");
  const toParam = params.get("to");

  const club = useMemo(() => {
    if (!clubs || clubs.length === 0) return undefined;
    return clubs.find((c) => c.id === clubParam) ?? clubs[0];
  }, [clubs, clubParam]);

  const range = useMemo<DateRange | undefined>(() => {
    if (!club || !nowIso) return undefined;
    if (fromParam && toParam && isValidLocalDate(fromParam) && isValidLocalDate(toParam) && fromParam <= toParam) {
      return { from: fromParam, to: toParam };
    }
    return defaultRange(nowIso, club.timeZone);
  }, [club, nowIso, fromParam, toParam]);

  const update = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null) sp.delete(key);
        else sp.set(key, value);
      }
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  /** Switching club keeps the selected range. */
  const setClub = useCallback((id: string) => update({ club: id }), [update]);
  const setRange = useCallback((r: DateRange) => update({ from: r.from, to: r.to }), [update]);

  return { club, range, setClub, setRange };
}
