# Rules (bắt buộc, không được phá)

## Correctness: phần dễ mất điểm nhất

1. **Thời gian.** DB lưu UTC dạng ISO string canonical `YYYY-MM-DDTHH:mm:ssZ` (**không có mili-giây**: dùng `toUtcIso`/`normalizeUtcIso` cho mọi thứ, cả mốc range). Nhờ vậy so sánh chuỗi cũng là so sánh thời gian. Mọi chuyển đổi timezone làm bằng Luxon trong `lib/time.ts`. **Cấm** dùng `strftime`, `date()` của SQLite, `Date#getDay()` hay `toLocaleDateString` để chia tuần.
2. **Timezone lấy từ `clubs.time_zone`**, không hardcode trong logic. Hằng `HCM` chỉ dùng trong test và fixture.
3. **"Now" là hằng `NOW_ISO = '2026-10-05T02:00:00Z'`** đặt trong `lib/time.ts`. Không gọi `new Date()` trong logic nghiệp vụ.
4. **Range:** input `from`/`to` là ngày theo giờ club, tính cả hai đầu. Bên trong luôn đổi thành `[startUtc, endUtcExclusive)`.
5. **Null là null.** `attended` giữ nguyên ba trạng thái: `1` / `0` / `NULL`. Không bao giờ dùng `COALESCE(attended, 0)` hay `!!attended`.
6. **No-shows chỉ tính ở session có `attendance_recorded = 1`.** Nếu coverage = 0 thì API trả `noShows: null` và UI hiện "Unknown", **không hiện 0**.
7. **Summary và drill-down dùng chung một hàm WHERE** (`lib/queries.ts`). Số trên card phải bằng đúng `drilldown.length`.
8. **Kỳ trước** = cùng số ngày, kết thúc ngay trước `from`. API trả về cả `previousRange` để UI hiển thị.
9. **Delta khi kỳ trước = 0 hoặc null**: không chia cho 0. Trả `deltaPct: null` và UI hiện "—" hoặc "new".

## API contract

10. Server component **không import `lib/db`**. Chỉ route handler trong `app/api/**` được phép đụng DB.
11. Mọi query param đều validate bằng zod. Sai thì trả 400 kèm `{ error: { code, message } }`. Club không tồn tại thì trả 404.
12. Response luôn có `definition` cho từng metric và `coverage` cho no-shows. Mobile app phải dùng được API mà không cần chép lại logic.
13. Route handler đặt `export const dynamic = 'force-dynamic'`.
14. Endpoint và response shape cố định:
    - `GET /api/clubs` → `{ clubs: { id, name, timeZone, createdAt, hasData, firstSessionDate, lastSessionDate }[] }`
    - `GET /api/clubs/:id/summary?from&to` → `{ range, previousRange, metrics: { activePlayers, sessionsHeld, noShows } }`. Mỗi metric có dạng `{ current, previous, delta, deltaPct, definition }`. Riêng noShows có thêm `coverage: { current: {recorded, held, bookingsRecorded}, previous }` và `rate`.
    - `GET /api/clubs/:id/weekly?from&to&metric` → `{ weeks: { weekStart, weekEnd, value, previousValue, partial }[] }`
    - `GET /api/clubs/:id/drilldown?from&to&metric` → `{ metric, total, definition, rows: [...] }`

## UI / UX: phần được chấm nặng nhất

15. Định nghĩa hiển thị **luôn thấy được**, ngay dưới con số. Tooltip chỉ để thêm chi tiết.
16. Ngày tháng hiển thị theo giờ club, dạng `13 Jul – 4 Oct 2026`. Không bao giờ hiện UTC. Subtitle luôn ghi "Times in <tz> · weeks Mon–Sun".
17. Card no-shows phải có: coverage "X of Y sessions had attendance taken", rate %, và cảnh báo nếu coverage giữa hai kỳ lệch nhau.
18. Màu delta: tăng active players hoặc sessions là tốt (xanh). **Tăng no-shows là xấu (đỏ).** Không gán màu cứng theo dấu +/−.
19. Mỗi khối dữ liệu đều phải có loading skeleton, error state có nút Retry, và empty state.
20. Club không có data thì không render "0 0 0".
21. Card bấm được phải là `<button>`, có focus ring, mở được bằng Enter, sheet đóng được bằng Esc.
22. Viewport 375px: không scroll ngang ở body, card xếp dọc, sheet chiếm full width.
23. Text UI viết tiếng Anh, giọng thân thiện, hướng tới host (ví dụ "players", không dùng "users").
23b. **Visual tuân theo `design-system.md`**: chỉ dùng token (không hardcode hex), font Inter, primary = `#3336FD` (brand blue), xanh lá = đang chọn, vàng = số đếm x/y. Chữ trắng không bao giờ đặt trên nền vàng/xanh lá/cam.

## Code

24. TypeScript strict, không dùng `any`. Type dùng chung đặt ở `lib/types.ts`.
25. Hàm thuần (time, metrics) tách riêng khỏi DB để test được.
26. Test bắt buộc phải có: chia tuần quanh mốc CN/T2 giờ HCM, session có attendance null không bị tính thành 0 no-show, session bị huỷ bị loại, một player book 2 session chỉ đếm 1, và summary bằng drilldown.length.
27. Code mỗi phase chỉ làm đúng phạm vi phase đó. Không thêm tính năng ngoài đề, những ý đó ghi vào mục "Next steps" của README.
28. Không commit `*.db`, `.next`, `node_modules`, `.DS_Store`, file PDF đề bài.
29. **Repo public: không nhắc tên công ty ra đề hay brand của họ** ở bất kỳ đâu (code, comment, README, commit, UI, `.memory/`). Trước mỗi commit chạy grep tên công ty (không phân biệt hoa thường), kết quả phải rỗng.
