import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { getTokenBalances, cachedBalances } from '../chain'
import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import { t } from '../i18n'

const ITEMS = [
  { id: 'ServiceHub', icon: 'hub',   label: 'Service Hub', disabled: true },   // nơi gom dịch vụ (của mình + thêm từ người khác) — chưa có nội dung, chưa bấm được
  { id: 'TxHistory',  icon: 'clock', label: 'Lịch sử giao dịch' },
  { id: 'Security',   icon: 'shield', label: 'Bảo mật' },
  { id: 'Language',   icon: 'globe', label: 'Language & Currency' },   // tách lại khỏi Security (08-04, user chốt)
  { id: 'About',      icon: 'info',  label: 'About' },
]

// Nạp tiền: copy địa chỉ ví vào clipboard rồi mở Faucet → user chỉ việc dán vào Faucet.
function copyAddrThenFaucet() {
  const addr = localStorage.getItem('ez_wallet_addr')
  if (addr) { try { navigator.clipboard.writeText(addr) } catch {} }
  window.open('https://faucet.circle.com/', '_blank')
}

export default function MenuScreen() {
  const { navigate } = useNav()
  // Seed tổng số dư từ cache → không "..." khi chuyển màn. CHƯA có cache → null (CHƯA BIẾT),
  // KHÔNG phải 0: bug 07-16 dùng 0 làm giá trị khởi tạo + loading={false} cứng → màn tự tin vẽ
  // "$0.00" trong lúc còn đang tải ("chuyển màn hình nó cũng làm cho số tiền về 0 0 0").
  // null → BalanceHeader hiện "…" cho tới khi có số THẬT.
  const [totalUsd, setTotalUsd] = useState(() => { const c = cachedBalances(localStorage.getItem('ez_wallet_addr')); return c ? c.reduce((s, t) => s + t.usd, 0) : null })
  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    // catch: đọc hỏng thì GIỮ số cũ, đừng để văng thành 0 (getTokenBalances giờ ném lỗi thay vì bịa 0)
    if (addr) getTokenBalances(addr).then(ts => setTotalUsd(ts.reduce((s, t) => s + t.usd, 0))).catch(() => {})
  }, [])

  return (
    <div className="screen">
      {/* Rows 1-2: Số dư (đồng bộ với HomeSend / HomeReceive) */}
      <BalanceHeader totalUsd={totalUsd} loading={totalUsd === null} />

      {/* Row 3: Nạp / Rút */}
      <div className="row-3" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.4 }} disabled>
          {t('Rút tiền')}
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={copyAddrThenFaucet}>
          {t('Nạp tiền')}
        </button>
      </div>

      {/* Rows 4-8: menu items (5 mục). Mục disabled (Service Hub) làm mờ + không bấm được. */}
      {ITEMS.map(({ id, icon, label, disabled }, i) => (
        <div key={id} className={`row-${i + 4}`} style={{ display: 'flex', alignItems: 'center' }}>
          <button className="menu-item" style={{ width: '100%', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled} onClick={disabled ? undefined : () => navigate(id, { title: label })}>
            {/* Icon dẫn đầu = brand blue (ngôn ngữ Swap, user chốt 07-17e); Sign out vẫn đỏ ngữ nghĩa */}
            <Icon name={icon} size="var(--is-md-lg)" color="var(--color-brand)" />
            <span style={{ flex: 1, fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)' }}>{t(label)}</span>
            {!disabled && <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
          </button>
        </div>
      ))}

      {/* Row 9: Đăng xuất (5 mục ITEMS chiếm row 4-8 từ khi thêm Service Hub + tách lại Language) */}
      <div className="row-9" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" style={{ width: '100%' }} onClick={() => {
          // GIỮ ez_email_history (gợi ý email lúc đăng nhập lại — user báo mất hint). Xóa cả
          // session Google (refreshToken/email/method) để đăng xuất sạch, deviceId giữ (định danh máy).
          ;['ez_user_token','ez_wallet_addr','ez_wallet_id','ez_encryption_key','ez_email','ez_notifs','ez_last_recv_ts','ez_refresh_token','ez_google_email','ez_login_method'].forEach(k => localStorage.removeItem(k))
          sessionStorage.removeItem('ez_pin_ok')   // đăng nhập lại phải qua cổng PIN
          sessionStorage.removeItem('ez_sync_token')   // token sao lưu gắn với lượt ký PIN của phiên này
          window.location.reload()
        }}>
          <Icon name="out" size="var(--is-md-lg)" color="var(--color-error)" />
          <span style={{ flex: 1, fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)' }}>{t('Đăng xuất')}</span>
        </button>
      </div>

      <NavBar active="MenuScreen" />
    </div>
  )
}
