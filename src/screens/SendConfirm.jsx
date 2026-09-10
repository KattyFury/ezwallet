import { useState, useEffect } from 'react'
import { addNotif } from '../notif'
import { useNav } from '../nav'
import { getDisplayCurrency, displaySymbol, fmtDisplay, decimalsOfCurrency } from '../data'
import { getDisplayRates, estimateFeeUsd } from '../chain'
import { getSDK, executeChallenge, refreshSession, circleErrorMessage } from '../circle'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

// Currency symbols / token names use Barlow (--font-condensed); numbers stay Barlow via .num
function Cur({ children }) {
  return <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 'var(--fw-medium)' }}>{children}</span>
}

export default function SendConfirm() {
  const { navigate, params } = useNav()
  // currency = 'USD' (the friendly label, USDC is sent) or a real token (USDC/EURC/cirBTC) - comes from SendAmount.
  const { address, name, amount, memo, currency = 'USD' } = params
  const [feeUsd, setFeeUsd] = useState(null)      // the real gas fee (USD, null = still calculating)
  // A separate rate for the FEE (USD per unit of the display currency - USDC:1, EURC:~1.08)
  const [feeRates, setFeeRates] = useState({ USDC: 1, EURC: 1.08, VND: 1 / 26300 })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)         // sent successfully → locked, no resending
  const [error, setError] = useState('')          // a terminal error (cancel/network...) shown in place

  useEffect(() => {
    // getDisplayRates (not the per-token getUsdRate) - it includes VND, and VND is not a token
    // so getUsdRate looking through TOKENS would not find it.
    getDisplayRates().then(setFeeRates).catch(() => {})
    // A memo goes through the Memo contract → more gas (~110k) than a plain transfer (~65k)
    estimateFeeUsd(memo && memo.trim() ? 110000 : 65000).then(setFeeUsd).catch(() => setFeeUsd(0))
  }, [memo])

  // USD = USDC (1:1, only the label differs); USDC/EURC/cirBTC send exactly the amount entered, with NO conversion.
  // VND = fiat, which does NOT exist on-chain → USDC is sent.
  const token = currency === 'USD' || currency === 'VND' ? 'USDC' : currency
  // ⚠️⚠️ VND: REUSE the exact token amount SendAmount settled on (params.tokenAmount), NEVER re-convert
  // from the rate on this screen. Rates move constantly (CoinGecko refreshes every 60s) - converting a second
  // time makes the number the user just saw ("≈ 19.00 USDC") differ from the one that ACTUALLY leaves the wallet.
  // People must get exactly what they confirmed.
  const sendUnits = currency === 'VND' ? (params.tokenAmount ?? 0) : amount
  const sendAmountStr = token === 'cirBTC' ? sendUnits.toFixed(8) : sendUnits.toFixed(2)
  const mainEl = currency === 'USD' ? <>{displaySymbol('USDC')}{amount}</>
    : currency === 'VND' ? <>{amount.toLocaleString('vi-VN')} <Cur>₫</Cur></>
    : <>{amount} <Cur>{currency}</Cur></>

  // Network fee in the DEFAULT CURRENCY from Settings (USDC/EURC/VND)
  const displayCur = getDisplayCurrency()
  function feeEl() {
    if (feeUsd === null) return 'Calculating...'
    const v = feeUsd / (feeRates[displayCur] || 1)
    // The "too small to show" threshold must follow the currency's DECIMALS: $0.01 for USD, but VND has no
    // decimals so its threshold is 1 ₫ - a shared 0.01 would render a 500 ₫ fee as "< 0.01 ₫" (meaningless).
    const dec = decimalsOfCurrency(displayCur)
    const min = 10 ** -dec
    return v < min ? `< ${fmtDisplay(min * (feeRates[displayCur] || 1), displayCur, feeRates)}`
                   : fmtDisplay(feeUsd, displayCur, feeRates)
  }

  async function handleConfirm() {
    if (loading || done) return   // block repeat taps / duplicate sends
    setLoading(true); setError('')
    // A NEW idempotencyKey on every tap → if the previous attempt was cancelled or failed, this one creates a CLEAN challenge.
    // Duplicate sends are prevented by the loading flag (sending) + done (finished), NOT by a fixed idemKey.
    const idempotencyKey = crypto.randomUUID()
    try {
      // Refresh the userToken before sending - avoids "userToken had expired" when
      // the app has been open a while (Circle userTokens live ~1 hour).
      const { userToken, encryptionKey } = await refreshSession()
      const walletId = localStorage.getItem('ez_wallet_id')

      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken, walletId,
          toAddress: address,
          token,
          amountDecimal: sendAmountStr,
          memo,
          idempotencyKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // The user signs with their PIN through the W3S SDK. executeChallenge (circle.js) already handles it: a WRONG PIN
      // → the iframe lets them retry; the RIGHT PIN → resolve → execution continues below (it does NOT throw out).
      await executeChallenge(await getSDK(), userToken, encryptionKey, data.challengeId)

      setDone(true)   // signed successfully → lock the screen, no resending
      navigate('SendReceipt', { address, name, amount, memo, currency, tokenAmount: sendUnits, timestamp: Date.now() })
    } catch (e) {
      // From here only TERMINAL errors remain (PIN cancelled / token expired / network...) - NOT a wrong PIN
      // (a wrong PIN is retried inside the iframe and never rejects). STAY on the confirm screen so they can tap send again.
      setLoading(false)
      if (e?.code === 155701) return   // the user cancelled the PIN themselves → stay silent, back to the confirm screen
      console.error('[SendConfirm] send failed:', e)
      const reason = circleErrorMessage(e)
      const msg = `Send failed: ${reason}`
      setError(msg)
      addNotif(msg, 'error')
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontWeight: 'var(--fw-semibold)' }}>
        Confirm transaction
      </div>

      {/* Card - node 1:223, RE-VERIFIED 2026-09-10 (the user redrew this frame): rows 3-5 exactly
          (centre 34.72dvh, height 242px = 3×70+2×16, was 328px/4 rows - the frame shrank one row when
          the warning box below became a real, separately-positioned element instead of loose flow).
          Anchored by its CENTRE, not stretched to fill - `justify-content:center` inside lets the
          (rare) 4-row case grow past 242px slightly rather than clipping, while the common 3-row case
          matches the Figma box exactly. */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '34.72dvh', transform: 'translateY(-50%)' }}>
        <div className="confirm-box" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="confirm-row">
            <span className="confirm-label">Send to</span>
            <span className="confirm-value">{name || shortenAddr(address)}</span>
          </div>
          {name && (
            <div className="confirm-row">
              <span className="confirm-label">Address</span>
              <span className="confirm-value">{shortenAddr(address)}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Amount</span>
            <span className="confirm-value num" style={{ fontSize: 'var(--fs-h2)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>
              {mainEl}
            </span>
          </div>
          {/* VND: spell out the real USDC amount leaving the wallet - the user types Vietnamese money but what moves
              on-chain is USDC, and hiding that is deceptive. This is the number settled on the previous screen, never recomputed. */}
          {currency === 'VND' && (
            <div className="confirm-row">
              <span className="confirm-label">Actually sent</span>
              <span className="confirm-value num">
                {sendAmountStr} USDC
              </span>
            </div>
          )}
          {memo && (
            <div className="confirm-row">
              <span className="confirm-label">Note</span>
              <span className="confirm-value">{memo}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Network fee</span>
            <span className="confirm-value num">
              {feeEl()}
            </span>
          </div>
        </div>
      </div>

      {/* The "cannot be undone" warning box is GONE - the user (2026-09-10) called it out as invented
          drama ("vẽ chuyện ra cho rắc rối") for a wallet with no bank-style reversal in the first place,
          and the re-fetched Figma (node 1:215) agrees: the frame no longer has ANY warning node at all,
          not just a redrawn one. Nothing replaces it - the card sits alone above the buttons now. */}

      {/* Status text - Figma has nothing here (it only draws the idle state); flows right under the
          card's bottom edge (49.05dvh) now that the warning box above it is gone. */}
      {(loading || (error && !loading)) && (
        <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '52dvh' }}>
          {loading && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center', display: 'block' }}>Opening PIN confirmation...</span>}
          {error && !loading && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-error)', textAlign: 'center', display: 'block' }}>{error}</span>}
        </div>
      )}

      {/* Back/Confirm PIN - node 1:218-1:221: ~165px each, i.e. (340 − 8) / 2 - flex:1 with an 8px gap.
          Centre 85.63dvh, glow shadow. "Back" (was "Edit") per the exact Figma label - functionally
          unchanged, still re-opens SendAmount with the same params to adjust the transaction. */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '85.63dvh', transform: 'translateY(-50%)', display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)' }} disabled={loading || done} onClick={() => navigate('SendAmount', params)}>Back</button>
        <button className="btn btn-primary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)' }}
          disabled={loading || done} onClick={handleConfirm}>
          {loading ? 'Processing...' : 'Confirm PIN'}
        </button>
      </div>
    </div>
  )
}
