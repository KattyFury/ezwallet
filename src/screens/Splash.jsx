import logoLong from '../../design/logo.svg'

// Figma "Splash" (node 1:169, re-verified 2026-09-11 directly on THIS node, not borrowed from
// Login): the wordmark logo is HORIZONTALLY centred only - vertically it sits at top=179.58px
// (21.28dvh of 844), which lands inside row 3 (172-242px) of the guideline grid, NOT screen-centre.
// Login's own logo (node 1:180's group 3:11) happens to sit at the identical y=179.58px, so the two
// screens share one fixed lockup and the logo does not jump when Splash hands off to Login - but this
// number comes from Splash's own node, confirmed via a fresh get_metadata + a clean figma-check pixel
// diff, not assumed from Login.
export default function Splash() {
  return (
    <div className="screen">
      <img src={logoLong} alt="ezwallet"
        style={{ position: 'absolute', top: '21.28dvh', left: '50%', transform: 'translateX(-50%)', width: 'min(50vw, calc(var(--screen-max) / 2))' }} />
    </div>
  )
}
