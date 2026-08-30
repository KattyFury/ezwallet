# Security

## Scope and current status

EZwallet runs on **Arc Testnet only**. Balances are test money with no real-world
value. The app is **not audited**, and there is no mainnet deployment.

**Key custody:** EZwallet does not hold or store private keys. Since 2026-08-30 the
wallet is a [Privy embedded wallet](https://docs.privy.io): the key is held in Privy's
secure hardware (TEE) and assembled only inside an iframe served from Privy's own
origin, so this app never has access to it. Signing happens in the browser, and this
project never sees the key material.

**The user can leave with their key.** Security → *Export private key* hands over the
raw key, which opens the same wallet in MetaMask or any other client. That export runs
in Privy's iframe, so neither this app nor Privy's servers can read the key as it is
shown. This is real self-custody without a seed phrase in the onboarding path – it
replaced Circle's User-Controlled Wallets, which are semi-custodial and never release
the key.

**Authorising a payment:** a user who has turned on *Fingerprint or Face ID* (Security
screen) must pass that check, verified by Privy's servers, before anything is signed.
It is offered during sign-up. It is not mandatory, so **a wallet whose owner declined
it is protected only by access to the signed-in device** – on that device, anyone who
can open the app can send money.

This replaced a 6-digit PIN, which does not survive the change of wallet provider.
Circle's PIN was cryptographically real because it *completed* the MPC signature. With
the key in Privy's hardware there is no local secret for a PIN to lock, so a rebuilt
PIN would have been either a string comparison anyone could bypass with devtools, or a
copy of the private key on the device behind six digits – a million combinations,
brute-forceable offline by anyone who obtained the file. A passkey is checked on
Privy's servers, where wrong attempts can actually be rate limited.

**Secrets:** `KIT_KEY` (Circle Stablecoin Kit, used only by Swap) lives only in
Cloudflare Pages environment variables and is used exclusively from server-side Pages
Functions (`functions/api/*`). It is never shipped to the browser. It is now the only
such secret: the Circle `API_KEY` is gone along with the endpoints that needed it, and
the Privy App ID in the bundle is public by design.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Preferred: GitHub → **Security → Report a vulnerability** (private advisory) on
  [this repository](https://github.com/KattyFury/ezwallet/security/advisories/new).
- Alternative: DM [@0xhieuxyz](https://x.com/0xhieuxyz) on X.

Please include what you did, what happened, and what you expected. Since this is a
testnet project maintained by one person, expect a reply in days rather than hours.

## Known limitations

Being explicit about what is *not* hardened yet:

- **No audit.** The contract interactions (Arc Memo, Multicall3From, Circle Swap
  Adapter) and the app itself have not been reviewed by a third party.
- **The fingerprint check is optional.** See above: decline it and the only thing
  standing between someone holding the unlocked phone and the money is the app screen.
- **Signing in requires the email inbox.** Privy mails a one-time code and the code is
  what proves ownership. This closed a real hole in the previous build, where typing an
  address was enough to be issued a session for it (email OTP existed but was disabled,
  because Circle could not offer both OTP and a PIN on the same account).
- **Contact backup is gated behind a wallet signature, not the email session.**
  The optional Cloudflare KV backup of contacts and saved QR codes does not use any
  login token. `/api/sync` issues a single-use nonce, the wallet signs it, and the
  server derives the storage identity by recovering the address from that signature.
  Knowing an email is therefore not enough to read or write someone's contact book.
  Session tokens live in `sessionStorage` and expire after 24h server-side. Avatars are
  never uploaded. The backup still requires an `EZ_SYNC` KV binding to be present;
  without it the endpoint returns `503` and the app silently keeps everything local.
