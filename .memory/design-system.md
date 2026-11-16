# Design System: Club Insights

> Ngôn ngữ thiết kế cho dashboard: thân thiện, nhiều năng lượng thể thao, nhưng tiết chế để host **đọc số nhanh và tin số**.
> Mobile app tương lai sẽ dùng chung API, nên dashboard theo phong cách mobile-native: nền sáng ngả xanh, card trắng bo tròn, pill, tag, số đếm dạng x/y.

## 1. Ngữ pháp thị giác (bắt buộc giữ nhất quán)

| Màu | Hex | Nghĩa | Chữ đặt lên trên |
|---|---|---|---|
| 🔵 Blue | **`#3336FD`** | **Điều hướng và hành động**: nút chính, link, gạch chân tab, ngày giờ session, bar của chart | Trắng (contrast 6.8 ✅) |
| 🟢 Green | `#36D97A` | **Đang chọn / xác nhận**: preset đang chọn, ngày được chọn trên calendar, tag "Recorded" | **Đen** (9.6 ✅, trắng chỉ 1.85 ❌) |
| 🟡 Yellow | `#FEBC17` | **Số đếm / sức chứa / cần chú ý**: badge x/y ("11/12", "34/60 sessions"), avatar club | **Đen** (10.5 ✅, trắng chỉ 1.69 ❌) |
| ⚪ Neutral | `#F0F0F0` / `#D7D7D8` | **Thông tin phụ**: tag trung tính ("Not taken"), pill chưa chọn | Đen |

Bề mặt:
| Token | Hex | Dùng cho |
|---|---|---|
| Nền trang | `#F4F8FF` | Trắng ngả xanh, đỡ chói hơn trắng tinh |
| Header tint | `#E9F0FF` | Header của sheet, hover row |
| Sunken | `#EEEFEE` | Nền khu list đặt sau card |
| Green tint | `#DCF6E8` | Nền của delta tích cực |
| Cream | `#FDF5DF` | Nền cảnh báo nhẹ, nền empty state |

Quy ước khác:
1. Card trắng, bo góc 12px, viền mảnh, gần như không có shadow.
2. Đếm dạng **"x/y"**. Phân cách bằng `·` hoặc `•`: "ATTENDANCE TAKEN · 34/60", "Pickleball • Ho Chi Minh City".
3. Ngày giờ của session viết dạng **"Mon, Jul 13 @5:30 AM"**. Khoảng ngày viết dạng `13 Jul – 4 Oct 2026`.
4. Nhãn section và label viết **HOA đậm, cỡ nhỏ**, không áp cho đoạn văn.
5. Font **Inter** (sans, có tabular figures). Tiêu đề lớn weight 800–900.
6. Button và tag dạng pill (`rounded-full`), input bo 6–8px.
7. Đường kẻ nét đứt dùng để chia các phần bên trong một card.

## 2. Design tokens (shadcn, HSL), dán vào `app/globals.css`

Chỉ có light mode (dark mode để vào mục Next steps).

```css
:root {
  /* Surfaces */
  --background: 218 100% 98%;        /* #F4F8FF nền trang */
  --foreground: 221 39% 11%;         /* #111827 */
  --card: 0 0% 100%;
  --card-foreground: 221 39% 11%;
  --muted: 221 100% 96%;             /* #E9F0FF header tint, hover row */
  --muted-foreground: 215 14% 34%;   /* #4B5563 caption, định nghĩa (7.1 trên nền trang) */
  --border: 222 44% 92%;             /* #E3E8F4 viền card nhạt hơi xanh */
  --input: 222 44% 92%;
  --radius: 0.75rem;                 /* 12px */

  /* Brand */
  --primary: 239 98% 60%;            /* #3336FD brand blue */
  --primary-foreground: 0 0% 100%;
  --ring: 239 98% 60%;
  --selected: 145 68% 53%;           /* #36D97A brand green: trạng thái đang chọn */
  --selected-foreground: 221 39% 11%;/* luôn chữ đen */
  --count: 43 99% 54%;               /* #FEBC17 brand yellow: badge x/y */
  --count-foreground: 221 39% 11%;
  --neutral-tag: 0 0% 94%;           /* #F0F0F0 */
  --pill-inactive: 240 1% 85%;       /* #D7D7D8 */

  /* Semantic: màu ink cho chữ, màu tint cho nền */
  --positive: 142 72% 29%;           /* #15803D chữ (4.7 trên nền trang) */
  --positive-bg: 148 59% 91%;        /* #DCF6E8 green tint */
  --negative: 4 76% 40%;             /* #B42318 */
  --negative-bg: 16 85% 95%;
  --warning: 39 100% 27%;            /* #8A5A00 */
  --warning-bg: 44 88% 93%;          /* #FDF5DF cream */
  --destructive: 4 76% 40%;

  /* Chart */
  --chart-current: 239 98% 60%;      /* #3336FD */
  --chart-previous: 239 97% 88%;     /* #C2C3FE bản nhạt của blue */
  --chart-partial: 43 99% 54%;       /* #FEBC17 đánh dấu tuần chưa đủ ngày */
}
```

Tailwind: `fontFamily.sans = ['var(--font-inter)', 'system-ui', 'sans-serif']` (tải Inter bằng `next/font/google`). Thêm bộ màu `brand: { blue: '#3336FD', green: '#36D97A', yellow: '#FEBC17' }`.

## 3. Typography

| Vai trò | Style | Ví dụ |
|---|---|---|
| Eyebrow / label card / section | 12px, **weight 700, UPPERCASE**, `tracking-wide`, `muted-foreground` | `ACTIVE PLAYERS` |
| Số KPI | 40px desktop / 32px mobile, **weight 800**, proportional figures (không `tabular-nums` ở cỡ lớn), `tracking-tight` | `142` |
| Delta | 13–14px, weight 600, `tabular-nums` | `▲ 12 · +9.2%` |
| Định nghĩa | 13–14px, weight 400, `muted-foreground`, **luôn hiện** | |
| Tên club (header) | 22–28px, weight 800 | `Saigon Smash Pickleball` |
| Meta line | 14px, `muted-foreground`, phân cách bằng `•` | `Pickleball • Ho Chi Minh City • Since Dec 2025` |
| Tiêu đề section | 16–18px, weight 700 | `Active players per week` |
| Ngày giờ của session | 14px, weight 500, **màu `primary`** | `Mon, Jul 13 @5:30 AM` |
| Bảng | 14px. Cột số canh phải, `tabular-nums` | |

## 4. Component patterns

**Header của club**
- Avatar tròn chứa chữ viết tắt của club (nền `count`/vàng, chữ đen) + tên club đậm + meta line `•`.
- Bên phải: **ClubSwitcher** (Select bo tròn).
- Bên dưới: hàng điều khiển range.

**Preset range: segmented pill**
- Option đang chọn: **nền `selected` (xanh lá), chữ đen**. Option còn lại: nền trắng, viền `border`, chữ `foreground`. Bo `rounded-full`.
- Kế bên là nút "Custom" mở Popover Calendar. Ngày đã chọn trong calendar cũng tô xanh lá.
- Dòng phụ bên dưới: `Compared with 20 Apr – 12 Jul 2026 · Times in Ho Chi Minh City · Weeks Mon–Sun`.

**MetricCard** (`<button>`, card trắng bo 12px, viền `border`)
```
┌──────────────────────────────────┐
│ ACTIVE PLAYERS              ›    │  eyebrow HOA
│ 142                              │  KPI 40/800
│ [▲ 12 · +9.2%]  vs 130           │  delta badge: nền positive-bg, chữ positive
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │  kẻ nét đứt
│ Different players with at least  │  định nghĩa, muted, luôn hiện
│ one confirmed booking…           │
│ See all 142 players →            │  chữ primary, báo có drill-down
└──────────────────────────────────┘
```
- Card no-shows: dòng coverage **"Attendance taken · 34/60 sessions"** dùng **badge vàng `count` dạng x/y**, kèm rate "6.2% of checked bookings". Nếu coverage = 0: KPI ghi "Unknown" (chữ muted), badge `warning-bg` "No attendance taken in this period".
- Hover: viền `primary`. Focus: `ring-2 ring-primary ring-offset-2`. Shadow tối đa `shadow-sm`.

**Delta (theo ý nghĩa, luôn có mũi tên và chữ đi kèm màu)**
| Metric | Tăng | Giảm |
|---|---|---|
| Active players, Sessions held | positive ▲ | negative ▼ |
| No-shows | negative ▲ | positive ▼ |
| Kỳ trước = 0 hoặc null | badge neutral "New" hoặc "—" | |

**WeeklyChart**
- Card trắng. Tiêu đề section kèm phụ đề muted.
- Bar `chart-current` (xanh dương), bo góc trên 4px. Kỳ trước dùng ghost bar `chart-previous` đặt cạnh.
- Grid ngang mảnh, trục Y bắt đầu từ 0, chỉ số nguyên.
- Tuần partial: bar mờ, kèm chấm vàng và ghi chú.
- Tooltip dạng card trắng bo 12px: "Week of Mon, Jul 13 · 58 players · prev. 51".
- Legend dạng chip: ● This period ● Previous period.
- *(Tuỳ chọn)* Tab gạch chân xanh để chuyển chart giữa 3 metric. Ngoài phạm vi bắt buộc.

**DrilldownSheet** (Sheet bên phải, rộng 560px desktop, full width mobile)
- Header nền `muted` (`#E9F0FF`). Eyebrow HOA tên metric → tiêu đề "142 players" → range → định nghĩa.
- Row dạng list, ví dụ với **sessions**:
  ```
  MON, JUL 13 @5:30 AM                     (eyebrow, ngày màu primary)
  Early Bird Monday                        (đậm)
  [Recorded] 1 no-show              [11/12]  ← badge vàng x/y = booked/places
  ```
  - Attendance: tag **"Recorded"** nền `selected` chữ đen. Tag **"Not taken"** nền `neutral-tag`. Không dùng màu đỏ, vì không ghi điểm danh không phải là lỗi.
- **Players**: avatar tròn viết tắt + tên + "5 sessions · 4 attended · 1 no-show".
- **No-shows**: avatar + tên, dòng phụ "Early Bird Monday · Mon, Jul 13 @5:30 AM".
- Desktop có thể hiển thị dạng bảng (header sticky), mobile hiển thị dạng list card.

**Tag / Badge**: bo pill, 12px, weight 600, padding `px-2 py-0.5`.
| Loại | Nền / chữ |
|---|---|
| Đếm x/y | `count` (vàng) / đen |
| Xác nhận, đang chọn | `selected` (xanh lá) / đen |
| Trung tính | `neutral-tag` / foreground |
| Cảnh báo | `warning-bg` / `warning` |

**Empty state** (club-002)
- Icon outline trong vòng tròn nền `warning-bg` (cream).
- Heading: "Thảo Điền Tennis Club is just getting started". Body: club tạo cách đây 4 ngày; mô tả sẽ thấy gì sau session đầu tiên (3 metric, mỗi cái 1 dòng).
- Có bản preview 3 card dạng skeleton mờ có nhãn, để host hình dung trang khi có data.
- CTA: pill primary "See an example: Saigon Smash Pickleball".

**Loading**: skeleton đúng kích thước thật, màu `muted`. **Error**: banner `negative-bg` + nút "Try again".

## 5. Layout & spacing

- Nền trang `background` (#F4F8FF). Container `max-w-6xl`, padding `px-4 md:px-8`, khoảng cách giữa các section `gap-6`.
- Card: trắng, `rounded-xl` (12px), viền `border`, padding `p-5`.
- Lưới card: 3 cột từ `md` trở lên, 1 cột trên mobile. Chart cao 320px (240px trên mobile).
- Mobile 375px: header xếp dọc. Preset pill scroll ngang trong chính nó. Sheet full width.

## 6. Giọng văn trên UI (EN)

- Thuật ngữ thống nhất: **players, sessions, host, booked, no-shows**. Đếm dạng x/y: "11/12 booked", "34/60 sessions".
- Ngắn, thân thiện: "Who played", "Sessions that went ahead", "Didn't show up".
- Ở chỗ cần sự tin tưởng thì nói thẳng: "Unknown, attendance wasn't taken".
- Năng lượng brand chỉ để ở empty state ("It's almost game time!").

## 7. Checklist consistency (review mỗi phase UI)

- [ ] Chỉ dùng token trong §2, không hardcode hex trong component.
- [ ] **Xanh lá = đang chọn/xác nhận, xanh dương = điều hướng/hành động, vàng = số đếm x/y** (đúng §1).
- [ ] Chữ trắng chỉ đặt trên `primary` hoặc `negative`. Nền xanh lá và vàng luôn đi với chữ đen.
- [ ] Số trong cột/bảng/badge dùng `tabular-nums` (số KPI lớn thì không), đếm dạng x/y khi có mẫu số.
- [ ] Delta có mũi tên và chữ, màu đúng theo bảng ở §4.
- [ ] Định nghĩa nằm ngay dưới số, không nằm trong tooltip.
- [ ] Eyebrow HOA chỉ dùng cho label nhỏ. Ngày giờ theo format `Mon, Jul 13 @5:30 AM` hoặc `13 Jul – 4 Oct 2026`, theo giờ club.
- [ ] Card bo 12px, pill/tag `rounded-full`, shadow tối đa `sm`.
- [ ] Hover, focus ring `primary`, dùng được bằng bàn phím.
- [ ] Không có tên công ty, logo hay asset bên ngoài nào trong repo.
- [ ] Đã kiểm tra ở 375, 768 và 1280px.
