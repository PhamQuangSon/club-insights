# Project Brief: Club Insights

## 1. Đề bài (rút gọn từ PDF)

**Mục tiêu:** dashboard cho host thấy club đang hoạt động thế nào. Không có mockup, việc thiết kế màn hình là phần được chấm kỹ nhất: host có **hiểu** và **tin** các con số không.

**Bối cảnh:** một app thể thao cộng đồng. Người chơi tìm session, book chỗ, đến chơi. Host tổ chức session hằng tuần và muốn biết hai điều: có nhiều người chơi hơn không, và ai không đến.

**Phải build:**
- Với một date range do host chọn, **so với kỳ liền trước**, hiển thị: **active players**, **sessions held**, **no-shows**.
- Một trong ba số đó hiển thị **theo tuần dạng chart**.
- **Mở (click) một số** để xem các session hoặc player đứng sau con số đó.

**Luật:**
- Mình tự định nghĩa từng số và **hiển thị định nghĩa trên màn hình, ngay cạnh con số**.
- Tuần tính từ **Thứ Hai đến Chủ nhật theo timezone của club**.
- Attendance chỉ được ghi ở một số session. Ở session không ghi, no-shows là **unknown, không phải 0**.
- Club mới chưa có data cũng phải có một trang hữu ích.

**Ràng buộc:** TypeScript + Next.js (route handlers). SQLite, seed từ CSV. **UI gọi DB qua JSON API** vì app mobile sẽ dùng chung API đó. Không có login, chỉ có switcher giữa 2 club. Thiết kế cho laptop nhưng không được vỡ trên điện thoại. Được dùng AI và component library, miễn là giải thích được mọi phần.

**Phải nộp:** git repo chạy được bằng **một lệnh sau khi install**; README ngắn (cách chạy, các quyết định ở chỗ đề không nói, hướng làm tiếp); **ít nhất một automated test cho con số dễ sai nhất**.

**"Now" = Thứ Hai 05/10/2026 09:00 giờ HCM = `2026-10-05T02:00:00Z`.**

## 2. Checklist yêu cầu

| # | Yêu cầu | Cách đáp ứng |
|---|---|---|
| R1 | 3 metric và so sánh với kỳ trước | `GET /api/clubs/:id/summary` → 3 MetricCard có delta |
| R2 | Chart theo tuần | Active players mỗi tuần, có kỳ trước để so |
| R3 | Drill-down | Sheet trượt từ phải, số dòng **bằng đúng** con số trên card |
| R4 | Định nghĩa nằm cạnh số | Caption luôn hiện dưới số, không giấu trong tooltip |
| R5 | Tuần Mon–Sun theo giờ club | `week_start_local` tính lúc seed bằng Luxon theo `clubs.time_zone` |
| R6 | No-show không biết thì không được thành 0 | Chỉ đếm ở session có `attendance_recorded=true`, kèm hiển thị coverage |
| R7 | Club mới có trang hữu ích | Empty state riêng, không hiện "0 0 0" |
| R8 | Đi qua JSON API | Client component dùng SWR gọi `/api/*`. Server component không query DB |
| R9 | Switcher 2 club | Dropdown trên header, state lưu trong URL `?club=` |
| R10 | Responsive | Kiểm tra ở 375 / 768 / 1280, body không scroll ngang |
| R11 | Một lệnh chạy | `npm run dev` có `predev` tự seed |
| R12 | README + test | Vitest cho no-shows và cách chia tuần |

## 3. Định nghĩa metric (đã chốt)

Nguồn sự thật cho text: `lib/definitions.ts`. Nguồn sự thật cho logic: `lib/metrics.ts` (SQL phải khớp). "Held" = `status='scheduled'` AND trong range AND `starts_at <= now`.

Range `[from, to]` là ngày theo giờ club, tính cả hai đầu. Đổi sang UTC thành `[startUtc, endUtcExclusive)`. Mọi metric chỉ xét session thuộc club đó có `starts_at` nằm trong range.

| Metric | Text hiển thị trên UI (EN) | Công thức |
|---|---|---|
| **Active players** | "Different players with at least one confirmed booking at a session that went ahead. Someone who played five times counts once." | `COUNT(DISTINCT b.player_id)` WHERE `b.status='booked'` AND `s.status='scheduled'` AND `s.starts_at <= now` |
| **Sessions held** | "Sessions that went ahead in this period. Cancelled sessions are not counted." | `COUNT(*)` WHERE `s.status='scheduled'` AND `s.starts_at <= now` |
| **No-shows** | "Confirmed bookings marked absent, counted only at sessions where attendance was taken. Elsewhere no-shows are unknown, not zero." | `COUNT(*)` WHERE `b.status='booked'` AND `b.attended=0` AND `s.attendance_recorded=1` AND session held. `null` nếu không có session held nào có điểm danh |

**Lý do:**
- Active players đếm theo **booking**, không theo attendance, vì 91/195 session không ghi điểm danh. Đếm theo attendance sẽ thiếu nghiêm trọng.
- No-shows luôn đi kèm **coverage** (X/Y session held có ghi điểm danh) và **no-show rate** = no-shows / số booking confirmed **có dấu điểm danh** (booking thiếu dấu ở session có điểm danh tính là unknown, không vào mẫu số). Lý do là số tuyệt đối thay đổi theo coverage. Khi X = 0 thì hiển thị "Unknown" (không hiện 0) kèm badge cảnh báo.
- Khi so với kỳ trước, nếu coverage hai kỳ chênh lệch nhiều thì ghi chú để host không đọc nhầm xu hướng.
- **Kỳ trước** = cùng số ngày, kết thúc ngay trước ngày `from`. UI hiển thị rõ ngày của kỳ trước.

## 4. Dữ liệu thật (đã kiểm tra ngày 16/11/2026, **không đoán lại**)

**Schema CSV (nằm trong `data-csv/`):**
```
clubs.csv    club_id,name,time_zone,created_at
players.csv  player_id,club_id,name,joined_club_at
sessions.csv session_id,club_id,title,starts_at,duration_minutes,places,status,attendance_recorded
bookings.csv booking_id,session_id,player_id,booked_at,status,cancelled_at,attended
```

**Số dòng:** 2 clubs, 260 players, 195 sessions, 1893 bookings.
- `club-001` Saigon Smash Pickleball, tạo ngày 2025-12-01, giữ toàn bộ data.
- `club-002` Thảo Điền Tennis Club, tạo ngày **2026-10-01**: 0 player, 0 session, 0 booking.

**Sessions:**
- 186 `scheduled`, 9 `cancelled`. Cả 9 session cancelled đều không có booking nào: s0029–s0034 (Tết, tháng 2), s0049, s0093, s0133.
- `attendance_recorded`: 104 true, 91 false.
- Khoảng thời gian: 2026-01-04T22:30Z đến 2026-10-04T11:00Z, đủ **39 tuần** (tuần đầu bắt đầu T2 05/01, tuần cuối bắt đầu T2 28/09). Không có session nào sau "now".
- 5 khung cố định mỗi tuần: Early Bird Monday, Tuesday Open Play, Thursday Drills & Games, Saturday Morning Social, Sunday Ladder.
- Các tuần có ít hơn 5 session held: 09/02 (3), 16/02 (1), 09/03 (4), 11/05 (4), 06/07 (4).

**Bookings:**
- `booked`: 1733 dòng, chia ra true 913 / false 86 / rỗng 734. `cancelled`: 160 dòng, `attended` luôn rỗng.
- Session có `attendance_recorded=true` thì mọi booking `booked` đều có true/false. Session có `false` thì `attended` luôn rỗng. **Không có trường hợp ghi điểm danh một phần**, nhưng code vẫn phải phòng thủ.
- Không có overbook, không booking trùng, không booking đặt hay huỷ sau giờ bắt đầu, không có player lạ.
- 36 booking có `booked_at` sớm hơn `joined_club_at` của player. Chỉ ghi chú, không xử lý.

**Bẫy timezone:** 39 session "Early Bird Monday" lưu là **CN 22:30 UTC = T2 05:30 giờ HCM**. Nhóm tuần theo UTC sẽ đặt sai cả 39 session này.

## 5. Decisions log (dùng làm phần README "where the brief was silent")

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Default range = **12 tuần đầy đủ gần nhất trước now**: 2026-07-13 → 2026-10-04. Kỳ trước: 2026-04-20 → 2026-07-12 | Now là Thứ Hai nên tuần đang chạy chưa có gì. Data kéo đến 04/10 nên default không bị trống |
| D2 | Preset: Last 4 weeks / Last 12 weeks / All data / Custom. Preset theo tuần luôn tính trọn tuần Mon–Sun | So sánh giữa các tuần mới công bằng |
| D3 | Active players đếm theo booking, không theo attendance | Chỉ 104/195 session có ghi điểm danh |
| D4 | No-shows chỉ tính ở session có ghi điểm danh, kèm coverage và rate | Unknown ≠ 0 |
| D5 | Chart hiển thị active players theo tuần | Trả lời trực tiếp câu hỏi "có nhiều người chơi hơn không?" |
| D6 | Đổi club giữ nguyên range. State lưu trong URL để share link được | |
| D7 | Tính `week_start_local` sẵn lúc seed. SQL không phải xử lý timezone | Dễ test, không sai |
| D8 | Summary và drill-down dùng chung một hàm WHERE | Số trên card luôn khớp số dòng trong drill-down |
| D9 | "Held" có thêm điều kiện `starts_at <= now` | Chặn trường hợp host chọn range nằm trong tương lai |
| D10 | Club không có data → empty state riêng, nêu ngày tạo club và mô tả những gì sẽ hiện khi có session | Đề yêu cầu "useful page" |
