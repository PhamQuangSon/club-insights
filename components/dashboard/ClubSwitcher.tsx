"use client";

import { ChevronDown } from "lucide-react";
import type { Club } from "@/lib/types";

interface Props {
  clubs: Club[];
  value: string;
  onChange: (id: string) => void;
}

/** A native select: keyboard and screen-reader friendly, and the best picker on phones. */
export function ClubSwitcher({ clubs, value, onChange }: Props) {
  return (
    <label className="relative inline-flex min-w-0 items-center">
      <span className="sr-only">Club</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 max-w-[16rem] cursor-pointer appearance-none truncate rounded-full border border-border bg-card py-2 pl-4 pr-9 text-sm font-semibold shadow-sm transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {clubs.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
    </label>
  );
}
