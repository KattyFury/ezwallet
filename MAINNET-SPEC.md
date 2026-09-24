# ezwallet Mainnet – Spec

> **Status 2026-09-22: NOT STARTED.** This is the user's own spec, recorded verbatim so it stops living
> only inside a chat transcript. The fork it describes has not happened yet – see `HANDOFF.md`
> § CURRENT STATE. Do not treat anything here as built.
>
> The plan: **`ezwallet` becomes the Arc MAINNET project**, and **this current repo is renamed
> `ezwallet-testnet`**. The user asked to improve the UI BEFORE forking, so the fork waits.

## Core belief

ezwallet was built on a simple belief: people shouldn't have to adapt to crypto. Crypto should adapt to
people. That means no memorizing seed phrases, no copying long wallet addresses, no worrying about gas
tokens – those are technical barriers, not the value of crypto. Simple should never come at the cost of
safety, so every transaction is protected by a PIN, and no one can move your money without you. And in
the end, your money stays yours: not held by a bank, yours to use any time you need it.

Thứ tự ưu tiên: đơn giản trước, bảo mật sau, sở hữu cuối cùng. Mọi feature mới phải trả lời được: có làm chuyển
nhận đơn giản hơn không.

## Định vị

Ví web2-hóa xây trên tech Circle, giải bài toán gửi/nhận cho người dùng web2. Không giới hạn người dùng Việt
Nam. On/off-ramp không thuộc phạm vi ezwallet, để CEX và các ramp khác lo.

## Stack

- Circle User-Controlled Wallets (MPC, ký bằng PIN)
- Arc Mainnet
- viem + Multicall3 cho đọc dữ liệu
- React + Vite, Cloudflare Pages + Functions (giữ kiến trúc từ bản testnet)
- Design system: dùng nguyên bản đã chốt 2026-09-09, không vẽ lại

## Phạm vi v1

**Có:** đăng nhập, gửi, nhận (QR + danh bạ), lịch sử, swap (trong service hub, không gộp vào màn ví chính)

**Không có ở v1:** cirBTC, LuckyPot/Bỏ Heo/các sub-app khác (để sau), CCTP, Gateway

## Luồng gửi

1. Chọn người nhận qua danh bạ hoặc quét QR, không gõ tay địa chỉ
2. Nhập số tiền bằng USDC, không giới hạn số thập phân khi nhập nhưng UI chỉ hiển thị tối đa 6 số lẻ
3. Hiện phí gas quy ra USDC trước khi xác nhận
4. Nhập PIN, gọi Circle ký, gửi lên Arc
5. Giao dịch atomic qua Multicall3From, approve + execute gộp một lần ký – hoặc thành công trọn vẹn hoặc
   revert, không có trạng thái nửa chừng mất tiền
6. Nếu mất mạng trước khi nhận được kết quả: hiện trạng thái "đang kiểm tra", không hiện "thất bại", tự tra lại
   theo txhash trước khi cho gửi lại

## Luồng nhận

Mở màn nhận, hiện QR + địa chỉ ví của chính mình. Không có bước nào người nhận phải làm thêm.

## Swap (trong service hub)

- Route swap: kiểm tra lại LiFi có hỗ trợ Arc Mainnet chưa trước khi build (bài viết Arc House tháng 5/2026
  mới ghi hỗ trợ Testnet) – nếu chưa, tìm nguồn route khác cho mainnet
- Approve đúng bằng số tiền giao dịch swap đó, không approve không giới hạn
- Giá hiển thị trước khi ký lấy trực tiếp từ quote của route sẽ thi hành, không lấy riêng từ nguồn khác – tránh
  lệch giá hiển thị với giá thực thi
- Có thể dùng Chainlink price feed (đã chạy trên Arc Mainnet) làm nguồn tham chiếu để báo giá bất thường

## Sàn bảo mật (không đổi theo đơn giản)

- PIN bắt buộc cho mọi giao dịch
- Khóa 24 giờ khi reset PIN, chặn mọi giao dịch ra trong thời gian đó
- Không hạn mức số dư, không hạn mức giao dịch

## Hạn chế cứng cho README

1. Circle Wallet hiện chưa hỗ trợ export private key (khác Privy) – nói thẳng, không né. Tình trạng này có thể
   đổi, kiểm tra lại trước mỗi lần release, không ghi cố định
2. Chưa có audit độc lập nào – cho ezwallet lẫn cho tầng ký của Circle (chưa tìm thấy tên hãng audit công khai)
3. Không phải ngân hàng, không lãi suất, không bảo hiểm – nhưng nhanh và chạy 24/7 hơn app ngân hàng
4. Tạm thời không CCTP, không Gateway, chỉ gửi/nhận trong mạng Arc
5. Ngôn ngữ UI tùy theo Circle Wallet hỗ trợ, không cố định là chỉ tiếng Anh

## Luật triển khai mainnet (đã chốt trước)

- Deploy bằng ví multi-sig, không dùng một ví đơn
- Địa chỉ contract mainnet lấy từ docs chính thức, không copy-paste từ testnet (trừ USDC)
- Dùng chuẩn ERC-20 (6 số lẻ) cho mọi thứ onchain, không dùng native balance (18 số lẻ)

## Việc cần xác nhận trước khi build

- LiFi có hỗ trợ Arc Mainnet chưa
- Địa chỉ Swap Adapter, TokenMessenger và các contract khác trên Arc Mainnet – lấy từ docs.arc.io
- Circle Wallets adapter có chạy đầy đủ với ARC mainnet chain code chưa
