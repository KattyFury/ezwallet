import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { getTokenBalances, cachedBalances } from '../chain'
import { useState, useEffect } from 'react'
import { useLogout } from '@privy-io/react-auth'
import { useNav } from '../nav'
import { clearLoginData } from '../privy'

// ⛔ 'Service Hub' REMOVED FROM HERE 08-13 (user decision): it is already TAB 1 of the NavBar, and a second door
// in the Menu means two ways into one place - redundant for everyday users. The navbar is the way in.
// (This entry used to live here, disabled, from 07-31 when there was no real screen yet.)
const ITEMS = [
  { id: 'TxHistory',  icon: 'clock', label: 'Transaction history' },
  { id: 'Security',   icon: 'shield', label: 'Security' },
  { id: 'Currency',   icon: 'globe', label: 'Language & Currency' },   // split off Security 08-04; the Language part dropped 08-25, label reworded 08-25
  { id: 'About',      icon: 'info',  label: 'About' },
]

// Top up: copy the wallet address to the clipboard then open the Faucet → the user only has to paste it there.
function copyAddrThenFaucet() {
  const addr = localStorage.getItem('ez_wallet_addr')
  if (addr) { try { navigator.clipboard.writeText(addr) } catch {} }
  window.open('https://faucet.circle.com/', '_blank')
}

export default function MenuScreen() {
  const { navigate } = useNav()
  const { logout } = useLogout()
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

      {/* Row 3: Top up / Withdraw */}
      <div className="row-3" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.4 }} disabled>
          Withdraw
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={copyAddrThenFaucet}>
          Deposit
        </button>
      </div>

      {/* Rows 4-7: menu items (4 of them). Anything with `disabled` is dimmed and not tappable. */}
      {ITEMS.map(({ id, icon, label, disabled }, i) => (
        <div key={id} className={`row-${i + 4}`} style={{ display: 'flex', alignItems: 'center' }}>
          <button className="menu-item" style={{ width: '100%', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled} onClick={disabled ? undefined : () => navigate(id, { title: label })}>
            {/* Leading icon = brand blue (the Swap language, user decision 07-17e); Sign out stays red for meaning */}
            <Icon name={icon} size="var(--is-md-lg)" color="var(--color-brand)" />
            <span style={{ flex: 1, fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)' }}>{label}</span>
            {!disabled && <Icon name="right2" size="var(--is-md-lg)" color="var(--color-brand)" />}
          </button>
        </div>
      ))}

      {/* Row 8: Sign out (the 4 ITEMS take rows 4-7). Service Hub removed 08-13 → back to exactly the layout
          before 07-31, with row 9 left empty as the gap before the NavBar. */}
      <div className="row-8" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="menu-item" style={{ width: '100%' }} onClick={async () => {
          // ⚠️ CLEARING OUR OWN KEYS IS NOT ENOUGH ANY MORE (2026-08-30). Under Circle, wiping
          // `ez_user_token` genuinely ended the session - it WAS the session. Privy keeps its own
          // session in its own storage, so without `logout()` the reload below would find the user
          // still signed in and walk them straight back into the wallet they just left.
          // `clearLoginData` (src/privy.js) handles our side; both are needed, neither is enough.
          clearLoginData()
          // KEEP ez_email_history (the email suggestion when signing back in - the user reported losing the hint).
          ;['ez_notifs','ez_last_recv_ts'].forEach(k => localStorage.removeItem(k))
          try { await logout() } catch {}
          window.location.reload()
        }}>
          <Icon name="out" size="var(--is-md-lg)" color="var(--color-error)" />
          <span style={{ flex: 1, fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)' }}>Sign out</span>
        </button>
      </div>

      <NavBar active="MenuScreen" />
    </div>
  )
}
