import logoLong from '../design/logo.svg'

// ══ ẢNH QR CÓ THƯƠNG HIỆU — dùng chung cho MỌI chỗ share QR (user chốt 08-13) ══
// Nhận canvas QR trần → trả canvas mới: QR + chữ "Only Arc Testnet" + logo EZwallet.
// Dùng ở: màn Nhận (Share) và màn ShowQR (QR tự tạo / QR trong kho).
//
// ⚠️ CỐ Ý KHÔNG vẽ địa chỉ ví lên ảnh (user chốt 08-13: "gắn địa chỉ vào QR xấu lắm").
// Màn Nhận gửi địa chỉ dưới dạng TEXT kèm theo ảnh; màn ShowQR không gửi địa chỉ (người ta
// quét QR để lấy, và ở đó điều quan trọng là SỐ TIỀN chứ không phải địa chỉ).
//
// Nhãn mạng PHẢI có trên ảnh: ảnh này rời khỏi app, người nhận không còn gì khác để biết
// đây là chuỗi nào. Xem thêm luật khoá mạng ở src/qr.js.
export async function brandedQrCanvas(qrCanvas) {
  const W = 620, QR = 420, PAD = 50
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = 640
  const x = cv.getContext('2d')
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, cv.height)
  x.drawImage(qrCanvas, (W - QR) / 2, PAD, QR, QR)

  x.textAlign = 'center'
  x.fillStyle = '#0B53BF'; x.font = '600 30px sans-serif'
  x.fillText('Only Arc Testnet', W / 2, PAD + QR + 58)

  const lw = 168, lh = lw * 380 / 1160   // tỉ lệ logo.svg (viewBox 1160×380), giống ảnh biên lai
  const img = new Image()
  img.src = logoLong
  try { await img.decode() } catch {}
  x.drawImage(img, (W - lw) / 2, cv.height - 30 - lh, lw, lh)
  return cv
}

// Lưu ảnh từ canvas vào KHO ẢNH (iOS: Web Share API → "Lưu ảnh" vào Photos, không phải Files).
// Fallback (desktop/không hỗ trợ): tải file về.
//
// ⚠️ THAM SỐ `text` (08-13): kèm text thì iOS LỌC BỚT app nhận trong bảng chia sẻ (Messages có
// thể rụng). User BIẾT và CHỌN đánh đổi này cho màn Nhận: "miễn sao là cái đó share 2 thứ, not
// 1 thứ" — địa chỉ ví phải đi kèm ảnh. ĐỪNG bỏ `text` đi để "sửa" danh sách app nhận.
// Màn ShowQR thì KHÔNG truyền text (chỉ ảnh) — cũng là ý user.
export function saveImageToPhotos(canvas, filename, text) {
  canvas.toBlob(async (blob) => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/png' })
    // Kèm text (địa chỉ ví) để share vẫn mang địa chỉ; share FILE ảnh → iOS hiện "Save Image" (kho ảnh).
    const payload = text ? { files: [file], text } : { files: [file] }
    if (navigator.canShare && navigator.canShare(payload)) {
      try { await navigator.share(payload); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
