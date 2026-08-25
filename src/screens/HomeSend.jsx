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
const TOKEN_TEXT_STYLE = { fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-num)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }

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
// Grey background and grey text - a secondary button, less important than the content itself.
// CENTRED ON ROW 6 (below the token list in rows 3-5, ABOVE the notification area in row 7) - evenly spaced from both so
// nobody thinks this button produces the notifications. top:55% = the centre of row 6 of .screen (10 equal rows,
// row 6 = 50%→60%); translate(-50%,-50%) drops the whole button body onto that centre.
function ShowTokensButton({ onHoldStart, onHoldEnd }) {
  return (
    <button
      onMouseDown={onHoldStart}
      onMouseUp={onHoldEnd}
      onMouseLeave={onHoldEnd}
      onTouchStart={onHoldStart}
      onTouchEnd={onHoldEnd}
      onTouchCancel={onHoldEnd}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'absolute', left: '50%', top: '55%', transform: 'translate(-50%, -50%)', zIndex: 10,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 40,
        // ⚠️ WIDTH HUGS THE TEXT (user decision 08-13: "I slightly regret making it this big") - the fixed
        // 3/4-screen width from 07-29 was dropped. This pair of buttons is no longer equal because the two sentences
        // differ in length; that is intended, do not "even them up".
        // SAFE against the old 07-29 bug (text dropping to a second line on older iPhones once the width was fluid): there is
        // whiteSpace:'nowrap' below, so the text CANNOT wrap. maxWidth + ellipsis are only a safety net
        // in case some wording ends up far too long.
        maxWidth: 'min(92vw, calc(var(--screen-max) - 24px))', overflow: 'hidden', textOverflow: 'ellipsis',
        // The button sits INSIDE the grey box (the token area of 07-17f) → WHITE + GREY BORDER so it stands out on the
        // surface (user rule 07-17f: "a button inside a grey box becomes white with a grey border", like the token chips
        // on Swap). BLACK text + drop shadow (user decision 07-22f: this button must look raised and clearly tappable).
        padding: '0 18px', borderRadius: 50, border: '1.5px solid var(--color-gray)', background: 'var(--color-white)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
        color: 'var(--color-content)', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-item)',
        fontWeight: 'var(--fw-medium)', cursor: 'pointer', whiteSpace: 'nowrap',
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
      }}
      aria-label={'Hold to show token amounts'}
    >
      Hold to show tokens
    </button>
  )
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

      {/* Rows 3-5.5 (user decision 07-17f): a GREY surface BOX holding the token list - extended 5dvh further
          down into half of row 6 (height calc below; the grid does not clip the overhang) so the "Hold to show
          tokens" button (absolute top 55% = exactly the box's bottom edge) sits NEATLY INSIDE the box. Scrolling + the bottom fade live
          on the INNER DIV - putting the mask on the box would fade the grey background too and smear it into the white. */}
      <div className="row-3-5" style={{ background: 'var(--color-surface)', borderRadius: 20, padding: '12px 16px 0', height: 'calc(100% + 5dvh)', minWidth: 0 }}>
        <div className="scroll-thin" style={{
          display: 'flex', flexDirection: 'column', gap: 26, overflowY: 'auto', height: '100%', paddingTop: 2, paddingBottom: 52,
          WebkitMaskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
          maskImage: 'linear-gradient(to top, transparent 0, black calc(100dvh / 30))',
        }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>Loading...</div>
        ) : tokens.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--color-muted)', fontSize: 'var(--fs-body)', padding: '0 2px' }}>
            No tokens yet
          </div>
        ) : (
          <>
            {tokens.map(tk => (
              <div key={tk.symbol} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
                <img
                  src={`/tokens/${tk.symbol.toLowerCase()}.png`}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }}
                  onError={e => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="token-icon" style={{ background: tk.color, flexShrink: 0, display: 'none' }}>{tk.symbol.slice(0, 2)}</div>

                {/* The real token name (USDC/EURC/cirBTC) + the verified badge (the app's green) */}
                <span style={TOKEN_TEXT_STYLE}>{tk.symbol}</span>
                <Icon name="check" size="var(--is-num)" color="var(--color-primary)" />

                {/* SAME font and SAME colour as "USDC" on the left (TOKEN_TEXT_STYLE) - follows the shared toggle above.
                    The 24h trend arrow (user request 08-25) is VOLATILE TOKENS ONLY - not USDC/EURC, they are
                    stablecoins. When it applies, it sits in a fixed 15px gap right after the amount (marginLeft:15
                    on the arrow itself, nothing added on top) - no arrow for a token → no gap, the amount sits
                    flush at the row's edge exactly as before this feature existed. */}
                <span style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
                  <span style={TOKEN_TEXT_STYLE}>
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
      </div>

      {/* Floats in the middle of row 6 (position:absolute inside ShowTokensButton) - it does NOT take a row of its own */}
      {tokens.length > 0 && (
        <ShowTokensButton onHoldStart={() => setShowToken(true)} onHoldEnd={() => setShowToken(false)} />
      )}

      <div className="row-7-8" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: '2dvh' }}>
        <NotifArea
          // Each line = one COMPLETE SENTENCE whose underlined keyword is TAPPABLE → going where the button of the same
          // name in row 9 goes (user decision 07-21).
          hints={[
            { label: 'Paste', desc: 'Paste a wallet address to send' },
            { label: 'Scan QR', desc: 'Scan a QR code to send' },
            { label: 'Contacts', desc: 'Save people you send to often' },
          ]}
          warning={
            !loading && (tokens.find(tk => tk.symbol === 'USDC')?.amount ?? 0) <= 1 ? (
              <div onClick={() => { const a = localStorage.getItem('ez_wallet_addr'); if (a) { try { navigator.clipboard.writeText(a) } catch {} } localStorage.setItem('ez_faucet_pending', String(Date.now())); window.open('https://faucet.circle.com/', '_blank') }}
                style={{ width: '100%', background: 'var(--color-warning-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                {/* The icon is CENTRED-LEFT against the whole 2-line block (user decision 07-17) - not stuck to line 1 */}
                <Icon name="warning" size="var(--is-item)" color="var(--color-warning)" style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: NOTIF_FS, color: 'var(--color-content)' }}>Out of USDC for transaction fees</span>
                  <span style={{ fontSize: NOTIF_FS, color: 'var(--color-content)' }}>
                    {'Tap to get testnet USDC from'}{' '}
                    <span style={{ color: 'var(--color-warning)', textDecoration: 'underline' }}>Faucet</span>
                  </span>
                </div>
              </div>
            ) : null
          }
        />
      </div>

      <div className="row-9 action-grid">
        {/* Left→right order: Paste · Scan QR · Contacts (user decision 07-23: Contacts is used more
            often → on the RIGHT; the NotifArea hint uses the same order) */}
        <button className="action-card" onClick={() => navigate('PasteAddress')}><Icon name="copy" size="var(--is-item)" /><span>Paste</span></button>
        <button className="action-card primary" onClick={() => navigate('QRScanner')}><Icon name="scan" size="var(--is-item)" color="var(--color-white)" /><span>Scan QR</span></button>
        <button className="action-card" onClick={() => navigate('Contacts')}><Icon name="human" size="var(--is-item)" /><span>Contacts</span></button>
      </div>

      <NavBar active="HomeSend" />

      {/* 24h price-change popup (user request 08-25) - standard .popup-card, closes on outside click or the X. */}
      {pctPopup && rates && (
        <div className="popup-overlay" onClick={() => setPctPopup(null)}>
          <div className="popup-card" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <button onClick={() => setPctPopup(null)} aria-label="Close"
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Icon name="x" size="var(--is-item)" color="var(--color-muted)" />
            </button>
            <div className="popup-title">{pctPopup.symbol}</div>
            <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-content)' }}>
              {'24h price change: '}
              <span style={{ fontWeight: 'var(--fw-medium)', color: pctPopup.change24h > 0 ? 'var(--color-primary)' : 'var(--color-error)' }}>
                {pctStr(pctPopup.change24h)}
              </span>
            </div>
            <div style={{ fontSize: 'var(--fs-body)', color: 'var(--color-content)' }}>
              {`Value changed from ${fmtDisplay(pctPopup.usd / (1 + pctPopup.change24h / 100), cur, rates)} to ${fmtDisplay(pctPopup.usd, cur, rates)}`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
