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
      <div className="row-1 col" style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Số dư khả dụng</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-bold)' }}>{fmtVND(MOCK_VND)}</span>
      </div>

      <div className="row-2 center">
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-gray)' }}>
          Số dư thực tế: {fmtVND(MOCK_VND)}
        </span>
      </div>

      <div className="row-3 center" style={{ gap: 12, justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" style={{ flex: 1, height: 40, fontSize: 'var(--fs-label)' }}
          onClick={() => navigate('Deposit')}>
          Nạp tiền
        </button>
        <button className="btn btn-secondary" style={{ flex: 1, height: 40, fontSize: 'var(--fs-label)', opacity: 0.4 }} disabled>
          Rút tiền
        </button>
      </div>

      <div className="row-4-9 col">
        {ITEMS.map(({ id, Icon, label }) => (
          <button key={id} className="menu-item" onClick={() => navigate(id)}>
            <Icon size={20} />
            <span style={{ flex: 1, fontSize: 'var(--fs-content)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
            <IconChevron size={16} />
          </button>
        ))}
      </div>

      <NavBar active="MenuScreen" />
    </div>
  )
}
