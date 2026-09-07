import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { useNav } from '../nav'
import { ensureWalletAddress } from '../circle'
import { getLuckyPotInfo } from '../lib/luckyPot'

// LUCKYPOT - M1 (READ-ONLY, 2026-09-07). Real numbers off the deployed contract via src/lib/luckyPot.js
// (Multicall3, no signing). Deposit/Withdraw are STILL STUBS - see Desktop/LUCKYPOT-INTEGRATION-SPEC.md
// for the milestone plan; M2+ (deposit/withdraw/claim/referral writes) come in a later pass, not this one.
function fmtCountdown(endTimeSec) {
  const ms = endTimeSec * 1000 - Date.now()
  if (ms <= 0) return 'Draw pending'
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`
}

export default function LuckyPot() {
  const { navigate } = useNav()
  // null = loading (never show a fabricated 0 - same rule chain.js's balance reads follow)
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ensureWalletAddress()
      .then(addr => addr ? getLuckyPotInfo(addr) : Promise.reject(new Error('no wallet address')))
      .then(i => { if (alive) setInfo(i) })
      .catch(e => { if (alive) setError(e?.message || 'Could not load LuckyPot data') })
    return () => { alive = false }
  }, [])

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        LuckyPot
      </div>

      {/* Your deposit - real number once loaded, "…" while loading, never a fake 0 */}
      <div className="col center" style={{ gridRow: '2 / 4', gap: 8 }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Your deposit</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', fontFamily: 'var(--font-condensed)' }}>
          {info ? `$${info.deposited.toFixed(2)}` : '…'}
        </span>
        {info?.referrer && (
          <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>Referred by {info.referrer.slice(0, 6)}…{info.referrer.slice(-4)}</span>
        )}
      </div>

      {/* Won-last-week banner - only if the read confirms it AND it has not been claimed yet */}
      {info?.wonLastEpoch && !info.hasClaimedLastEpoch && (
        <div style={{
          gridRow: '4 / 5', background: 'var(--color-primary-soft)', border: `1.5px solid var(--color-primary)`, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', textAlign: 'center',
        }}>
          <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary)' }}>
            You won ${info.owedLastEpoch.toFixed(2)} last epoch - claim coming soon
          </span>
        </div>
      )}

      {/* Draw status - real epoch id/countdown/prize once loaded */}
      <div style={{
        gridRow: info?.wonLastEpoch && !info.hasClaimedLastEpoch ? '5 / 8' : '4 / 8',
        background: 'var(--color-white)', border: '1.5px solid var(--color-gray)', borderRadius: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 24px', textAlign: 'center',
      }}>
        <Icon name="luckypot" size="min(7.38dvh, 15.96vw)" />
        {error ? (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)' }}>{error}</span>
        ) : info ? (
          <>
            <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>Epoch #{info.epochId} - {fmtCountdown(info.epochEndTime)}</span>
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
              Eligible: ${info.eligible.toFixed(2)} · This week's yield: ${info.weeklyYieldUsd.toFixed(2)}
            </span>
            <span style={{ fontSize: 'var(--fs-tiny)', color: 'var(--color-muted)' }}>No loss, ever - withdraw any time.</span>
          </>
        ) : (
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>Loading…</span>
        )}
      </div>

      {/* Deposit / Withdraw - matching MenuScreen's dual button, still disabled stubs (M2/M3, not this pass) */}
      <div className="row-9" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-secondary" style={{ flex: 1, opacity: 0.4 }} disabled>Withdraw</button>
        <button className="btn btn-primary" style={{ flex: 1, opacity: 0.4 }} disabled>Deposit</button>
      </div>

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
    </div>
  )
}
