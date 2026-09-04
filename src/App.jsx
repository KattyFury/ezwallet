import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
import { usePrivy, useWallets, useMfa, useRegisterMfaListener, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { NavContext } from './nav'
import ErrorBoundary from './components/ErrorBoundary'
import BugButton from './components/BugButton'
import { MOCK } from './mock'
import { rememberLogin } from './privy'

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
const ProtectWallet = lazy(() => import('./screens/ProtectWallet'))
const CreateQR    = lazy(() => import('./screens/CreateQR'))
const ShowQR      = lazy(() => import('./screens/ShowQR'))
const SavedQRList = lazy(() => import('./screens/SavedQRList'))
const Contacts    = lazy(() => import('./screens/Contacts'))
const QRScanner   = lazy(() => import('./screens/QRScanner'))
const TxHistory   = lazy(() => import('./screens/TxHistory'))
const Currency    = lazy(() => import('./screens/Currency'))
const Security    = lazy(() => import('./screens/Security'))
const About       = lazy(() => import('./screens/About'))
// PinGate was DELETED on 2026-08-30. It existed to make the user enter their Circle PIN before the
// app opened, and that PIN was real: it completed the MPC signature. Privy holds the key in its own
// secure hardware and gates signing on its session, so there is no local secret a PIN of ours could
// lock - a rebuilt one would have been a string comparison anyone could step around. The guard moved
// to where it actually protects something: a fingerprint check in front of SIGNING (see the MFA
// listener below), not in front of looking at your own balance.

const SCREENS = {
  Login,
  HomeSend, HomeReceive, Swap, ServiceHub, MenuScreen,
  PasteAddress, SendAmount, SendConfirm, SendReceipt,
  ProtectWallet, CreateQR, ShowQR, SavedQRList,
  Contacts, QRScanner,
  TxHistory,
  Currency,
  Security,
  About,
}

export default function App() {
  const { ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()

  // ══ THE FINGERPRINT CHECK IN FRONT OF THE MONEY (2026-08-30) ══
  // Once the user has turned on Fingerprint/Face ID (Security screen), Privy demands it before
  // anything uses the wallet's key. Because this app hides Privy's own wallet UIs, that demand
  // arrives HERE instead of as a Privy modal - and if nothing answered it, signing would simply
  // hang, or worse, the check would quietly never happen.
  //
  // `promptMfa()` hands this to PRIVY'S OWN dialog rather than a hand-built one (user decision
  // 2026-08-30: use Privy's popups, do not re-implement flows Privy already ships). For a passkey
  // that dialog leads straight to the device's own prompt - Windows Hello, Touch ID, Face ID - so
  // the whole "second factor" is one touch, which is the point: the person this app is for should
  // not have to learn a new ritual to send money to their family.
  //
  // ⚠️ THE CALLBACK MUST BE STABLE ACROSS RENDERS. Written the obvious way - an object literal with
  // an inline arrow, straight into the hook call - it is a BRAND NEW object and a brand new function
  // on every single render. Privy subscribes to what it is handed, so a fresh callback each render
  // means unsubscribe/resubscribe on every render, and if that subscription touches state at all the
  // app renders again and the loop never ends. That is a hard freeze, not slowness, and it is what
  // "the app keeps crashing" was (2026-08-30).
  // The fix is the standard one: keep the live functions in a ref, hand the hook ONE callback that
  // never changes identity, and read the current functions out of the ref when it actually fires.
  const mfa = useMfa()
  const mfaRef = useRef(mfa)
  mfaRef.current = mfa
  const onMfaRequired = useCallback(async () => {
    try {
      await mfaRef.current.promptMfa()
    } catch (e) {
      // Cancelled, wrong, or timed out. Cancel the flow so the pending send rejects and the screen
      // that started it can say so - leaving it open would strand the user on "Sending..." forever.
      console.error('[MFA]', e)
      try { mfaRef.current.cancel() } catch {}
    }
  }, [])
  const mfaListener = useMemo(() => ({ onMfaRequired }), [onMfaRequired])
  useRegisterMfaListener(mfaListener)
  // null = not decided yet. The Circle build could pick the first screen SYNCHRONOUSLY, because
  // "is there a session" was just `localStorage.ez_user_token`. Privy answers that question
  // asynchronously (it restores a previous visit's session over the network), so there is a moment
  // where the honest answer is "not known yet" - and drawing Login during it would flash the
  // sign-in screen at somebody who is already signed in. MOCK keeps the old instant path.
  const [nav, setNav] = useState(() => (MOCK ? { screen: 'HomeSend', params: {} } : null))

  function navigate(screen, params = {}) {
    setNav({ screen, params })
  }

  // Privy IS the session now. This one effect covers both the first decision and every later change
  // (signing out from MenuScreen flips `authenticated` to false and lands the user back on Login).
  useEffect(() => {
    if (MOCK || !ready) return
    if (!authenticated) {
      setNav({ screen: 'Login', params: {} })
      return
    }
    // Straight in. There is no unlock screen any more - the guard is on SIGNING, not on opening the
    // app (see the deleted-PinGate note above the lazy imports).
    setNav(n => n?.screen === 'Login' || !n ? { screen: 'HomeSend', params: {} } : n)
  }, [ready, authenticated])

  // ══ THE WALLET THE APP IS SHOWING - TWO KINDS, ONE VARIABLE (2026-08-30) ══
  // Email user  → no wallet of their own, so Privy made them one. That is the app's whole premise.
  // MetaMask user → came in WITH a wallet, and it is THEIRS. Privy makes them nothing
  //                 (`createOnLogin: 'users-without-wallets'` in src/privy.js), because handing them
  //                 a second empty wallet and showing that instead of their real money is nonsense.
  // Prefer the embedded one when there is one, otherwise take the connected wallet. That order
  // matters: it keeps email users on exactly the wallet they have always had, and never lets an
  // injected wallet that happens to be present quietly take over their account.
  //
  // ⚠️ DECLARED BEFORE THE EFFECTS THAT USE IT. `const` is in the temporal dead zone until this
  // line, and a dependency array is evaluated DURING render - so an effect placed above this would
  // not merely misbehave, it would throw a ReferenceError before the app drew anything.
  const embeddedWallet = getEmbeddedConnectedWallet(wallets)
  const activeWallet = embeddedWallet || wallets?.[0] || null
  const isEmbedded = !!embeddedWallet

  // Offer the fingerprint ONCE, right after signing up - so nobody ends up with an unguarded wallet
  // just because they never opened Security. Only once per session, so "Not now" does not put them
  // straight back on it.
  // ⚠️ EMBEDDED WALLETS ONLY. Privy's MFA guards the key PRIVY holds; it has no say over a MetaMask
  // signature, which MetaMask guards itself with its own password and its own confirm dialog. Showing
  // "protect your money" to a MetaMask user would promise a lock this app cannot fit.
  // ⚠️ `passkeyOn` IS A BOOLEAN IN THE DEPS, NOT `user.mfaMethods`. That is an ARRAY, and React
  // compares deps by identity - a fresh array from Privy on each render makes the effect re-run on
  // EVERY render. Derive the one fact this effect cares about and depend on that instead.
  const passkeyOn = !!user?.mfaMethods?.includes('passkey')
  const offeredProtect = useRef(false)
  useEffect(() => {
    if (MOCK || !authenticated || !isEmbedded || !activeWallet?.address) return
    if (offeredProtect.current || passkeyOn) return
    offeredProtect.current = true
    setNav(n => (n?.screen === 'HomeSend' ? { screen: 'ProtectWallet', params: {} } : n))
  }, [authenticated, isEmbedded, activeWallet?.address, passkeyOn])

  // Copy the wallet address into the localStorage key ~15 screens read (see src/privy.js). NOT only
  // a login-time job: Privy also restores the session on a page reload, and the address can arrive a
  // moment after `authenticated` turns true.
  useEffect(() => {
    if (MOCK || !activeWallet?.address) return
    rememberLogin({ address: activeWallet.address, email: user?.email?.address })
  }, [activeWallet?.address, user?.email?.address])

  // ── THE CONTACTS-BACKUP SIGNATURE IS NOT HERE ANY MORE (removed 2026-09-04) ──
  // It used to run at app open, signing silently (`showWalletUIs: false`) to open the backup session.
  // With the fingerprint on, that FROZE THE WHOLE APP - Chrome's "Page Unresponsive", reproduced by
  // the user on 09-04. The flag tells Privy to sign WITHOUT prompting, an MFA-guarded wallet will not,
  // so Privy raised MFA-required → the listener above ran `promptMfa()` → which could not show its
  // dialog for a call that asked for no UI → it failed → cancel → Privy asked again, and round it
  // went, pinning the main thread. The 08-30 note called this a silent no-op; it is worse than that.
  //
  // Dropping the flag is NOT the fix either: it would meet the user with a fingerprint prompt the
  // instant they open the app, for a message they never asked to sign - exactly how a phishing site
  // behaves. The signature belongs on the Contacts screen, where the user has just asked for the
  // thing it is for. Until it is put there, backup does not run and contacts stay on the device -
  // which is where they already were, since this path had not worked since MFA was switched on.

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
  // ⚠️ Since 08-30 the FIRST pull happens in the signature effect above, which opens the session.
  // This one covers a TAB RELOAD, where sessionStorage survived so `ez_sync_token` already exists and
  // that effect deliberately skips (there is no reason to sign a second time for a session that is
  // already open). With no token, `pullOnce` silently does nothing.
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
      // The Circle SDK used to be prefetched here (~1MB, needed for PIN signing). Privy ships with
      // the app instead of being pulled in on demand, so there is nothing left to warm up.
    })
    return () => cancel(id)
  }, [])

  // Still waiting on Privy → the same empty .screen frame the Suspense fallback uses, so there is no
  // white flash and no layout jump when the real first screen appears.
  if (!nav) return <div className="screen" />

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
