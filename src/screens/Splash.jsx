import logoLong from '../../design/logo.svg'

// Figma "Splash" (node 1:169): just the wordmark logo, centred, same position/size as the
// logo on Login (node 1:180's group 3:11 sits at the identical y=179.58px) - the two screens
// share one fixed lockup so the logo does not jump when Splash hands off to Login.
export default function Splash() {
  return (
    <div className="screen">
      <img src={logoLong} alt="ezwallet"
        style={{ position: 'absolute', top: '21.28dvh', left: '50%', transform: 'translateX(-50%)', width: 'min(50vw, calc(var(--screen-max) / 2))' }} />
    </div>
  )
}
