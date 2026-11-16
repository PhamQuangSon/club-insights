import { describe, expect, it } from "vitest";
import {
  HCM,
  NOW_ISO,
  defaultRange,
  getWeekStart,
  matchPreset,
  normalizeUtcIso,
  presetRange,
  previousRange,
  rangeLengthDays,
  rangeToUtcBounds,
  toLocalDate,
  weeksInRange,
} from "@/lib/time";

describe("getWeekStart (Monday–Sunday weeks in the club's zone)", () => {
  it("puts the real Sunday-22:30-UTC 'Early Bird Monday' session in the Monday week", () => {
    // s0001: Sunday 4 Jan 22:30 UTC = Monday 5 Jan 05:30 in Ho Chi Minh City.
    expect(getWeekStart("2026-01-04T22:30:00Z", HCM)).toBe("2026-01-05");
    expect(toLocalDate("2026-01-04T22:30:00Z", HCM)).toBe("2026-01-05");
  });

  it("splits weeks exactly at local midnight Sunday→Monday (17:00 UTC)", () => {
    expect(getWeekStart("2026-01-04T16:59:59Z", HCM)).toBe("2025-12-29"); // Sun 23:59:59 local
    expect(getWeekStart("2026-01-04T17:00:00Z", HCM)).toBe("2026-01-05"); // Mon 00:00 local
  });

  it("keeps a Sunday-evening local session in its own week", () => {
    // s0195: Sunday 4 Oct 18:00 local
    expect(getWeekStart("2026-10-04T11:00:00Z", HCM)).toBe("2026-09-28");
  });

  it("would differ from naive UTC bucketing (guards against regressions)", () => {
    const utcWeek = getWeekStart("2026-01-04T22:30:00Z", "utc");
    expect(utcWeek).toBe("2025-12-29");
    expect(getWeekStart("2026-01-04T22:30:00Z", HCM)).not.toBe(utcWeek);
  });
});

describe("rangeToUtcBounds", () => {
  it("converts an inclusive local range to [start, end) in UTC", () => {
    expect(rangeToUtcBounds({ from: "2026-01-05", to: "2026-01-11" }, HCM)).toEqual({
      start: "2026-01-04T17:00:00Z",
      end: "2026-01-11T17:00:00Z",
    });
  });

  it("rejects malformed dates", () => {
    expect(() => rangeToUtcBounds({ from: "2026-1-5", to: "2026-01-11" }, HCM)).toThrow();
    expect(() => rangeToUtcBounds({ from: "2026-02-30", to: "2026-03-01" }, HCM)).toThrow();
  });
});

describe("normalizeUtcIso", () => {
  it("produces one canonical format so string comparison is time order", () => {
    expect(normalizeUtcIso("2026-01-04T22:30:00Z")).toBe("2026-01-04T22:30:00Z");
    expect(normalizeUtcIso("2026-01-04T22:30:00.000Z")).toBe("2026-01-04T22:30:00Z");
    expect(normalizeUtcIso("2026-01-05T05:30:00+07:00")).toBe("2026-01-04T22:30:00Z");
  });
});

describe("previousRange", () => {
  it("is the same length and ends the day before", () => {
    expect(previousRange({ from: "2026-07-13", to: "2026-10-04" })).toEqual({ from: "2026-04-20", to: "2026-07-12" });
    expect(previousRange({ from: "2026-01-12", to: "2026-01-18" })).toEqual({ from: "2026-01-05", to: "2026-01-11" });
  });

  it("handles odd-length ranges and single days", () => {
    expect(previousRange({ from: "2026-03-10", to: "2026-03-12" })).toEqual({ from: "2026-03-07", to: "2026-03-09" });
    expect(previousRange({ from: "2026-03-01", to: "2026-03-01" })).toEqual({ from: "2026-02-28", to: "2026-02-28" });
  });

  it("keeps the length equal", () => {
    const range = { from: "2026-02-01", to: "2026-03-31" };
    expect(rangeLengthDays(previousRange(range))).toBe(rangeLengthDays(range));
  });
});

describe("default range and presets", () => {
  const span = { first: "2026-01-05", last: "2026-10-04" };

  it("defaults to the last 12 full weeks before now", () => {
    expect(defaultRange(NOW_ISO, HCM)).toEqual({ from: "2026-07-13", to: "2026-10-04" });
  });

  it("resolves presets to whole weeks", () => {
    expect(presetRange("last4w", NOW_ISO, HCM, span)).toEqual({ from: "2026-09-07", to: "2026-10-04" });
    expect(presetRange("all", NOW_ISO, HCM, span)).toEqual({ from: "2026-01-05", to: "2026-10-04" });
    expect(presetRange("all", NOW_ISO, HCM, null)).toBeNull();
  });

  it("recognises which preset a range is", () => {
    expect(matchPreset({ from: "2026-07-13", to: "2026-10-04" }, NOW_ISO, HCM, span)).toBe("last12w");
    expect(matchPreset({ from: "2026-07-14", to: "2026-10-04" }, NOW_ISO, HCM, span)).toBeNull();
  });
});

describe("weeksInRange", () => {
  it("lists every overlapping week and flags partial edges", () => {
    const weeks = weeksInRange({ from: "2026-07-15", to: "2026-07-26" });
    expect(weeks).toEqual([
      { weekStart: "2026-07-13", weekEnd: "2026-07-19", partial: true },
      { weekStart: "2026-07-20", weekEnd: "2026-07-26", partial: false },
    ]);
  });

  it("returns 12 full weeks for the default range", () => {
    const weeks = weeksInRange(defaultRange(NOW_ISO, HCM));
    expect(weeks).toHaveLength(12);
    expect(weeks.every((w) => !w.partial)).toBe(true);
  });
});
