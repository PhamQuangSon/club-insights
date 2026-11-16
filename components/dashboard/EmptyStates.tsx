import { CalendarX2, ClipboardCheck, Sparkles } from "lucide-react";
import { METRIC_COPY } from "@/lib/definitions";
import { daysAgo, formatDateRange } from "@/lib/format";
import { METRICS, type Club } from "@/lib/types";
import type { DateRange } from "@/lib/time";

/** A club with no sessions yet: explain what the page will show and how to make the numbers trustworthy. */
export function NewClubEmpty({ club, nowIso, example, onSeeExample }: {
  club: Club;
  nowIso: string;
  example?: Club;
  onSeeExample: (id: string) => void;
}) {
  const age = daysAgo(club.createdAt, nowIso, club.timeZone);
  return (
    <section aria-labelledby="new-club-title" className="rounded-xl border border-border bg-card p-6 md:p-10">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-warning-bg text-warning">
          <Sparkles aria-hidden className="size-6" />
        </span>
        <h2 id="new-club-title" className="mt-4 text-xl font-extrabold tracking-tight md:text-2xl">
          {club.name} is just getting started
        </h2>
        <p className="mt-2 text-muted-foreground">
          The club was created {age <= 0 ? "today" : age === 1 ? "yesterday" : `${age} days ago`} and hasn&apos;t held a
          session yet. It&apos;s almost game time! After the first session goes ahead, this page will show:
        </p>
      </div>

      <ul className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
        {METRICS.map((m) => (
          <li key={m} className="rounded-xl border border-dashed border-border bg-background p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{METRIC_COPY[m].label}</p>
            <p aria-hidden className="mt-2 text-[32px] font-extrabold leading-none text-pill-inactive">—</p>
            <p className="mt-3 text-sm leading-snug text-muted-foreground">{METRIC_COPY[m].definition}</p>
          </li>
        ))}
      </ul>

      <div className="mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-xl bg-positive-bg p-4 text-sm">
        <ClipboardCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-positive" />
        <p>
          <span className="font-semibold">Tip: take attendance at every session.</span> No-shows can only be counted where
          attendance was taken. Everywhere else they show as unknown.
        </p>
      </div>

      {example && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => onSeeExample(example.id)}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            See an example: {example.name}
          </button>
        </div>
      )}
    </section>
  );
}

/** A club with data, but nothing went ahead in the selected range. */
export function EmptyRange({ club, range, onReset }: { club: Club; range: DateRange; onReset: () => void }) {
  const span =
    club.firstSessionDate && club.lastSessionDate
      ? formatDateRange({ from: club.firstSessionDate, to: club.lastSessionDate })
      : null;
  return (
    <section className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-primary">
        <CalendarX2 aria-hidden className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-bold">No sessions went ahead in {formatDateRange(range)}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {span ? `This club's sessions so far run from ${span}.` : "This club hasn't held a session yet."} Pick another
        range to see players, sessions and no-shows.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Show the last 12 weeks
      </button>
    </section>
  );
}
