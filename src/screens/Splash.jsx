import logoLong from '../../design/logo.svg'

// Figma "Splash" (node 1:169): just the wordmark, positioned by the shared `.logo-lockup` class -
// see THE LOGO RULE in index.css for the measured numbers and why no screen may re-declare them.
export default function Splash() {
  return (
    <div className="screen">
      <img className="logo-lockup" src={logoLong} alt="ezwallet" />
    </div>
  )
}
