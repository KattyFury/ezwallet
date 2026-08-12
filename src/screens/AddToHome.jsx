import { t } from '../i18n'

// MÀN CHÀO LẦN ĐẦU — hướng dẫn thêm web vào MÀN HÌNH CHÍNH. Hiện TRƯỚC cả Login/PinGate.
// Chỉ hiện khi mở bằng TRÌNH DUYỆT; đã thêm vào màn hình chính rồi thì biến mất hẳn.
//
// CỐ Ý KHÔNG dùng nút cài 1 chạm của Chrome (`beforeinstallprompt`) — user chốt 08-12: cả 2 hệ
// đều hướng dẫn bấm tay, cùng một bố cục. Được thêm 2 cái lợi: (1) iPhone vốn KHÔNG có nút 1 chạm
// nên 2 hệ khỏi lệch nhau, (2) nút 1 chạm đòi app phải có service worker — app này chưa có.

// Đã thêm vào màn hình chính → app mở ở chế độ standalone. Phải check CẢ HAI đường:
// `display-mode` là chuẩn web (Android + iOS 16.4 trở lên), `navigator.standalone` là API riêng
// của Apple — iPhone đời cũ CHỈ có cái này. Thiếu 1 trong 2 là màn chào hiện lại sau khi đã cài.
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
}

const UA = navigator.userAgent
// iPadOS 13+ khai UA là "Macintosh" → phải dò thêm maxTouchPoints mới nhận ra iPad.
const IS_IOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const IS_ANDROID = /android/i.test(UA)

const SKIP_KEY = 'ez_a2hs_skipped'

// App.jsx hỏi hàm này để biết có chèn màn chào hay không.
// Máy tính KHÔNG hiện: không có "màn hình chính" để thêm vào.
export function shouldShowAddToHome() {
  if (isStandalone()) return false
  if (localStorage.getItem(SKIP_KEY)) return false
  return IS_IOS || IS_ANDROID
}

// Ký hiệu mô phỏng đúng nút trên máy, để cạnh chữ cho người già dò theo.
const IOS_STEPS = [
  ['Mở website bằng Safari', ''],
  ['Nhấn nút Option', '•••'],
  ['Nhấn nút Share', '🡅'],
  ['Chọn Add to Home Screen', '✚'],
  ['Nhấn Add', '✔︎'],
]

const ANDROID_STEPS = [
  ['Mở website bằng Chrome', ''],
  ['Nhấn nút Menu', '⋮'],
  ['Chọn Add to Home screen', '✚'],
  ['Nhấn Install', '✔︎'],
]

export default function AddToHome({ onDone }) {
  function skip() {
    localStorage.setItem(SKIP_KEY, '1')
    onDone()
  }

  const steps = IS_IOS ? IOS_STEPS : ANDROID_STEPS

  return (
    <div className="screen">
      {/* Cụm chữ bắt đầu từ GIỮA HÀNG 3 = 25dvh viết xuống (user chốt). Absolute chứ không dùng ô
          lưới: iPhone 5 bước / Android 4 bước, để grid tự căn là mốc trên bị xê giữa 2 hệ. */}
      <div style={{ position: 'absolute', left: 20, right: 20, top: '25dvh' }}>
        <div style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-semibold)' }}>
          {t('Chào mừng đến với EZwallet.')}
        </div>

        <div style={{ fontSize: 'var(--fs-body)', marginTop: 14, lineHeight: 1.4 }}>
          {IS_IOS
            ? t('Xin hãy thêm website vào màn hình chính iPhone để sử dụng thuận tiện hơn:')
            : t('Xin hãy thêm website vào màn hình chính để sử dụng thuận tiện hơn:')}
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map(([label, sym], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 'var(--fs-body)' }}>
              <span className="num" style={{ color: 'var(--color-muted)' }}>{i + 1}.</span>
              <span style={{ minWidth: 0 }}>
                {t(label)}{sym && <span style={{ marginLeft: 6 }}>{sym}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* HÀNG 9: "Bỏ qua" = nút XANH gradient, đúng chuẩn nút đứng một mình của app (About,
          Language cũng vậy). KHÔNG tô ĐỎ: đỏ trong app này nghĩa là mất tiền/lỗi, mà bỏ qua thì
          chẳng phá gì — tô đỏ là dọa người dùng vô cớ. */}
      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={skip}>{t('Bỏ qua')}</button>
      </div>
    </div>
  )
}
