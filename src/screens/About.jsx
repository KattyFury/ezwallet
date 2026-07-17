import { useNav } from '../nav'
import Icon from '../components/Icon'
import { t } from '../i18n'

const VERSION = '0.1.0'

const ITEMS = [
  { label: 'Ứng dụng', value: 'EZwallet' },
  { label: 'Phiên bản', value: VERSION },
  { label: 'Mạng', value: 'Arc Testnet' },
  { label: 'Ví', value: 'Circle Wallet' },
  { label: 'GitHub', value: 'KattyFury/ezwallet', link: 'https://github.com/KattyFury/ezwallet' },
  { label: 'Điều khoản sử dụng', link: 'https://www.circle.com/en/legal/privacy-policy' },
  { label: 'Chính sách bảo mật', link: 'https://www.circle.com/en/legal/privacy-policy' },
]

export default function About() {
  const { navigate } = useNav()

  // VALUE lên fs-item 17 (user 07-17f: About + Security "nội dung hơi nhỏ" — trước fs-label 15)
  const LABEL = { flex: 1, fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }
  const VALUE = { fontSize: 'var(--fs-item)', color: 'var(--color-muted)', maxWidth: '55%', textAlign: 'right', wordBreak: 'break-word' }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('About')}
      </div>

      {/* BOX XÁM chung hàng 2-8 (user chốt 07-17f); trong box KHÔNG line xám ngăn cách (luật cũ giữ). */}
      <div style={{ gridRow: '2 / 9', background: 'var(--color-surface)', borderRadius: 20, padding: '4px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', minWidth: 0 }}>
        {ITEMS.map(({ label, value, link }) => (
          link ? (
            <button key={label} className="menu-item" onClick={() => window.open(link, '_blank')}>
              <span style={LABEL}>{t(label)}</span>
              {value && <span style={VALUE}>{value}</span>}
              <Icon name="right2" size="var(--is-md-lg)" color="var(--color-faint)" />
            </button>
          ) : (
            <div key={label} className="menu-item">
              <span style={LABEL}>{t(label)}</span>
              <span style={VALUE}>{value}</span>
            </div>
          )
        ))}
      </div>

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
