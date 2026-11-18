# Club Insights: Project Instructions

Bài take-home: dashboard cho chủ club (host) xem tình hình club. Đề gốc là file PDF chỉ lưu ở máy local (đã gitignore). Nội dung đề đã tóm tắt trong `.memory/project-brief.md`.

> ⚠️ **Repo sẽ push lên GitHub public.** Không được nhắc tên công ty ra đề, sản phẩm hay brand của họ ở bất kỳ đâu trong repo: code, comment, README, commit message, UI text, `.memory/`. Không dùng logo, mascot hay asset bên ngoài. Gọi chung là "the brief" / "a sports community app".
Người chấm nhìn kỹ nhất vào việc **host có hiểu và tin các con số không**. Một app nhỏ nhưng hoàn chỉnh tốt hơn một app to mà dang dở.

## Đọc trước khi làm bất cứ việc gì

Bộ nhớ của dự án nằm trong `.memory/`. Đây là nguồn sự thật, ưu tiên hơn `phan-tich.md` và `ke-hoach-phase.md`. Hai file đó viết khi dữ liệu chưa đầy đủ và có chỗ sai, chỉ giữ lại để tham khảo.

@../.memory/project-brief.md
@../.memory/rules.md
@../.memory/techstack.md
@../.memory/design-system.md
@../.memory/progress.md

## Cách làm việc

1. **Mỗi lần làm một phase**, theo đúng thứ tự trong `.memory/progress.md`. Chỉ sang phase sau khi đã đạt Definition of Done (DoD) của phase hiện tại.
2. **Trước khi code**: đọc phase hiện tại trong `progress.md` và các rule liên quan trong `rules.md`. Phase UI (7–12) bắt buộc theo `design-system.md` và chạy checklist §7 của file đó.
3. **Sau khi xong một phase**:
   - Chạy `npx tsc --noEmit` và `npm test`, dán kết quả thật vào câu trả lời.
   - Đánh dấu `[x]` cho phase đó trong `progress.md`, ghi ngày và các quyết định mới phát sinh.
   - Nếu chốt được quyết định mà đề không nói tới, thêm vào bảng "Decisions log" trong `project-brief.md`. Bảng này về sau sẽ thành phần README.
4. **Không bịa schema hay số liệu.** Cần một con số thì query SQLite hoặc đọc CSV để lấy. Tên cột thật ghi trong `project-brief.md` §4.
5. **Gặp chỗ mơ hồ ảnh hưởng tới định nghĩa metric thì hỏi user**, đừng tự quyết.
6. Trao đổi với user bằng tiếng Việt. Code, comment, text trên UI, README và commit message viết bằng tiếng Anh.
7. Chỉ commit khi user yêu cầu. Mỗi commit tương ứng một phase, message dạng `phase N: <summary>`.

## Lệnh thường dùng

Hướng dẫn chạy và maintain đầy đủ cho dev: `.memory/dev-guide.md`. README ở root là bản giới thiệu cho người chấm (HR, tech lead).

```bash
npm install && npm run dev   # predev tự seed nếu db chưa có
npm test                     # vitest
npm run seed -- --force      # xoá DB và seed lại
npx tsc --noEmit
```
