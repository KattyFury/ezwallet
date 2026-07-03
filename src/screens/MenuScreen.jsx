import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { getTokenBalances } from '../chain'
import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import { t } from '../i18n'

const ITEMS = [
  { id: 'TxHistory', icon: 'clock',  label: 'Lịch sử giao dịch' },
  { id: 'Language',  icon: 'globe',  label: 'Tiền tệ' },
  { id: 'Security',  icon: 'shield', label: 'Bảo mật' },
  { id: 'About',     icon: 'info',   label: 'About' },
]

export default function MenuScreen() {
  const { navigate } = useNav()
  const [totalVND, setTotalVND] = useState(0)
  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    if (addr) getTokenBalances(addr).then(ts => setTotalVND(ts.reduce((s, t) => s + t.vnd, 0)))
  }, [])

  return (
    <div className="screen">
      {/* Rows 1-2: Số dư (đồng bộ với HomeSend / HomeReceive) */}
      <BalanceHeader totalVND={totalVND} loading={false} />

      {/* Row 3: Nạp / Rút */}
      <div className="row-3" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.4 }} disabled>
          {t('Rút tiền')}
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }}
          onClick={() => window.open('https://faucet.circle.com/', '_blank')}>
          {t('Nạp tiền')}
        </button>
      </div>

      {/* Rows 4-7: menu items */}
      {ITEMS.map(({ id, icon, label }, i) => (
        <div key={id} className={`row-${i + 4}`} style={{ display: 'flex', alignItems: 'center' }}>
          <button className="menu-item" style={{ width: '100%' }} onClick={() => navigate(id, { title: label })}>
            <Icon name={icon} size={24} color="var(--color-content)" />
            <span style={{ flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{t(label)}</span>
            <Icon name="right2" size={15} color="var(--color-faint)" />
          </button>
        </div>
      ))}

      {/* Row 8: Đăng xuất */}
      <div className="row-8" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" style={{ width: '100%' }} onClick={() => {
          ['ez_user_token','ez_wallet_addr','ez_wallet_id','ez_encryption_key','ez_email','ez_notifs','ez_last_recv_ts','ez_email_history'].forEach(k => localStorage.removeItem(k))
          window.location.reload()
        }}>
          <Icon name="out" size={24} color="var(--color-error)" />
          <span style={{ flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)', color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)' }}>{t('Đăng xuất')}</span>
        </button>
      </div>

      <NavBar active="MenuScreen" />
    </div>
  )
}
