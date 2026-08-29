import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import logoLong from '../design/logo.svg'
import { MOCK, seedMockSession, installMockFetch } from './mock'

// MOCK MODE (npm run mock): skips Login/PIN, blocks the network, feeds fake data. NEVER in production.
if (MOCK) { seedMockSession(); installMockFetch() }

// ⚡ PRIVY IS LAZY-LOADED, and the whole app sits inside it. Do NOT turn this back into
// `import { PrivyProvider } from '@privy-io/react-auth'` at the top of this file - the reasoning,
// with the measurements, is at the top of PrivyRoot.jsx. Short version: imported eagerly it puts
// 777 kB gzip in front of the first paint, against 52 kB for the Circle build.
// (The provider stays above App even in MOCK mode: the hooks in App.jsx throw without a provider
// over them, and React does not allow calling hooks conditionally. MOCK never waits on it - App.jsx
// reads the seeded localStorage session instead - so the provider just sits there unused.)
const PrivyRoot = lazy(() => import('./PrivyRoot'))

// The splash while Privy arrives. It is the LOGO ALONE, positioned exactly as on the Login screen
// (same 50%-of-screen width, same rows 1-5 frame) - so when the real screen replaces it the logo
// does not move, and the slogan and button simply appear underneath. An empty white frame is what
// the app uses elsewhere, but that fallback was written for chunks that load in under 100ms; this
// one is measured in seconds on a phone, and seconds of nothing reads as a broken app.
function Splash() {
  return (
    <div style={{ position: 'relative', maxWidth: 'var(--screen-max)', margin: '0 auto' }}>
      <div className="screen">
        <div className="row-1-5 center col" style={{ gap: '3dvh' }}>
          <img src={logoLong} alt="ezwallet" style={{ width: 'min(50vw, calc(var(--screen-max) / 2))' }} />
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<Splash />}>
      <PrivyRoot />
    </Suspense>
  </React.StrictMode>
)
