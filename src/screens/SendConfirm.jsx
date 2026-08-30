import { useState, useEffect } from 'react'
import { useSendTransaction } from '@privy-io/react-auth'
import Icon from '../components/Icon'
import { addNotif } from '../notif'
import { useNav } from '../nav'
import { getDisplayCurrency, displaySymbol, fmtDisplay, decimalsOfCurrency } from '../data'
import { getDisplayRates, estimateFeeUsd, buildTransferCall, arcTestnet } from '../chain'
import { privyErrorMessage } from '../privy'
import { MOCK } from '../mock'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

// Currency symbols / token names use Barlow (--font-condensed); numbers stay Barlow via .num
function Cur({ children }) {
  return <span style={{ fontFamily: 'var(--font-condensed)', fontWeight: 'var(--fw-medium)' }}>{children}</span>
}

export default function SendConfirm() {
  const { navigate, params } = useNav()
  const { sendTransaction } = useSendTransaction()
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

  // ══ SENDING, AFTER THE MOVE TO PRIVY (2026-08-30) ══
  // The Circle version needed four steps and a backend: refresh a userToken that expired every hour,
  // POST the pieces to /api/send so the Worker could encode them with the API key it held, get a
  // challengeId back, then open Circle's PIN iframe to finish the signature. All four are gone.
  // Privy signs in the browser, so this builds the calldata (chain.js) and sends it. functions/api/send.js
  // was deleted with this change - there is nothing left for it to do.
  //
  // WHAT GUARDS THIS: if the user turned on Fingerprint/Face ID (Security screen), Privy demands it
  // before it will sign, and the MFA listener in App.jsx answers that demand with the phone's own
  // sheet. Nothing to do here - the guard is not this screen's job and must not be reimplemented as
  // a check of ours, which could be stepped around while Privy's cannot.
  async function handleConfirm() {
    if (loading || done) return   // block repeat taps / duplicate sends
    setLoading(true); setError('')
    // MOCK (npm run mock): pretend it worked and go to the receipt, exactly as the Circle build did
    // (executeChallenge returned early on MOCK). Without this the UI-checking mode would try to sign
    // a real transaction with no session behind it.
    if (MOCK) {
      setDone(true)
      navigate('SendReceipt', { address, name, amount, memo, currency, tokenAmount: sendUnits, timestamp: Date.now(), hash: '0xmocksend' })
      return
    }
    try {
      const from = localStorage.getItem('ez_wallet_addr')
      if (!from) throw new Error('No wallet address')
      const { to, data } = buildTransferCall({ token, toAddress: address, amountDecimal: sendAmountStr, memo })

      const { hash } = await sendTransaction(
        { to, data, chainId: arcTestnet.id },
        {
          address: from,
          // ⚠️ HIDE PRIVY'S OWN CONFIRMATION MODAL. The user has ALREADY confirmed - that is the entire
          // screen they are looking at, in this app's words and this app's design. Privy's modal on top
          // of it would be a second confirmation showing raw calldata, which is exactly the
          // "Contract Interaction screen that baffles older users" that got Circle's OTP flow switched
          // off in July. One confirmation, in language the user understands.
          uiOptions: { showWalletUIs: false },
        },
      )

      setDone(true)   // broadcast successfully → lock the screen, no resending
      navigate('SendReceipt', { address, name, amount, memo, currency, tokenAmount: sendUnits, timestamp: Date.now(), hash })
    } catch (e) {
      // STAY on the confirm screen so they can tap send again.
      setLoading(false)
      console.error('[SendConfirm] send failed:', e)
      const reason = privyErrorMessage(e)
      if (!reason) return   // the user closed Privy's flow themselves → stay silent
      const msg = `Send failed: ${reason}`
      setError(msg)
      addNotif(msg, 'error')
    }
  }

  return (
    <div className="screen">
      <div className="row-1 center send-title" style={{ justifyContent: 'center' }}>
        <span>Confirm transaction</span>
      </div>

      <div className="row-2-8 col" style={{ justifyContent: 'center', alignItems: 'stretch', gap: 14 }}>
        <div className="confirm-box">
          <div className="confirm-row">
            <span className="confirm-label">Send to</span>
            <span className="confirm-value">{name || shortenAddr(address)}</span>
          </div>
          {name && (
            <div className="confirm-row">
              <span className="confirm-label">Address</span>
              <span className="confirm-value" style={{ fontSize: 'var(--fs-body)' }}>{shortenAddr(address)}</span>
            </div>
          )}
          <div className="confirm-row">
            <span className="confirm-label">Amount</span>
            <span className="confirm-value num" style={{ fontWeight: 'var(--fw-bold)', color: 'var(--color-brand)' }}>
              {mainEl}
            </span>
          </div>
          {/* VND: spell out the real USDC amount leaving the wallet - the user types Vietnamese money but what moves
              on-chain is USDC, and hiding that is deceptive. This is the number settled on the previous screen, never recomputed. */}
          {currency === 'VND' && (
            <div className="confirm-row">
              <span className="confirm-label">Actually sent</span>
              <span className="confirm-value num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
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
            <span className="confirm-value num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
              {feeEl()}
            </span>
          </div>
        </div>

        <div className="warning-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="warning" size="var(--is-label)" color="var(--color-warning)" />{'This transaction cannot be undone once confirmed'}
        </div>

        {loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>Sending your money...</span>}
        {error && !loading && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>}
      </div>

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" disabled={loading || done} onClick={() => navigate('SendAmount', params)}>Edit</button>
        {/* Said "Confirm PIN" under Circle. There is no PIN in this build (see handleConfirm), and a
            button naming a step that never happens is worse than a plain one. Step 5 brings the PIN
            back and this label goes with it. */}
        <button className="btn btn-primary" style={{ flex: 1 }}
          disabled={loading || done} onClick={handleConfirm}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
