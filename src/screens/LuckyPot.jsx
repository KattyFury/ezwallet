import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { ensureWalletAddress, refreshSession, getSDK, executeChallenge, circleErrorMessage,
  executeLuckyPotDeposit, executeLuckyPotWithdraw, executeLuckyPotClaim } from '../circle'
import { getLuckyPotInfo, getEpochHistory } from '../lib/luckyPot'
import { getTokenBalances } from '../chain'
import { addNotif } from '../notif'

// LUCKYPOT - full build. Theme = ezwallet's own light/blue tokens. Referral is OUT of scope on this
// screen. Layout redone 2026-09-08 to the user's exact pixel spec.
//
// TYPOGRAPHY (user decision 2026-09-08, revised): headers (EPOCH #, TOTAL TICKETS/POOL, My tickets/
// deposit, Draw history) use Space Grotesk, ALL CAPS - luckypot.cc's own font, matching its brand.
// Everything else stays the app's normal system-font stack (ezwallet's brand guideline dropped webfonts
// app-wide on 08-25 for first-paint speed - see index.html's comment - so only Space Grotesk is loaded
// here, and only for headers, not a wholesale second webfont for body text too).
const FONT_HEADER = "'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
const FONT_BODY = 'var(--font-condensed)'
function useLuckyPotFonts() {
  useEffect(() => {
    if (document.getElementById('lp-fonts')) return
    const link = document.createElement('link')
    link.id = 'lp-fonts'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap'
    document.head.appendChild(link)
  }, [])
}

function fmtCountdown(endTimeSec, nowSec) {
  const s = endTimeSec - nowSec
  if (s <= 0) return 'Draw pending'
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return `${d}d ${h}h ${m}m ${sec}s`
}
function dateLabel(ts) {
  return new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// The shared popup shell: 5/6 of the mobile screen, closes ONLY via the X top-right or a click outside
// (no bottom Close button - user decision 2026-09-08). Used for every popup on this screen.
function LPModal({ title, onClose, children }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        // 5/6 of the MOBILE screen, not of the browser viewport - .popup-overlay is position:fixed to the
        // whole window, and on desktop that window is far wider than the phone frame (--screen-max: 430px).
        // Same idiom already used by .row10-single .btn for exactly this reason.
        width: 'min(calc(100vw * 5 / 6), calc(var(--screen-max) * 5 / 6))',
        maxHeight: '80dvh', overflowY: 'auto',
        background: 'var(--color-white)', borderRadius: 16, padding: '28px 20px 20px',
        display: 'flex', flexDirection: 'column', gap: 14, fontFamily: FONT_BODY,
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 8,
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Icon name="x" size={18} color="var(--color-muted)" />
        </button>
        <div style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-semibold)', textAlign: 'center', color: 'var(--color-content)' }}>
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

function AmountField({ amount, setAmount, onMax }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.5px solid var(--color-gray)', paddingBottom: 8 }}>
      <input className="num" type="number" min="0" inputMode="decimal" value={amount} placeholder="0.00"
        onChange={e => setAmount(e.target.value)}
        style={{ flex: 1, minWidth: 0, fontFamily: FONT_BODY, fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-content)' }} />
      <button onClick={onMax} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT_BODY, color: 'var(--color-primary)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-label)' }}>MAX</button>
    </div>
  )
}

// One row of the 2 stat boxes (row 3-5 / row 6-8): a HEADER label on the left (Space Grotesk, all caps),
// content on the right - the box itself is split into 4 of these equal-height rows (the last spans 2).
// `divider` draws the separating line under rows 1 and 2 (user decision 2026-09-08: without it the 4
// sub-rows read as one undifferentiated block of text).
function StatRow({ label, children, span = 1, divider = false }) {
  return (
    <div style={{
      flex: span, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      borderBottom: divider ? '1.5px solid rgba(11, 83, 191, 0.15)' : 'none',
    }}>
      <span style={{ fontFamily: FONT_HEADER, textTransform: 'uppercase', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>{label}</span>
      {children}
    </div>
  )
}
// "$eligible (black 17) / $total (grey 14)" - the exact 2-tone amount format used in both stat boxes.
function SplitAmount({ big, small }) {
  return (
    <span className="num" style={{ fontFamily: FONT_BODY }}>
      <span style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>${big.toFixed(2)}</span>
      <span style={{ fontSize: 14, color: 'var(--color-muted)' }}> / ${small.toFixed(2)}</span>
    </span>
  )
}

export default function LuckyPot() {
  useLuckyPotFonts()
  const { navigate } = useNav()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('ez_wallet_addr'))
  useEffect(() => { if (!walletAddress) ensureWalletAddress().then(a => a && setWalletAddress(a)).catch(() => {}) }, [])
  const walletId = localStorage.getItem('ez_wallet_id')

  const [walletUsdc, setWalletUsdc] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [popup, setPopup] = useState(null) // null | 'deposit' | 'withdraw' | 'result' | 'history'
  const [depositAmt, setDepositAmt] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [txError, setTxError] = useState('')
  const [txStatus, setTxStatus] = useState('')
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')

  function loadInfo() {
    return ensureWalletAddress()
      .then(addr => addr ? getLuckyPotInfo(addr) : Promise.reject(new Error('no wallet address')))
      .then(i => setInfo(i))
      .catch(e => setError(e?.message || 'Could not load LuckyPot data'))
  }
  useEffect(() => { loadInfo() }, [])
  useEffect(() => {
    if (!walletAddress) return
    getTokenBalances(walletAddress).then(ts => {
      const usdc = ts.find(t => t.symbol === 'USDC')
      setWalletUsdc(usdc ? usdc.amount : 0)
    }).catch(() => {})
  }, [walletAddress])
  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(id) }, [])

  // The "Result" button only opens the CURRENT self-claim window (SWEEP_DELAY after the last draw) -
  // outside it, it stays dimmed/disabled (user decision: "3 ngày đầu sau khi nổ giải, thứ 2 sáng tới thứ
  // 5 sáng"). Browsing OLDER results lives in Draw History instead, not behind this button.
  const resultWindowOpen = !!(info?.prevEpochDrawnAt > 0 && info?.sweepDelay > 0
    && now >= info.prevEpochDrawnAt && now < info.prevEpochDrawnAt + info.sweepDelay)
  const pastClaimWindow = info?.prevEpochDrawnAt != null && info?.sweepDelay
    ? now >= info.prevEpochDrawnAt + info.sweepDelay : false

  function closePopup() { setPopup(null); setTxError(''); setTxStatus(''); setBusy(false); setRevealed(false) }
  function openPopup(p) { setMenuOpen(false); setDepositAmt(''); setWithdrawAmt(''); setTxError(''); setPopup(p) }

  function openHistory() {
    openPopup('history')
    if (history === null) {
      getEpochHistory(info?.epochId ?? 1).then(setHistory).catch(e => setHistoryError(e?.message || 'Could not load history'))
    }
  }

  async function handleDeposit() {
    const amt = depositAmt
    setBusy(true); setTxError(''); setTxStatus('Preparing…')
    try {
      const { userToken, encryptionKey } = await refreshSession()
      const res = await executeLuckyPotDeposit({ userToken, walletId, amountIn: amt })
      if (res.error) throw new Error(res.error)
      setTxStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, res.challengeId)
      addNotif(`Deposited ${amt} USDC into LuckyPot`, 'sent', null, `luckypot-deposit-${Date.now()}`)
      closePopup()
      loadInfo()
      getTokenBalances(walletAddress).then(ts => setWalletUsdc((ts.find(t => t.symbol === 'USDC') || {}).amount ?? 0)).catch(() => {})
    } catch (e) {
      setTxError(circleErrorMessage(e)); setBusy(false); setTxStatus('')
    }
  }

  async function handleWithdraw() {
    const amt = withdrawAmt
    setBusy(true); setTxError(''); setTxStatus('Preparing…')
    try {
      const { userToken, encryptionKey } = await refreshSession()
      const res = await executeLuckyPotWithdraw({ userToken, walletId, amountIn: amt })
      if (res.error) throw new Error(res.error)
      setTxStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, res.challengeId)
      addNotif(`Withdrew ${amt} USDC from LuckyPot`, 'sent', null, `luckypot-withdraw-${Date.now()}`)
      closePopup()
      loadInfo()
      getTokenBalances(walletAddress).then(ts => setWalletUsdc((ts.find(t => t.symbol === 'USDC') || {}).amount ?? 0)).catch(() => {})
    } catch (e) {
      setTxError(circleErrorMessage(e)); setBusy(false); setTxStatus('')
    }
  }

  async function handleClaim() {
    setBusy(true); setTxError(''); setTxStatus('Preparing…')
    try {
      const { userToken, encryptionKey } = await refreshSession()
      const res = await executeLuckyPotClaim({ userToken, walletId, epochId: info.prevEpochId, useSweep: pastClaimWindow })
      if (res.error) throw new Error(res.error)
      setTxStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, res.challengeId)
      addNotif(`Claimed $${info.owedLastEpoch.toFixed(2)} from LuckyPot`, 'received', null, `luckypot-claim-${Date.now()}`)
      closePopup()
      loadInfo()
    } catch (e) {
      setTxError(circleErrorMessage(e)); setBusy(false); setTxStatus('')
    }
  }

  // Row 2, faucet state: a DIRECT action, no popup (user decision) - copy the address and open the
  // faucet in one tap.
  function copyAddressAndFaucet() {
    navigator.clipboard?.writeText(walletAddress || '').catch(() => {})
    window.open('https://faucet.circle.com', '_blank', 'noopener,noreferrer')
  }

  const hasUnclaimedPrize = info?.wonLastEpoch && !info?.hasClaimedLastEpoch

  return (
    <div className="screen">
      {/* Row 1 - menu icon + "LuckyPot" (black) ".cc" (grey), both LEFT. The right side is reserved for
          the global BugButton (App.jsx renders it absolute at right:20/top:5dvh on every screen) - that's
          the whole reason this moved off a centred/right layout. */}
      <div className="row-1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Icon name="menu" size="calc(100dvh / 30)" color="var(--color-content)" />
        </button>
        <span style={{ fontFamily: FONT_HEADER, fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-semibold)' }}>
          <span style={{ color: 'var(--color-content)' }}>LuckyPot</span>
          <span style={{ color: 'var(--color-muted)' }}>.cc</span>
        </span>
      </div>

      {/* Row 2 - the hint strip: solid warning colour always, black text, only the icon+copy change. */}
      <div className="row-2" style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={hasUnclaimedPrize ? () => openPopup('result') : copyAddressAndFaucet} style={{
          flex: 1, height: '8.82dvh' /* 74.4/844 */, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
          background: 'var(--color-warning)', border: 'none', borderRadius: 10, padding: '0 14px', fontFamily: FONT_BODY,
        }}>
          <Icon name={hasUnclaimedPrize ? 'check' : 'info'} size={20} color="var(--color-content)" />
          <span style={{ flex: 1, fontSize: 14, color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>
            {hasUnclaimedPrize
              ? `You won $${info.owedLastEpoch.toFixed(2)} last epoch - tap to claim.`
              : "Need testnet USDC? Tap to copy your address and open the faucet."}
          </span>
        </button>
      </div>

      {/* Row 3-5 - Epoch box: light-blue surface, split into 4 equal sub-rows (the yield sentence spans 2). */}
      <div style={{ gridRow: '3 / 6', alignSelf: 'center', height: '28.82dvh' /* 243.2/844 */, background: 'var(--color-surface)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column' }}>
        <StatRow divider label={info ? `EPOCH #${info.epochId}` : '…'}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 'var(--fw-semibold)', color: 'var(--color-white)', background: 'var(--color-brand)', borderRadius: 999, padding: '2px 10px' }}>USDC</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)', border: '1.5px solid var(--color-gray)', borderRadius: 999, padding: '2px 10px', opacity: 0.5, cursor: 'not-allowed' }}>ARC</span>
          </div>
        </StatRow>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_BODY, borderBottom: '1.5px solid rgba(11, 83, 191, 0.15)' }}>
          <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Draw in</span>
          <span className="num" style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-item)', color: 'var(--color-content)' }}>
            {info ? fmtCountdown(info.epochEndTime, now) : '…'}
          </span>
        </div>
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', fontFamily: FONT_BODY }}>
          {error ? (
            <span style={{ fontSize: 14, color: 'var(--color-error)' }}>{error}</span>
          ) : info ? (
            <span style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.35 }}>
              This week's yield goes to <strong style={{ color: 'var(--color-content)', fontSize: 'var(--fs-item)' }}>{info.numWinners}</strong> winner{info.numWinners === 1 ? '' : 's'} out
              of <strong style={{ color: 'var(--color-content)', fontSize: 'var(--fs-item)' }}>{info.participantCount}</strong> player{info.participantCount === 1 ? '' : 's'}. Winners return 5% to the protocol.
            </span>
          ) : (
            <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Loading…</span>
          )}
        </div>
      </div>

      {/* Row 6-8 - Tickets/Deposit box: same box treatment, 4 equal sub-rows. */}
      <div style={{ gridRow: '6 / 9', alignSelf: 'center', height: '28.82dvh' /* 243.2/844 */, background: 'var(--color-surface)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column' }}>
        <StatRow divider label="TOTAL TICKETS / POOL">
          {info ? <SplitAmount big={info.eligiblePoolTotal} small={info.poolTotal} /> : <span className="num" style={{ fontFamily: FONT_BODY }}>…</span>}
        </StatRow>
        <StatRow divider label="My tickets / deposit">
          {info ? <SplitAmount big={info.eligible} small={info.deposited} /> : <span className="num" style={{ fontFamily: FONT_BODY }}>…</span>}
        </StatRow>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: 'var(--color-muted)' }}>
            In your wallet: {walletUsdc != null ? `${walletUsdc.toFixed(2)} USDC` : '…'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14 }} onClick={() => openPopup('deposit')}>Deposit</button>
            <button className="btn btn-secondary" style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14 }} onClick={() => openPopup('withdraw')}>Withdraw</button>
            <button className="btn" style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, background: 'var(--color-warning)', color: 'var(--color-content)', border: 'none' }}
              disabled={!resultWindowOpen} onClick={() => openPopup('result')}>Result</button>
          </div>
        </div>
      </div>

      {/* Row 9 - Draw history, built for real: past epochs' payouts. Same light-blue box treatment and
          height as row 2's hint strip (user decision 2026-09-08). */}
      <div className="row-9" style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={openHistory} style={{
          alignSelf: 'center', flex: 1, height: '8.82dvh' /* matches row 2's box height */,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-surface)', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer',
        }}>
          <span style={{ fontFamily: FONT_HEADER, textTransform: 'uppercase', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>Draw history</span>
          <Icon name="right2" size={16} color="var(--color-brand)" />
        </button>
      </div>

      {/* Row 10 - Exit */}
      <div className="row-10" style={{ display: 'flex' }}>
        <button onClick={() => navigate('ServiceHub')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-bold)',
            color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)',
            WebkitTapHighlightColor: 'transparent',
          }}>Exit</button>
      </div>

      {/* ── Menu popup (row 1's hamburger) ── */}
      {menuOpen && (
        <LPModal title="LuckyPot menu" onClose={() => setMenuOpen(false)}>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY }} onClick={() => openPopup('deposit')}>Deposit</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY }} onClick={() => openPopup('withdraw')}>Withdraw</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY }} onClick={openHistory}>Draw history</button>
          <button className="btn btn-secondary" disabled style={{ width: '100%', fontFamily: FONT_BODY, opacity: 0.4 }}>My history</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, color: 'var(--color-error)' }} onClick={() => navigate('ServiceHub')}>Exit</button>
        </LPModal>
      )}

      {/* ── Deposit popup ── */}
      {popup === 'deposit' && (
        <LPModal title="Deposit" onClose={closePopup}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
            Wallet balance: <strong className="num" style={{ fontFamily: FONT_BODY, color: 'var(--color-content)' }}>{walletUsdc != null ? walletUsdc.toFixed(2) : '…'} USDC</strong>
          </span>
          <AmountField amount={depositAmt} setAmount={setDepositAmt} onMax={() => setDepositAmt(String(walletUsdc ?? 0))} />
          <button className="btn btn-primary" style={{ width: '100%', fontFamily: FONT_BODY }}
            disabled={busy || !(parseFloat(depositAmt) > 0) || parseFloat(depositAmt) > (walletUsdc ?? 0)}
            onClick={handleDeposit}>
            {busy ? (txStatus || 'Confirming…') : 'Deposit'}
          </button>
          {txError && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{txError}</span>}
        </LPModal>
      )}

      {/* ── Withdraw popup ── */}
      {popup === 'withdraw' && (
        <LPModal title="Withdraw" onClose={closePopup}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
            Deposited: <strong className="num" style={{ fontFamily: FONT_BODY, color: 'var(--color-content)' }}>{info ? info.deposited.toFixed(2) : '…'} USDC</strong>
          </span>
          <AmountField amount={withdrawAmt} setAmount={setWithdrawAmt} onMax={() => setWithdrawAmt(String(info?.deposited ?? 0))} />
          {info?.eligible > 0 && parseFloat(withdrawAmt) > 0 && (
            <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-warning)' }}>
              Withdrawing now will remove you from this epoch's draw.
            </span>
          )}
          <button className="btn btn-primary" style={{ width: '100%', fontFamily: FONT_BODY }}
            disabled={busy || !(parseFloat(withdrawAmt) > 0) || parseFloat(withdrawAmt) > (info?.deposited ?? 0)}
            onClick={handleWithdraw}>
            {busy ? (txStatus || 'Confirming…') : 'Withdraw'}
          </button>
          {txError && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{txError}</span>}
        </LPModal>
      )}

      {/* ── Result / Claim popup (tap-to-reveal) ── */}
      {popup === 'result' && info && (
        <LPModal title={`Epoch #${info.prevEpochId} - your result`} onClose={closePopup}>
          {!revealed ? (
            <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY }} onClick={() => setRevealed(true)}>
              Tap to reveal
            </button>
          ) : info.wonLastEpoch ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textTransform: 'uppercase' }}>You won</span>
              <span className="num" style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', color: 'var(--color-primary)' }}>
                ${info.owedLastEpoch.toFixed(2)}
              </span>
              {info.hasClaimedLastEpoch ? (
                <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Already claimed.</span>
              ) : (
                <>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, fontFamily: FONT_BODY }} disabled={busy} onClick={handleClaim}>
                    {busy ? (txStatus || 'Confirming…') : (pastClaimWindow ? 'Release prize' : 'Claim now')}
                  </button>
                  {pastClaimWindow && (
                    <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)', textAlign: 'center' }}>
                      The self-claim window passed, but your prize is still there - this releases it.
                    </span>
                  )}
                  {txError && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{txError}</span>}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)' }}>Good luck next epoch</span>
              <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Your principal is safe and still deposited.</span>
            </div>
          )}
        </LPModal>
      )}

      {/* ── Draw history popup ── */}
      {popup === 'history' && (
        <LPModal title="Draw history" onClose={closePopup}>
          {historyError ? (
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{historyError}</span>
          ) : history === null ? (
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>Loading…</span>
          ) : history.length === 0 ? (
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>No draws yet.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(h => (
                <div key={h.epochId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--color-gray)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)' }}>Epoch #{h.epochId}</span>
                    <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>{dateLabel(h.drawnAt)}</span>
                  </div>
                  <span className="num" style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-label)', color: 'var(--color-primary)', fontWeight: 'var(--fw-semibold)' }}>
                    ${h.weeklyYield.toFixed(2)} - {h.numWinners} winner{h.numWinners === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </LPModal>
      )}
    </div>
  )
}
