import Icon from '../components/Icon'
import { useNav } from '../nav'

// LUCKYPOT - DRAFT FRAME (2026-09-07), placeholder scaffold only. Real logic still to come: call the
// deployed LuckyStakerPool contract (0xBdE568986a009eBaAE31Cb78033470c334Fad698, Arc Testnet) via the
// SAME PIN/contractExecution pattern Swap.jsx already uses - no wagmi, no LuckyPot's own frontend, no
// separate wallet connect. See the plan discussed in chat: port deposit/withdraw/claim into this screen
// using Circle's contractExecution + a new lib/luckyPot.js encoder (mirrors chain.js's existing pattern).
// Deposit/Withdraw below are STUBS (disabled) - wiring them is the next step, not part of this frame.
export default function LuckyPot() {
  const { navigate } = useNav()

  return (
    <div className="screen">
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        LuckyPot
      </div>

      {/* Your deposit - placeholder amount until the real contract read is wired in */}
      <div className="col center" style={{ gridRow: '2 / 4', gap: 8 }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>Your deposit</span>
        <span style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-light)', fontFamily: 'var(--font-condensed)' }}>$0.00</span>
      </div>

      {/* Draw status - placeholder, real epoch/eligibility data comes from the contract later */}
      <div style={{
        gridRow: '4 / 8', background: 'var(--color-white)', border: '1.5px solid var(--color-gray)', borderRadius: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 24px', textAlign: 'center',
      }}>
        <Icon name="luckypot" size="min(7.38dvh, 15.96vw)" />
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>Deposit USDC for a shot at this week's prize</span>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>No loss, ever - withdraw any time.</span>
      </div>

      {/* Deposit / Withdraw - matching MenuScreen's dual button, disabled stubs until the real
          deposit/withdraw challenge is wired in */}
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
