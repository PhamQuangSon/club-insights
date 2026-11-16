import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatCount, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  delta: number | null;
  deltaPct: number | null;
  previous: number | null;
  /** Whether an increase is good news (players, sessions) or bad news (no-shows). */
  upIsGood: boolean;
}

/** Change vs the previous period. Colour = direction × whether up is good, always with an arrow and words. */
export function Delta({ delta, deltaPct, previous, upIsGood }: Props) {
  if (delta === null || previous === null) {
    return <Pill tone="neutral" icon={<Minus aria-hidden className="size-3.5" />} text="No comparison" />;
  }
  if (delta === 0) {
    return <Pill tone="neutral" icon={<Minus aria-hidden className="size-3.5" />} text="No change" />;
  }
  const up = delta > 0;
  const good = up === upIsGood;
  const amount = `${up ? "+" : "−"}${formatCount(Math.abs(delta))}`;
  return (
    <Pill
      tone={good ? "positive" : "negative"}
      icon={up ? <ArrowUp aria-hidden className="size-3.5" /> : <ArrowDown aria-hidden className="size-3.5" />}
      text={deltaPct === null ? `${amount} · new` : `${amount} · ${formatPct(deltaPct, true)}`}
      label={`${up ? "Up" : "Down"} ${formatCount(Math.abs(delta))}${deltaPct === null ? "" : ` (${formatPct(deltaPct)})`}, ${good ? "good" : "worse"} than before`}
    />
  );
}

function Pill({
  tone,
  icon,
  text,
  label,
}: {
  tone: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  text: string;
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-semibold tabular-nums",
        tone === "positive" && "bg-positive-bg text-positive",
        tone === "negative" && "bg-negative-bg text-negative",
        tone === "neutral" && "bg-neutral-tag text-muted-foreground",
      )}
    >
      {icon}
      {text}
    </span>
  );
}
