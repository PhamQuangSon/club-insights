# Progress

> Cập nhật file này sau mỗi phase: đánh `[x]`, ghi ngày và các ghi chú hoặc quyết định mới. Phase đang làm đánh dấu 👉.

## Trạng thái hiện tại

- **Phase hiện tại:** 👉 Phase 8 (DateRangePicker + presets)
- **Cập nhật lần cuối:** 2026-11-16
- **Đã có:** đề PDF, `data-csv/` (4 CSV), các file phân tích cũ (`phan-tich.md`, `ke-hoach-phase.md`, có chỗ đã lỗi thời so với data thật), `.claude/CLAUDE.md`, `.memory/`.
- **Blockers:** chưa có.

## Các phase

- [x] **Phase 0: Phân tích & setup bộ nhớ** (2026-11-16)
  - Xây dựng design system → `.memory/design-system.md` (token, typography, component pattern, checklist consistency).
  - Đối chiếu dữ liệu thật với các file phân tích cũ, phát hiện 6 chỗ sai (xem `project-brief.md` §4). Tạo `.claude/CLAUDE.md` và `.memory/`.

- [x] **Phase 1: Scaffold** (2026-11-16)
  - Next.js + TS strict + Tailwind + shadcn/ui + Recharts + SWR + better-sqlite3 + papaparse + luxon + zod + vitest + tsx.
  - `.gitignore` (gồm `db/*.db*`, `.DS_Store`). Path alias `@/*`.
  - Inter qua `next/font`, token trong `globals.css` theo `design-system.md` §2, màu `brand-*` trong Tailwind config.
  - **DoD:** `npm install && npm run dev` mở được trang. `npm test` chạy được. `npx tsc --noEmit` sạch. ✅ (dev → HTTP 200, 1 smoke test pass, tsc sạch)

- [x] **Phase 2: `lib/time.ts` + `lib/types.ts` + test (TDD)** (2026-11-16, 15 test pass)
  - `NOW_ISO`, `getWeekStart(utcIso, tz)`, `toLocalDate`, `rangeToUtcBounds(from, to, tz)`, `previousRange(from, to)`, `defaultRange(nowIso, tz)`, `presetRange(...)`.
  - **DoD (test bắt buộc):**
    - `getWeekStart('2026-01-04T22:30:00Z', HCM) === '2026-01-05'` (session Early Bird thật, s0001)
    - `getWeekStart('2026-01-04T16:59:59Z', HCM) === '2025-12-29'`, `getWeekStart('2026-01-04T17:00:00Z', HCM) === '2026-01-05'`
    - `rangeToUtcBounds('2026-01-05','2026-01-11', HCM)` → `start '2026-01-04T17:00:00Z'`, `end '2026-01-11T17:00:00Z'` (format canonical, không mili-giây)
    - `previousRange('2026-07-13','2026-10-04')` → `{ from: '2026-04-20', to: '2026-07-12' }`
    - `defaultRange(NOW_ISO, HCM)` → `{ from: '2026-07-13', to: '2026-10-04' }`

- [x] **Phase 3: DB schema + seed** (2026-11-16, DoD khớp toàn bộ, 4 test seed)
  - Tính `week_start_local` và `date_local` bằng hàm của Phase 2, theo `time_zone` của từng club. `attended` rỗng → NULL. Idempotent, có `--force`. `ensure-seed.mjs` dùng cho `predev`.
  - **DoD:** log ra 2 clubs / 260 players / 195 sessions / 1893 bookings.
    - `SELECT COUNT(*) FROM bookings WHERE attended IS NULL` = **894** (734 booked + 160 cancelled)
    - `SELECT COUNT(*) FROM sessions WHERE attendance_recorded=1` = **104**
    - Mọi `week_start_local` đều là Thứ Hai. Có đúng 39 tuần có session scheduled.

- [x] **Phase 4: `lib/metrics.ts` (hàm thuần) + test**: đây là test chính "con số dễ sai nhất"
  - Fixture: A (đã ghi điểm danh, T/F/F → 2 no-show), B (`attendance_recorded=false`, attended null → không tính, không phải 0), C (có 1 booking cancelled → không phải no-show), D (session cancelled → bị loại hoàn toàn), E (session Early Bird CN 22:30 UTC → thuộc tuần sau).
  - **DoD:** test pass, có case "coverage = 0 → noShows null". ✅ (2026-11-16, 12 test metric, tổng 31)

- [x] **Phase 5: `lib/queries.ts` (SQL, WHERE dùng chung) + test integration**
  - `getSummary`, `getWeeklySeries`, `getDrilldown`, `getClubs`.
  - **DoD:** test vitest chạy trên DB đã seed, assert `summary.X.current === drilldown(X).total` cho cả 3 metric với range mặc định và range all-data. Đối chiếu số với kết quả tính bằng Python/CSV. ✅ (2026-11-16, 18 test integration, tổng 49)

- [x] **Phase 6: API routes** (zod, 400/404, force-dynamic, contract đúng như `rules.md` §14)
  - **DoD:** `curl` thử 4 endpoint, kèm 1 case 400 và 1 case 404. ✅ (2026-11-16: 200 ×6, 400 ×6 kiểu lỗi, 404)

- [x] **Phase 7: App shell + ClubSwitcher** (URL state `?club&from&to`) (2026-11-16: đổi club giữ range, 375px không tràn)
- [ ] 👉 **Phase 8: DateRangePicker + presets** (Last 4w / 12w / All / Custom, hiển thị cả range của kỳ trước)
- [ ] **Phase 9: MetricCards** (định nghĩa luôn hiện, delta tô màu theo ngữ nghĩa, coverage của no-shows). **Phase cần review UI kỹ nhất.**
- [ ] **Phase 10: WeeklyChart** (active players, so sánh với kỳ trước, đánh dấu tuần partial, tooltip theo giờ HCM)
- [ ] **Phase 11: DrilldownSheet** (số dòng bằng số trên card, bảng riêng cho từng metric, badge attendance)
- [ ] **Phase 12: Empty states + polish** (club-002, range rỗng, Retry khi lỗi, responsive 375/768/1280)
- [ ] **Phase 13: README + final QA** (clone sạch → install → dev chạy được, test pass, tsc sạch)

## Nhật ký

| Ngày | Phase | Ghi chú |
|---|---|---|
| 2026-11-16 | 0 | Đã phân tích đề và dữ liệu, tạo bộ nhớ dự án. |
| 2026-11-16 | 0 | Chốt design system: Inter, primary `#3336FD`, nền `#F4F8FF`, xanh lá = đang chọn, vàng = badge x/y. |
| 2026-11-16 | 0 | Repo public → xoá mọi nhắc tới tên công ty, gitignore PDF đề bài. |
| 2026-11-16 | 1 | Scaffold: Next 15.5, TS 5.9, Tailwind 3.4 + token, Radix, vitest. Hạ TS 7 → 5 vì Next chưa hỗ trợ. |
| 2026-11-16 | 2 | `lib/time.ts` (week bucketing, bounds, previous range, presets, weeksInRange) + `lib/types.ts` (API contract). Chốt format UTC không mili-giây để so sánh chuỗi an toàn. |
| 2026-11-16 | 3 | Logic seed nằm trong `lib/seed.ts` (để test dùng lại), CLI `scripts/seed.ts`, `ensure-seed.mjs` chạy ở predev/prebuild. DB API mở readonly. Seed log ghi chú chất lượng data (36 booking trước joined_club_at). |
| 2026-11-16 | 4 | `lib/metrics.ts` là reference implementation; `lib/definitions.ts` là text định nghĩa. Thêm case: điểm danh thiếu dấu, mark lạc ở session không ghi, session đúng `now`. |
| 2026-11-16 | 5 | WHERE dùng chung (HELD/CONFIRMED/MARKED/NO_SHOW). Weekly GROUP BY `week_start_local`, tuần so sánh = lùi đúng độ dài kỳ. Số kiểm tra: mặc định 180 players / 60 sessions / 40 no-shows (33/60 có điểm danh); tuần Tết 16/02 no-shows = null. |
| 2026-11-16 | 6 | `from`/`to` không bắt buộc (mặc định 12 tuần), tối đa 731 ngày. `/api/clubs` trả thêm `now`. Sửa lỗi: zod 4 vẫn chạy object refine khi field lỗi → guard bằng `bothValid`. |
| 2026-11-16 | 7 | Header + ClubSwitcher (native select cho mobile/a11y), `useDashboardUrl`, `lib/format.ts`, `lib/fetcher.ts`. QA bằng puppeteer-core trong `.qa/` (gitignored) vì Chrome headless CLI có width tối thiểu 500px. |
