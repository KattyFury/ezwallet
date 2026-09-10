import logoLong from '../../design/logo.svg'
import { useNav } from '../nav'
import { useState, useEffect, useRef } from 'react'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import { createSocialToken, initializeWallet, executeChallenge, getWalletAddress, GOOGLE_CLIENT_ID, circleErrorMessage } from '../circle'

const APP_ID = '518fec6a-4680-5175-9de6-0810fb3dfd04'

// Translate Circle error codes → a message that names the cause (instead of the baffling
// "Failed to validate..." string). 155140 is almost always a redirect URI missing from the Circle Console
// allowlist or an origin not registered in Google Cloud Console - NOT a code bug (verified against
// SDK 1.1.11 source). The full object is logged so a test on a deploy can read the real code.
function googleErrMsg(error) {
  console.error('[GoogleLogin]', error?.code, error, JSON.stringify(error || {}))
  const code = error?.code
  if (code === 155140) return `Google sign-in was rejected by Circle (code 155140). Almost certainly: origin "${window.location.origin}" is missing from the redirect-URI allowlist in Circle Console and/or Authorized origins in Google Cloud Console (clientId).`
  if (code === 155706) return 'Network error while authenticating with Circle (code 155706). Try again.'
  return circleErrorMessage(error)
}
// Config the SDK needs to rehydrate after the redirect - saved/cleared through COOKIES (they survive the full page reload
// of an OAuth redirect; sessionStorage does NOT → that was the root cause of error 155140, per Circle support).
const COOKIE_KEYS = ['appId', 'google.clientId', 'deviceToken', 'deviceEncryptionKey']

export default function Login() {
  const { navigate } = useNav()
  const sdkRef = useRef(null)
  const [restoring, setRestoring] = useState(false)  // finishing up after the redirect
  const [googleErr, setGoogleErr] = useState('')

  // deviceId MUST come from sdk.getDeviceId() (Circle fingerprints it through its own iframe) - do NOT
  // invent one (e.g. crypto.randomUUID()), because Circle's backend knows nothing about a homemade ID → the error
  // "Provided device ID is not found in the system" at performLogin. Exactly per the Circle Web
  // quickstart 3.4: call once, cache in localStorage so it is not requested again on every tap.
  async function ensureDeviceId(sdk) {
    let id = localStorage.getItem('ez_google_deviceId')
    if (id) return id
    id = await sdk.getDeviceId()
    localStorage.setItem('ez_google_deviceId', id)
    return id
  }

  // Initialise the SDK once on mount with the config restored from cookies + the onLoginComplete callback.
  // The first time (empty cookies) → harmless. After a Google redirect (cookies present + a token in the URL hash)
  // → the SDK constructor reads the hash itself and calls onLoginComplete to finish signing in.
  // ⚡ The SDK is lazy-loaded and does NOT block the first paint (2026-07-17). Before: `import { W3SSdk } from '...'` at the top
  // of the file → the Login screen (the FIRST thing a newcomer sees) had to download ~740KB of firebase+crypto before it could
  // even draw the logo. The effect still builds the SDK exactly as before (for the Google redirect flow), but through
  // a dynamic import() running in the BACKGROUND → the logo + buttons appear immediately, the SDK follows.
  useEffect(() => {
    let cancelled = false
    const onLoginComplete = async (error, result) => {
      COOKIE_KEYS.forEach(k => deleteCookie(k))   // the deviceToken is single-use → clean it up right away
      if (error) { setGoogleErr(googleErrMsg(error)); setRestoring(false); return }
      if (!result?.userToken) { setRestoring(false); return }
      try {
        const { userToken, encryptionKey, refreshToken, oAuthInfo } = result
        localStorage.setItem('ez_user_token', userToken)
        localStorage.setItem('ez_encryption_key', encryptionKey)
        // ⚠️ A Circle userToken only lives 60 MINUTES (it is what the PIN challenge uses). Google users have NO
        // ez_email, so the old refreshSession() could NOT refresh it → after 1h every PIN action (Change PIN,
        // sending) returned 403 Forbidden. FIX: SAVE the refreshToken (Circle already returns it) → refreshSession()
        // trades it for a fresh userToken via POST /users/token/refresh. Do NOT throw the refreshToken away again.
        if (refreshToken) localStorage.setItem('ez_refresh_token', refreshToken)
        localStorage.setItem('ez_login_method', 'google')
        // Circle DOES return the Google email in oAuthInfo.socialUserInfo.email - store it SEPARATELY (do NOT write
        // it into ez_email, because ez_email drives the email-login refresh flow = a DIFFERENT identity). It is only for
        // displaying "Login email" instead of "…".
        const gEmail = oAuthInfo?.socialUserInfo?.email
        if (gEmail) localStorage.setItem('ez_google_email', gEmail)
        localStorage.removeItem('ez_wallet_addr')
        localStorage.removeItem('ez_wallet_id')

        // Create the wallet (if there is none) → the challenge to set the first PIN
        const walletData = await initializeWallet(userToken)
        const challengeId = walletData?.data?.challengeId
        if (challengeId) await executeChallenge(sdkRef.current, userToken, encryptionKey, challengeId)

        // The wallet address can be slow to provision → retry a few times
        let info = null
        for (let i = 0; i < 3 && !info?.address; i++) {
          info = await getWalletAddress(userToken)
          if (!info?.address) await new Promise(r => setTimeout(r, 2000))
        }
        if (info?.address) localStorage.setItem('ez_wallet_addr', info.address)
        if (info?.walletId) localStorage.setItem('ez_wallet_id', info.walletId)

        sessionStorage.setItem('ez_pin_ok', '1')   // Google users have no PIN → skip the PIN gate
        navigate('HomeSend')
      } catch (e) {
        setGoogleErr(circleErrorMessage(e)); setRestoring(false)
      }
    }

    // Coming back from the redirect (a token in the URL) → show the "signing in" state IMMEDIATELY,
    // without waiting for the SDK to download.
    const restoringNow = /access_token|id_token|code=/.test(window.location.hash + window.location.search)
    if (restoringNow) setRestoring(true)

    import('@circle-fin/w3s-pw-web-sdk').then(({ W3SSdk }) => {
      if (cancelled) return
      const sdk = new W3SSdk({
        appSettings: { appId: getCookie('appId') || APP_ID },
        loginConfigs: {
          deviceToken: getCookie('deviceToken') || '',
          deviceEncryptionKey: getCookie('deviceEncryptionKey') || '',
          google: {
            clientId: getCookie('google.clientId') || GOOGLE_CLIENT_ID,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        },
      }, onLoginComplete)
      sdkRef.current = sdk
      // requested ahead of time so tapping the button is not delayed (not during a restore)
      if (!restoringNow) ensureDeviceId(sdk).catch(() => {})
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function handleGoogleLogin() {
    setGoogleErr('')
    try {
      // sdkRef may NOT exist yet if the button is tapped before the dynamic import() finishes (the SDK is lazy since 07-17).
      // The SDK used to be built synchronously in useEffect so it was never null → now it has to be handled.
      // (The Google button is hidden from the UI so this branch does not run today, but do not leave a landmine for when it returns.)
      if (!sdkRef.current) {
        const { W3SSdk } = await import('@circle-fin/w3s-pw-web-sdk')
        sdkRef.current = new W3SSdk({ appSettings: { appId: APP_ID } })
      }
      const sdk = sdkRef.current
      const deviceId = await ensureDeviceId(sdk)
      const { deviceToken, deviceEncryptionKey } = await createSocialToken(deviceId)
      // Save the config into COOKIES so the SDK can rehydrate after the redirect (per Circle Web quickstart 3.6)
      setCookie('appId', APP_ID)
      setCookie('google.clientId', GOOGLE_CLIENT_ID)
      setCookie('deviceToken', deviceToken)
      setCookie('deviceEncryptionKey', deviceEncryptionKey)

      sdk.updateConfigs({
        appSettings: { appId: APP_ID },
        loginConfigs: {
          deviceToken, deviceEncryptionKey,
          google: { clientId: GOOGLE_CLIENT_ID, redirectUri: window.location.origin, selectAccountPrompt: true },
        },
      })
      sdk.performLogin('Google')  // = SocialLoginProvider.GOOGLE ('Google')
    } catch (e) {
      setGoogleErr(googleErrMsg(e))
    }
  }

  // ⚠️ Google login is DISABLED (2026-07-03, user decision after session 10). The login itself WORKS
  // (OAuth redirect + SSO wallet creation + PIN all fine), but Circle BLOCKS changing the PIN for SSO users at the
  // platform layer: PUT /user/pin → 403 code 3 despite a fresh token + pinStatus ENABLED (verified by calling the real
  // API). The user decided to turn it off until there is a way forward (either Circle opens it up, or we switch
  // architecture to take the email from Google Identity Services and use the email flow - see HANDOFF session 8).
  // Google login is REMOVED FROM THE UI (user decision 2026-07-05). The plumbing (handleGoogleLogin, cookies,
  // deviceId, refreshToken, onLoginComplete) is KEPT so it can be switched back on quickly - only the button is hidden.

  // Every position below is lifted straight from the current Figma file (`GxgsMU6HAYqolckzvPWXp1`,
  // node 1:180 "Login") as an exact px→dvh/% conversion (x/390→%, y/844→dvh), same convention as the
  // rest of the app. Absolute + translate(-50%) so each element's Figma CENTRE lands exactly on screen,
  // instead of the old flex-centred block (which no longer matches this redesign's tighter offsets).
  return (
    <div className="screen">
      {/* 50% OF THE SCREEN WIDTH (user decision 07-17, still holds - Figma's 190.91/390 = 48.95%,
          close enough to keep the existing rule rather than special-case it). */}
      <img src={logoLong} alt="ezwallet"
        style={{ position: 'absolute', top: '21.28dvh', left: '50%', transform: 'translateX(-50%)', width: 'min(50vw, calc(var(--screen-max) / 2))' }} />

      {/* Slogan - node 3:10, centre at y=(258+70/2)=293px = 34.72dvh, width 258px = 66.15% of the screen.
          NEW COPY (2026-09-10, replacing the old "A crypto wallet simple enough for my mom to use" one-liner) -
          verbatim off the Figma text layer, 2 lines via <br/> exactly as authored there. */}
      <span style={{
        position: 'absolute', top: '34.72dvh', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(66.15vw, calc(var(--screen-max) * 0.6615))',
        fontSize: '18px', fontWeight: 'var(--fw-semibold)', color: 'var(--color-muted-2)',
        textAlign: 'center', lineHeight: 'normal',
      }}>
        Simple enough for anyone.<br />No seed phrase, just a PIN.
      </span>

      {restoring && (
        <span style={{ position: 'absolute', top: 'calc(85.66dvh - 40px)', left: '50%', transform: 'translateX(-50%)', fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>
          Processing...
        </span>
      )}

      {/* "Sign in with email" pill - node 1:191/1:192, centre at y=(699+48/2)=723px = 85.66dvh,
          width 231.996px = 59.48% of the screen. No icon (Figma's button is text-only, unlike the old
          mail-icon version). Glow shadow (0 0 8px rgba(0,0,0,.5), measured off the Figma layer) instead
          of .btn-primary's straight-down shadow - per-screen shadow update, see FIGMA-SCREENS-SPEC.md §4. */}
      <button className="btn"
        style={{
          position: 'absolute', top: '85.66dvh', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(59.48vw, calc(var(--screen-max) * 0.5948))',
          background: 'var(--color-brand)', color: 'var(--color-white)',
          boxShadow: '0 0 8px rgba(0, 0, 0, 0.5)', fontSize: '18px',
        }}
        onClick={() => navigate('EnterEmail')}>
        Sign in with email
      </button>
    </div>
  )
}
