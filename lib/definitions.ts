import type { MetricKey } from "./types";

export interface MetricCopy {
  label: string;
  /** One-line definition shown under the number, always visible. */
  definition: string;
  /** Unit for counts, singular / plural. */
  unit: [string, string];
}

/**
 * The single source of truth for what each number means. The API returns
 * `definition` with every metric so any client (web, mobile) shows the same words.
 */
export const METRIC_COPY: Record<MetricKey, MetricCopy> = {
  activePlayers: {
    label: "Active players",
    definition:
      "Different players with at least one confirmed booking at a session that went ahead. Someone who played five times counts once.",
    unit: ["player", "players"],
  },
  sessionsHeld: {
    label: "Sessions held",
    definition: "Sessions that went ahead in this period. Cancelled sessions are not counted.",
    unit: ["session", "sessions"],
  },
  noShows: {
    label: "No-shows",
    definition:
      "Confirmed bookings marked absent, counted only at sessions where attendance was taken. Elsewhere no-shows are unknown, not zero.",
    unit: ["no-show", "no-shows"],
  },
};
