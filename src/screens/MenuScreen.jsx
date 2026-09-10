import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import { getTokenBalances, cachedBalances } from '../chain'
import { useState, useEffect } from 'react'
import { useNav } from '../nav'

// ⛔ 'Service Hub' REMOVED FROM HERE 08-13 (user decision): it is already TAB 1 of the NavBar, and a second door
// in the Menu means two ways into one place - redundant for everyday users. The navbar is the way in.
// (This entry used to live here, disabled, from 07-31 when there was no real screen yet.)
// `top` = the row's vertical CENTRE, `rule` = the divider under it, both measured off the current Figma
// file's rendered pixels (2026-09-10): row centres 207/293/379/465/551px of 844, dividers at
// 241.5/327.5/414/500px. NOTE the divider is NOT the midpoint between two rows - it sits 34.5px under its
// own row and 51.5px above the next one, so the grid-row approximation used before was up to ~12px out.
const ITEMS = [
  { id: 'TxHistory', label: 'Transaction history', top: '24.53dvh', rule: '28.61dvh' },
  { id: 'Security',  label: 'Security',            top: '34.72dvh', rule: '38.80dvh' },
  { id: 'Currency',  label: 'Language & currency',  top: '44.91dvh', rule: '49.05dvh' },   // split off Security 08-04; the Language part dropped 08-25, label reworded 08-25
  { id: 'About',     label: 'About',               top: '55.09dvh', rule: '59.24dvh' },
]

// Shared row geometry: the bullet's left edge at x=25 (6.41%), the label starting at x=46.8 - i.e. a
// 8.8px gap after the 13px triangle. minHeight keeps a comfortable touch target around the 18px label.
const ROW_STYLE = { position: 'absolute', left: '6.41%', right: '6.41%', transform: 'translateY(-50%)', padding: 0, gap: 8.8, minHeight: 44 }

// Small filled right-pointing triangle bullet (node "Polygon 6"/"Polygon 13" in the current Figma file,
// 2026-09-10) - REPLACES the old leading category icon (clock/shield/globe/info) + trailing chevron.
// The redesigned row is bullet + label only, no per-item glyph, no arrow - drawn inline (not added to
// Icon.jsx) since this exact shape is only ever used here.
function Bullet({ color }) {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" style={{ flexShrink: 0 }}>
      <path d="M0 0 L13 7.5 L0 15 Z" fill={color} />
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

      {/* A triangle bullet + label, no leading category icon, no trailing chevron - matching the current
          Figma file's menu rows. The thin divider under each of these 4 rows is real (the 2026-09-10
          first pass dropped it, trusting the structured node list over the rendered screenshot - the
          screenshot was right; the line is simply baked into the frame's background image instead of
          being its own exported node). No divider under Sign out - it is the last row. */}
      {ITEMS.map(({ id, label, top, rule, disabled }) => (
        <div key={id}>
          <button className="menu-item" style={{ ...ROW_STYLE, top, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled} onClick={disabled ? undefined : () => navigate(id, { title: label })}>
            <Bullet color="var(--color-brand)" />
            <span style={{ flex: 1, fontSize: 18, fontWeight: 'var(--fw-semibold)' }}>{label}</span>
          </button>
          <div style={{ position: 'absolute', left: '6.67%', right: '6.67%', top: rule, height: 1, background: 'var(--color-gray)' }} />
        </div>
      ))}

      {/* Sign out - the last row, centre 551px of 844. */}
      <div>
        <button className="menu-item" style={{ ...ROW_STYLE, top: '65.28dvh' }} onClick={() => {
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
