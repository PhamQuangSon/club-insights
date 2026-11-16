"use client";

import * as Popover from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { DayPicker, type DateRange as PickerRange } from "react-day-picker";
import "react-day-picker/style.css";
import { formatDateRange } from "@/lib/format";
import {
  localToday,
  matchPreset,
  presetRange,
  previousRange,
  weekEndOf,
  weekStartOfDate,
  type DataSpan,
  type DateRange,
  type RangePreset,
} from "@/lib/time";
import type { Club } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "last4w", label: "Last 4 weeks" },
  { id: "last12w", label: "Last 12 weeks" },
  { id: "all", label: "All time" },
];

// The picker only deals in calendar days; these helpers never touch time zones.
const toDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
};
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface Props {
  club: Club;
  range: DateRange;
  nowIso: string;
  onChange: (range: DateRange) => void;
}

export function RangePicker({ club, range, nowIso, onChange }: Props) {
  const span: DataSpan | null =
    club.firstSessionDate && club.lastSessionDate ? { first: club.firstSessionDate, last: club.lastSessionDate } : null;
  const active = matchPreset(range, nowIso, club.timeZone, span);
  const prev = previousRange(range);
  const wholeWeeks = weekStartOfDate(range.from) === range.from && weekEndOf(weekStartOfDate(range.to)) === range.to;

  return (
    <section aria-label="Date range" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Quick ranges" className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const r = presetRange(p.id, nowIso, club.timeZone, span);
            const selected = active === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!r}
                aria-pressed={selected}
                onClick={() => r && onChange(r)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition-colors sm:px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-selected bg-selected text-selected-foreground"
                    : "border-border bg-card text-foreground hover:border-primary",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <CustomRange range={range} today={localToday(nowIso, club.timeZone)} selected={active === null} onApply={onChange} />
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{formatDateRange(range)}</span>
        <span aria-hidden> · </span>compared with {formatDateRange(prev)}
        {!wholeWeeks && <span className="block sm:inline"><span aria-hidden className="hidden sm:inline"> · </span>Not whole weeks, so the first or last week on the chart is partial</span>}
      </p>
    </section>
  );
}

function CustomRange({
  range,
  today,
  selected,
  onApply,
}: {
  range: DateRange;
  today: string;
  selected: boolean;
  onApply: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickerRange | undefined>();

  const openChange = (next: boolean) => {
    if (next) setDraft({ from: toDate(range.from), to: toDate(range.to) });
    setOpen(next);
  };

  const canApply = Boolean(draft?.from && draft?.to);
  const wide = useMinWidth(640);

  return (
    <Popover.Root open={open} onOpenChange={openChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-pressed={selected}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors sm:px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selected
              ? "border-selected bg-selected text-selected-foreground"
              : "border-border bg-card text-foreground hover:border-primary",
          )}
        >
          <CalendarDays aria-hidden className="size-4" />
          {selected ? formatDateRange(range) : "Custom"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[calc(100vw-2rem)] max-w-max rounded-xl border border-border bg-card p-4 shadow-lg focus:outline-none"
        >
          <DayPicker
            mode="range"
            weekStartsOn={1}
            numberOfMonths={wide ? 2 : 1}
            defaultMonth={draft?.from}
            selected={draft}
            onSelect={setDraft}
            disabled={{ after: toDate(today) }}
            endMonth={toDate(today)}
            className="club-calendar"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {draft?.from && draft?.to
                ? formatDateRange({ from: toIso(draft.from), to: toIso(draft.to) })
                : "Pick a first and last day"}
              <span aria-hidden> · </span>Weeks run Mon–Sun
            </p>
            <div className="flex gap-2">
              <Popover.Close className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Cancel
              </Popover.Close>
              <button
                type="button"
                disabled={!canApply}
                onClick={() => {
                  if (!draft?.from || !draft.to) return;
                  onApply({ from: toIso(draft.from), to: toIso(draft.to) });
                  setOpen(false);
                }}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function useMinWidth(px: number): boolean {
  const [matches, setMatches] = useState(true);
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${px}px)`);
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [px]);
  return matches;
}
