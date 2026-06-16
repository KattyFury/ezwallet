# HANDOFF — ezpay (ezwallet)

**Cập nhật:** 2026-06-16  
**Repo:** https://github.com/KattyFury/ezpay  
**Local:** `D:\Claude\Build_on_Arc\ezpay`  
**Dev:** `npm run dev` → http://localhost:5173

---

## Stack

- **Frontend:** React + Vite → Cloudflare Pages
- **Backend:** Cloudflare Workers (JS) — gọi Circle API server-side
- **Wallet:** Circle Developer Controlled Wallet
- **Auth:** Email OTP (SĐT disabled — "sắp ra mắt")
- **Chain:** Arc Testnet · Chain ID `5042002` · RPC `https://rpc.testnet.arc.network`
- **USDC:** `0x3600000000000000000000000000000000000000` (native gas token)
- **Secrets:** `.env` local + Cloudflare Dashboard. KHÔNG hardcode.

---

## Design System (locked — không thay đổi)

**Font:** `Roboto Condensed` (400 / 500 / 700)

**Palette — chỉ 6 màu:**
| Variable | Hex | Vai trò |
|---|---|---|
| `--color-primary` | `#16A34A` | Button chính, active, icon |
| `--color-black` | `#000000` | Text chính |
| `--color-gray` | `#CCCCCC` | Text phụ, border, background |
| `--color-white` | `#FFFFFF` | Nền, button thứ cấp |
| `--color-error` | `#DC2626` | Lỗi |
| `--color-warning` | `#F59E0B` | Cảnh báo |

**Typography scale:**
| Variable | Size | Dùng cho |
|---|---|---|
| `--fs-amount` | 22px | Số tiền VND |
| `--fs-content` | 16px | Nội dung, button |
| `--fs-item` | 9.5px | Item list - tên |
| `--fs-label` | 10px | Label, placeholder |
| `--fs-sub` | 7px | Item list - phụ |

**Assets:**
- App icon: `app icon.png`
- Logo màn đăng nhập: `logo long.png`
- `logo short.png`, `pattern*.png`, `PFP.png` — chưa assign

---

## Layout Rules

- **Lưới 10 hàng** theo chiều cao màn hình (`height: 100dvh`)
- **Sub-screen:** hàng 1 = tiêu đề, hàng 10 = action buttons
- **4 màn chính:** không có hàng 1 tiêu đề, có nav bar hàng 10
- **Row 10 — 1 nút:** class `row10-single`, width 2/3, căn giữa
- **Row 10 — 2 nút:** class `row10-dual`, trái = phụ trắng, phải = chính xanh
- **Numpad:** cố định hàng 7–8–9, layout 4 dòng: 123 / 456 / 789 / ,0←
- **Padding an toàn:** `padding: 0 16px` trên `.screen`

---

## UI Rules

- Hiển thị **VND** — USDC ẩn hoàn toàn (chỉ hiện màn confirm giao dịch)
- **Memo** bắt buộc hỗ trợ khi chuyển khoản (encode vào `data` field của tx)
- PIN: 4 số · khóa sau 4 lần sai (30 phút) · đổi PIN → tài khoản khả dụng sau 12h
- Nav bar 4 tab: **Đổi tiền · Gửi · Nhận · Menu**
- Thông báo in-app: vùng 6–7, tối đa 2, có nút X; nếu không có → tip dashed

---

## Cấu trúc thư mục

```
ezpay/
├── src/
│   ├── index.css          ← design tokens, grid, shared styles
│   ├── main.jsx
│   ├── App.jsx            ← router sẽ build ở đây
│   ├── screens/           ← mỗi màn 1 file
│   └── components/        ← shared: Numpad, NavBar, PinDots, Button...
├── functions/             ← Cloudflare Workers (Circle API)
├── public/
├── index.html
├── vite.config.js
├── package.json
├── .gitignore
├── CLAUDE.md
└── ezwallet-wireframe-spec.md  ← spec đầy đủ 21+ màn
```

---

## Thứ tự build (8 phases)

- [x] **Phase 1** — Scaffold + Design system ✅
- [ ] **Phase 2** — Onboarding + PIN
  - Màn đăng nhập (email OTP, SĐT disabled)
  - Tạo PIN → Xác nhận PIN
  - Recovery (passkey, SĐT disabled)
  - Nhập PIN + trạng thái khóa (4b)
- [ ] **Phase 3** — 4 màn chính (Home Gửi, Home Nhận, Đổi tiền, Menu)
- [ ] **Phase 4** — Luồng Gửi (Nhập số tiền + memo → Xác nhận → Biên lai)
- [ ] **Phase 5** — Custom QR (Tạo → Hiển thị → QR đã lưu)
- [ ] **Phase 6** — Danh bạ + Lịch sử giao dịch
- [ ] **Phase 7** — Settings (Ngôn ngữ, Bảo mật, Nạp, Rút disabled, About)
- [ ] **Phase 8** — Edge cases + State screens + Quên PIN flow

---

## Decisions Log

- 2026-06-16: Đập qrpay, build ezpay mới từ đầu — reason: đổi wallet từ Privy → Circle Developer Controlled Wallet, auth flow và tx signing khác hoàn toàn, không đáng port code cũ
- 2026-06-16: Monorepo (`frontend + functions/` trong cùng repo) — reason: Cloudflare Pages tự nhận `functions/` làm Workers, deploy 1 lần xong cả hai
- 2026-06-16: Font Roboto Condensed, 6 màu locked (#16A34A / #000 / #CCCCCC / #FFF / #DC2626 / #F59E0B) — không thêm màu nào khác
- 2026-06-16: Xanh dương #185FA5 trong spec cũ → bỏ, thay bằng #16A34A cho tất cả button chính

---

## Failed Approaches

_(chưa có)_
