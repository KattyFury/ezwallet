import { useState, useEffect, lazy, Suspense } from 'react'
import { NavContext } from './nav'
import ErrorBoundary from './components/ErrorBoundary'
import BugButton from './components/BugButton'

// LAZY-LOAD EVERY SCREEN (2026-07-17) - the user: "why is this rubbish app so slow to load".
// Before: App.jsx imported all 22 screens STATICALLY → Vite bundled EVERYTHING into one 1,668 KB file, and the
// browser had to download + parse + run ALL of it before React drew the first character → a MEASURED 2.7s WHITE SCREEN on 4G.
// The heaviest parts were what the first screen does NOT need: jsQR 130KB (scanner only), qrcode.react (QR screens only).
// lazy() → one file per screen, downloaded only when the user actually opens it.
const Login       = lazy(() => import('./screens/Login'))
const HomeSend    = lazy(() => import('./screens/HomeSend'))
const HomeReceive = lazy(() => import('./screens/HomeReceive'))
const Swap        = lazy(() => import('./screens/Swap'))
const ServiceHub  = lazy(() => import('./screens/ServiceHub'))
const MenuScreen  = lazy(() => import('./screens/MenuScreen'))
const PasteAddress = lazy(() => import('./screens/PasteAddress'))
const SendAmount  = lazy(() => import('./screens/SendAmount'))
const SendConfirm = lazy(() => import('./screens/SendConfirm'))
const SendReceipt = lazy(() => import('./screens/SendReceipt'))
const EnterEmail  = lazy(() => import('./screens/EnterEmail'))
const CreateQR    = lazy(() => import('./screens/CreateQR'))
const ShowQR      = lazy(() => import('./screens/ShowQR'))
const SavedQRList = lazy(() => import('./screens/SavedQRList'))
const Contacts    = lazy(() => import('./screens/Contacts'))
const QRScanner   = lazy(() => import('./screens/QRScanner'))
const TxHistory   = lazy(() => import('./screens/TxHistory'))
const Currency    = lazy(() => import('./screens/Currency'))
const Security    = lazy(() => import('./screens/Security'))
const About       = lazy(() => import('./screens/About'))
const PinGate     = lazy(() => import('./screens/PinGate'))

const SCREENS = {
  Login,
  HomeSend, HomeReceive, Swap, ServiceHub, MenuScreen,
  PasteAddress, SendAmount, SendConfirm, SendReceipt,
  EnterEmail, CreateQR, ShowQR, SavedQRList,
  Contacts, QRScanner,
  TxHistory,
  Currency,
  Security,
  About,
  PinGate,
}

export default function App() {
  const [nav, setNav] = useState(() => {
    // Session exists → through the PIN GATE (wallet unlock) before HomeSend, unless this session is already unlocked
    // (ez_pin_ok - set after verifying the PIN, or right after CREATING the PIN on first login). No session → Login.
    const hasSession = localStorage.getItem('ez_user_token')
    if (!hasSession) return { screen: 'Login', params: {} }
    const unlocked = sessionStorage.getItem('ez_pin_ok')
    return unlocked ? { screen: 'HomeSend', params: {} } : { screen: 'PinGate', params: { next: 'HomeSend' } }
  })

  function navigate(screen, params = {}) {
    setNav({ screen, params })
  }

  // iOS/Android: when the keyboard opens, the browser SCROLLS the page to reveal the field → the screen/popup
  // "jumps up". Every input in this app is deliberately placed in the TOP HALF (above the keyboard area),
  // so we pin the page scroll at 0 → the field stays visible and the screen does not jump. (Only the PAGE
  // scroll is pinned; inner scrolling lists - overflow:auto in Contacts/History - are unaffected.)
  useEffect(() => {
    const lock = () => { if (window.scrollY !== 0) window.scrollTo(0, 0) }
    window.addEventListener('scroll', lock, { passive: true })
    return () => window.removeEventListener('scroll', lock)
  }, [])

  // PULL THE BACKUP of contacts/QR library once at startup (2026-07-29). Background, silent:
  // no KV binding / network error / MOCK → skipped, and the app never notices. It lives here (app startup) and
  // NOT in the Contacts screen: at this point the user certainly has no screen reading contacts open, so overwriting
  // local data cannot jolt the UI. Merge rules in detail: src/sync.js.
  // ⚠️ Since 08-06 (PIN-signature auth): the MAIN pull happens in PinGate, right after the user enters the PIN -
  // because the sync session token only exists after the signing step. This call now only covers a tab RELOAD
  // (sessionStorage survives → `ez_pin_ok` + `ez_sync_token` already exist, so PinGate is skipped).
  // With no token, `pullOnce` silently does nothing.
  useEffect(() => {
    if (!sessionStorage.getItem('ez_sync_token') || !localStorage.getItem('ez_wallet_addr')) return
    import('./sync').then(s => s.pullOnce()).catch(() => {})
  }, [])

  // PREFETCH while the browser is IDLE (2026-07-22g - the user: "the app is not smooth yet") → tab switching and the
  // PIN step feel SMOOTHER. No logic changes: it only warms the chunk cache (the dynamic import() still runs exactly the
  // same on real navigation). Frequently used screens are preloaded → switching tabs does NOT flash white (Suspense
  // fallback); the ~1MB Circle SDK (only needed for PIN signing) loads in the background → the PIN step does not stall
  // on a cold download. It runs when the browser is idle, so it does NOT compete for bandwidth at startup.
  useEffect(() => {
    const idle = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : cb => setTimeout(cb, 1600)
    const cancel = window.cancelIdleCallback ? window.cancelIdleCallback.bind(window) : clearTimeout
    const id = idle(() => {
      import('./screens/HomeSend'); import('./screens/HomeReceive')
      import('./screens/ServiceHub'); import('./screens/Swap'); import('./screens/MenuScreen')
      import('./screens/SendAmount'); import('./screens/Contacts'); import('./screens/TxHistory')
      if (import.meta.env.VITE_MOCK !== '1') import('@circle-fin/w3s-pw-web-sdk').catch(() => {})
    })
    return () => cancel(id)
  }, [])

  const Screen = SCREENS[nav.screen] || SCREENS['Login']

  return (
    <NavContext.Provider value={{ navigate, params: nav.params }}>
      <ErrorBoundary>
        {/* fallback = an EMPTY WHITE SCREEN FRAME, deliberately WITHOUT a spinner or "loading" text: screens load in
            <100ms, and a spinner that blinks in and out is more annoying than nothing. Keeping the white background +
            the exact .screen frame → no layout jump when the real screen appears. */}
        {/* ANCHOR FRAME for the bug-report button: same width and centring as .screen (max 430px), so the button
            hugs the APP's right edge and not the screen's (on desktop those two are very far apart).
            The inner .screen still handles its own height/overflow. */}
        <div style={{ position: 'relative', maxWidth: 'var(--screen-max)', margin: '0 auto' }}>
          <Suspense fallback={<div className="screen" />}>
            <Screen />
          </Suspense>
          {/* The bug-report button shows on EVERY screen, Login/PinGate included - errors are most likely exactly when
              you cannot get into the app, and blocking it there would silence the case that most needs reporting. */}
          <BugButton screen={nav.screen} />
        </div>
      </ErrorBoundary>
    </NavContext.Provider>
  )
}
