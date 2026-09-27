// WHERE THE APP STARTS. Extracted from App.jsx on 2026-09-23 because the "Add to home screen" screen
// also needs it: when the user taps Skip there, it has to continue to wherever boot WOULD have gone,
// and duplicating the session/PIN rules in two places is how they drift apart.

// Session exists → through the PIN GATE (wallet unlock) before HomeSend, unless this session is already
// unlocked (ez_pin_ok - set after verifying the PIN, or right after CREATING the PIN on first login).
// No session → Login.
export function bootTarget() {
  const hasSession = localStorage.getItem('ez_user_token')
  if (!hasSession) return { screen: 'Login', params: {} }
  const unlocked = sessionStorage.getItem('ez_pin_ok')
  return unlocked ? { screen: 'HomeSend', params: {} } : { screen: 'PinGate', params: { next: 'HomeSend' } }
}

export const A2HS_KEY = 'ez_a2hs_done'

// SHOULD THE "ADD TO HOME SCREEN" OFFER RUN? Two gates, both of which must pass:
//   1. not dismissed before - one Skip and it never comes back,
//   2. NOT already installed - `display-mode: standalone` (Android/Chrome + the manifest) or
//      `navigator.standalone` (iOS Safari's own, non-standard flag). Offering to install an app that IS
//      installed is the most annoying version of this screen.
//
// ⚠️ DESKTOP IS DELIBERATELY INCLUDED (user decision 2026-09-23: "hiện luôn trên desktop đi, cho đẹp,
// show off"). There WAS a `pointer: coarse` gate here, on the reasoning that a desktop browser cannot
// add anything to a home screen so the offer is a dead end. The user overrode it: on desktop the whole
// app is drawn inside an iPhone handset (see the `min-width: 481px` block in index.css), so this screen
// reads as part of that presentation. Known trade-off, accepted: the two steps are worded for iOS
// Safari ("Tap Options, then tap Share"), so on a desktop browser they describe something that is not
// there. Do not re-add the gate without asking.
//
// Everything is wrapped: localStorage throws in private mode on some browsers, and matchMedia is absent
// in old WebViews - in either case the offer is simply skipped rather than blocking the whole boot.
export function shouldOfferInstall() {
  try {
    if (localStorage.getItem(A2HS_KEY)) return false
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return false
    if (window.navigator.standalone === true) return false
    return true
  } catch {
    return false
  }
}
