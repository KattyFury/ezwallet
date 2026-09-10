import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import { getTokenBalances, cachedBalances } from '../chain'
import { useState, useEffect } from 'react'
import { useNav } from '../nav'

// ⛔ 'Service Hub' REMOVED FROM HERE 08-13 (user decision): it is already TAB 1 of the NavBar, and a second door
// in the Menu means two ways into one place - redundant for everyday users. The navbar is the way in.
// (This entry used to live here, disabled, from 07-31 when there was no real screen yet.)
const ITEMS = [
  { id: 'TxHistory', label: 'Transaction history' },
  { id: 'Security',  label: 'Security' },
  { id: 'Currency',  label: 'Language & currency' },   // split off Security 08-04; the Language part dropped 08-25, label reworded 08-25
  { id: 'About',     label: 'About' },
]

// Small filled right-pointing triangle bullet (node "Polygon 6"/"Polygon 13" in the current Figma file,
// 2026-09-10) - REPLACES the old leading category icon (clock/shield/globe/info) + trailing chevron.
// The redesigned row is bullet + label only, no per-item glyph, no arrow - drawn inline (not added to
// Icon.jsx) since this exact shape is only ever used here.
function Bullet({ color }) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" style={{ flexShrink: 0 }}>
      <path d="M0 0 L14 8 L0 16 Z" fill={color} />
    </svg>
  )
}

// Top up: copy the wallet address to the clipboard then open the Faucet → the user only has to paste it there.
function copyAddrThenFaucet() {
  const addr = localStorage.getItem('ez_wallet_addr')
  if (addr) { try { navigator.clipboard.writeText(addr) } catch {} }
  window.open('https://faucet.circle.com/', '_blank')
}

export default function MenuScreen() {
  const { navigate } = useNav()
  // Seed the total balance from cache → no "..." when switching screens. NO cache yet → null (NOT KNOWN YET),
  // NOT 0: bug 07-16 used 0 as the initial value + a hardcoded loading={false} → the screen confidently drew
  // "$0.00" while still loading ("switching screens makes my money go to 0 0 0").
  // null → BalanceHeader shows "…" until a REAL number arrives.
  const [totalUsd, setTotalUsd] = useState(() => { const c = cachedBalances(localStorage.getItem('ez_wallet_addr')); return c ? c.reduce((s, t) => s + t.usd, 0) : null })
  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    // catch: on a failed read KEEP the old number, never let it collapse to 0 (getTokenBalances now throws instead of inventing 0)
    if (addr) getTokenBalances(addr).then(ts => setTotalUsd(ts.reduce((s, t) => s + t.usd, 0))).catch(() => {})
  }, [])

  return (
    <div className="screen">
      {/* Rows 1-2: Balance (same as HomeSend / HomeReceive) */}
      <BalanceHeader totalUsd={totalUsd} loading={totalUsd === null} />

      {/* ABSOLUTE, not className="row-2" (2026-09-10): BalanceHeader's own cell already spans grid-row
          1/3 (rows 1-2), so a SECOND item explicitly placed at row-2 would occupy the same grid track -
          CSS Grid resolves that overlap by silently inserting an extra implicit column and splitting
          every row's width, which quietly squeezed every menu row below into ~133px and forced their
          labels onto 2 lines. Going absolute sidesteps the grid entirely AND lands exactly on the
          Figma centre (14.3dvh, node 1:29/1:30) instead of only approximating it via a grid cell.
          Glow shadow (0 0 8px rgba(0,0,0,.48)) matches every button rebuilt today. */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '14.3dvh', transform: 'translateY(-50%)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.4, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)', fontSize: 18 }} disabled>
          Withdraw
        </button>
        <button className="btn btn-primary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)', fontSize: 18 }} onClick={copyAddrThenFaucet}>
          Deposit
        </button>
      </div>

      {/* Rows 3-6 (up from 4-7, same reason as the button row above): a small triangle bullet + label,
          no leading category icon, no trailing chevron - matching the current Figma file's menu rows
          exactly (it draws only a Polygon bullet before each label). A thin divider DOES sit under each
          of these 4 rows (2026-09-10 correction: the earlier build dropped it, trusting the structured
          node list over the rendered screenshot - the screenshot was right, the line is real, it is just
          baked into the frame's background image rather than a separate exported node). No divider under
          Sign out below - it is the last row. */}
      {ITEMS.map(({ id, label, disabled }, i) => (
        <div key={id} className={`row-${i + 3}`} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-gray)' }}>
          <button className="menu-item" style={{ width: '100%', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled} onClick={disabled ? undefined : () => navigate(id, { title: label })}>
            <Bullet color="var(--color-brand)" />
            <span style={{ flex: 1, fontSize: 18, fontWeight: 'var(--fw-semibold)' }}>{label}</span>
          </button>
        </div>
      ))}

      {/* Row 7 (up from row-8): Sign out. Service Hub removed 08-13 → rows 8-9 stay empty as the gap
          before the NavBar. */}
      <div className="row-7" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" style={{ width: '100%' }} onClick={() => {
          // KEEP ez_email_history (the email suggestion when signing back in - the user reported losing the hint). Clear the
          // Google session too (refreshToken/email/method) for a clean sign-out; keep deviceId (it identifies the machine).
          ;['ez_user_token','ez_wallet_addr','ez_wallet_id','ez_encryption_key','ez_email','ez_notifs','ez_last_recv_ts','ez_refresh_token','ez_google_email','ez_login_method'].forEach(k => localStorage.removeItem(k))
          sessionStorage.removeItem('ez_pin_ok')   // signing in again must go through the PIN gate
          sessionStorage.removeItem('ez_sync_token')   // the backup token is tied to this session's PIN signature
          window.location.reload()
        }}>
          <Bullet color="var(--color-error)" />
          <span style={{ flex: 1, fontSize: 18, fontWeight: 'var(--fw-semibold)', color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)' }}>Sign out</span>
        </button>
      </div>

      <NavBar active="MenuScreen" />
    </div>
  )
}
