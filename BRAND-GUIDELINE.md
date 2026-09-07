# BRAND GUIDELINE – EZwallet

> **Quy luật này VƯỢT QUA thiết kế Figma.** Khi đọc 1 frame Figma mà thấy lệch guideline này (màu, font,
> tỷ lệ layout) → SỬA CHO ĐÚNG GUIDELINE, không copy y nguyên số đo/màu lệch từ Figma. Figma chỉ đúng vai trò
> tham khảo bố cục/nội dung, không phải nguồn chân lý cho những gì đã quy định ở đây.

## 1. Màu sắc

| Vai trò | Mã màu |
|---|---|
| Chủ đạo (brand) | `#0B53BF` |
| Nền/chữ phụ | Trắng |
| Text chính | Đen |
| Text phụ | `#757575` |
| Nền hộp chứa / input nhập liệu ("box lõm xuống") | `#E3F1FF` (2026-09-07, đổi từ `#E3E3E3` — **không dùng xám nhạt cho loại box này nữa**) |
| Danger (lỗi/xoá) | `#EC221F` |
| Warning (cảnh báo) | `#E8B931` |
| Tích cực (thành công/nhận tiền) | `#14AE5C` |

Không dùng gradient cho các màu trên – tất cả là màu SOLID.

## 2. Font chữ

- Toàn app dùng **font hệ thống** (system font stack) – không webfont, không tải font ngoài.
- Trong Figma vẽ bằng **Inter** làm đại diện (gần với hệ thống thật để đo tỷ lệ/wrapping chính xác hơn) –
  khi build KHÔNG dùng Inter thật, luôn ép về system stack. Tên font trong Figma không phải chỉ định
  font thật sự render ra máy.

## 3. Layout

- **Chiều dọc:** chia màn hình làm **10 phần bằng nhau**. Hai yếu tố khác nhau nằm sát nhau theo chiều dọc
  → cách nhau tự động **20px**.
- **Chiều ngang:** chỉ cần đảm bảo 2 điều:
  - Cách lề trái/phải: **20px**.
  - Hai yếu tố khác nhau nằm sát nhau theo chiều ngang → cách nhau **10px**.
- **Tỷ lệ dọc theo chức năng:**
  - Phần **thiên về hiển thị** (nội dung, thông tin) → chiếm **6/10** màn hình.
  - Phần **thiên về nhập tay hoặc bấm** (input, nút bấm, bàn phím) → chiếm **4/10** màn hình.
