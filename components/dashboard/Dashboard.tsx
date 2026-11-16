"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { ClubsResponse } from "@/lib/types";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubHeader } from "./ClubHeader";
import { ClubSwitcher } from "./ClubSwitcher";
import { useDashboardUrl } from "./use-dashboard-url";

export function Dashboard() {
  const clubsQuery = useSWR<ClubsResponse>("/api/clubs", fetcher);
  const { club, range, setClub } = useDashboardUrl(clubsQuery.data?.clubs, clubsQuery.data?.now);
  const now = clubsQuery.data?.now;

  return (
    <div className="min-h-screen">
      <div className="h-1 bg-count" aria-hidden />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Club Insights</p>
          {clubsQuery.data && club && (
            <ClubSwitcher clubs={clubsQuery.data.clubs} value={club.id} onChange={setClub} />
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        {clubsQuery.error ? (
          <ErrorBanner message={`Couldn't load clubs. ${clubsQuery.error.message}`} onRetry={() => clubsQuery.mutate()} />
        ) : !club || !now || !range ? (
          <DashboardSkeleton />
        ) : (
          <>
            <ClubHeader club={club} nowIso={now} />
            <p className="text-sm text-muted-foreground">
              Range {range.from} → {range.to}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl rounded-full" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[380px] rounded-xl" />
    </div>
  );
}
