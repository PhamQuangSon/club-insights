"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { describeZone } from "@/lib/format";
import { defaultRange, type DateRange } from "@/lib/time";
import type { Club, ClubsResponse, MetricKey, SummaryResponse, WeeklyResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubHeader } from "./ClubHeader";
import { ClubSwitcher } from "./ClubSwitcher";
import { DrilldownSheet } from "./DrilldownSheet";
import { EmptyRange, NewClubEmpty } from "./EmptyStates";
import { MetricCards, MetricCardsSkeleton } from "./MetricCards";
import { RangePicker } from "./RangePicker";
import { useDashboardUrl } from "./use-dashboard-url";
import { WeeklyChart, WeeklyChartSkeleton } from "./WeeklyChart";

export function Dashboard() {
  const clubsQuery = useSWR<ClubsResponse>("/api/clubs", fetcher);
  const clubs = clubsQuery.data?.clubs;
  const now = clubsQuery.data?.now;
  const { club, range, setClub, setRange } = useDashboardUrl(clubs, now);

  useEffect(() => {
    document.title = club ? `${club.name} · Club Insights` : "Club Insights";
  }, [club]);

  return (
    <div className="min-h-screen">
      <div className="h-1 bg-count" aria-hidden />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Club Insights</p>
          {clubs && club && <ClubSwitcher clubs={clubs} value={club.id} onChange={setClub} />}
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        {clubsQuery.error ? (
          <ErrorBanner message={`Couldn't load clubs. ${clubsQuery.error.message}`} onRetry={() => clubsQuery.mutate()} />
        ) : !clubs || !club || !now || !range ? (
          <DashboardSkeleton />
        ) : (
          <>
            <ClubHeader club={club} nowIso={now} />
            {club.hasData ? (
              <ClubInsights club={club} range={range} nowIso={now} onRangeChange={setRange} />
            ) : (
              <NewClubEmpty
                club={club}
                nowIso={now}
                example={clubs.find((c) => c.hasData)}
                onSeeExample={setClub}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ClubInsights({
  club,
  range,
  nowIso,
  onRangeChange,
}: {
  club: Club;
  range: DateRange;
  nowIso: string;
  onRangeChange: (range: DateRange) => void;
}) {
  const [openMetric, setOpenMetric] = useState<MetricKey | null>(null);
  const query = `?from=${range.from}&to=${range.to}`;
  const summaryQuery = useSWR<SummaryResponse>(`/api/clubs/${club.id}/summary${query}`, fetcher, {
    keepPreviousData: true,
  });
  const weeklyQuery = useSWR<WeeklyResponse>(`/api/clubs/${club.id}/weekly${query}&metric=activePlayers`, fetcher, {
    keepPreviousData: true,
  });

  // While a new range loads, keep the previous numbers dimmed instead of jumping the layout.
  const stale = (r?: DateRange) => r !== undefined && (r.from !== range.from || r.to !== range.to);
  const summary = summaryQuery.data;
  const nothingHeld = summary !== undefined && !stale(summary.range) && summary.metrics.sessionsHeld.current === 0;

  return (
    <>
      <RangePicker club={club} range={range} nowIso={nowIso} onChange={onRangeChange} />

      {summaryQuery.error ? (
        <ErrorBanner message={`Couldn't load the numbers. ${summaryQuery.error.message}`} onRetry={() => summaryQuery.mutate()} />
      ) : !summary ? (
        <MetricCardsSkeleton />
      ) : nothingHeld ? (
        <EmptyRange club={club} range={range} onReset={() => onRangeChange(defaultRange(nowIso, club.timeZone))} />
      ) : (
        <div className={cn("transition-opacity", stale(summary.range) && "opacity-50")}>
          <MetricCards summary={summary} onOpen={setOpenMetric} />
        </div>
      )}

      {!nothingHeld &&
        (weeklyQuery.error ? (
          <ErrorBanner
            message={`Couldn't load the weekly chart. ${weeklyQuery.error.message}`}
            onRetry={() => weeklyQuery.mutate()}
          />
        ) : !weeklyQuery.data ? (
          <WeeklyChartSkeleton />
        ) : (
          <div className={cn("transition-opacity", stale(weeklyQuery.data.range) && "opacity-50")}>
            <WeeklyChart weekly={weeklyQuery.data} zoneCity={describeZone(club.timeZone, nowIso).city} />
          </div>
        ))}

      <DrilldownSheet
        clubId={club.id}
        timeZone={club.timeZone}
        range={range}
        metric={openMetric}
        summary={summary}
        onClose={() => setOpenMetric(null)}
      />
    </>
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
      <MetricCardsSkeleton />
      <WeeklyChartSkeleton />
    </div>
  );
}
