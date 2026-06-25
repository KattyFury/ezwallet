import NavBar from '../components/NavBar'
import { MOCK_VND, fmtVND } from '../data'
import { IconHistory, IconLanguage, IconSecurity, IconInfo, IconChevron } from '../icons'
import { useNav } from '../nav'

const ITEMS = [
  { id: 'TxHistory', Icon: IconHistory,  label: 'Lịch sử giao dịch' },
  { id: 'Language',  Icon: IconLanguage, label: 'Ngôn ngữ & tiền tệ' },
  { id: 'Security',  Icon: IconSecurity, label: 'Bảo mật' },
  { id: 'About',     Icon: IconInfo,     label: 'About' },
]

export default function MenuScreen() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      {/* Row 1: Số dư khả dụng */}
      <div className="row-1 col" style={{ justifyContent: 'center', borderBottom: '1px solid var(--color-gray)' }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)', lineHeight: 1.1 }}>{fmtVND(MOCK_VND)}</span>
      </div>

      {/* Row 2: Số dư thực tế */}
      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Số dư thực tế: {fmtVND(MOCK_VND)}
        </span>
      </div>

      {/* Row 3: Nạp / Rút */}
      <div className="row-3" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-primary" style={{ flex: 1 }}
          onClick={() => window.open('https://faucet.circle.com/', '_blank')}>
          Nạp tiền
        </button>
        <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.4 }} disabled>
          Rút tiền
        </button>
      </div>

      {/* Rows 4-7: menu items */}
      {ITEMS.map(({ id, Icon, label }, i) => (
        <div key={id} className={`row-${i + 4}`} style={{ display: 'flex', alignItems: 'center' }}>
          <button className="menu-item" style={{ width: '100%' }} onClick={() => navigate(id)}>
            <Icon size={20} />
            <span style={{ flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
            <IconChevron size={16} />
          </button>
        </div>
      ))}

      {/* Row 8: logout */}
      <div className="row-8 center">
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}
          onClick={() => { localStorage.clear(); window.location.reload() }}>
          Đăng xuất
        </button>
      </div>

      <NavBar active="MenuScreen" />
    </div>
  )
}
