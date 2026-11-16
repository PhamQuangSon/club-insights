"use client";

import { AlertTriangle } from "lucide-react";
import { METRIC_COPY } from "@/lib/definitions";
import { formatCount, formatPct, plural } from "@/lib/format";
import type { Coverage, MetricKey, SummaryResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Delta } from "./Delta";
import { MetricCard } from "./MetricCard";

/** Coverage gap (share of held sessions with attendance) that makes the count comparison misleading. */
const COVERAGE_GAP = 0.15;

const share = (c: Coverage) => (c.held === 0 ? 0 : c.recorded / c.held);

function seeAll(n: number, unit: [string, string]): string {
  return n === 1 ? `See the 1 ${unit[0]}` : `See all ${formatCount(n)} ${plural(n, unit)}`;
}

function vsText(previous: number | null): string {
  return previous === null ? "unknown last period" : `vs ${formatCount(previous)} last period`;
}

export function MetricCards({ summary, onOpen }: { summary: SummaryResponse; onOpen: (metric: MetricKey) => void }) {
  const { activePlayers, sessionsHeld, noShows } = summary.metrics;
  const cov = noShows.coverage;
  const unknown = noShows.current === null;
  const coverageShifted =
    noShows.current !== null && noShows.previous !== null && Math.abs(share(cov.current) - share(cov.previous)) >= COVERAGE_GAP;

  return (
    <section aria-label="Headline numbers" className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label={METRIC_COPY.activePlayers.label}
        value={formatCount(activePlayers.current ?? 0)}
        delta={<Delta {...activePlayers} upIsGood />}
        comparison={vsText(activePlayers.previous)}
        definition={activePlayers.definition}
        cta={seeAll(activePlayers.current ?? 0, METRIC_COPY.activePlayers.unit)}
        onOpen={() => onOpen("activePlayers")}
      />

      <MetricCard
        label={METRIC_COPY.sessionsHeld.label}
        value={formatCount(sessionsHeld.current ?? 0)}
        delta={<Delta {...sessionsHeld} upIsGood />}
        comparison={vsText(sessionsHeld.previous)}
        definition={sessionsHeld.definition}
        cta={seeAll(sessionsHeld.current ?? 0, METRIC_COPY.sessionsHeld.unit)}
        onOpen={() => onOpen("sessionsHeld")}
      />

      <MetricCard
        label={METRIC_COPY.noShows.label}
        value={unknown ? "Unknown" : formatCount(noShows.current!)}
        unknown={unknown}
        delta={<Delta {...noShows} upIsGood={false} />}
        comparison={vsText(noShows.previous)}
        definition={noShows.definition}
        cta={unknown ? "See which sessions were held" : seeAll(noShows.current!, METRIC_COPY.noShows.unit)}
        onOpen={() => onOpen("noShows")}
      >
        {unknown ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-warning-bg px-2.5 py-1 text-xs font-semibold text-warning">
            <AlertTriangle aria-hidden className="size-3.5" />
            {cov.current.held === 0 ? "No sessions held in this period" : "Attendance wasn't taken at any session"}
          </span>
        ) : (
          <>
            <CoverageBar coverage={cov.current} />
            {noShows.rate.current !== null && (
              <span className="text-[13px] text-muted-foreground">
                No-show rate <span className="font-semibold text-foreground">{formatPct(noShows.rate.current)}</span>
                {noShows.rate.previous !== null && <> · was {formatPct(noShows.rate.previous)}</>}
              </span>
            )}
            {coverageShifted && (
              <span className="flex items-start gap-1.5 text-xs text-warning">
                <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                Attendance was taken at {formatPct(share(cov.current))} of sessions now vs {formatPct(share(cov.previous))}{" "}
                before. Compare the rate, not the count.
              </span>
            )}
          </>
        )}
      </MetricCard>
    </section>
  );
}

function CoverageBar({ coverage }: { coverage: Coverage }) {
  const pct = coverage.held === 0 ? 0 : (coverage.recorded / coverage.held) * 100;
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 font-bold uppercase tracking-wide text-muted-foreground">Sessions with attendance</span>
        <span
          aria-label={`${coverage.recorded} of ${coverage.held} sessions`}
          className="shrink-0 whitespace-nowrap rounded-full bg-count px-2 py-0.5 font-semibold tabular-nums text-count-foreground"
        >
          {coverage.recorded}/{coverage.held}
        </span>
      </span>
      <span
        role="meter"
        aria-label="Sessions with attendance taken"
        aria-valuemin={0}
        aria-valuemax={coverage.held}
        aria-valuenow={coverage.recorded}
        className="block h-1.5 overflow-hidden rounded-full bg-count/25"
      >
        <span className="block h-full rounded-full bg-count" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

export function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[300px] rounded-xl" />
      ))}
    </div>
  );
}
