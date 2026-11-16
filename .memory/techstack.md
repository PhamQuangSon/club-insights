# Tech Stack

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | **Next.js 15.5** App Router + React 19 + **TypeScript 5.9** strict (`noUncheckedIndexedAccess`) | `params` trong route handler là Promise, phải `await`. Không dùng TS 7 (Next chưa hỗ trợ) |
| API | Next.js Route Handlers (`app/api/**/route.ts`) | Đề cho phép, nhanh hơn dựng server riêng |
| DB | **SQLite** + `better-sqlite3` 12 (đồng bộ, đơn giản) | File `db/club-insights.db` (gitignored). Bật WAL, `foreign_keys=ON`. Cần `serverExternalPackages: ['better-sqlite3']` trong next.config |
| Seed | `tsx scripts/seed.ts` + `papaparse` | Đọc từ `data-csv/` |
| Time | **Luxon** | Tuần ISO bắt đầu Thứ Hai. `setZone(club.time_zone).startOf('week')` |
| Validation | **zod 4** | Query params của API |
| Data fetching (client) | **SWR** | `keepPreviousData` để không nhấp nháy khi đổi range |
| UI | **Tailwind CSS 3.4** + component kiểu shadcn tự viết trên **Radix** (`react-dialog` cho sheet, `react-popover`) + `react-day-picker` + `lucide-react`. Theme theo `design-system.md`, font Inter (`next/font/google`) | Không dùng shadcn CLI (cần tương tác). Token HSL map trong `tailwind.config.ts` |
| Chart | **Recharts 3** | Bar cho kỳ hiện tại, line hoặc ghost bar cho kỳ trước |
| Test | **Vitest 4** | Unit test cho hàm thuần, integration test cho query trên DB in-memory |

## Cấu trúc thư mục dự kiến

```
app/
  layout.tsx, page.tsx            # page redirect hoặc render DashboardClient
  api/clubs/route.ts
  api/clubs/[id]/summary/route.ts
  api/clubs/[id]/weekly/route.ts
  api/clubs/[id]/drilldown/route.ts
components/
  DashboardClient.tsx  ClubSwitcher.tsx  DateRangePicker.tsx
  MetricCard.tsx  WeeklyChart.tsx  DrilldownSheet.tsx  EmptyState.tsx
  ui/                             # shadcn
lib/
  time.ts      # NOW_ISO, getWeekStart, rangeToUtcBounds, previousRange, presets
  types.ts
  db.ts        # singleton better-sqlite3
  metrics.ts   # hàm thuần (in-memory) cho test
  queries.ts   # SQL builder dùng chung cho summary, weekly, drilldown
  definitions.ts  # text định nghĩa của các metric
scripts/
  seed.ts  ensure-seed.mjs
tests/
  time.test.ts  metrics.test.ts  queries.test.ts
data-csv/      # CSV gốc, không sửa
```

## Schema SQLite

```sql
clubs(id TEXT PK, name, time_zone, created_at)
players(id TEXT PK, club_id FK, name, joined_club_at)
sessions(id TEXT PK, club_id FK, title, starts_at TEXT /*UTC ISO*/, duration_minutes INT,
         places INT, status TEXT /*scheduled|cancelled*/, attendance_recorded INT /*0|1*/,
         week_start_local TEXT /*YYYY-MM-DD, Thứ Hai theo giờ club*/,
         date_local TEXT /*YYYY-MM-DD theo giờ club*/)
bookings(id TEXT PK, session_id FK, player_id FK, booked_at, status /*booked|cancelled*/,
         cancelled_at, attended INT NULL /*1|0|NULL, giữ nguyên NULL*/)
INDEX sessions(club_id, starts_at); sessions(club_id, week_start_local);
INDEX bookings(session_id); bookings(player_id)
```

## Scripts trong package.json

`dev` (có `predev` chạy `node scripts/ensure-seed.mjs`), `build` (có `prebuild` seed), `start`, `test`, `test:watch`, `seed`, `typecheck`. Không có `lint` (chưa cài ESLint, ghi ở Next steps).
