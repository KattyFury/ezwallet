import { useState, useEffect, useRef } from 'react'
import { addNotif } from '../notif'
import { useNav } from '../nav'
import { getDisplayCurrency, displaySymbol, fmtDisplay, decimalsOfCurrency, shortenAddr } from '../data'
import { getDisplayRates, estimateFeeUsd } from '../chain'
import { getSDK, executeChallenge, refreshSession, circleErrorMessage } from '../circle'
import ScreenSheet from '../components/ScreenSheet'
import ExitBar from '../components/ExitBar'
import { GRADIENT } from '../brandBg'
import { assertNetworkReady } from '../clientNet'
import { newAttempt, getPending, clearPending, lookup, classify, waitFinal } from '../txTracker'

// Currency symbols / token names use Barlow (--font-condensed); numbers stay Barlow via .num
function Cur({ children }) {
  return <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 'var(--fw-medium)' }}>{children}</span>
}

export default function SendConfirm() {
  const { navigate, params } = useNav()
  // currency = 'USD' (the friendly label, USDC is sent) or a real token (USDC/EURC/cirBTC) - comes from SendAmount.
  const { address, name, amount, amountStr, memo, currency = 'USD' } = params
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
  // MAINNET-AUDIT H1: send EXACTLY the string the user typed/confirmed (validated again by the server) - the old
  // toFixed(2) turned "0.004" into "0.00". VND is unreachable (see HANDOFF §4) and keeps its old conversion.
  const sendAmountStr = currency === 'VND' ? sendUnits.toFixed(2) : (amountStr ?? String(amount))
  const mainEl = currency === 'USD' ? <>{displaySymbol('USDC')}{sendAmountStr}</>
    : currency === 'VND' ? <>{amount.toLocaleString('vi-VN')} <Cur>₫</Cur></>
    : <>{sendAmountStr} <Cur>{currency}</Cur></>

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

  // The attempt this screen created (refId + timestamps) - see src/txTracker.js.
  const attemptRef = useRef(null)
  const [status, setStatus] = useState('')        // the line under the card while working ("Checking…")

  // A final, successful payment → lock the screen and show the receipt (only now - MAINNET-AUDIT C4).
  function finishOk(tx) {
    clearPending(attemptRef.current?.refId)
    setDone(true)
    navigate('SendReceipt', { address, name, amount, amountStr: sendAmountStr, memo, currency, tokenAmount: sendUnits, txHash: tx?.txHash || null, timestamp: Date.now() })
  }
  function fail(msg) {
    setLoading(false); setStatus(''); setError(msg); addNotif(msg, 'error')
  }
  // The payment exists but is not final yet (or we could not ask) → NEVER offer a plain resend (MAINNET-AUDIT C3).
  function stuck() {
    setLoading(false); setStatus('')
    setError('This payment is still being confirmed. Do NOT send it again - tap "Check again" in a moment, or look in Transaction history.')
  }

  async function handleConfirm() {
    if (loading || done) return   // block repeat taps / duplicate sends
    setLoading(true); setError('')
    try {
      // Refuse before any challenge exists if the server's network/contracts do not check out (MAINNET-AUDIT C2).
      await assertNetworkReady()

      // 1. Never start a payment while an earlier one's fate is unknown - this screen's retry, or one left
      //    unresolved when the app was closed (MAINNET-AUDIT C3).
      const prev = attemptRef.current || getPending()
      if (prev) {
        setStatus('Checking your previous payment…')
        let r
        try { r = classify(await lookup(prev)) } catch { return stuck() }
        if (r === 'pending') {
          const w = await waitFinal(prev, { timeoutMs: 30000 })
          r = w.outcome === 'ok' ? 'ok' : w.outcome === 'failed' ? 'failed' : 'pending'
          if (r === 'pending') return stuck()
        }
        if (r === 'ok' && prev === attemptRef.current) return finishOk(await lookup(prev).catch(() => null))
        if (r === 'ok') {   // an EARLIER payment (another screen/session) went through - make them look first
          clearPending(prev.refId)
          return fail('Your previous payment went through. Check Transaction history before sending again.')
        }
        clearPending(prev.refId)   // 'failed' or never created → nothing left the wallet, safe to go on
        attemptRef.current = null
      }

      // 2. A new attempt. Its refId is stored on the Circle transaction (server passes it through).
      const attempt = newAttempt('send', { address, amount: sendAmountStr, token })
      attemptRef.current = attempt
      setStatus('Opening PIN confirmation…')
      // Refresh the userToken before sending - avoids "userToken had expired" when
      // the app has been open a while (Circle userTokens live ~1 hour).
      const { userToken, encryptionKey } = await refreshSession()
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken, walletId: attempt.walletId,
          toAddress: address, token, amountDecimal: sendAmountStr, memo,
          idempotencyKey: crypto.randomUUID(), refId: attempt.refId,
        }),
      })
      const data = await res.json()
      if (data.error) {
        // No challenge → no transaction can exist. Safe to retry.
        clearPending(attempt.refId); attemptRef.current = null
        return fail(`Send failed: ${data.error}`)
      }

      // 3. The PIN. A wrong PIN is retried inside Circle's iframe and never rejects (circle.js).
      let signError = null
      try {
        await executeChallenge(await getSDK(), userToken, encryptionKey, data.challengeId)
      } catch (e) {
        if (e?.code === 155701) {   // the user closed the PIN screen → nothing was signed, back to Confirm silently
          clearPending(attempt.refId); attemptRef.current = null
          setLoading(false); setStatus('')
          return
        }
        signError = e   // may or may not have been signed - FIND OUT below, never assume "failed"
      }

      // 4. The real outcome, from Circle's record of THIS transaction.
      setStatus('Confirming on the network…')
      const { outcome, tx } = await waitFinal(attempt, { timeoutMs: signError ? 30000 : 90000 })
      if (outcome === 'ok') return finishOk(tx)
      if (outcome === 'failed') {
        clearPending(attempt.refId); attemptRef.current = null
        return fail('The network rejected this payment - no money left your wallet. You can try again.')
      }
      if (outcome === 'none' && signError) {
        // The PIN step broke before anything was signed (no transaction exists) → a genuine, retryable failure.
        clearPending(attempt.refId); attemptRef.current = null
        console.error('[SendConfirm] send failed:', signError)
        return fail(`Send failed: ${circleErrorMessage(signError)}`)
      }
      return stuck()   // exists but not final, or Circle could not be asked - keep it blocked
    } catch (e) {
      console.error('[SendConfirm] send failed:', e)
      // Anything unexpected while an attempt is open is treated as "unknown", not "failed".
      if (attemptRef.current) return stuck()
      fail(`Send failed: ${circleErrorMessage(e)}`)
    }
  }

  return (
    <div className="screen" style={{ background: GRADIENT }}>
      <ScreenSheet />
      <div className="sheet-title">Confirm transaction</div>

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
          {loading && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center', display: 'block' }}>{status || 'Working…'}</span>}
          {error && !loading && <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--color-error)', textAlign: 'center', display: 'block' }}>{error}</span>}
        </div>
      )}

      {/* Back/Confirm PIN - node 58:298/58:294: ~166px each, i.e. (340 − 8) / 2 - flex:1 with an 8px gap.
          Centre 85.66dvh, glow shadow. "Back" (was "Edit") per the exact Figma label - functionally
          unchanged, still re-opens SendAmount with the same params to adjust the transaction. */}
      <div style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '85.66dvh', transform: 'translateY(-50%)', display: 'flex', gap: 'calc(8 * var(--u))' }}>
        <button className="btn btn-secondary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)' }} disabled={loading || done} onClick={() => navigate('SendAmount', params)}>Back</button>
        <button className="btn btn-primary" style={{ flex: 1, boxShadow: '0 0 8px rgba(0, 0, 0, 0.48)' }}
          disabled={loading || done} onClick={handleConfirm}>
          {loading ? 'Processing...' : (attemptRef.current ? 'Check again' : 'Confirm PIN')}
        </button>
      </div>

      <ExitBar onClick={() => navigate('HomeSend')} />
    </div>
  )
}
