# BRAND GUIDELINE – EZwallet

> **CẬP NHẬT 2026-09-08 — PREMISE ĐẢO NGƯỢC SO VỚI BẢN 09-07.** Bản cũ nói "guideline luôn vượt qua
> Figma". Quyết định mới của user: **bảng màu trong file Figma `iQxFGA890VhyXkEKipCC9C`
> (frame Send money/Exchange/Service hub/Menu/Home/Sign in with email) CHÍNH LÀ nguồn của guideline màu
> sắc bên dưới** — không tự ý "chuẩn hoá ngược" màu Figma về giá trị cũ nữa khi 2 bên lệch nhau. Layout/
> tỷ lệ (mục 3) và font (mục 2) thì vẫn giữ nguyên như trước — Figma chỉ đổi ở phần MÀU.

## 1. Màu sắc

| Vai trò | Mã màu |
|---|---|
| Chủ đạo (brand) | `#0B53BF` (không đổi) |
| Nền/chữ phụ | Trắng |
| Text chính | Đen |
| Text phụ — nhãn dòng meta ("Available:", "Fee:", "Balance:", "Rate:") | `#667085` (MỚI 09-08, tách ra từ `#757575`) |
| Text phụ — nav inactive, placeholder input | `#94A3B8` (MỚI 09-08, tách ra từ `#757575`) |
| Nền hộp chứa / input nhập liệu / **card nội dung thường** | `#F1F5F9` (2026-09-08, ĐỔI từ `#E3F1FF` — quyết định 09-07 dùng xanh nhạt đã bị đảo ngược đúng 1 ngày sau, **không dùng xanh nhạt làm nền nữa**) |
| Danger (lỗi/xoá/Exit/Sign out) | `#FF383C` (2026-09-08, đổi từ `#EC221F`) |
| Warning (cảnh báo) | `#E8B931` (không đổi, không xuất hiện trong file Figma mới nhất) |
| Tích cực (thành công/nhận tiền) | `#14AE5C` (không đổi, không xuất hiện trong file Figma mới nhất) |

Không dùng gradient cho các màu trên – tất cả là màu SOLID.

**Palette cố tình hẹp (user 09-08):** trắng - xám - đen - xanh brand làm nền tảng, đỏ chỉ dành riêng cho
destructive/lỗi. Không tự thêm màu ngoài bảng trên khi build màn mới trừ khi Figma thật sự vẽ vậy.

## 2. Font chữ

- Toàn app dùng **font hệ thống** (system font stack) – không webfont, không tải font ngoài.
- Trong Figma vẽ bằng **Inter** làm đại diện (gần với hệ thống thật để đo tỷ lệ/wrapping chính xác hơn) –
  khi build KHÔNG dùng Inter thật, luôn ép về system stack. Tên font trong Figma không phải chỉ định
  font thật sự render ra máy.
- **Weight KHÔNG bị ép về 1-2 mức cố định.** Giữ nguyên thang 4 mức đã có (Light/Regular/Medium/
  Semibold) và áp dụng theo kiến thức thiết kế cho từng chỗ — kể cả khi phần lớn text trong 1 file Figma
  cụ thể chỉ dùng Regular/Semibold, đó không phải lệnh xoá bỏ mức Medium ở những chỗ khác của app.
- **Số tiền lớn (hero number):** luôn dùng weight Light dù Figma có vẽ Regular — size thì theo đúng
  Figma đo được cho từng màn cụ thể (không có 1 size chung bắt buộc cho mọi "số to").
- **Cỡ chữ NÚT — CHỐT 2026-09-08 (an toàn vì chỉ nhỏ lại, không tràn):**
  - Nút chuẩn (`.btn`: Continue/Back/Deposit/Withdraw/Sign in with Email/mọi CTA full-width) →
    **19px Semibold** (trước là 21px Medium).
  - Nút hành động phụ trong 1 hàng 3 nút (`.action-card`, kiểu Paste/Contacts) → **15px Semibold**.
  - Nút hành động chính giữa được nhấn mạnh (`.action-card.primary`, kiểu Scan QR) → **17px Semibold**.
- **⚠️ NGOẠI LỆ RIÊNG MÀN — KHÔNG tự động ghi đè khi đã có quyết định riêng cho màn đó.** Bài học
  2026-09-08: LuckyPot.cc có typography RIÊNG đã được quyết định trước đó cùng ngày (font Space Grotesk +
  VIẾT HOA cho mọi header/label, xem comment đầu `src/screens/LuckyPot.jsx`) — đây là bản sắc thương hiệu
  cố ý của MỘT màn cụ thể, không phải lỗi cần "chuẩn hoá" về rule chung. Khi một màn đã có ghi chú
  "user decision" riêng cho font/màu/casing, **giữ nguyên màn đó**, chỉ áp guideline chung cho phần
  KHÔNG có ngoại lệ được ghi rõ (ví dụ: spacing, chiều cao nút vẫn theo rule chung ngay cả trên màn có
  typography riêng).

## 3b. Bóng đổ (shadow) — QUY TẮC MỚI 2026-09-08

- **Chỉ phần tử CLICKABLE mới có bóng.** Nút, chip, pill bấm được → có bóng. Icon/card/viền chỉ mang
  tính hiển thị, không bấm được → KHÔNG bóng.
- Kiểu bóng: **glow lan toả đều quanh, không có offset x/y** (khác rule cũ "đổ thẳng xuống"). Độ mờ/bán
  kính không cần khớp tuyệt đối 1 con số — miễn rõ ràng phần tử đó "nổi lên, có thể bấm".
- Áp dụng dần khi build lại từng màn theo Figma mới — chưa đổi hàng loạt CSS hiện có.

## 3. Layout

- **Chiều dọc:** chia màn hình làm **10 phần bằng nhau**. Hai yếu tố khác nhau nằm sát nhau theo chiều dọc
  → cách nhau tự động **20px**.
- **Chiều ngang:** chỉ cần đảm bảo 2 điều:
  - Cách lề trái/phải: **20px**.
  - Hai yếu tố khác nhau nằm sát nhau theo chiều ngang → cách nhau **10px**.
- **Tỷ lệ dọc theo chức năng:**
  - Phần **thiên về hiển thị** (nội dung, thông tin) → chiếm **6/10** màn hình.
  - Phần **thiên về nhập tay hoặc bấm** (input, nút bấm, bàn phím) → chiếm **4/10** màn hình.
