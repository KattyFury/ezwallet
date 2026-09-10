import { useNav } from '../nav'
import Icon from '../components/Icon'

const VERSION = '0.1.0'

// node 1:293-1:299, RE-VERIFIED 2026-09-10: 7 rows, each occupying its OWN full 70px grid row (2-8) -
// row centres 121/207/293/379/465/551/637px of 844 → the exact same row-centre values Menu.jsx's ITEMS
// already use (24.53/34.72/44.91/55.09dvh etc, same shared grid), extended two rows further since About
// has 7 items where Menu has 4. Unlike Security/Currency (2-3 items packed at the TOP of the same tall
// card), About's 7 items fill the whole 586px card - no leftover blank space either way.
const ITEMS = [
  { label: 'App', value: 'EZwallet', top: '14.34dvh' },
  { label: 'Version', value: VERSION, top: '24.53dvh' },
  { label: 'Network', value: 'Arc Testnet', top: '34.72dvh' },
  { label: 'Wallet', value: 'Circle Wallet', top: '44.91dvh' },
  { label: 'Github', link: 'https://github.com/KattyFury/ezwallet', top: '55.09dvh' },
  { label: 'Term of use', link: 'https://www.circle.com/en/legal/privacy-policy', top: '65.28dvh' },
  { label: 'Privacy policy', link: 'https://www.circle.com/en/legal/privacy-policy', top: '75.47dvh' },
]

export default function About() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        About
      </div>

      {/* Card - node 1:292: rows 2-8 (340x586, radius 16 - was 20, gridRow-based instead of this exact
          top/height). */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '10.19dvh', height: '69.43dvh', background: 'var(--color-surface)', borderRadius: 16 }} />

      {ITEMS.map(({ label, value, link, top }) => (
        link ? (
          // Link rows (Github/Term of use/Privacy policy) - node 1:297-1:302: an arrow icon at 7.95%,
          // text starting at 15.13% (after the icon), both 18px semibold black.
          <button key={label} onClick={() => window.open(link, '_blank')}
            style={{ position: 'absolute', left: '7.95%', right: '9.23%', top, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <Icon name="right2" size="var(--is-item)" color="var(--color-brand)" />
            <span style={{ fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-black)' }}>{label}</span>
          </button>
        ) : (
          // Plain rows (App/Version/Network/Wallet) - node 1:293-1:296: label at 9.23%, 18px semibold
          // black. Figma's static mock draws no value at all for these (nothing to measure) - the value
          // is real functional info the app must still show, right-aligned at the mirrored 9.23% inset,
          // 16px muted-2 matching the "Label:"-line value colour used everywhere else in the app.
          <div key={label} style={{ position: 'absolute', left: '9.23%', right: '9.23%', top, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 'var(--fw-semibold)', flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 16, color: 'var(--color-muted-2)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
          </div>
        )
      ))}

      <div className="row-10 row10-single">
        <button className="btn btn-primary" onClick={() => navigate('MenuScreen')}>Back</button>
      </div>
    </div>
  )
}
