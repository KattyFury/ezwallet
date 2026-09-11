import { useState, useEffect } from 'react'
import NavBar from '../components/NavBar'
import BalanceHeader from '../components/BalanceHeader'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { getDisplayCurrency, fmtDisplay } from '../data'
import { getTokenBalances, getDisplayRates, cachedBalances, cachedRates } from '../chain'
import { ensureWalletAddress } from '../circle'
import NotifArea, { NOTIF_FS } from '../components/NotifArea'

// USDC (left) and $98.59 (right) must share the SAME font and the SAME colour - one shared style object
// so they cannot drift apart (rather than two declarations where it is easy to change only one).
// Weight = Semibold, 18px (2026-09-10, up from Regular/24px 09-08) - the current Figma file draws each
// token as its OWN white card (not a shared divided list), name + amount both Semibold 18.
const TOKEN_TEXT_STYLE = { fontFamily: 'var(--font-condensed)', fontSize: '18px', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }

// Small solid triangle (▲/▼) signalling the token's 24h price move (user request 08-25) - a plain CSS/SVG
// shape rather than a shared Icon.jsx entry since it is only ever used here, right next to the amount.
// Green = up, red = down (the app's existing received/lost colours). Flat (<0.005%) → nothing to signal, hide it.
function TrendArrow({ pct }) {
  if (pct == null || Math.abs(pct) < 0.005) return null
  const up = pct > 0
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
      <path d={up ? 'M5 0 L10 10 L0 10 Z' : 'M0 0 L10 0 L5 10 Z'} fill={up ? 'var(--color-primary)' : 'var(--color-error)'} />
    </svg>
  )
}

function pctStr(pct) { return (pct > 0 ? '+' : '') + pct.toFixed(2) + '%' }

// The arrow is for VOLATILE tokens only (user correction 08-25: "stablecoin thì đâu có biến động" - USDC/EURC
// are pegged 1:1 and showing a jittery ±0.01% arrow on them is noise, not signal). Everything in TOKENS that
// is not a stablecoin gets it - today that is only cirBTC.
const STABLECOINS = ['USDC', 'EURC']
const isVolatile = symbol => !STABLECOINS.includes(symbol)

// Matches the "Send" button in Contacts.jsx (height 40, fs-item, Barlow medium - .btn) so both come from the same
// design system. The width is NOT fixed - it hugs its content.
// PRESS AND HOLD (not a sticky toggle): by default it shows $ (which everyday users understand);
// holding reveals the real token amounts; releasing returns to $ - so nobody flips it, forgets, and is left
// staring at "0.0001 cirBTC" with no idea what it means.
// SHAPE (2026-09-10, measured off the Figma render, not guessed): this is a HALF-oval, not a pill.
// Sampling the white run row by row gives width 183 at y=374 growing to 258 at y=412, then the shape is
// cut off at y=414 - which is exactly the grey box's bottom edge, below which the page is white so the
// rest of the shape is invisible. Fitting that curve gives a 258-wide box, top at 374, corner radius 38 on
// the TOP CORNERS ONLY, square at the bottom. It lives INSIDE the grey box (bottom: 0) with the box
// clipping it, so its shadow falls only on the grey and never onto the white page below.
export function ShowTokensButton({ onHoldStart, onHoldEnd }) {
  return (
    <button
      onMouseDown={onHoldStart}
      onMouseUp={onHoldEnd}
      onMouseLeave={onHoldEnd}
      onTouchStart={onHoldStart}
      onTouchEnd={onHoldEnd}
      onTouchCancel={onHoldEnd}
      onContextMenu={e => e.preventDefault()}
      style={HALF_OVAL_STYLE}
      aria-label={'Hold to show token amounts'}
    >
      Hold to show tokens
    </button>
  )
}

// Shared by "Hold to show tokens" (Send) and "Tap to copy your address" (Receive) - the Figma draws both
// at the identical 258×40 half-oval, so they stay one definition rather than two that can drift.
export const HALF_OVAL_STYLE = {
  position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', zIndex: 10,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 'min(66.15vw, calc(var(--screen-max) * 0.6615))', height: 40,
  borderRadius: '38px 38px 0 0', border: 'none', background: 'var(--color-white)',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.4)',
  padding: '0 18px', overflow: 'hidden', textOverflow: 'ellipsis',
  color: 'var(--color-content)', fontFamily: 'var(--font-condensed)', fontSize: '16px',
  fontWeight: 'var(--fw-semibold)', cursor: 'pointer', whiteSpace: 'nowrap',
  WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
}

export default function HomeSend() {
  const { navigate } = useNav()
  // Seeded from the module-level cache → switching screens shows the number IMMEDIATELY (no "..." flash), with a background fetch updating it.
  const seedTokens = cachedBalances(localStorage.getItem('ez_wallet_addr'))
  const [tokens, setTokens] = useState(seedTokens || [])
  const [loading, setLoading] = useState(!seedTokens)
  const cur = getDisplayCurrency()
  const [rates, setRates] = useState(cachedRates)
  // ONE toggle for the whole list (no longer per token): false by default = show $; press and hold
  // ShowTokensButton → true = show the real token amounts; release → back to $.
  const [showToken, setShowToken] = useState(false)
  // Which token's 24h-change popup is open (holds the token so the popup keeps working even if the list refreshes)
  const [pctPopup, setPctPopup] = useState(null)

  // Reading balances: on failure RETRY, and NEVER fall back to 0.
  // Bug 07-16: `.catch(console.error).finally(() => setLoading(false))` - a failed fetch with no cache yet
  // → tokens=[] + loading=false → totalUsd=0 → the screen confidently drew "$0.00" (an INVENTED balance). Now a failure
  // KEEPS the loading state ("…") and retries every 3s until a REAL number arrives.
  useEffect(() => {
    let cancelled = false
    let timer = null
    ensureWalletAddress().then(addr => {
      if (cancelled) return
      if (!addr) { setLoading(false); return }
      const load = () => getTokenBalances(addr)
        .then(ts => { if (!cancelled) { setTokens(ts); setLoading(false) } })
        .catch(() => { if (!cancelled) timer = setTimeout(load, 3000) })
      load()
    })
    getDisplayRates().then(setRates).catch(() => setRates(r => r || { USDC: 1, EURC: 1.08 }))
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const totalUsd = tokens.reduce((s, t) => s + t.usd, 0)

  return (
    <div className="screen">
      <BalanceHeader totalUsd={totalUsd} loading={loading} />

      {/* GREY BOX = ROWS 2-5 of the guideline grid (86-414px of 844 → top 10.19dvh, height 38.86dvh),
          inset 6.45% = the 12-column grid's cols 2-11 plus their outer gutters. Each token is its OWN
          WHITE rounded-16 card (48px tall, 10px gap = the cards are cols 2-11 exactly, the box's 8px
          padding being the gutter). overflow:hidden so the half-oval button below is clipped at the box's
          bottom edge - shadow included, exactly as the design draws it. */}
      <div style={{
        position: 'absolute', left: '6.45%', right: '6.45%', top: '10.19dvh', height: '38.86dvh',
        background: 'var(--color-surface)', borderRadius: 20, padding: '10px 8px 0', minWidth: 0,
        overflow: 'hidden',
      }}>
        {/* .scroll-hidden, NOT .scroll-thin - that class's margin-right:-20px trick pushes content past this
            box's own 8px right padding and gets clipped by the box's overflow:hidden, gluing the white cards
            to the right edge with no gap (iOS doesn't support scrollbar-gutter to compensate - the same bug
            class already documented and avoided in SavedQRList.jsx). */}
        <div className="scroll-hidden" style={{
          display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: '100%', paddingBottom: 44,
          WebkitMaskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
          maskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
        }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-content-1)', padding: '0 2px' }}>Loading...</div>
        ) : tokens.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-content-1)', padding: '0 2px' }}>
            No tokens yet
          </div>
        ) : (
          <>
            {tokens.map(tk => (
              <div key={tk.symbol} style={{
                display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
                height: 48, borderRadius: 16, background: 'var(--color-white)', padding: '0 10px',
              }}>
                <img
                  src={`/tokens/${tk.symbol.toLowerCase()}.png`}
                  alt=""
                  style={{ width: 27, height: 27, borderRadius: '50%', flexShrink: 0 }}
                  onError={e => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="token-icon" style={{ width: 27, height: 27, background: tk.color, flexShrink: 0, display: 'none' }}>{tk.symbol.slice(0, 2)}</div>

                <span style={TOKEN_TEXT_STYLE}>{tk.symbol}</span>

                {/* SAME font/size/weight as "USDC" on the left (TOKEN_TEXT_STYLE), brand-blue colour - follows the
                    shared toggle above. The 24h trend arrow (user request 08-25) is VOLATILE TOKENS ONLY - not USDC/EURC, they are
                    stablecoins. When it applies, it sits in a fixed 15px gap right after the amount (marginLeft:15
                    on the arrow itself, nothing added on top) - no arrow for a token → no gap, the amount sits
                    flush at the row's edge exactly as before this feature existed. */}
                <span style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                  {/* Brand-blue (matching the new Figma file's black-label/blue-value pattern used everywhere
                      else in the app - Available:/Balance:/Fee:/Rate: lines) - same font/size/weight as the
                      name on the left (TOKEN_TEXT_STYLE), only the colour differs. */}
                  <span style={{ ...TOKEN_TEXT_STYLE, color: 'var(--color-brand)' }}>
                    {showToken
                      ? tk.amount.toFixed(tk.symbol === 'cirBTC' ? 4 : 2)
                      : (rates ? fmtDisplay(tk.usd, cur, rates) : '…')}
                  </span>
                  {rates && isVolatile(tk.symbol) && tk.change24h != null && Math.abs(tk.change24h) >= 0.005 && (
                    // padding 6 = a bigger touch target than the 10px triangle alone; the negative margin cancels
                    // it on 3 sides (no added width/height) and on the left leaves EXACTLY 15px from the amount
                    // (9px margin + 6px padding = 15, not 15+6 - the touch target must not widen the visible gap).
                    <button onClick={() => setPctPopup(tk)} aria-label={`24h price change for ${tk.symbol}`}
                      style={{ background: 'none', border: 'none', padding: 6, margin: '-6px -6px -6px 9px', display: 'flex', cursor: 'pointer' }}>
                      <TrendArrow pct={tk.change24h} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </>
        )}
        </div>

        {/* INSIDE the grey box so the box clips its lower half + shadow - that clipping is what makes it
            read as a half-oval sitting on the box's bottom edge. */}
        {tokens.length > 0 && (
          <ShowTokensButton onHoldStart={() => setShowToken(true)} onHoldEnd={() => setShowToken(false)} />
        )}
      </div>

      {/* GREY WRAPPER CARD = ROWS 6-8 of the guideline grid (430-672px of 844), same inset as the box
          above, wrapping the whole notification/hint area. */}
      <div style={{
        position: 'absolute', left: '6.45%', right: '6.45%', top: '50.95dvh', height: '28.67dvh',
        background: 'var(--color-surface)', borderRadius: 20, padding: '10px 8px',
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <NotifArea
          // Each line = one COMPLETE SENTENCE whose underlined keyword is TAPPABLE → going where the button of the same
          // name in row 9 goes (user decision 07-21).
          hints={[
            { label: 'Paste', desc: 'Paste a wallet address to send' },
            { label: 'Scan QR', desc: 'Scan a QR code to send' },
            { label: 'Contacts', desc: 'Save people you send to often' },
          ]}
          warning={
            // Threshold raised 1 → 20 (user decision 2026-09-11): "under 20 USDC" now covers the old
            // "just-created empty wallet" case too, not a separate rule - it disappears again only once
            // the balance is OVER 20. Same non-dismissible standing-hint treatment as the network/QR
            // Storage/Create QR/Share hints above (no X button - see NotifArea.jsx's warning branch).
            !loading && (tokens.find(tk => tk.symbol === 'USDC')?.amount ?? 0) <= 20 ? (
              <div onClick={() => { const a = localStorage.getItem('ez_wallet_addr'); if (a) { try { navigator.clipboard.writeText(a) } catch {} } localStorage.setItem('ez_faucet_pending', String(Date.now())); window.open('https://faucet.circle.com/', '_blank') }}
                style={{ width: '100%', background: 'var(--color-white)', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                {/* White card + warning-coloured icon/text (user correction 2026-09-11: this was a pale-yellow
                    card with BLACK body text - wrong, it must match the same "white card, one solid type
                    colour for icon+text together" rule the real notification rows already use (STYLE.received/
                    sent/error in NotifArea.jsx), not HintBlock's black-body/coloured-keyword pattern. */}
                <Icon name="warning" size="var(--is-content-2)" color="var(--color-warning)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: NOTIF_FS, color: 'var(--color-warning)' }}>Out of USDC for transaction fees</span>
                  <span style={{ fontSize: NOTIF_FS, color: 'var(--color-warning)' }}>
                    {'Tap to get testnet USDC from'}{' '}
                    <span style={{ fontWeight: 'var(--fw-semibold)', textDecoration: 'underline' }}>Faucet</span>
                  </span>
                </div>
              </div>
            ) : null
          }
        />
      </div>

      {/* ABSOLUTE at the exact Figma centre (723.18px of 844 = 85.68dvh, nodes 1:338-1:340) - the old
          row-9 + align-self:end placement sat ~12px too high. Swap.jsx still uses the row-9 flow variant. */}
      <div className="action-grid" style={{ position: 'absolute', left: '6.45%', right: '6.45%', top: '85.68dvh', transform: 'translateY(-50%)', marginBottom: 0 }}>
        {/* Left→right order: Paste · Scan QR · Contacts (user decision 07-23: Contacts is used more
            often → on the RIGHT; the NotifArea hint uses the same order). Icon sizes 19.5/24 (2026-09-10,
            up from --is-item 17) match the side/centre pills exactly. */}
        <button className="action-card" onClick={() => navigate('PasteAddress')}><Icon name="copy" size={19.5} /><span>Paste</span></button>
        <button className="action-card primary" onClick={() => navigate('QRScanner')}><Icon name="scan" size={24} color="var(--color-white)" /><span>Scan QR</span></button>
        <button className="action-card" onClick={() => navigate('Contacts')}><Icon name="human" size={19.5} /><span>Contacts</span></button>
      </div>

      <NavBar active="HomeSend" />

      {/* 24h price-change popup (user request 08-25) - standard .popup-card, closes on outside click or the X. */}
      {pctPopup && rates && (
        <div className="popup-overlay" onClick={() => setPctPopup(null)}>
          <div className="popup-card" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <button onClick={() => setPctPopup(null)} aria-label="Close"
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Icon name="x" size="var(--is-content-2)" color="var(--color-muted)" />
            </button>
            <div className="popup-title">{pctPopup.symbol}</div>
            <div style={{ fontSize: 'var(--fs-content-1)', color: 'var(--color-content)' }}>
              {'24h price change: '}
              <span style={{ fontWeight: 'var(--fw-medium)', color: pctPopup.change24h > 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {pctStr(pctPopup.change24h)}
              </span>
            </div>
            <div style={{ fontSize: 'var(--fs-content-1)', color: 'var(--color-content)' }}>
              {`Value changed from ${fmtDisplay(pctPopup.usd / (1 + pctPopup.change24h / 100), cur, rates)} to ${fmtDisplay(pctPopup.usd, cur, rates)}`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
