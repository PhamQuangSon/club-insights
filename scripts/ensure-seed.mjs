// Runs before `dev` and `build`: seeds the SQLite database the first time,
// so `npm install && npm run dev` is all a reviewer needs.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.CLUB_INSIGHTS_DB ?? path.join(process.cwd(), "db", "club-insights.db");

if (fs.existsSync(dbPath)) process.exit(0);

console.log("[ensure-seed] no database yet, seeding from data-csv/ …");
const result = spawnSync("npx", ["tsx", "scripts/seed.ts"], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
