import path from "node:path";
import Database from "better-sqlite3";

export const DB_PATH = process.env.CLUB_INSIGHTS_DB ?? path.join(process.cwd(), "db", "club-insights.db");

const globalForDb = globalThis as unknown as { __clubInsightsDb?: Database.Database };

/**
 * Shared read-only connection for API route handlers.
 * Cached on globalThis so dev-mode hot reloads don't leak connections.
 * Only `app/api/**` may import this module.
 */
export function getDb(): Database.Database {
  if (!globalForDb.__clubInsightsDb) {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    db.pragma("foreign_keys = ON");
    globalForDb.__clubInsightsDb = db;
  }
  return globalForDb.__clubInsightsDb;
}
