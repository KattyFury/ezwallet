import { useState } from 'react'
import Icon from './Icon'
import { t } from '../i18n'

// ══ NÚT BÁO LỖI (user chốt 2026-08-13) ══
// Icon 🐛 sát mép PHẢI, canh giữa HÀNG 1 — hiện trên MỌI màn (render 1 lần ở App.jsx, không
// nhét vào từng màn). Bấm → popup gõ mô tả → POST /api/bug → bắn thẳng vào Telegram chủ dự án.
//
// ⚠️ MÀU XÁM --color-muted-2, ĐỪNG đổi sang xanh/đỏ (user chốt sau khi cân nhắc cả 3):
//   · xanh brand = màu "bấm cái này đi" của app → nút bug sẽ tranh chỗ với nội dung chính
//     (số dư, nút Quét QR) trên MỌI màn.
//   · đỏ = màu lỗi/nguy hiểm (Exit, Sign out, cảnh báo Arc) → chấm đỏ cạnh số dư làm người
//     lớn tuổi tưởng TIỀN CỦA HỌ đang có vấn đề, trong khi app vẫn chạy bình thường.
//   xám = đúng ngôn ngữ "công cụ nằm đó, chưa dùng tới" (= icon navbar chưa chọn).
// Icon TRẦN: không nền, không viền, không đổ bóng — nó KHÔNG phải nút nổi tranh chỗ với nội dung.
//
// ⚠️ TUYỆT ĐỐI KHÔNG gom localStorage gửi lên. Chỉ 4 field dưới đây. `ez_user_token` /
// `ez_encryption_key` / `ez_refresh_token` / `ez_sync_token` lọt ra ngoài là MẤT VÍ.
// Địa chỉ ví thì gửi: nó là thông tin công khai và không có nó thì không tra được giao dịch lỗi.

// Chuỗi máy/trình duyệt gọn — KHÔNG bê nguyên userAgent (dài loằng ngoằng, đọc mệt).
function deviceInfo() {
  const ua = navigator.userAgent || ''
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'khác'
  const br = /CriOS|Chrome/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox'
    : /Safari/.test(ua) ? 'Safari' : 'khác'
  // standalone = đã thêm vào màn hình chính (PWA) — hành vi share/âm thanh/localStorage khác hẳn
  // tab Safari thường, nên PHẢI biết khi đọc báo lỗi.
  const pwa = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  return `${os} · ${br} · ${window.innerWidth}×${window.innerHeight}${pwa ? ' · PWA' : ''}`
}

export default function BugButton({ screen }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [state, setState] = useState('')   // '' | 'sending' | 'sent' | <chuỗi lỗi>

  function close() { setOpen(false); setText(''); setState('') }

  async function send() {
    if (!text.trim() || state === 'sending') return
    setState('sending')
    try {
      const r = await fetch('/api/bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          screen,
          wallet: localStorage.getItem('ez_wallet_addr') || '',
          device: deviceInfo(),
          version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
        }),
      })
      if (r.ok) { setState('sent'); setTimeout(close, 1600); return }
      const d = await r.json().catch(() => ({}))
      // Nói rõ từng loại hỏng — "có lỗi xảy ra" chung chung thì user báo lại cũng vô ích.
      setState(d.error === 'bug-report-disabled' ? t('Chưa cấu hình gửi báo lỗi')
        : d.error === 'rate-limited' ? t('Bạn đã gửi quá nhiều, thử lại sau 1 giờ')
        : t('Gửi thất bại, thử lại'))
    } catch {
      setState(t('Gửi thất bại, thử lại'))
    }
  }

  return (
    <>
      {/* absolute trong khung .app-frame (App.jsx) → neo đúng mép phải của KHUNG APP, không phải
          mép màn hình. top 5dvh = tâm hàng 1 (10 hàng đều nhau). right 20px = đúng lề .screen. */}
      <button onClick={() => setOpen(true)} aria-label={t('Báo lỗi')}
        style={{
          position: 'absolute', top: '5dvh', right: 20, transform: 'translateY(-50%)', zIndex: 50,
          background: 'none', border: 'none', padding: 8, cursor: 'pointer', display: 'flex',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <Icon name="bug" size="var(--is-body)" color="var(--color-muted-2)" />
      </button>

      {open && (
        <div className="popup-overlay" onClick={close}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">{t('Báo lỗi')}</div>
            {/* Nói TRƯỚC là gửi kèm gì — đừng để user phát hiện sau khi đã bấm gửi. */}
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', lineHeight: 1.35 }}>
              {t('Gửi kèm: màn hình bạn đang mở, địa chỉ ví, loại máy. Không gửi mật khẩu hay khoá ví.')}
            </span>
            <textarea
              className="address-input" autoFocus value={text} maxLength={1000}
              onChange={e => setText(e.target.value)}
              placeholder={t('Lỗi gì vậy?')}
              style={{ fontSize: 'var(--fs-body)', minHeight: 96, resize: 'none', lineHeight: 1.35, fontFamily: 'inherit' }}
            />
            {state && state !== 'sending' && (
              <span style={{ fontSize: 'var(--fs-label)', color: state === 'sent' ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {state === 'sent' ? t('Đã gửi, cảm ơn bạn!') : state}
              </span>
            )}
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={close}>{t('Hủy')}</button>
              <button className="btn btn-primary" disabled={!text.trim() || state === 'sending'} onClick={send}>
                {state === 'sending' ? t('Đang gửi...') : t('Gửi')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
