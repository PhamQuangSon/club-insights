/**
 * Builds db/club-insights.db from the CSV files in data-csv/.
 *   npm run seed            seed if the database is empty
 *   npm run seed -- --force drop the data and seed again
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DB_PATH } from "../lib/db";
import { clearData, createSchema, dataQualityReport, loadCsvData } from "../lib/seed";

const force = process.argv.includes("--force");
const dataDir = path.join(process.cwd(), "data-csv");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

createSchema(db);

const existing = db.prepare("SELECT COUNT(*) FROM clubs").pluck().get() as number;
if (existing > 0 && !force) {
  console.log(`[seed] ${path.relative(process.cwd(), DB_PATH)} already has data, skipping (use --force to reseed).`);
  process.exit(0);
}
if (force) clearData(db);

const counts = loadCsvData(db, dataDir);
console.log(
  `[seed] loaded ${counts.clubs} clubs, ${counts.players} players, ${counts.sessions} sessions, ${counts.bookings} bookings → ${path.relative(process.cwd(), DB_PATH)}`,
);
for (const note of dataQualityReport(db)) console.log(`[seed] note: ${note}`);
// Leave a single self-contained file (no -wal/-shm) so it can be opened read-only,
// e.g. on a read-only serverless filesystem.
db.pragma("journal_mode = DELETE");
db.close();
