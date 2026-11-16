import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  /** The big number, already formatted. */
  value: string;
  /** True when the value is unknown rather than a count. */
  unknown?: boolean;
  delta: React.ReactNode;
  comparison: string;
  definition: string;
  /** Extra context under the number (coverage, rate…). */
  children?: React.ReactNode;
  cta: string;
  onOpen: () => void;
}

/** One headline number. The whole card is a button that opens the rows behind it. */
export function MetricCard({ label, value, unknown, delta, comparison, definition, children, cta, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </span>

      <span
        className={cn(
          "mt-2 text-[32px] font-extrabold leading-none tracking-tight md:text-[40px]",
          unknown && "text-muted-foreground",
        )}
      >
        {value}
      </span>

      <span className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
        {delta}
        <span>{comparison}</span>
      </span>

      {children && <span className="mt-3 flex flex-col gap-2">{children}</span>}

      <span className="mt-4 border-t border-dashed border-border pt-3 text-sm leading-snug text-muted-foreground">
        {definition}
      </span>

      <span className="mt-auto pt-3 text-sm font-semibold text-primary">
        {cta} <span aria-hidden>→</span>
      </span>
    </button>
  );
}
