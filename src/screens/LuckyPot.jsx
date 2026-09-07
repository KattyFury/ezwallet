import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import logoFull from '../../design/luckypot/logo-full.svg?raw'
import { ensureWalletAddress, refreshSession, getSDK, executeChallenge, circleErrorMessage,
  executeLuckyPotDeposit, executeLuckyPotWithdraw, executeLuckyPotClaim } from '../circle'
import { getLuckyPotInfo } from '../lib/luckyPot'
import { getTokenBalances } from '../chain'
import { addNotif } from '../notif'

// LUCKYPOT - full build (2026-09-07) per Desktop/LUCKYPOT-LAYOUT-SPEC.md: read (M1) + Deposit (M2) +
// Withdraw (M3) + Claim (M4). Theme = ezwallet's own light/blue tokens (HANDOFF decision, NOT the
// dark/green luckypot.cc draft). Referral is OUT of scope here (spec §0) - no UI for it on this screen.
function fmtCountdown(endTimeSec, nowSec) {
  const s = endTimeSec - nowSec
  if (s <= 0) return 'Draw pending'
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return `${d}d ${h}h ${m}m ${sec}s`
}

// The shared popup shell (spec §6): 5/6 width, closes ONLY via the X top-right or a click outside - no
// bottom Close button (user decision 2026-09-08). Used for EVERY popup on this screen (menu, Deposit,
// Withdraw, result/Claim, Faucet).
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
        display: 'flex', flexDirection: 'column', gap: 14,
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

function AmountField({ amount, setAmount, max, onMax }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.5px solid var(--color-gray)', paddingBottom: 8 }}>
      <input className="num" type="number" min="0" inputMode="decimal" value={amount} placeholder="0.00"
        onChange={e => setAmount(e.target.value)}
        style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-content)' }} />
      <button onClick={onMax} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-label)' }}>MAX</button>
    </div>
  )
}

export default function LuckyPot() {
  const { navigate } = useNav()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('ez_wallet_addr'))
  useEffect(() => { if (!walletAddress) ensureWalletAddress().then(a => a && setWalletAddress(a)).catch(() => {}) }, [])
  const walletId = localStorage.getItem('ez_wallet_id')

  const [walletUsdc, setWalletUsdc] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [popup, setPopup] = useState(null) // null | 'deposit' | 'withdraw' | 'result' | 'faucet'
  const [depositAmt, setDepositAmt] = useState('')
  const [withdrawAmt, setWithdrawAmt] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [txError, setTxError] = useState('')
  const [txStatus, setTxStatus] = useState('')

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

  const pastClaimWindow = info?.prevEpochDrawnAt != null && info?.sweepDelay
    ? now >= info.prevEpochDrawnAt + info.sweepDelay : false

  function closePopup() { setPopup(null); setTxError(''); setTxStatus(''); setBusy(false); setRevealed(false) }
  function openPopup(p) { setMenuOpen(false); setDepositAmt(''); setWithdrawAmt(''); setTxError(''); setPopup(p) }

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

  function copyAddressAndFaucet() {
    navigator.clipboard?.writeText(walletAddress || '').catch(() => {})
    window.open('https://faucet.circle.com', '_blank', 'noopener,noreferrer')
  }

  const hasUnclaimedPrize = info?.wonLastEpoch && !info?.hasClaimedLastEpoch

  return (
    <div className="screen">
      {/* Row 1 - logo (not tappable) + hamburger opening the menu. The hamburger sits LEFT of the global
          BugButton (App.jsx renders it absolute at right:20/top:5dvh on every screen) so the two don't overlap. */}
      <div className="row-1" style={{ display: 'flex', alignItems: 'center' }}>
        <span className="lp-logo" style={{ height: '3dvh', display: 'flex', alignItems: 'center', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: logoFull }} />
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={{
          position: 'absolute', top: '5dvh', right: 56, transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 8, WebkitTapHighlightColor: 'transparent',
        }}>
          <Icon name="menu" size="var(--is-body)" color="var(--color-content)" />
        </button>
      </div>

      {/* Row 2 - dynamic banner: unclaimed prize (gold) takes priority over the faucet suggestion */}
      <div className="row-2" style={{ display: 'flex' }}>
        {hasUnclaimedPrize ? (
          <button onClick={() => openPopup('result')} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
            background: 'var(--color-warning-soft)', border: `1.5px solid var(--color-warning)`, borderRadius: 10,
            padding: '0 14px', fontFamily: 'inherit',
          }}>
            <Icon name="warning" size={20} color="var(--color-warning)" />
            <span style={{ flex: 1, fontSize: 'var(--fs-label)', color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>
              You won ${info.owedLastEpoch.toFixed(2)} last epoch - tap to claim.
            </span>
          </button>
        ) : (
          <button onClick={() => openPopup('faucet')} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
            background: 'var(--color-surface)', border: `1.5px solid var(--color-gray)`, borderRadius: 10,
            padding: '0 14px', fontFamily: 'inherit',
          }}>
            <Icon name="info" size={20} color="var(--color-brand)" />
            <span style={{ flex: 1, fontSize: 'var(--fs-label)', color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>
              Need testnet USDC? Tap to copy your address and open the faucet.
            </span>
          </button>
        )}
      </div>

      {/* Row 3-5 - Epoch box */}
      <div style={{ gridRow: '3 / 6', background: 'var(--color-white)', border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)' }}>{info ? `Epoch #${info.epochId}` : '…'}</span>
          <span style={{ fontSize: 'var(--fs-tiny)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-muted)', border: '1.5px solid var(--color-gray)', borderRadius: 999, padding: '2px 10px' }}>USDC</span>
        </div>
        {error ? (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>
        ) : info ? (
          <>
            <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Draw in</span>
            <span className="num" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary)' }}>
              {fmtCountdown(info.epochEndTime, now)}
            </span>
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', lineHeight: 1.35 }}>
              This week's yield goes to <strong style={{ color: 'var(--color-content)' }}>{info.numWinners}</strong> winner{info.numWinners === 1 ? '' : 's'} out
              of <strong style={{ color: 'var(--color-content)' }}>{info.eligibleParticipants}</strong> player{info.eligibleParticipants === 1 ? '' : 's'}. Winners return 5% to the protocol.
            </span>
          </>
        ) : (
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>Loading…</span>
        )}
      </div>

      {/* Row 6-8 - Tickets/Deposit box */}
      <div style={{ gridRow: '6 / 9', background: 'var(--color-white)', border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-tiny)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary)', textTransform: 'uppercase' }}>Total tickets / pool</span>
            <span className="num" style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)' }}>{info ? `$${info.eligiblePoolTotal.toFixed(2)} / $${info.poolTotal.toFixed(2)}` : '…'}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--fs-tiny)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary)', textTransform: 'uppercase' }}>My tickets / deposit</span>
            <span className="num" style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)' }}>{info ? `$${info.eligible.toFixed(2)} / $${info.deposited.toFixed(2)}` : '…'}</span>
          </div>
        </div>
        <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>
          In your wallet: {walletUsdc != null ? `${walletUsdc.toFixed(2)} USDC` : '…'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1, fontSize: 'var(--fs-label)' }} onClick={() => openPopup('deposit')}>Deposit</button>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 'var(--fs-label)' }} onClick={() => openPopup('withdraw')}>Withdraw</button>
          <button className="btn btn-secondary" style={{ flex: 1, fontSize: 'var(--fs-label)' }} disabled={!info || info.prevEpochId === null} onClick={() => openPopup('result')}>Latest result</button>
        </div>
      </div>

      {/* Row 9 - Draw history (not built yet, dimmed like every other "coming soon" row in the app) */}
      <div className="row-9" style={{ display: 'flex', alignItems: 'center' }}>
        <button disabled style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%',
          background: 'none', border: 'none', padding: '0 4px', opacity: 0.4, cursor: 'not-allowed', fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)' }}>Draw history</span>
          <Icon name="right2" size={16} color="var(--color-muted)" />
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
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => openPopup('deposit')}>Deposit</button>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => openPopup('withdraw')}>Withdraw</button>
          <button className="btn btn-secondary" disabled style={{ width: '100%', opacity: 0.4 }}>Draw history</button>
          <button className="btn btn-secondary" disabled style={{ width: '100%', opacity: 0.4 }}>My history</button>
          <button className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-error)' }} onClick={() => navigate('ServiceHub')}>Exit</button>
        </LPModal>
      )}

      {/* ── Deposit popup ── */}
      {popup === 'deposit' && (
        <LPModal title="Deposit" onClose={closePopup}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
            Wallet balance: <strong className="num" style={{ color: 'var(--color-content)' }}>{walletUsdc != null ? walletUsdc.toFixed(2) : '…'} USDC</strong>
          </span>
          <AmountField amount={depositAmt} setAmount={setDepositAmt} onMax={() => setDepositAmt(String(walletUsdc ?? 0))} />
          <button className="btn btn-primary" style={{ width: '100%' }}
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
            Deposited: <strong className="num" style={{ color: 'var(--color-content)' }}>{info ? info.deposited.toFixed(2) : '…'} USDC</strong>
          </span>
          <AmountField amount={withdrawAmt} setAmount={setWithdrawAmt} onMax={() => setWithdrawAmt(String(info?.deposited ?? 0))} />
          {info?.eligible > 0 && parseFloat(withdrawAmt) > 0 && (
            <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-warning)' }}>
              Withdrawing now will remove you from this epoch's draw.
            </span>
          )}
          <button className="btn btn-primary" style={{ width: '100%' }}
            disabled={busy || !(parseFloat(withdrawAmt) > 0) || parseFloat(withdrawAmt) > (info?.deposited ?? 0)}
            onClick={handleWithdraw}>
            {busy ? (txStatus || 'Confirming…') : 'Withdraw'}
          </button>
          {txError && <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{txError}</span>}
        </LPModal>
      )}

      {/* ── Result / Claim popup (tap-to-reveal, spec §6) ── */}
      {popup === 'result' && info && (
        <LPModal title={`Epoch #${info.prevEpochId} - your result`} onClose={closePopup}>
          {!revealed ? (
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setRevealed(true)}>
              Tap to reveal
            </button>
          ) : info.wonLastEpoch ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textTransform: 'uppercase' }}>You won</span>
              <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', color: 'var(--color-primary)' }}>
                ${info.owedLastEpoch.toFixed(2)}
              </span>
              {info.hasClaimedLastEpoch ? (
                <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Already claimed.</span>
              ) : (
                <>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy} onClick={handleClaim}>
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

      {/* ── Faucet popup ── */}
      {popup === 'faucet' && (
        <LPModal title="Get testnet USDC" onClose={closePopup}>
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>
            Your wallet address will be copied. Paste it on Circle's faucet page to receive free testnet USDC.
          </span>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={copyAddressAndFaucet}>
            Copy address &amp; open faucet
          </button>
        </LPModal>
      )}
    </div>
  )
}
