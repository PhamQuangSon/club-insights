"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { METRIC_COPY } from "@/lib/definitions";
import { fetcher } from "@/lib/fetcher";
import { describeZone, formatCount, formatDateRange, formatSessionTime, initials, plural } from "@/lib/format";
import type { DateRange } from "@/lib/time";
import type {
  ActivePlayerRow,
  DrilldownResponse,
  MetricKey,
  NoShowRow,
  SessionHeldRow,
  SummaryResponse,
} from "@/lib/types";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  clubId: string;
  timeZone: string;
  range: DateRange;
  metric: MetricKey | null;
  summary: SummaryResponse | undefined;
  onClose: () => void;
}

/** The rows behind a card. Uses the same API filter as the card, so the count always matches. */
export function DrilldownSheet({ clubId, timeZone, range, metric, summary, onClose }: Props) {
  const open = metric !== null;
  // Opened from a card, not a Dialog.Trigger, so remember what to give focus back to.
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) returnFocus.current = document.activeElement as HTMLElement | null;
  }, [open]);
  const query = useSWR<DrilldownResponse>(
    metric ? `/api/clubs/${clubId}/drilldown?from=${range.from}&to=${range.to}&metric=${metric}` : null,
    fetcher,
  );
  const copy = metric ? METRIC_COPY[metric] : null;
  const data = query.data && query.data.metric === metric ? query.data : undefined;
  const noShowsUnknown = metric === "noShows" && summary?.metrics.noShows.current === null;
  const coverage = summary?.metrics.noShows.coverage.current;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-card shadow-xl focus:outline-none sm:max-w-[560px] sm:border-l sm:border-border"
          aria-describedby="drilldown-definition"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          {copy && (
            <>
              <header className="border-b border-border bg-muted px-5 pb-4 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{copy.label}</p>
                    <Dialog.Title className="mt-1 text-2xl font-extrabold tracking-tight">
                      {noShowsUnknown
                        ? "No-shows unknown"
                        : data
                          ? `${formatCount(data.total)} ${plural(data.total, copy.unit)}`
                          : " "}
                    </Dialog.Title>
                    <p className="mt-0.5 text-sm text-muted-foreground">{formatDateRange(range)}</p>
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="rounded-full p-2 text-muted-foreground hover:bg-card hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <Dialog.Description id="drilldown-definition" className="mt-3 text-sm leading-snug text-muted-foreground">
                  {copy.definition}
                </Dialog.Description>
                {metric === "noShows" && coverage && coverage.held > 0 && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-count px-2 py-0.5 font-semibold tabular-nums text-count-foreground">
                      {coverage.recorded}/{coverage.held} sessions
                    </span>
                    <span className="text-muted-foreground">had attendance taken</span>
                  </p>
                )}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {query.error ? (
                  <div className="p-5">
                    <ErrorBanner message={`Couldn't load the list. ${query.error.message}`} onRetry={() => query.mutate()} />
                  </div>
                ) : !data ? (
                  <ListSkeleton />
                ) : noShowsUnknown ? (
                  <Empty
                    warning
                    title="Attendance wasn't taken at any session in this period"
                    body="Without attendance we can't tell who didn't show up, so this is unknown rather than zero. Pick a longer range or check the sessions list."
                  />
                ) : data.total === 0 ? (
                  <Empty title={`No ${copy.unit[1]} in this period`} body="Try a longer range." />
                ) : data.metric === "activePlayers" ? (
                  <PlayerList rows={data.rows} />
                ) : data.metric === "sessionsHeld" ? (
                  <SessionList rows={data.rows} timeZone={timeZone} />
                ) : (
                  <NoShowList rows={data.rows} timeZone={timeZone} />
                )}
              </div>

              {data && data.total > 0 && !noShowsUnknown && (
                <footer className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                  {formatCount(data.total)} {plural(data.total, copy.unit)}, the same rows the card counts. Times in{" "}
                  {describeZone(timeZone, range.to + "T00:00:00Z").city}.
                </footer>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground"
    >
      {initials(name)}
    </span>
  );
}

function Tag({ tone, children }: { tone: "selected" | "neutral" | "count"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone === "selected" && "bg-selected text-selected-foreground",
        tone === "neutral" && "border border-dashed border-pill-inactive bg-neutral-tag text-muted-foreground",
        tone === "count" && "bg-count text-count-foreground",
      )}
    >
      {children}
    </span>
  );
}

type PlayerSort = "sessions" | "noShows" | "name";

function PlayerList({ rows }: { rows: ActivePlayerRow[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<PlayerSort>("sessions");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
    const sorted = [...filtered];
    if (sort === "noShows") sorted.sort((a, b) => b.noShows - a.noShows || b.sessionsBooked - a.sessionsBooked || a.name.localeCompare(b.name));
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [rows, search, sort]);

  return (
    <>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card px-5 py-3">
        <label className="relative min-w-[12rem] flex-1 basis-full sm:basis-0">
          <span className="sr-only">Search players</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players"
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div role="group" aria-label="Sort players" className="flex gap-1">
          {(
            [
              ["sessions", "Most sessions"],
              ["noShows", "Most no-shows"],
              ["name", "A–Z"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={sort === id}
              onClick={() => setSort(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sort === id ? "bg-selected text-selected-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <Empty title="No players match" body={`Nobody called “${search}” played in this period.`} />
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((r) => (
            <li key={r.playerId} className="flex items-start gap-3 px-5 py-3 sm:items-center">
              <Avatar name={r.name} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-[13px] tabular-nums text-muted-foreground">
                    {r.attended} attended
                    {r.unknown > 0 && <> · {r.unknown} not recorded</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.noShows > 0 && (
                    <span className="rounded-full bg-negative-bg px-2 py-0.5 text-xs font-semibold tabular-nums text-negative">
                      {r.noShows} {plural(r.noShows, ["no-show", "no-shows"])}
                    </span>
                  )}
                  <Tag tone="count">
                    {r.sessionsBooked} {plural(r.sessionsBooked, ["session", "sessions"])}
                  </Tag>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SessionList({ rows, timeZone }: { rows: SessionHeldRow[]; timeZone: string }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.sessionId} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{formatSessionTime(r.startsAt, timeZone)}</p>
            <p className="truncate font-semibold">{r.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              {r.attendanceRecorded ? (
                <>
                  <Tag tone="selected">Recorded</Tag>
                  <span className="tabular-nums">
                    {r.attended} came · {r.noShows} {plural(r.noShows ?? 0, ["no-show", "no-shows"])}
                  </span>
                </>
              ) : (
                <>
                  <Tag tone="neutral">Not recorded</Tag>
                  <span>No-shows unknown</span>
                </>
              )}
            </p>
          </div>
          <span className="shrink-0 text-right">
            <Tag tone="count">
              {r.booked}/{r.places}
            </Tag>
            <span className="mt-1 block text-[11px] text-muted-foreground">booked</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function NoShowList({ rows, timeZone }: { rows: NoShowRow[]; timeZone: string }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.bookingId} className="flex items-center gap-3 px-5 py-3">
          <Avatar name={r.playerName} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.playerName}</p>
            <p className="truncate text-[13px] text-muted-foreground">
              {r.sessionTitle} · <span className="text-primary">{formatSessionTime(r.startsAt, timeZone)}</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ title, body, warning }: { title: string; body: string; warning?: boolean }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      {warning && (
        <span className="mb-3 inline-flex size-11 items-center justify-center rounded-full bg-warning-bg text-warning">
          <AlertTriangle aria-hidden className="size-5" />
        </span>
      )}
      <p className="font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4 p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
