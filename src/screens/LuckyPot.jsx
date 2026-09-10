import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { ensureWalletAddress, refreshSession, getSDK, executeChallenge, circleErrorMessage,
  executeLuckyPotDeposit, executeLuckyPotWithdraw, executeLuckyPotClaim } from '../circle'
import { getLuckyPotInfo, getEpochHistory, getMyHistory } from '../lib/luckyPot'
import { getTokenBalances } from '../chain'
import { addNotif } from '../notif'

// LUCKYPOT - full build. Theme = ezwallet's own light/blue tokens. Referral is OUT of scope on this
// screen. Layout redone 2026-09-08 to the user's pixel spec (header wordmark / gold hint strip / 2 grey
// stat boxes / grey history bar / Exit).
//
// TYPOGRAPHY (user decision 2026-09-08, RECONFIRMED same day after a false start): headers/titles (the
// "LuckyPot.cc" wordmark, Epoch #, Total tickets/pool, My tickets/deposit, Draw history, every popup
// title) use Space Grotesk (the wordmark keeps its brand casing, other headers ordinary mixed case) -
// this FONT-FAMILY exception is deliberate, LuckyPot's own brand identity, and stays.
// SIZE, however, is back on the app-wide 5-tier scale as of 2026-09-10 (the user's own call - LuckyPot
// no longer keeps a separate local size mapping): every text size on this screen is one of
// --fs-content-1/-content-2/-caption, same tokens every other screen uses. Only the two true HERO NUMBER
// displays (the deposit/withdraw amount input, the "you won $X" amount) stay literal px + --fw-light,
// same as the rest of the app's hero-number system.
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
// Every button on this screen = 2/3 of a 10dvh grid row (user decision 2026-09-08: the stat box's tight
// flex layout was squeezing Deposit/Withdraw/Result shorter than every other button in the app -
// flexShrink:0 stops the parent flex row from compressing them again).
// 2026-09-10: every Space-Grotesk header label in the redesigned Figma file (EPOCH #/Total tickets/
// My tickets/Draw history/My history) is drawn BOLD (700), not semibold (600) - a deliberate exception
// to the app's usual 600-weight cap, same spirit as the existing "Space Grotesk is this screen's own
// brand identity" note above (that cap exists only because Barlow 700 looked bad, which does not apply
// to Space Grotesk at all).
// ⚠️ NO textTransform:uppercase any more (dropping the 2026-09-08 "ALL CAPS" decision): the new Figma
// pull draws "Total tickets / Pool", "My tickets / My deposit", "Draw history" and "My history" in
// ordinary mixed case - only "EPOCH #3" is capitalised, and that is literally how the string is typed
// (`EPOCH #${epochId}`), not a CSS transform.
const headerStyle = { fontFamily: FONT_HEADER, fontSize: 'var(--fs-content-2)', fontWeight: 700, color: 'var(--color-brand)' }

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
// (no bottom Close button - user decision 2026-09-08). Used for every popup on this screen. Title uses
// the same header treatment as the main screen's labels (Space Grotesk, mixed case, Nội dung 2).
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
        <div style={{ ...headerStyle, fontSize: 'var(--fs-content-2)', textAlign: 'center' }}>
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
        style={{ flex: 1, minWidth: 0, fontFamily: FONT_BODY, fontSize: 28, fontWeight: 'var(--fw-light)', border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-content)' }} />
      <button onClick={onMax} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT_BODY, color: 'var(--color-primary)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-caption)' }}>MAX</button>
    </div>
  )
}

// One row of the 2 stat boxes (row 3-5 / row 6-8): a HEADER label on the left, content on the right -
// the box itself is split into 4 of these equal-height rows (the last spans 2). `divider` draws the
// separating line under rows 1 and 2 (user decision 2026-09-08: without it the 4 sub-rows read as one
// undifferentiated block of text).
function StatRow({ label, children, span = 1, divider = false, style }) {
  return (
    <div style={{
      flex: span, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      borderBottom: divider ? '1.5px solid rgba(11, 83, 191, 0.15)' : 'none',
    }}>
      <span style={{ ...headerStyle, ...style }}>{label}</span>
      {children}
    </div>
  )
}
// "eligible (black, Nội dung 2 semibold) / total USDC (grey, Chú thích semibold)" - 2026-09-10 correction:
// BOTH halves were prefixed "$" - `big` is a TICKET COUNT (eligiblePoolTotal/eligible, a plain positive
// number, no currency symbol at all) and `small` is a real USDC amount, which reads "USDC" (unit suffix),
// never "$" (this pool has no dollar-labelled display currency, only the real on-chain token).
function SplitAmount({ big, small }) {
  return (
    <span className="num" style={{ fontFamily: FONT_BODY }}>
      <span style={{ fontSize: 'var(--fs-content-2)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{big.toFixed(2)}</span>
      <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-muted-2)' }}> / {small.toFixed(2)} USDC</span>
    </span>
  )
}

// USDC / ARC toggle (row 3-5's epoch box, top-right) - 2026-09-10, user decision: was a dropdown
// revealing ARC/ETH both disabled, changed to a 2-segment TOGGLE instead (no popup) - USDC is the
// active/selected segment (filled brand blue), ARC sits greyed out and unclickable right next to it,
// same "chỉ USDC hoạt động, chưa có token" reason as before, just a clearer control shape for it.
function TokenToggle() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', fontFamily: FONT_BODY, height: 34,
      background: 'var(--color-white)', borderRadius: 999, padding: 3, gap: 2,
      boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', height: '100%', padding: '0 10px', borderRadius: 999,
        background: 'var(--grad-brand)', color: 'var(--color-white)',
        fontSize: 'var(--fs-content-2)', fontWeight: 'var(--fw-semibold)',
      }}>USDC</div>
      <div style={{
        display: 'flex', alignItems: 'center', height: '100%', padding: '0 10px', borderRadius: 999,
        color: 'var(--color-muted)', fontSize: 'var(--fs-content-2)', fontWeight: 'var(--fw-semibold)',
        opacity: 0.5, cursor: 'not-allowed',
      }}>ARC</div>
    </div>
  )
}

// A single row in the My history / Draw history popups.
function HistoryRow({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--color-gray)', paddingBottom: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{title}</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)' }}>{subtitle}</span>
      </div>
      <span className="num" style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-primary)', fontWeight: 'var(--fw-semibold)' }}>{right}</span>
    </div>
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
  const [popup, setPopup] = useState(null) // null | 'deposit' | 'withdraw' | 'result' | 'history' | 'myhistory'
  const [depositAmt, setDepositAmt] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [txError, setTxError] = useState('')
  const [txStatus, setTxStatus] = useState('')
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [myHistory, setMyHistory] = useState(null)
  const [myHistoryError, setMyHistoryError] = useState('')

  function loadInfo() {
    return ensureWalletAddress()
      .then(addr => addr ? getLuckyPotInfo(addr) : Promise.reject(new Error('no wallet address')))
      .then(i => setInfo(i))
      .catch(e => setError(e?.message || 'Could not load LuckyPot data'))
  }
  // After a deposit/withdraw/claim, ONE immediate loadInfo() call was the only refresh - no retry, no
  // interval. 2026-09-10 bug report: the number stayed stuck after a real deposit ("trơ ra"). Root cause:
  // executeChallenge resolving only means the PIN signature was accepted and the tx BROADCAST, not that
  // it is mined/indexed yet - the immediate read can land before the RPC node has caught up, and nothing
  // ever asked again. Fixed with 2 extra delayed re-checks (3s, then 8s) on top of the immediate one -
  // same backoff idea multicallWithRetry already uses elsewhere, just applied here at the UI layer instead
  // of inside one RPC call.
  function reloadInfoAfterTx() {
    loadInfo()
    setTimeout(loadInfo, 3000)
    setTimeout(loadInfo, 8000)
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
  function openMyHistory() {
    openPopup('myhistory')
    if (myHistory === null && walletAddress) {
      getMyHistory(walletAddress).then(setMyHistory).catch(e => setMyHistoryError(e?.message || 'Could not load your history'))
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
      reloadInfoAfterTx()
      const reloadBalance = () => getTokenBalances(walletAddress).then(ts => setWalletUsdc((ts.find(t => t.symbol === 'USDC') || {}).amount ?? 0)).catch(() => {})
      reloadBalance(); setTimeout(reloadBalance, 3000)
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
      reloadInfoAfterTx()
      const reloadBalance = () => getTokenBalances(walletAddress).then(ts => setWalletUsdc((ts.find(t => t.symbol === 'USDC') || {}).amount ?? 0)).catch(() => {})
      reloadBalance(); setTimeout(reloadBalance, 3000)
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
      reloadInfoAfterTx()
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
      {/* 2026-09-10 REBUILD against the user's updated Figma file (node 1:158) - this is now much closer
          to the real luckypot.cc frontend, per the user's own description. Every zone below sits on
          exact guideline-grid coordinates (HANDOFF.md READ FIRST §1: 70px rows, 16px gutter). */}

      {/* Row 1 - menu icon + "LuckyPot.cc" wordmark (Space Grotesk bold 28px, was --fs-title 25), both LEFT. */}
      <div className="row-1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <Icon name="menu" size={27} color="var(--color-content)" />
        </button>
        <span style={{ fontFamily: FONT_HEADER, fontSize: 28, fontWeight: 700 }}>
          <span style={{ color: 'var(--color-content)' }}>LuckyPot</span>
          <span style={{ color: 'var(--color-muted-2)' }}>.cc</span>
        </span>
      </div>

      {/* Row 2 - the hint strip: solid warning colour, black text. Radius 16 (was 10), height matches
          row 2 exactly (8.29dvh, was 8.82), icon 25 (was 20), text 13px semibold (was --fs-label medium). */}
      <div className="row-2" style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={hasUnclaimedPrize ? () => openPopup('result') : copyAddressAndFaucet} style={{
          flex: 1, height: '8.29dvh', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
          background: 'var(--color-warning)', border: 'none', borderRadius: 16, padding: '0 14px', fontFamily: FONT_BODY,
        }}>
          <Icon name={hasUnclaimedPrize ? 'check' : 'info'} size={25} color="var(--color-content)" />
          <span style={{ flex: 1, fontSize: 'var(--fs-caption)', color: 'var(--color-content)', fontWeight: 'var(--fw-semibold)' }}>
            {hasUnclaimedPrize
              ? `You won $${info.owedLastEpoch.toFixed(2)} last epoch - tap to claim.`
              : "Need testnet USDC? Tap to copy your address and open the faucet."}
          </span>
        </button>
      </div>

      {/* Row 3-5 - Epoch box: radius 16 (was 10), height 28.67dvh/242px (was 28.82/243.2) - the 4
          sub-rows still split 1:1:2 (60.5px each), that proportion was already correct. */}
      <div style={{ gridRow: '3 / 6', alignSelf: 'center', height: '28.67dvh', background: 'var(--color-surface)', borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column' }}>
        <StatRow divider label={info ? `EPOCH #${info.epochId}` : '…'} style={{ fontSize: 'var(--fs-content-1)' }}>
          <TokenToggle />
        </StatRow>
        {/* "Draw in:" - label 16px --color-muted-2 (was --fs-label muted), value Space Grotesk BOLD 18px
            black (was body-font 17 regular) - node 13:154/13:155. */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_BODY, borderBottom: '1.5px solid rgba(11, 83, 191, 0.15)' }}>
          <span style={{ fontSize: 'var(--fs-content-2)', color: 'var(--color-muted-2)' }}>Draw in:</span>
          <span className="num" style={{ fontFamily: FONT_HEADER, fontSize: 'var(--fs-content-1)', fontWeight: 700, color: 'var(--color-content)' }}>
            {info ? fmtCountdown(info.epochEndTime, now) : '…'}
          </span>
        </div>
        {/* Yield sentence - 16px regular base (was --fs-label), the 2 inline numbers 18px semibold black
            (was --fs-item) - node 13:156. */}
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', fontFamily: FONT_BODY }}>
          {error ? (
            <span style={{ fontSize: 'var(--fs-content-2)', color: 'var(--color-error)' }}>{error}</span>
          ) : info ? (
            <span style={{ fontSize: 'var(--fs-content-2)', color: 'var(--color-muted-2)', lineHeight: 1.35 }}>
              This week's yield goes to <strong style={{ color: 'var(--color-content)', fontSize: 'var(--fs-content-1)' }}>{info.numWinners}</strong> winner{info.numWinners === 1 ? '' : 's'} out
              of <strong style={{ color: 'var(--color-content)', fontSize: 'var(--fs-content-1)' }}>{info.eligibleParticipantCount}</strong> player{info.eligibleParticipantCount === 1 ? '' : 's'}. Winners return 5% to the protocol.
            </span>
          ) : (
            <span style={{ fontSize: 'var(--fs-content-2)', color: 'var(--color-muted-2)' }}>Loading…</span>
          )}
        </div>
      </div>

      {/* Row 6-8 - Tickets/Deposit box: radius 16 (was 10), height 28.67dvh (was 28.82). */}
      <div style={{ gridRow: '6 / 9', alignSelf: 'center', height: '28.67dvh', background: 'var(--color-surface)', borderRadius: 16, padding: 8, display: 'flex', flexDirection: 'column' }}>
        <StatRow divider label="Total tickets / Pool">
          {info ? <SplitAmount big={info.eligiblePoolTotal} small={info.poolTotal} /> : <span className="num" style={{ fontFamily: FONT_BODY }}>…</span>}
        </StatRow>
        {/* "My tickets / My deposit" - node 14:160 repeats "My" for both halves; the previous build
            dropped the second one. */}
        <StatRow divider label="My tickets / My deposit">
          {info ? <SplitAmount big={info.eligible} small={info.deposited} /> : <span className="num" style={{ fontFamily: FONT_BODY }}>…</span>}
        </StatRow>
        {/* Wallet line - node 14:185: "Your balance: X USDC" (was "In your wallet:"), REGULAR weight
            (was semibold - this line's base style differs from the rows above it in the Figma file),
            label --color-muted-2 16px, value black. Grouped TIGHT with the buttons (user fix 2026-09-08:
            space-between pushed them apart, leaving an ugly gap). */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-content-2)', fontWeight: 'var(--fw-normal)', color: 'var(--color-muted-2)' }}>
            Your balance: <span style={{ color: 'var(--color-content)' }}>{walletUsdc != null ? `${walletUsdc.toFixed(2)} USDC` : '…'}</span>
          </span>
          {/* RE-VERIFIED 2026-09-10 (the user redrew this row too): Deposit/Withdraw/Result are now
              EQUAL width, 102.66px each (nodes 14:163/15:223/15:226) - the earlier 92:91:125 proportion
              was from a stale pull. flex:1 each with an 8px gap reproduces that exactly. Height 34px,
              16px semibold, glow shadow. ⚠️ "Result", NOT "Latest result" (user decision 2026-09-10,
              overriding the Figma text on purpose - do not "fix" this back to match the design). */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, height: 34, minHeight: 0, fontFamily: FONT_BODY, fontSize: 'var(--fs-content-2)', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)' }} onClick={() => openPopup('deposit')}>Deposit</button>
            <button className="btn btn-secondary" style={{ flex: 1, height: 34, minHeight: 0, fontFamily: FONT_BODY, fontSize: 'var(--fs-content-2)', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)' }} onClick={() => openPopup('withdraw')}>Withdraw</button>
            <button className="btn" style={{ flex: 1, height: 34, minHeight: 0, fontFamily: FONT_BODY, fontSize: 'var(--fs-content-2)', background: 'var(--color-warning)', color: 'var(--color-content)', border: 'none', boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)' }}
              disabled={!resultWindowOpen} onClick={() => openPopup('result')}>Result</button>
          </div>
        </div>
      </div>

      {/* Row 9 - Draw history + My history, SIDE BY SIDE (2026-09-10: the user added a second box here,
          bringing this screen to parity with the real luckypot.cc frontend - `openMyHistory` and the
          "My history" popup already existed below, wired only into the hamburger menu until now). Each
          box is exactly half the content width minus the 8px gap (166px of 340px, matching Menu's
          Withdraw/Deposit split), height = row 9 exactly (8.29dvh). */}
      <div className="row-9" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={openHistory} style={{
          flex: 1, height: '8.29dvh',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-surface)', border: 'none', borderRadius: 16, padding: '0 14px', cursor: 'pointer',
        }}>
          <span style={headerStyle}>Draw history</span>
          <Icon name="right2" size={18} color="var(--color-brand)" />
        </button>
        <button onClick={openMyHistory} style={{
          flex: 1, height: '8.29dvh',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-surface)', border: 'none', borderRadius: 16, padding: '0 14px', cursor: 'pointer',
        }}>
          <span style={headerStyle}>My history</span>
          <Icon name="right2" size={18} color="var(--color-brand)" />
        </button>
      </div>

      {/* Row 10 - Exit */}
      <div className="row-10" style={{ display: 'flex' }}>
        <button onClick={() => navigate('ServiceHub')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-content-1)', fontWeight: 'var(--fw-bold)',
            color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)',
            WebkitTapHighlightColor: 'transparent',
          }}>Exit</button>
      </div>

      {/* ── Menu popup (row 1's hamburger) ── */}
      {menuOpen && (
        <LPModal title="LuckyPot menu" onClose={() => setMenuOpen(false)}>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }} onClick={() => openPopup('deposit')}>Deposit</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }} onClick={() => openPopup('withdraw')}>Withdraw</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }} onClick={openHistory}>Draw history</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }} onClick={openMyHistory}>My history</button>
          <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }} onClick={() => navigate('ServiceHub')}>Exit</button>
        </LPModal>
      )}

      {/* ── Deposit popup ── */}
      {popup === 'deposit' && (
        <LPModal title="Deposit" onClose={closePopup}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)' }}>
            Wallet balance: <strong className="num" style={{ color: 'var(--color-content)' }}>{walletUsdc != null ? walletUsdc.toFixed(2) : '…'} USDC</strong>
          </span>
          <AmountField amount={depositAmt} setAmount={setDepositAmt} onMax={() => setDepositAmt(String(walletUsdc ?? 0))} />
          <button className="btn btn-primary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }}
            disabled={busy || !(parseFloat(depositAmt) > 0) || parseFloat(depositAmt) > (walletUsdc ?? 0)}
            onClick={handleDeposit}>
            {busy ? (txStatus || 'Confirming…') : 'Deposit'}
          </button>
          {txError && <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }}>{txError}</span>}
        </LPModal>
      )}

      {/* ── Withdraw popup ── */}
      {popup === 'withdraw' && (
        <LPModal title="Withdraw" onClose={closePopup}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)' }}>
            Deposited: <strong className="num" style={{ color: 'var(--color-content)' }}>{info ? info.deposited.toFixed(2) : '…'} USDC</strong>
          </span>
          <AmountField amount={withdrawAmt} setAmount={setWithdrawAmt} onMax={() => setWithdrawAmt(String(info?.deposited ?? 0))} />
          {info?.eligible > 0 && parseFloat(withdrawAmt) > 0 && (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-warning)' }}>
              Withdrawing now will remove you from this epoch's draw.
            </span>
          )}
          <button className="btn btn-primary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }}
            disabled={busy || !(parseFloat(withdrawAmt) > 0) || parseFloat(withdrawAmt) > (info?.deposited ?? 0)}
            onClick={handleWithdraw}>
            {busy ? (txStatus || 'Confirming…') : 'Withdraw'}
          </button>
          {txError && <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }}>{txError}</span>}
        </LPModal>
      )}

      {/* ── Result / Claim popup (tap-to-reveal) ── */}
      {popup === 'result' && info && (
        <LPModal title={`Epoch #${info.prevEpochId} - your result`} onClose={closePopup}>
          {!revealed ? (
            <button className="btn btn-secondary" style={{ width: '100%', fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }} onClick={() => setRevealed(true)}>
              Tap to reveal
            </button>
          ) : info.wonLastEpoch ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)' }}>You won</span>
              <span className="num" style={{ fontFamily: FONT_BODY, fontSize: 32, fontWeight: 'var(--fw-light)', color: 'var(--color-primary)' }}>
                ${info.owedLastEpoch.toFixed(2)}
              </span>
              {info.hasClaimedLastEpoch ? (
                <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)' }}>Already claimed.</span>
              ) : (
                <>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)' }} disabled={busy} onClick={handleClaim}>
                    {busy ? (txStatus || 'Confirming…') : (pastClaimWindow ? 'Release prize' : 'Claim now')}
                  </button>
                  {pastClaimWindow && (
                    <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>
                      The self-claim window passed, but your prize is still there - this releases it.
                    </span>
                  )}
                  {txError && <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }}>{txError}</span>}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)' }}>Good luck next epoch</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)' }}>Your principal is safe and still deposited.</span>
            </div>
          )}
        </LPModal>
      )}

      {/* ── Draw history popup ── */}
      {popup === 'history' && (
        <LPModal title="Draw history" onClose={closePopup}>
          {historyError ? (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }}>{historyError}</span>
          ) : history === null ? (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>Loading…</span>
          ) : history.length === 0 ? (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>No draws yet.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map(h => (
                <HistoryRow key={h.epochId} title={`Epoch #${h.epochId}`} subtitle={dateLabel(h.drawnAt)}
                  right={`$${h.weeklyYield.toFixed(2)} - ${h.numWinners} winner${h.numWinners === 1 ? '' : 's'}`} />
              ))}
            </div>
          )}
        </LPModal>
      )}

      {/* ── My history popup ── */}
      {popup === 'myhistory' && (
        <LPModal title="My history" onClose={closePopup}>
          {myHistoryError ? (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-error)' }}>{myHistoryError}</span>
          ) : myHistory === null ? (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>Loading…</span>
          ) : myHistory.length === 0 ? (
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--fs-caption)', color: 'var(--color-muted)', textAlign: 'center' }}>No activity yet.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myHistory.map(h => (
                <HistoryRow key={h.hash} title={h.type} subtitle={dateLabel(h.timestamp)} right={`$${h.amount.toFixed(2)}`} />
              ))}
            </div>
          )}
        </LPModal>
      )}
    </div>
  )
}
