// ══ ÂM THANH BÁO THÀNH CÔNG (user chốt 2026-08-13) ══
//
// CHỈ kêu ở 2 chỗ ĐỘNG TỚI TIỀN: gửi tiền xong (SendReceipt) · đổi tiền xong (Swap).
// ⚠️ ĐỪNG rắc thêm tiếng cho copy/lưu QR/chuyển màn: kêu nhiều thì tiếng MẤT THIÊNG, đúng lúc
// tiền rời ví lại không còn nổi bật (user chốt, đã cân nhắc và loại phương án đó).
// ⚠️ CŨNG ĐỪNG thêm cho "nhận được tiền": tiền tự về thì KHÔNG có cú chạm nào của user, iOS chặn
// phát âm → phải giữ AudioContext sống suốt phiên, phức tạp hơn nhiều. User đã chốt bỏ.
//
// TỰ SINH TIẾNG bằng Web Audio, KHÔNG dùng file .mp3 (user chọn):
//   · 0 KB thêm vào app · chạy được khi mất mạng · không dính bản quyền nhạc
//   · đổi cao độ/độ dài = sửa mấy con số ngay dưới đây
//
// ⚠️ LUẬT iOS: AudioContext sinh ra ở trạng thái 'suspended', CHỈ resume được BÊN TRONG một cú
// chạm của người dùng. Lúc gửi tiền xong thì đã qua bao nhiêu await (ký PIN, chờ on-chain) nên
// chuỗi cử chỉ ĐỨT — gọi resume() ở đó là quá muộn. Vì vậy `unlockOnFirstTouch()` (App.jsx gọi
// 1 lần lúc mở app) mở khoá sẵn ngay cú chạm ĐẦU TIÊN vào app, sau đó phát lúc nào cũng được.

const KEY = 'ez_sound'   // 'off' = tắt. Không có key = BẬT (mặc định bật, user chốt)

export function isSoundOn() { return localStorage.getItem(KEY) !== 'off' }
export function setSoundOn(on) { localStorage.setItem(KEY, on ? 'on' : 'off') }

let ctx = null

function getCtx() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null              // trình duyệt quá cũ → im lặng, KHÔNG nổ
  try { ctx = new AC() } catch { return null }
  return ctx
}

// Gọi 1 lần lúc mở app (App.jsx). Cú chạm đầu tiên vào app sẽ resume AudioContext rồi tự gỡ
// listener. Dùng cả pointerdown lẫn touchstart cho chắc trên iOS đời cũ.
export function unlockOnFirstTouch() {
  const unlock = () => {
    const c = getCtx()
    if (c && c.state === 'suspended') c.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: true, passive: true })
  window.addEventListener('touchstart', unlock, { once: true, passive: true })
}

// 1 nốt hình sin + bao âm lượng lên/xuống. PHẢI có bao âm (gain ramp): cho gain nhảy thẳng từ 0
// lên là loa kêu "tách" ở đầu và cuối nốt.
function note(c, freq, startAt, dur, peak) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015)      // vào nhanh
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)      // tắt dần
  osc.connect(gain); gain.connect(c.destination)
  osc.start(startAt); osc.stop(startAt + dur + 0.02)
}

// "ting-ting" 2 nốt ĐI LÊN = tín hiệu xong việc/tích cực (đi xuống nghe như báo lỗi).
// C6 1046.5 → E6 1318.5, tổng ~0,3s. Âm lượng 0.18 = nghe rõ mà không giật mình.
export function playSuccess() {
  if (!isSoundOn()) return
  const c = getCtx()
  if (!c) return
  // Vẫn cố resume phòng khi lần mở khoá đầu trượt (iOS đôi lúc trả về suspended sau khi app
  // chạy nền rồi quay lại). Thất bại thì thôi, im lặng — KHÔNG được để văng lỗi ra màn biên lai.
  if (c.state === 'suspended') c.resume().catch(() => {})
  try {
    const t0 = c.currentTime
    note(c, 1046.5, t0, 0.12, 0.18)
    note(c, 1318.5, t0 + 0.11, 0.20, 0.18)
  } catch { /* thiết bị lạ → im lặng, đừng làm hỏng luồng tiền */ }
}
