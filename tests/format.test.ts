import { describe, expect, it } from "vitest";
import { daysAgo, describeZone, formatDateRange, formatPct, formatSessionTime, initials } from "@/lib/format";
import { HCM, NOW_ISO } from "@/lib/time";

describe("format", () => {
  it("formats ranges compactly in the club's calendar", () => {
    expect(formatDateRange({ from: "2026-07-13", to: "2026-10-04" })).toBe("13 Jul – 4 Oct 2026");
    expect(formatDateRange({ from: "2025-12-29", to: "2026-01-04" })).toBe("29 Dec 2025 – 4 Jan 2026");
    expect(formatDateRange({ from: "2026-03-02", to: "2026-03-08" })).toBe("2 – 8 Mar 2026");
  });

  it("shows session times in the club's zone, never UTC", () => {
    expect(formatSessionTime("2026-01-04T22:30:00Z", HCM)).toBe("Mon, Jan 5 @5:30 AM");
  });

  it("describes the zone and age of a club", () => {
    expect(describeZone(HCM, NOW_ISO)).toEqual({ city: "Ho Chi Minh City", offset: "UTC+7" });
    expect(daysAgo("2026-10-01", NOW_ISO, HCM)).toBe(4);
  });

  it("formats percentages and initials", () => {
    expect(formatPct(0.7307, true)).toBe("+73%");
    expect(formatPct(-0.052, true)).toBe("−5.2%");
    expect(formatPct(0.0941)).toBe("9.4%");
    expect(initials("Thảo Điền Tennis Club")).toBe("TĐ");
  });
});
