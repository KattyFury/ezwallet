# Security

## Scope and current status

EZwallet runs on **Arc Testnet only**. Balances are test money with no real-world
value. The app is **not audited**, and there is no mainnet deployment.

**Key custody:** EZwallet does not hold or store private keys. Keys are managed by
[Circle User-Controlled Wallets](https://developers.circle.com/wallets/user-controlled)
using 2-of-2 MPC, and every signature is authorised by the user's PIN, entered in
Circle's own cross-origin iframe. This project never sees the PIN. This is
*user-controlled* custody, not seed-phrase self-custody — an intentional trade-off
to remove the seed phrase from the onboarding path.

**Secrets:** the Circle API keys (`API_KEY`, `KIT_KEY`) live only in Cloudflare Pages
environment variables and are used exclusively from server-side Pages Functions
(`functions/api/*`). They are never shipped to the browser.

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
- **Account identity is an email address.** A session token is issued for a given
  email without an ownership check (email OTP is deliberately disabled, because
  Circle only supports PIN authentication on the plain email flow — OTP/SSO accounts
  cannot have a PIN). Funds are still protected: every transfer requires the PIN.
- **Contact backup is opt-in infrastructure and currently disabled in production.**
  The optional Cloudflare KV backup of contacts and saved QR codes inherits the
  identity weakness above, so it is not enabled. See `HANDOFF.md` for the plan to
  gate it behind a PIN signature before it is turned on.
