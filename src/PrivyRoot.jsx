import { PrivyProvider } from '@privy-io/react-auth'
import App from './App'
import { PRIVY_APP_ID, privyConfig } from './privy'

// This file exists ONLY so `main.jsx` can lazy-load it. Nothing else belongs here.
//
// WHY (measured 2026-08-30, both branches built and compared):
//   Circle build ...... entry chunk    163 kB /  52 kB gzip
//   Privy, imported eagerly ......... 2,656 kB / 777 kB gzip
// Fifteen times more to download before the browser can draw a single character - WORSE than the
// 1,668 kB monolith that caused the measured 2.7s white screen on 4G and triggered the whole
// lazy-loading rework on 07-17. Shipping that would undo the fix and quietly break the promise the
// app is built on ("simple enough for my mom to use" is also a promise about a phone on a bad connection).
//
// The weight is NOT ours and cannot be trimmed by configuration: `@privy-io/react-auth` depends on
// WalletConnect, the Coinbase Wallet SDK, @base-org/account, @stripe/crypto, two captcha libraries,
// styled-components and four UI kits. EZwallet uses none of them - it drives Privy through headless
// hooks and only ever touches the embedded wallet - but `PrivyProvider` references the modal system
// internally, so tree-shaking cannot drop any of it.
//
// So it gets the same treatment the Circle SDK already had here: keep it OUT of the entry chunk and
// let it arrive in the background while the user is still reading the first screen. Same trick,
// same reason, and by the time anyone taps "Sign in with Email" it has landed.
export default function PrivyRoot() {
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <App />
    </PrivyProvider>
  )
}
