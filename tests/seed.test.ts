import path from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { createSchema, loadCsvData } from "@/lib/seed";

describe("seed from data-csv/", () => {
  const db = new Database(":memory:");
  const one = (sql: string) => db.prepare(sql).pluck().get();

  beforeAll(() => {
    createSchema(db);
    loadCsvData(db, path.join(process.cwd(), "data-csv"));
  });

  it("loads every row", () => {
    expect(one("SELECT COUNT(*) FROM clubs")).toBe(2);
    expect(one("SELECT COUNT(*) FROM players")).toBe(260);
    expect(one("SELECT COUNT(*) FROM sessions")).toBe(195);
    expect(one("SELECT COUNT(*) FROM bookings")).toBe(1893);
  });

  it("keeps unknown attendance as NULL instead of turning it into a no-show", () => {
    expect(one("SELECT COUNT(*) FROM bookings WHERE attended IS NULL")).toBe(894);
    expect(one("SELECT COUNT(*) FROM bookings WHERE attended = 0")).toBe(86);
    expect(one("SELECT COUNT(*) FROM bookings WHERE status = 'cancelled' AND attended IS NOT NULL")).toBe(0);
  });

  it("stores the attendance flag and local week per session", () => {
    expect(one("SELECT COUNT(*) FROM sessions WHERE attendance_recorded = 1")).toBe(104);
    expect(one("SELECT week_start_local FROM sessions WHERE id = 's0001'")).toBe("2026-01-05");
    expect(one("SELECT COUNT(DISTINCT week_start_local) FROM sessions WHERE status = 'scheduled'")).toBe(39);
  });

  it("leaves the new club empty", () => {
    expect(one("SELECT COUNT(*) FROM sessions WHERE club_id = 'club-002'")).toBe(0);
  });
});
