# HANDOFF – EZwallet

**Updated:** 2026-09-05 (new Figma grid + all nine PIN defects fixed and tested) · **Local:** `D:\Files\Claude\Build on Arc\EZwallet`

## ⚠️ READ THIS FIRST - PIN feature is built, blocked on ONE Privy account-level step

Everything below in this section is current as of the last commit on `privy` (`372fa15`). The
PIN-signing MECHANISM itself is proven correct (see "Confirmed working" below) - what's blocking is
purely getting a real wallet into the right ownership state on Privy's side. Do not re-derive this by
re-reading old commits; start here.

### Confirmed working (do not re-verify from scratch)
- `functions/api/pin.js` `sign` action: ran a full local end-to-end test earlier today against a
  throwaway wallet - nonce/session/PIN-hash/rate-limit all correct, server-side co-signing via
  `@privy-io/node`'s `generateAuthorizationSignature` succeeded, and the real call to Privy's REST API
  went through (failed only on a deliberately fake wallet ID, exactly as expected).
- `PinGateHost.jsx` UI: verified visually via screenshots, all states (set/confirm/verify/mismatch),
  matches Figma frames 3/4/5 pixel for pixel.
- `SendConfirm.jsx`/`Swap.jsx` call `signWithPin()` instead of `sendTransaction()`.
- `src/screens/Security.jsx` has a real "Set up PIN" row (`useSetupPin()` in `pinSigner.js`) - this
  part is a genuine, permanent feature, not a debug leftover.

### The actual blocker: the founder's REAL wallet cannot be reassigned to the PIN quorum
Wallet `uihroi7x6jthz2f7bsvcdyzh` (address `0x0eE44Ec95898682658Bb3847a854b25D165610D7`) has no
`owner_id` set (Privy's default - implicitly controlled by the user). Getting it under the quorum
(`p1loakdgs7wvd40loha4pf70`, already created, 2-of-2, members = the founder's `user_id` +
`PRIVY_AUTH_KEY`'s public key) needs a `PATCH /v1/wallets/{id}` with `owner_id` set, and **two
different approaches both failed for real, documented reasons - do not retry either without new
information**:
1. **Server-only signature** (our `PRIVY_AUTH_KEY` alone) → Privy 401's: "No valid authorization
   signatures were provided."
2. **Client-side signature** (the founder's own browser, via `useAuthorizationSignature()`) →
   Privy's SDK refuses OUTRIGHT, before even making a network call: *"Unable to sign request. Wallet
   ownership updates are not supported. Please exclude 'owner' or 'owner_id' from the request."* This
   is a deliberate guardrail in Privy's client SDK, not a bug or a format issue - confirmed by the
   exact wording of the error.

**Privy's own Dashboard has no manual control for this either** - checked the wallet's Details tab
directly (Wallet ID / Address / Created / Chain type / Entity / User only, no Owner field, no
button). This looks like it genuinely requires **Privy support** to resolve for an *existing* wallet.
Nobody has contacted them yet - that's the recommended next step, not more API guessing.

### The side-path that was tried instead, and where it left off
To avoid needing the blocked reassignment at all, a **brand new wallet** was created server-side with
`owner_id` set to the quorum **at creation** (no reassignment involved, so the guardrail above doesn't
apply): address `0xA6c573647012D5A6AAb32CdB9911C5aCc3398790`, wallet ID `iha9ln1q0etk016i7sqghrtx`,
linked to the founder's `user_id` via the `entity` field. This half-worked and then got complicated:
- It does **not** show up in `usePrivy().user.linkedAccounts` on the client the way a normal
  login-created wallet does (untested whether `useUser().refreshUser()` would fix this - worth trying
  before assuming it's impossible). Worked around for now: `usePinSigner().signWithPin()` gained an
  optional `walletId` override parameter (real call sites don't use it, only the temp test button does).
- **With that worked around, clicking the test button ("🔧 TEST: sign on the fresh dual-approval
  wallet" in `Security.jsx`) got stuck on "Signing..." and the user reported the whole browser tab
  lagging/freezing.** This was NOT diagnosed before the session ended - the browser became
  unresponsive before Console/Network evidence could be captured. **Suspected** (not confirmed) to be
  the same class of bug fixed earlier today (an MFA-listener retry storm - see the `App.jsx` freeze
  fix commit from this morning) but now possibly triggered by signing with a SECOND embedded wallet
  that was never "activated" in the browser session the normal way (only the primary,
  `createOnLogin`-created wallet ever goes through the app's usual init path). This is a real
  hypothesis, not a verified cause - next session should get a fresh Console/Network capture (ask the
  user to open DevTools BEFORE clicking, so evidence survives even if the tab then hangs) before
  writing any fix.
- **Recommendation going in: abandon this second-wallet test path** rather than keep debugging it -
  it was only ever a workaround for the reassignment guardrail, and it's now generating its own
  unrelated problems (linkedAccounts gap, possible freeze) that have nothing to do with whether the
  core PIN mechanism works, which is already proven separately (see "Confirmed working" above).
  Getting the FOUNDER'S ACTUAL WALLET onto the quorum via Privy support is the real remaining task.

### Debug/temporary code still in the working tree, on purpose
- `src/screens/Security.jsx`: the yellow "🔧 TEST: sign on the fresh dual-approval wallet" button and
  its `handleTestSign`/`testStatus` state. Left in deliberately (not deleted) so the next session can
  either finish debugging the freeze or rip it out once Privy support unblocks the real wallet instead.
  Obviously not a real feature (ugly on purpose) - remove before this branch ever merges to `main`.
- `.env.txt` (gitignored) has `PRIVY_AUTH_KEY` (PKCS8 base64, NOT the SEC1 PEM `openssl ecparam`
  produces by default - see the comment right above it) + `PRIVY_APP_SECRET` + `PRIVY_PIN_QUORUM_ID`.
- Privy Dashboard → App settings → Domains now includes `https://*.ezwallet.pages.dev` (added this
  session so every future Cloudflare Pages preview can log in without re-adding domains by hand).

### One process note for whoever picks this up
A live API mutation was attempted, failed safely (401), retried once more with a plausible fix,
failed again with a DIFFERENT, more specific error that revealed the real cause (the SDK guardrail).
Two real attempts against production credentials is already the right amount of trial-and-error for
one session - a third blind retry on the SAME operation would not have been. The pivot to a
brand-new wallet instead of the blocked reassignment was the right call; chasing the new wallet's own
side-effects (freeze, linkedAccounts gap) past the point of usefulness was not - that's the main thing
to do differently this time.

## 🔐 MANDATORY PIN VIA PRIVY DUAL-APPROVAL - BUILT, PARTIALLY VERIFIED, NOT LIVE YET

Full plan: `C:\Users\Dell\.claude\plans\gentle-jumping-puppy.md` (approved this session). Real
security decision (`EZWALLET-SIGNIN-DECISIONS.md`): PIN is a MANDATORY baseline for every user,
using Privy's actual dual-approval mechanism (a server-held authorization key co-signs alongside the
user's own wallet key) - NOT the old Circle-era fake PIN removed 08-30.

**Done and code-verified:**
- `functions/api/pin.js` (new) - `nonce`/`session`/`set` (PIN hashing: PBKDF2-SHA256 via Web Crypto,
  salt+iterations stored per-record) + `sign` (verifies PIN with a 4-attempts/5-min lockout, then
  co-signs with `PRIVY_AUTH_KEY` and relays to Privy's real REST API). Wired into `dev-server.js`.
  **Ran a full local end-to-end test** (throwaway wallet, real signature round-trip, wrong-PIN
  lockout counting down correctly, right-PIN reaching Privy's real API) - the only reason it didn't
  fully succeed is the test used a fake wallet ID on purpose (Privy correctly returned "Invalid
  wallet ID"), which is expected until the real wallet is reassigned (see below).
- `src/pinSigner.js` (`usePinSigner().signWithPin(...)`) + `src/pinGate.js` (imperative
  `requestPin()` bridge) + `src/components/PinGateHost.jsx` (the actual sheet, mounted once in
  `App.jsx` next to `<BugButton>`). Matches Figma frames 3/4/5 (fileKey `l26UsgoqIDfvLkrozVLPTq`)
  pixel-for-pixel - **verified visually via screenshots of every state** (empty, wrong-PIN error,
  set→confirm transition, PIN mismatch restart), not just "it builds".
  ⚠️ Caught by that testing, not by inspection: the numpad's digit handler originally read `digits`
  from a stale render closure, which drops a digit under React 18 batching if two taps land before a
  re-render (a real risk on a touchscreen 6-digit PIN, not just a test artifact) - fixed to the
  functional `setState` form + a `useEffect` watching completion, before this was called done.
- `SendConfirm.jsx` and `Swap.jsx` both now call `signWithPin(...)` instead of `sendTransaction(...)`
  - a dual-approval wallet's own key can only produce HALF the required signatures, so
    `useSendTransaction()` cannot be used for these any more at all.
- **Manual setup done:** P-256 authorization keypair generated locally (PKCS8 format specifically -
  `@privy-io/node` rejects the SEC1 format `openssl ecparam` produces by default, caught by actually
  trying it, not by reading the format name). Key quorum created via Privy's real REST API
  (`p1loakdgs7wvd40loha4pf70` - id kept in `.env.txt`, not a secret itself). Both `PRIVY_AUTH_KEY`
  and `PRIVY_APP_SECRET` are in `.env.txt` (gitignored).

**Deliberately NOT done yet (staged, per the approved plan):**
- **The founder's test wallet has NOT been reassigned to the quorum.** Doing that now would make
  `sendTransaction()`-based sending fail immediately for everyone, including on `main`/prod, before
  this replacement flow has been tested live - this is the correct order, not a forgotten step.
  Wallet: `uihroi7x6jthz2f7bsvcdyzh` (address `0x0eE44Ec95898682658Bb3847a854b25D165610D7`), user
  `did:privy:cmtensenf01gg0dl80n3mhpyq`. Reassign via `PATCH` on the wallet with
  `owner_id: p1loakdgs7wvd40loha4pf70`, THEN a real Arc Testnet send from a live deploy is the actual
  end-to-end test (same constraint as every wallet flow in this app - Privy does not run on
  localhost).
- No PIN has been SET for any wallet yet (the `set` action works, verified in isolation, but nothing
  has called it against the real founder wallet).
- Export wallet (`Security.jsx`) is explicitly OUT of scope for this round - Privy's docs mention a
  1-of-k quorum config where the server key can export UNILATERALLY, the opposite of the intent here;
  needs its own read before touching, not blocking Send/Swap.
- Privy's pricing for dual-approval was not confirmed with their support (not found gated on the
  public pricing page, judged good enough to proceed on - see the plan file for the reasoning).

**One habit fixed mid-session, worth repeating:** the authorization private key was briefly printed
into the chat transcript by mistake while generating it - caught immediately, moved to `.env.txt`,
temp files deleted. Never print a real secret into chat output again; write straight to the gitignored
file instead.

### 🔗 THE 4 OFFICIAL LINKS - use this set when introducing the project (user decision 08-04)
| | |
|---|---|
| **Demo** | https://ezwallet.cash (domain bought on Cloudflare 07-29; `ezwallet.pages.dev` runs alongside it, auto-deployed from `main`) |
| **GitHub** | https://github.com/KattyFury/ezwallet |
| **Video** | https://youtu.be/UIR4Ee3Wp_Y |
| **Deck** | https://canva.link/zr3ik84radd39vc |

## ▶️ NEXT SESSION - START HERE (updated 2026-09-05, later the same evening)

1. **The client-SDK-refuses-quorum-updates question is CLOSED - it does not, and the code to raise
   the founder's quorum is already built, tested against a stub, and verified against the real API
   (`enable-pin-plan` for the founder's real address returns the exact right payload). Not clicked.**
   See "WHAT A KEY QUORUM UPDATE ACTUALLY COSTS" below for the full reasoning and what is left:
   wire `useEnableMandatoryPin()` to a real button (natural spot: right after `useSetupPin`'s `set`
   succeeds in Security.jsx), **get the user's explicit go-ahead**, then have them click it themselves
   logged into `privy.ezwallet.pages.dev` - this changes a real wallet's security posture and is not
   freely reversible, so it is deliberately not something a session fires on its own.
2. **Then do the end-to-end test that has never been run:** a real Arc Testnet send from
   `privy.ezwallet.pages.dev` (not localhost - Privy needs a real origin, and passkey needs HTTPS)
   with the PIN actually enforced.
3. **Delete the stray key quorum `agd77lp7ay8s4t6p6pucxipk` in the Privy Dashboard** when convenient
   (details below). Harmless but untidy, and the API cannot do it.
4. Still open from before: contacts backup does not run (it was removed on 09-04 to fix the freeze and
   needs to move to the Contacts screen), and the sign-in screen is paused for a design pass with two
   undecided questions - see the 09-04 section.
5. Not restyled to the new Figma grid yet: the ~15 sub-screens. See `DESIGN-GRID-390.md` rules 1-6,
   and the open question there about whether Menu's dividers should spread to the other lists.

## 🛠️ SESSION 2026-09-05 (part 2): REVIEWED THE PIN FEATURE AND FIXED ALL NINE DEFECTS

A review of the 09-04 PIN work (`23a4429..c1aa080`) found nine defects. All nine are fixed, and
`test/pin.test.mjs` (new, 10 cases) pins six of them down. **The tests were verified to actually
fail**: with the two new guards commented out, exactly those two regression cases go red.

- **🔴 THE FEATURE WAS DEAD ON ARRIVAL, and not for the reason the old handoff gives.**
  `pinSigner.js` read the wallet id from `user.linkedAccounts[].id` in the browser. Privy documents
  `Wallet.id` as **"Null if the wallet is not delegated"**
  (`react-auth/dist/dts/types-Ck8tvlPZ.d.ts:1008`) and this app never delegates - confirmed live, the
  account's wallets return `delegated: false`. So the lookup returned null for every user and **every
  PIN-gated Send and Swap threw `no-wallet-id` before the PIN sheet ever opened.** The old comment
  cited that exact type file but stopped reading one sentence too early.
  **Fix:** the server resolves it - `GET /v1/wallets?address=…` with `PRIVY_APP_SECRET` returns the id
  without delegation. New `wallet-id` action; the client fetches it before signing. Verified against
  the real API: the founder's address returns `uihroi7x6jthz2f7bsvcdyzh`.
- **🔴 The PIN and the wallet being signed for were unrelated inputs.** `sign` checked the PIN against
  a client-supplied `address` while taking the wallet from the client's `requestPayload.url`, with
  nothing tying them together - so a caller could register their own address + PIN and aim the
  server's quorum half at someone else's wallet. Privy would still refuse the transfer (the victim's
  own signature is the other half), but the PIN would be defeated in precisely the case it exists for:
  a stolen device where the key is available and only the PIN is not. **Fix:** the id is re-derived
  from the address the PIN was checked against, and a mismatching URL is a 403.
- **🔴 Every signed request was replayable forever** (no expiry, no nonce on the user's signature).
  **Fix:** the signature's hash is recorded and re-presenting it is a 409. It is burned only after the
  PIN passes, so a typo does not cost the user a fresh passkey prompt (there is a test for that).
- **🟠 Any stranger's keypair could open a session** and write permanent, TTL-less `pinhash:` records
  into the `EZ_SYNC` namespace shared with contacts backup and bug reports. **Fix:** the recovered
  address must be a wallet of this Privy app.
- **🟠 `Login.jsx` reopened the sign-in modal over a user who had just signed in.** A child's effects
  flush before its parent's, so on the render where `authenticated` flips true this ran before
  App.jsx could navigate away - and the manual sign-in button had been deleted, so there was no way
  out. **Fix:** an `authenticated` guard. This is the same shape as the 09-04 freeze.
- **🟠 `pinGate.js` could hang a Send forever.** With no host mounted (ErrorBoundary replacing the
  tree) `pending` was set with nothing able to resolve it, and every later PIN request in that session
  then rejected with "already pending". **Fix:** reject immediately if there is no listener, and
  reject any in-flight request when the host unmounts.
- **🟠 `setupPin` asked for a signature on unvalidated data** - an unchecked nonce response meant a
  503 led to prompting the user's fingerprint to sign the string `"undefined"`. **Fix:** check the
  response first.
- **🟡 The lockout counter is not atomic** and cannot be: Workers KV has no atomic increment, so
  parallel requests all read the same count. Mitigated with `cacheTtl: 0` and **documented honestly in
  the code** - what actually slows a brute force is PBKDF2 at 100k iterations per guess. A Durable
  Object is the real fix and is noted as such; do not describe the counter as a hard lock.
- **🟡 The temporary yellow test button in `Security.jsx` is deleted** (with its now-unused
  `arcTestnet`/`usePinSigner` imports). It could never have worked: it signed for `TEST_WALLET` while
  PINs are only ever stored under `ez_wallet_addr`, so it would always have come back `pin-not-set` -
  worth knowing, since the 09-04 handoff treats its "stuck on Signing…" as an unexplained mystery.

### ⚠️ THE OLD "READ THIS FIRST" BLOCKER IS DESCRIBED WRONGLY - RE-CHECK IT BEFORE ACTING
Read live from Privy's API on 09-05, not from memory:
- The founder's wallet `uihroi7x6jthz2f7bsvcdyzh` **DOES have an `owner_id`**: `tzaph36jf5851ik6bvcf0qs3`.
  The section below says it "has no `owner_id` set". That is no longer true.
- That quorum is **`authorization_threshold: 1`, `authorization_keys: []`, `user_ids: [the founder]`**
  - i.e. Privy's default 1-of-1 owner quorum, the user alone.
- The PIN quorum `p1loakdgs7wvd40loha4pf70` ("ezwallet-pin-dual-approval") is correctly built:
  threshold 2, one server authorization key + the founder.
- **⇒ There may be a path nobody tried: instead of reassigning the WALLET to a different quorum (which
  Privy's client SDK refuses outright), UPDATE THE QUORUM THE WALLET ALREADY POINTS AT** - raise
  `tzaph36jf5851ik6bvcf0qs3` to threshold 2 and add the server's authorization key. No ownership
  change is involved, so the "Wallet ownership updates are not supported" guardrail should not apply.
  **NOT DONE - it needs the user's go-ahead**: it takes effect immediately and every send from that
  wallet then requires the PIN flow. Lower risk than the old note implies, though, because
  **ezwallet.cash does not use Privy at all** (see below).

### 🔑 WHAT A KEY QUORUM UPDATE ACTUALLY COSTS - measured 09-05, start here tomorrow
`owner_id` on a wallet is **the id of the key quorum that must authorize anything that wallet does** -
not "who owns the money". It is the unlocking rule: how many signatures, and whose.
- Founder's wallet → quorum `tzaph36jf5851ik6bvcf0qs3`: `threshold 1`, `authorization_keys: []`,
  `user_ids: [founder]` ⇒ **"the founder's own signature alone is enough"**, Privy's default.
- The PIN quorum `p1loakdgs7wvd40loha4pf70` ("ezwallet-pin-dual-approval"): `threshold 2`, one server
  authorization key + the founder ⇒ **"both, or nothing"**. That second signature is the one the
  server only produces when the PIN is right - which is what makes this PIN real rather than a
  client-side string compare.
- ⇒ **Until the wallet points at a 2-of-2 quorum, the PIN protects nothing.** The code is correct now;
  the lock it guards is still open.

**The SDK does support changing a quorum** (`keyQuorums._update(id, { authorization_threshold,
public_keys, user_ids })`, `node/resources/key-quorums.d.ts:199`) - so "update the quorum the wallet
already points at" instead of "repoint the wallet" is a real option, and it involves no ownership
change, so the client-SDK guardrail should not apply.

**⚠️ BUT: create is cheap, change is not.** Measured directly against the API today:
- `POST /v1/key_quorums` → **works with the app secret alone**.
- `PATCH` / `DELETE /v1/key_quorums/{id}` → **401 `Missing privy-authorization-signature header`**.
  A quorum can only be changed by *its own members signing*.
- ⇒ Changing `tzaph36…` needs a signature from **the founder's own wallet in the browser**, since
  that quorum's only member is the founder and it holds no authorization keys. That is a
  client-side step, not something this server can do alone.
- ⇒ It also means the change is **not freely reversible**: once the quorum is 2-of-2, undoing it
  needs both signatures. The server key is in `.env.txt`, so it is recoverable, but do not treat it
  as a one-click experiment.

**✅ THE ONE UNKNOWN IS RESOLVED (09-05, later the same day) - by reading source, not guessing.**
`useAuthorizationSignature().generateAuthorizationSignature` is the exact function `signWithPin`
already uses for Send/Swap. Read its real implementation (`@privy-io/js-sdk-core`, function `N`, in
`node_modules`): it canonicalizes whatever `{version, method, url, body, headers}` it is handed and
signs the result - **no inspection of the body, no restriction to wallet-RPC URLs**. The only
occurrence of `owner_id` validation logic anywhere in that SDK is inside wallet CREATE, unrelated.
**The "wallet ownership updates are not supported" guardrail is not a client-side check that exists
in this SDK version at all** - so the earlier session's account of it happening "before even making a
network call" does not match the code; it was very likely Privy's SERVER rejecting a `PATCH
/v1/wallets/{id}` with `owner_id` in the body (a WALLET update), not the SDK refusing to sign. A
`PATCH /v1/key_quorums/{id}` (a QUORUM update, never touching any wallet's `owner_id`) is a
completely different request and this mechanism does not care what it contains.
**⇒ Mechanically, nothing blocks the founder's own browser from signing the upgrade payload below.**

**🛠️ BUILT (not yet clicked) - `functions/api/pin.js` actions `enable-pin-plan` / `enable-pin-apply`,
`src/pinSigner.js`'s `useEnableMandatoryPin()`.** `enable-pin-plan` (no PIN, no signature - it only
reveals a payload) resolves the address's own wallet → its `owner_id` → that quorum's current
members, and returns the EXACT PATCH needed: `authorization_threshold: 2`, the server's public key
added to `public_keys`, `user_ids` **preserved untouched**. Idempotent - already-upgraded returns
`{alreadyEnabled: true}`. `enable-pin-apply` takes `{address, requestPayload, userSignature}`,
**re-derives the same payload from scratch and refuses if the client's copy does not match byte for
byte** (same principle as `sign`'s wallet-id binding - never trust what the client says it signed),
then relays with Basic auth. **Verified against the real API through `npm run api` (not just a
stub):** `enable-pin-plan` for the founder's real address returns exactly
`{quorumId: "tzaph36jf5851ik6bvcf0qs3", payload: {method: "PATCH", url: ".../key_quorums/tzaph36…",
body: {authorization_threshold: 2, user_ids: ["did:privy:cmtensenf…"], public_keys: [<the real
PRIVY_AUTH_PUBLIC_KEY>]}}}` - **nothing was sent to Privy, this only proves the plan is right.**
`test/pin.test.mjs` gained 7 more cases (17 total in that file) against a stubbed Privy with an
in-memory quorum store, including the payload-mismatch and owner_id-never-touched regressions -
verified to actually fail with those two guards removed, same as the first nine.
**⚠️ `useEnableMandatoryPin` is NOT wired to any button.** This was a deliberate stop: the auto-mode
classifier itself flagged writing this code as security-sensitive enough to pause on, and applying it
for real changes a real wallet's security posture in a way that is not casually reversible (see
above). **The first real click - founder logs into `privy.ezwallet.pages.dev`, and something calls
`enableMandatoryPin(walletAddr)` - is for the user to trigger deliberately, not for a session to fire
on their behalf.** The natural place to wire it is right after `useSetupPin`'s `set` succeeds in
Security.jsx (the two together are what "mandatory PIN" actually means end to end), but that wiring
itself was left undone on purpose - do it, and get an explicit go-ahead before the resulting button
is ever pressed, not just before writing the code.

**🧹 MESS LEFT BEHIND, please delete from the Privy Dashboard:** key quorum
**`agd77lp7ay8s4t6p6pucxipk`**, display name `ezwallet-TEST-DELETEME`. Created 09-05 to test the
reversibility question above. It is **inert** - threshold 1, owns no wallet, nothing references it -
but it **cannot be deleted through the API**: its one authorization key was generated in a throwaway
process and never saved, and DELETE demands a signature from that key. Lesson for next time: never
create a quorum with a key you have not written down first.

### 📍 ezwallet.cash WAS NEVER AT RISK FROM ANY OF THIS (checked 09-05)
`main` is unchanged since 08-30 (`7ca39e5`), Cloudflare's production branch is `main`, and every
recent deployment is a **preview** of `privy`. More to the point, **prod still runs CIRCLE**
(`src/circle.js`, `@circle-fin/w3s-pw-web-sdk`; there is no `src/privy.js` on `main`), so no Privy
account change can reach it. The warning elsewhere in this file that reassigning the wallet "would
make sending fail for everyone, including on main/prod" was written assuming prod had already moved
to Privy. It has not.

### 🧪 HOW TO TEST THIS BRANCH
- **Live site for the branch: https://privy.ezwallet.pages.dev** - a stable alias Cloudflare Pages
  already rebuilds on every push to `privy`. **Passkey only works here**, not on localhost.
- **Local: `npm run dev` (port 5173) + `npm run api` (8787).** ⚠️ **It must be 5173** - Privy's CSP
  `frame-ancestors` lists `http://localhost:5173` and nothing else, so any other port makes the
  sign-in iframe fail to frame with no useful error.
- **⚠️ `PRIVY_APP_SECRET` + `PRIVY_AUTH_KEY` were MISSING from Cloudflare's PREVIEW environment**, so
  every PIN endpoint answered 503 `pin-signing-disabled` on the deploy while working fine locally
  (dev-server.js reads `.env.txt`). Added as secrets on 09-05 with the user's go-ahead; **env-var
  changes only take effect on a NEW build**, so the deployment had to be retried afterwards.
  Verified live on `privy.ezwallet.pages.dev`: `wallet-id` returns `uihroi7x6jthz2f7bsvcdyzh`, an
  unknown address 404s, `nonce` works (so `EZ_SYNC` is bound), a junk session is 401.
  **Security note to keep in mind: Cloudflare's `preview` environment is shared by EVERY branch**, so
  any branch pushed to this repo can now co-sign with the server authorization key. That is fine for
  a solo repo; it would not be if outside contributors could push.
  Production still has neither key - correct, because `main` is the Circle build and has no PIN flow.

## 🎨 SESSION 2026-09-05: THE NEW 12-COLUMN FIGMA GRID IS IN, ON THE 4 MAIN SCREENS

**Read `DESIGN-GRID-390.md` (new, repo root) before touching any layout.** It holds every measured
coordinate from Figma frames 1-10 plus the six rules derived for the screens Figma has NOT drawn.

- **The file was redrawn on a 390×844 board with a 12-column grid (32.5px columns).** Frames 1-7, 9
  and 10 are detailed; **Frame 8 does not exist** (the file jumps 7 → 9), and `04-Swap`,
  `07-PasteAddress` … `20-About` are still bare placeholder rectangles - they are meant to be built
  in code from the rules, which is what the doc is for.
- **⚠️ 390 IS THE DRAWING FRAME, NOT A LOCK (user decision 09-05).** `--screen-max` STAYS 430 and the
  app keeps flexing. So a column is a PERCENTAGE (1 col = 8.3333%), never 32.5px, and a row is dvh
  (1 row = 10dvh - the existing `.screen` 10-row grid already IS the vertical half of this grid).
  Verified across 360/390/430/500: nav tab 90/97.5/107.5/107.5, card 320/350/390/390, no overflow.
- **What actually changed:** ServiceHub redrawn to frame 10 (three full-width horizontal cards, icon
  left + title + description right, replacing the 2-column square tiles - the descriptions and the
  labels *Exchange*/*PigSave* are content that exists only in the frame) · the Home cards moved up to
  15.62dvh and **Receive gained the card it never had** (its QR floated on white) · the action row
  re-measured to **94.31 / 127.7 / 94.31 with a 16.84 gap**, the centre card now bigger in BOTH
  directions · MenuScreen: frame 9 CONFIRMED the existing row placement to the dvh, so only
  Deposit/Withdraw swapped sides and the 4 dividers were added · Login + `.pin-card` + `.popup-card`:
  hardcoded 325/340px became the proportional 10 columns.
- **⚠️ TWO GRID BUGS FOUND BY MEASURING, and both were app-wide, not cosmetic:**
  1. **A fixed-height grid item STRETCHES the ten tracks.** `repeat(10, 1fr)` is really
     `minmax(auto, 1fr)`, so the tall Home card pushed rows 2-5 to 94.94px and squeezed rows
     1/6/7/8/10 to 75.95 - the navbar row lost 8px. **Every screen in the app is laid out on those
     rows being equal.** The Home cards are `position: absolute` instead, which is what their exact
     dvh coordinates mean anyway. Do not put a fixed-height item back into those tracks.
  2. **Overlapping rows create a SECOND COLUMN.** An auto-placed item that would overlap one already
     placed is moved to the next column instead, and the implicit column is born there - the balance
     was exiled into a 133px column 2 and the whole screen skewed. Fixed app-wide with
     **`.screen > * { grid-column: 1 / 2; }`**. The **`/ 2` is load-bearing**: a bare `1` leaves the
     END line `auto`, which for an ABSOLUTE child resolves to the container's PADDING edge, giving a
     lopsided 20→390 containing block. With `1 / 2` it is the real column-1 area (20→370), so
     `left/right: 0` = the app's 20px margins.
- **Verified at 390×844 with Playwright** (not "it should work"): ten equal 84.39px rows · action
  cards 94.3/127.7/94.3 with all three centres at **cy=709**, the concentric invariant in §6 intact ·
  Home card at x=20 w=350 against Figma's 19.97/350.06 · popup at x=32.5 w=325 = frame 2/3's card
  exactly · no horizontal overflow, no page errors. `npm run build` clean, `npm test` 16/16.
- **🔴 ONE THING DELIBERATELY NOT DONE, needs the user:** frame 7 labels the centre Receive button
  **"Custom QR"**; the code says **"Create QR"**. §6 lists that hint/button text as *settled* and
  "do not edit it yourself", and the frame carries the label as **two overlapping duplicate text
  nodes** (`14:692` + `14:834`) - which reads as an edit in progress, not a decision. Renaming the
  button also forces the NotifArea hint to change (§6: a hint's label MUST match its button).
- **Not done:** the ~15 sub-screens beyond the 4 main ones were NOT restyled. Frame 9 showed the
  existing 10-row system already IS this grid, so they comply structurally; what is genuinely open is
  whether Menu's new dividers should spread to the other lists - **TxHistory has an explicit
  contrary decision in §6 ("NO grey separator lines") and no frame of its own**, so nothing was
  inferred onto it.

## 🚧 SESSION 2026-09-04: FOUND + FIXED THE APP-FREEZE, PAUSED THE SIGN-IN SCREEN FOR A DESIGN PASS

- **✅ FIXED AND CONFIRMED BY THE USER: the app froze solid ("Page Unresponsive") right after signing
  in, once the fingerprint (MFA) was on.** Root cause was the 08-30 contacts-backup signature effect
  in `App.jsx`: it signed silently (`showWalletUIs: false`), Privy demanded MFA anyway, the MFA
  listener called `promptMfa()` for a call that asked for no UI, that failed, it retried, and the
  loop pinned the main thread. The 08-30 notes had called this a silent no-op - it is worse, a hard
  freeze. **Fix: the whole effect (~40 lines, `signMessage`/`useSignMessage` import included) was
  removed from `App.jsx`.** Isolated with a real diagnostic (not guesswork): mock mode (no Privy)
  measured 137 requestAnimationFrame ticks in 3 seconds with the full screen rendering correctly, so
  the freeze was proven to live in the Privy/MFA path, not the screens. `npm test` 16/16, `npm run
  build` clean, entry chunk unaffected. **⚠️ Consequence, already true since MFA went on and now
  simply visible instead of silent: contacts backup does not run.** It still needs to move to the
  Contacts screen (see the 08-30 note this replaces, same reasoning still holds) - not done this
  session, deliberately deferred so the freeze fix could ship on its own.
- **🛑 SIGN-IN SCREEN (`Login.jsx`/`privy.js`): PAUSED MID-EDIT, NOT DONE, NOT VERIFIED IN A REAL
  BROWSER.** The user asked to redo the sign-in screen (Privy modal opens by itself, cannot be
  dismissed by X/backdrop/Escape, no in-modal logo). Code for that is drafted and builds/tests pass,
  but the user then stopped further coding to get a design pass first - **do not assume the current
  `landingHeader`/`loginMessage` strings in `privy.js` are final, they were mid-edit when work
  paused.** Two things are genuinely undecided, not just unwritten:
  1. **Passkey vs PIN for returning users.** 08-30 replaced PIN with Passkey for a real security
     reason (Privy has no PIN concept; a hand-built one is a bypassable string compare - see section
     1c of `MIGRATION-PRIVY.md`). The user described the return flow as "PIN" this session, which
     contradicts that decision. Not resolved - flagged, not silently picked either way.
  2. **Keep Privy's hosted modal vs hand-build the email/OTP screen.** Confirmed by reading
     `node_modules/@privy-io/react-auth/dist/dts/types-Ck8tvlPZ.d.ts`: the modal's email-field
     placeholder and submit-button text are NOT configurable through `PrivyClientConfig` - no such
     field exists. Wanting different wording there means dropping the hosted modal for a hand-built
     one using `useLoginWithEmail`, which is the exact rebuild 08-30 rejected ("use Privy's popups,
     don't re-implement what Privy ships"). Reopening that is fine if it's a real decision, not a
     side effect of wanting different placeholder text.
  - **Font is NOT a blocker either way, confirmed by reading Privy's own shipped CSS**
    (`dist/esm/ui.mjs` + the `*Screen-*.mjs` files): every modal text element is `font-family:
    inherit` - Privy ships no webfont, it just takes the page's font. Keeping the hosted modal means
    it already matches whatever `--font-base` is (currently system-ui); a hand-built screen isn't
    constrained by Privy's font at all. Recommended for the redesign: keep the system-ui stack, not
    a new webfont - this app already measured a 2.7s white-screen cost from loading Barlow (see the
    "THE BUNDLE TRAP" note further down) and the audience (elderly, everyday users) needs legibility
    over brand personality; system-ui also means zero work keeping Privy's modal in sync.
  - **`SIGNIN-DESIGN-BRIEF.md`** (repo root + copied to the user's Desktop) was written for the
    user to take into Claude Desktop + Figma before more code changes happen here. It carries the
    two open questions above, the Privy `appearance` config surface (what's actually configurable),
    and the app's layout constants (`--screen-max: 430px`, the 10-row grid, `--color-brand`). Read
    it before touching `Login.jsx`/`privy.js` again - it documents exactly what is and isn't settled.
- **Not yet done, and not blocked on the design pass:** re-verify the freeze fix in a REAL browser
  (only mock mode was measured with the diagnostic; the user's earlier repro was on the pre-fix
  build) · then resume the ORIGINAL unfinished item from 08-30 - sending money, which was fixed for
  a 401 but never re-tested after that fix.

### 📍 WHERE THINGS STAND (end of session 2026-08-30)

## 🚧 SESSION 2026-08-30: MIGRATING CIRCLE → PRIVY, ON THE `privy` BRANCH

**READ `MIGRATION-PRIVY.md` BEFORE TOUCHING ANY OF THIS.** It holds the plan, the six steps, the
decisions and the PoC measurements. This section is only the status.

- **`main` is UNTOUCHED and still the Circle build** - it is what runs at ezwallet.cash, and it keeps
  running there until the Privy version is verified. All the work is on the **`privy`** branch
  (pushed). Merge to `main` only when steps 3-6 are done and tested on a real device.
- **WHY the change** (3 reasons, user decision): social login (Circle offers email + PIN only) ·
  private-key export, which Circle's semi-custodial wallets do not allow · a login UI that can be
  localised, where Circle's PIN iframe is English-only with no roadmap.
- **ALL 6 STEPS ARE CODED (2026-08-30). Nothing has been run yet - see the warning below.**
  Build is clean, 16/16 tests pass, entry chunk 46 kB gzip.
- **THE PIN IS GONE, REPLACED BY A FINGERPRINT. Read this before touching security.**
  The plan assumed we would rebuild the PIN ourselves, encrypting "the secret Privy needs to sign".
  **There is no such secret.** Circle's PIN was real because it COMPLETED the MPC signature; Privy
  holds the key in its own secure hardware and gates signing on its session. A PIN of ours could only
  have been a string comparison anyone bypasses with devtools, or the private key pulled onto the
  device behind six digits (a million guesses, brute-forceable offline). User chose passkeys.
  Consequences, all deliberate: `PinGate.jsx` is DELETED (the guard moved from opening the app to
  signing) · "Change PIN" is gone from Security, replaced by "Fingerprint or Face ID" and
  "Export private key" · it is OFFERED AT SIGN-UP so the default is not an unguarded wallet, but it
  is an offer, not a wall · **a user who declines it is protected only by access to the phone** -
  this is written plainly in SECURITY.md and must stay written.
- **🔥 `showWalletUIs: false` BREAKS SENDING ONCE THE FINGERPRINT IS ON. DO NOT PUT IT BACK.**
  It was on send and swap to keep Privy's confirmation modal off the screen. But the flag does not
  only hide a modal - per the SDK docs it makes the wallet *"attempt to sign the transaction WITHOUT
  PROMPTING the user"*, and an MFA-guarded wallet may not sign unprompted. Every send died with
  `POST auth.privy.io/api/v1/wallets/authenticate 401`. Removed from both paths 2026-08-30. The cost
  is a second confirmation screen (Privy's, after ours) - accepted: a modal too many is a papercut,
  a wallet that cannot send money is not a wallet. Removing that extra screen is still open, but it
  has to be done some other way.
  ⚠️ The flag is STILL on the silent contacts-backup signature in `App.jsx`, where it now fails the
  same way - so **contacts backup silently does not run once MFA is on**. Do not "fix" it by removing
  the flag: that meets the user with a fingerprint prompt for a message they never asked to sign the
  instant they open the app, which is what a phishing site does. The fix is to move that signature to
  the Contacts screen, where the user just asked for the thing it is for. NOT DONE.
- (Historical, kept because the reasoning still applies to any future attempt) the reason the modals
  were suppressed in the first place:
  the app has its own confirm screen, and Privy's would be a second one showing raw calldata - the
  exact "Contract Interaction screen that baffles older users" that killed Circle's OTP flow in July.
  Because of that, Privy's demand for the fingerprint arrives as a LISTENER in `App.jsx`, not a
  modal. **If that listener is ever removed, signing hangs or the check silently stops happening.**
  - ✅ **Step 1 - PoC** (in `../ezwallet-privy-poc/`, a throwaway app, delete it when the migration
    lands). Every answer verified against the real chain, not inferred from the docs: Arc Testnet
    works as a viem `defineChain` and Privy creates the embedded wallet on first login · a real
    0.01 USDC transfer went through (RPC check: nonce 1, balance 20 → 19.988972), so Privy signs and
    broadcasts fine even though Arc uses USDC as its gas token · `exportWallet` works on Arc, so the
    "Tier 2/3 chains only" worry was unfounded.
  - ✅ **Step 2 - auth + wallet address.** `src/privy.js` (new) replaces the auth half of
    `circle.js`; `Login.jsx` lost ~150 lines of dead Circle/Google plumbing; sign-out calls Privy's
    `logout()`; `App.jsx` takes the session from Privy instead of `ez_user_token`.
    **Later the same day the hand-built sign-in screen was thrown away** (user: use Privy's popups,
    do not re-implement what Privy ships). `EnterEmail.jsx` is DELETED - `Login.jsx` calls `login()`
    and Privy's modal runs email + OTP. Same for the fingerprint: `showMfaEnrollmentModal()`.
    ⚠️ That also FIXED a bug worth remembering: the headless version called
    `initEnrollmentWithPasskey()` alone and **nothing opened at all**. Headless passkey enrollment is
    two calls (init, then `submitEnrollmentWithPasskey` with the credential ids) and half a flow fails
    silently rather than erroring.
  - ✅ **Step 3 - send.** Privy signs in the browser, so `functions/api/send.js` is DELETED. The
    calldata it built moved to `chain.js` (both paths unchanged: a plain transfer, or the Memo
    contract when there is a note). Amounts now go through viem's `parseUnits` instead of
    `Math.round(parseFloat(x) * 10**decimals)`, which went through a float and could land a unit or
    two off what the user confirmed at cirBTC's 8 decimals.
  - ✅ **Step 4 - swap.** `/api/swap` 'execute' PREPARES rather than executes: it returns the
    calldata and `Swap.jsx` signs it. The Stablecoin Kit call behind it is untouched - that half was
    never Circle-the-wallet, it needs KIT_KEY, and it does not care who signs.
  - ✅ **Step 5 - the fingerprint + contacts backup.** Backup signs through Privy from `App.jsx` now
    (it used to be folded into the PIN entry, which no longer exists; the sync endpoint itself was
    already signature-based and needed no changes).
  - ✅ **Step 6 - cleanup.** `circle.js` is down from ~330 lines to ~45 (swap only) ·
    `functions/api/session.js` + `wallet.js` deleted along with the Circle `API_KEY` they hid ·
    dropped `@circle-fin/w3s-pw-web-sdk` and `cookies-next` · README, SECURITY.md and package.json
    corrected.
- **WHAT HAS ACTUALLY BEEN RUN, and what has not** (updated 2026-08-30, end of session):
  - ✅ Signing in with email through Privy's modal - works.
  - ✅ Turning the fingerprint on (Windows Hello) - works, **but only after enabling Passkey in the
    Privy dashboard** under Authentication → MFA. Until that switch was flipped, the modal said
    *"ezwallet does not have any verification methods enabled"* and no amount of code would have
    helped. **If the fingerprint ever stops appearing, check the dashboard before the code.**
  - ✅ The backup signature at app open - the dev-server log showed `KV put sess:…`, so the wallet
    signed and the session opened. (This was BEFORE MFA was switched on - see the `showWalletUIs`
    warning above; with MFA on it now fails silently.)
  - ✅ `/api/swap` quotes - a real LiFi route came back (1 EURC → ~3.36 USDC).
  - ❌ **SENDING - LAST SEEN FAILING, THEN FIXED, AND THE FIX IS UNVERIFIED.** It died with the 401
    described above; the flag was removed and it has NOT been retried since. **This is the first
    thing to check.**
  - ❌ **THE APP WAS FREEZING AND CRASHING, ALSO FIXED AND ALSO UNVERIFIED** - see the React section
    below. Test in a fresh tab; a page left open through the broken build proves nothing.
  - ❌ Swap end-to-end (only the quote half is proven), signing in with MetaMask, `npm run mock`,
    anything on a real phone.

### ⚠️ THE FREEZE, AND THE SHAPE OF BUG THAT CAUSED IT (2026-08-30)

The app locked up, then crashed repeatedly. Three causes, all introduced during this migration, all
the SAME SHAPE: **a value that looks constant but is rebuilt on every render.** Worth internalising,
because Privy's API invites all three.

1. **The freeze itself.** `useRegisterMfaListener` was handed an object literal with an inline arrow,
   written straight into the hook call. New object *and* new function every render → Privy
   unsubscribes and resubscribes every render → anything touching state in that path renders again →
   the loop never ends. Fixed the standard way: live functions in a `ref`, the hook gets ONE callback
   whose identity never changes. **Never pass a fresh object or closure into a Privy hook.**
2. `user.mfaMethods` in a dependency array. It is an **array**; React compares deps by identity, so a
   fresh one each render re-ran the effect every render. Depend on a derived boolean instead.
3. `useFitFontSize` called `getComputedStyle` as a **default parameter** - forcing a style
   recalculation on every render of every screen showing an amount (HomeSend, SendAmount, Swap). Now
   read once and cached.

(2) and (3) on their own are jank. (1) is the difference between a slow app and one that locks up.
- **Testing runs on `localhost:5173` + `localhost:8787`** (`npm run dev` and `npm run api`, two
  terminals). Sign-in works locally now - Privy has no deployed-origin requirement, unlike the Circle
  SDK - but `http://localhost:5173` has to be in the Privy dashboard's allowed domains.
- **⚠️ `docs/*.gif` STILL SHOW THE PIN SCREENS.** The three flow GIFs in the README are from the
  Circle build and now show a flow that no longer exists. They need re-recording by a human.
- **SIGN-IN: EMAIL + METAMASK** (user decision, and it went back and forth - the reasoning matters).
  Email is FIRST in the modal: someone who already has MetaMask will find it either way, someone who
  has never heard of it must not be met with "Connect a wallet" as the opening move.
  ⚠️ **`createOnLogin` MUST STAY `'users-without-wallets'`.** With `'all-users'` a MetaMask user is
  handed a second, EMPTY Privy wallet and the app shows them that instead of their real money.
  `App.jsx` reads `embeddedWallet || wallets[0]`, preferring the embedded one so an injected wallet
  can never quietly take over an email user's account.
  Three things are embedded-wallet-only, and skipping them is honesty, not tidiness: the fingerprint
  offer (Privy's MFA cannot gate a MetaMask signature), Export private key (Privy never held that
  key), and the contacts-backup signature (Privy's flag has no authority over MetaMask, so the user
  would be met by an unexplained signature request on app open - phishing behaviour). Security.jsx
  hides those rows and shrinks its grey box to 2 rows.
- **FONT: THE SYSTEM STACK, matching Privy character-for-character** - read out of the shipped SDK
  (`dist/esm/useActiveWallet-*.mjs`), not the docs. Privy loads **no webfont**. Barlow and the Google
  Fonts link are gone, along with two preconnects in front of the first paint. Three `--font-*`
  variables in `index.css`; change one, change all three. `useFitFontSize.js` now reads
  `--font-condensed` off the document rather than hardcoding a family - that is a live canvas
  measurement, and a stale value there sizes the balance against a typeface nobody is looking at.
- **`public/logo.png` is on BOTH branches.** On `main` it is a lone static image nothing references,
  pushed so `https://ezwallet.cash/logo.png` resolves for the Privy dashboard's branding field.
  ⚠️ Before it existed that URL returned **HTTP 200 with `text/html`** - Cloudflare Pages serves
  index.html for any unknown path. **A 200 on this domain does not mean the file is there; check the
  content-type.**
- **Privy App ID** (public, ships in the bundle like Circle's did): `cmtenk9en00250blabovll48e`.
  Overridable with `VITE_PRIVY_APP_ID`.
- **THE BUNDLE TRAP - do not undo this.** Imported eagerly, `@privy-io/react-auth` puts **777 kB
  gzip** in front of the first paint against **52 kB** for the Circle build (both measured 08-30) -
  worse than the 1,668 kB monolith that caused the 2.7s white screen on 4G in July. It pulls in
  WalletConnect, the Coinbase Wallet SDK, @stripe/crypto, two captcha libraries and four UI kits,
  none of which this app uses, and `PrivyProvider` references them internally so tree-shaking keeps
  them. It is therefore lazy-loaded behind `src/PrivyRoot.jsx`, exactly as the Circle SDK was →
  entry chunk back down to **46 kB gzip**, smaller than the Circle build. If a future change moves
  `import { PrivyProvider }` back into `main.jsx`, this regression returns silently.
- **Three SDK traps found by reading `node_modules/@privy-io/react-auth/dist/dts/*.d.ts`** (SDK
  3.38.0), each of which fails SILENTLY if guessed from the docs: the config key is
  `embeddedWallets.ethereum.createOnLogin` in 3.x, not `embeddedWallets.createOnLogin` as in 2.x and
  every tutorial - written the old way the user logs in but never gets a wallet · error codes are the
  enum VALUES, which differ from the names (`USER_EXITED_AUTH_FLOW` is `'exited_auth_flow'`) ·
  `sendTransaction` resolves to `{ hash }`, not `{ transactionHash }`.

---

- **Branches: `main` (Circle, production) and `privy` (this migration).** Before 08-30 there was one
  branch only; every older WIP branch had been merged and deleted. Latest commit on `main`: `7dd9c4f`.
- **Production runs:** **ENGLISH + USD/EUR ONLY.** Vietnamese and Chinese were **REMOVED FROM THE PROJECT ENTIRELY on 08-25** - the i18n layer is gone, not merely switched off (see section 2). The whole repo, comments and documents included, is English now; the only file still holding Vietnamese is `.env.txt`, which is gitignored.
- **🟢 SWAP IS BACK UP** - the user tested it live on a deploy 08-25 and it went through with no `331001`. See section 4 for the outage history (kept in case it returns).
- **New in session 08-25 (part 1):** the LuckyPot tile · the i18n layer removed · the whole codebase translated · 2 notification bugs fixed (dust amounts showing 0.00, long text cut off) · `Available Network: Arc Testnet` in the hint block · a `Balance:` line on the Send screen. Details in the table at the top of section 9.
- **New in session 08-25 (part 2, UI polish batch):** a 24h price-change triangle (▲/▼, tap for a popup) next to each token's amount on the Send tab · the network line reworded to `Current Available Network: Arc Testnet` · the Paste/Scan QR/Contacts hint titles are no longer tap-navigable (they were sending people to random screens) · the Scan QR caption now says "Scan Arc Testnet QRs only" · Security's icon is a new hexagon shield (`icon/shield.svg` replaced, same filename) · Menu's Currency entry + its screen title are now "Language & Currency" · the Send screen's `Balance:` line moved from beside "Send to" down to the blank space below the note field. Details in the table at the top of section 9.
- **CI is live** (`.github/workflows/ci.yml`): every push to `main` runs `npm test` + `npm run build` on Node 22. All 3 runs on 08-25 were green.
- **In progress:** the success sound (`src/sound.js` is written but **not wired into the app**) - sections 7c + 9A. This is the first thing to pick up.
- **Who does what:**
  - **LongDC** → the multi-language work is on hold: the i18n layer was removed 08-25, so adding a language now means designing it again from scratch (see section 2).
  - **User + Claude** → refining the UX/UI.
- **Still pending, needs a human:** the message to Circle support was sent 08-25 (swap recovered on its own before a reply came back, so no answer is being chased any more) · **nothing from session 08-25 has been touched on a real device yet** - the deploy checklist for it is at the end of section 9.

> ⚠️ **`DECK-DESIGN-SPEC.md` in the repo IS OUT OF DATE** (user confirmed 08-04) - the real deck now lives in the **YouTube video + the Canva deck** linked above, not in that .md file. **Do not use it as a source when writing introductory content, and do not spend time updating it** until the user decides whether to keep it. It stays in the repo (not deleted) because it still holds a few Brand Voice decisions. `PITCH.md` was rewritten in English on 08-25 and its facts were refreshed at the same time.

> **A stablecoin wallet for everyday people and older users.** Simple UX, mobile-first. **The user-satisfaction milestone was reached (07-18): the whole flow - login, PIN, sending, swapping real money - was tested by the user on a deploy and ran smoothly.**
> AT THE START OF EVERY SESSION read BOTH `HANDOFF.md` (this file) and `CLAUDE.md` (how to work with the user).
> The principle: **follow Circle/Arc properly, read the docs and verify with real API/eth_call responses before building, NEVER guess.**
> Detailed per-session history: `git log` (the commit messages carry the detail) - this file holds only the LATEST STATE + the rules + the lessons.

**EXTERNAL documents (do not put marketing content in this file):** `README.md` = the technical introduction for GitHub · **`PITCH.md` (rewritten in English 08-25) = the project spec + MESSAGING KIT** (the one-liner, a "say only this" fact sheet, 5 differentiators, 7 guardrails, ready-to-post copy for X/LinkedIn/Discord, the hard-question FAQ, a release schedule) · `DECK-DESIGN-SPEC.md` = the design system for the 9-page deck. ⚠️ Change a feature or the product's status → **update sections 2 and 6 of `PITCH.md`** or the copy that goes out will be untrue.

AI resources: Circle [skills](https://developers.circle.com/ai/skills) · [mcp](https://developers.circle.com/ai/mcp) - Arc [skills](https://docs.arc.io/ai/skills) · [mcp](https://docs.arc.io/ai/mcp). Already installed locally: the Circle Skill (`circle:*`), Circle MCP (`mcp__circle__*`), Arc MCP (`mcp__arc-docs__*`).

---

## 0. Core value - EVERY decision in this project revolves around it

> EZwallet was built on a simple belief: everyone should be able to own their
> own money, without needing to become a crypto expert.
>
> Self-custody shouldn't mean memorizing seed phrases, copying long wallet
> addresses, or worrying about gas tokens. Those are technical barriers, not
> the value of crypto.
>
> We believe people shouldn't have to adapt to crypto. Crypto should adapt to
> people, making it simple enough for anyone to use while preserving full
> ownership of their money.

**How to apply it:** every feature, UX decision and architectural choice in this file must be able to
answer the question "does this make crypto simpler for an everyday user,
or is it making them adapt to crypto?". Anything that drifts from that: stop and ask the user.

---

## 1. Stack & infrastructure

- **Frontend:** React + Vite → Cloudflare Pages. **Backend:** Cloudflare Functions (`functions/api/*.js`) proxy Circle API (key server-side).
- **Wallet:** a Circle **User-Controlled Wallet** (MPC EOA, signing with a **PIN** through `@circle-fin/w3s-pw-web-sdk`, lazy-loaded - see the gotcha in section 7).
- **Chain:** Arc Testnet · chainId `5042002` · RPC `https://rpc.testnet.arc.network` · Explorer `testnet.arcscan.app`.
- **Balances/prices:** on-chain through viem (`src/chain.js`, Multicall3 in 1 request) + CoinGecko prices (60s cache). **Swap:** the Circle Stablecoin Kit REST API (section 4). **QR:** `qrcode.react` (drawing) + `jsqr` (scanning).
- **CLAUDE'S CLOUDFLARE ACCESS (set up 08-01 - the user: "find a way to do this work for me"):** `npx wrangler login` has been run (the user clicked Allow once), and the OAuth token is stored at `C:\Users\Dell\AppData\Roaming\xdg.config\.wrangler\config\default.toml` (key `oauth_token`). Account `f9df99b7751b7dc3c80a22b6911c6f2b`. It works for the REST API with the header `Authorization: Bearer <oauth_token>` - the `wrangler` CLI is missing many commands (e.g. there is NO `pages domain`), so REST is the complete option.
  **✅ WHAT WORKS:** add/remove/list Pages custom domains · view + PATCH the project config (env vars, **KV bindings**) · create/write/read KV namespaces · view deployments and roll back.
  **✅ THERE IS ALSO A DEDICATED API TOKEN (created by the user 08-01, named `claude-code`)** - kept in **`.env.txt`**: `CF_API_TOKEN=` + `CF_ACCOUNT_ID=f9df99b7751b7dc3c80a22b6911c6f2b`. That token **HAS DNS Edit permission** (which the `wrangler login` token lacks) → Claude can create/edit DNS records. Usage: read those 2 lines from `.env.txt` and call REST with `Authorization: Bearer <token>`. **NEVER print the token into chat/logs, NEVER commit it** (`.env.txt` is on line 5 of `.gitignore` - verified with `git check-ignore`, and it has never been committed). If the token breaks or leaks, the user can kill it instantly at My Profile → API Tokens → Roll/Delete.
  **Worth remembering when reading the Pages config through the API:** environment variables returned as `type=secret_text` **have no `value`** - that is Cloudflare encrypting and hiding them, **NOT an empty variable**. `API_KEY`/`KIT_KEY`/`VITE_CIRCLE_APP_ID` are all in that state (verified 08-01), so do not panic and re-set them.
- **Domain (07-29):** `ezwallet.cash` (bought on Cloudflare → the zone is already in the same account) attached to the Pages project `ezwallet` through **Workers & Pages → ezwallet → Custom domains**. The apex is the main link; `ezwallet.pages.dev` is NOT lost (Pages always keeps its original subdomain) so old links still work. **The code hardcodes no domain** - Login/Circle use `window.location.origin` and `manifest.json` uses `start_url: "/"` → changing domain needs no code change. ⚠️ **When Google login comes back (roadmap section 4): the origin `https://ezwallet.cash` MUST be added to the redirect-URI allowlist in Circle Console + Authorized origins in Google Cloud Console**, or error 155140 follows (per the Circle docs: `redirectUri` only exists in the SOCIAL login flow; the email+PIN flow in use needs no domain declaration - checked in the docs 07-29).
- **Secrets** (`.env.txt` + `.dev.vars`, both gitignored, set in the Cloudflare Dashboard): `API_KEY` (Circle W3S), `KIT_KEY` (Stablecoin Kit). **Hardcoded IDs** (not secrets): APP_ID `518fec6a-4680-5175-9de6-0810fb3dfd04`, GOOGLE_CLIENT_ID `51031114717-...googleusercontent.com`.
- **Local dev (Windows - do NOT use `wrangler pages dev`, it fails with "write EOF"):** Terminal 1 `node dev-server.js` (proxy on 8787, importing `functions/api/*` directly) + Terminal 2 `npm run dev` (Vite 5173). ⚠️ **The Circle SDK does NOT run on localhost** → the PIN/login/swap flows can only be tested on a deploy.
- **MOCK MODE - `npm run mock` (for checking UI/flow locally, with NO Circle):** `src/mock.js` + the `VITE_MOCK=1` flag. Skips Login/PIN → straight into HomeSend with a fake wallet and fake balances (`MOCK_AMOUNTS`); intercepts `/api/*` + ArcScan with fake data; Send/Swap pretend to succeed. It NEVER reaches production. **Verify the UI with Playwright at 390×844 AND 375×812 on the mock** (lesson 07-23: measuring only 390 misses overflow bugs). ⚠️ Playwright is NOT in the repo (do not add it to `package.json`) - the harness lives outside at `C:\tmp\ezw-verify` (`npm i playwright` + `npx playwright install chromium`, script `verify.mjs`); after a Windows reinstall, rebuild that folder, ~2 minutes.

**Tokens on Arc Testnet:**
| Token | Address | Dec | CoinGecko |
|---|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | 6 | `usd-coin` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | 6 | `euro-coin` |
| cirBTC | `0xf0c4a4ce82a5746abaad9425360ab04fbba432bf` | 8 | `bitcoin` |

**Arc contracts (predeployed, the precompile preserves msg.sender):**
| Contract | Address | Used for |
|---|---|---|
| Memo | `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` | sending money with a note (the Memo event) |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | batching approve+swap into 1 tx / 1 PIN (from an EOA, allowFailure=false, NO value) |
| Swap Adapter | `0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b` | Circle's swap settlement (section 4) |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | batched balance reads (declared in `defineChain`) |

---

## 2. Money & display model (user decisions - do not misread them again)

- **Tokens ALWAYS show their REAL NAME** (USDC/EURC/cirBTC) in the token list, in history (the secondary line) and on receipts.
- **"Display money"** = a conversion layer over fetched rates (NOT a real swap): `ez_currency` ∈ {USDC, EURC}, defaulting to USDC. Symbols USDC→`$`, EURC→`€`. **The conversion base is USD, with USDC pinned to $1** (`getDisplayRates()` returns USD per unit; `displayNum(usd,cur,rates)=usd/rate[cur]`).
- **The Send screen takes input in "USD"** (the friendly label) = sending USDC 1:1; the real token is chosen through the chip.
- **Money is formatted as ONE STRING IN ONE STYLE:** `fmtMoney()` → `$2` / `€2` / `2 USDC`. A bold number with a regular symbol is FORBIDDEN.
- **Fee reserve:** `GAS_RESERVE_USDC = 1` - the available USDC always has 1 subtracted (Arc gas is paid in USDC).
- **The app is English + USD/EUR ONLY. Vietnamese and Chinese were REMOVED ENTIRELY on 08-25 (user decision):** `src/i18n.js` and `src/circleLocalizations.js` are deleted, all 219 `t('...')` calls became plain English strings, `npm run check-lang` and `scripts/check-lang.cjs` are gone, and the Language screen became `screens/Currency.jsx` with only the currency picker (the CNY + VND options, both already locked, were dropped with it). `SUPPORTED_CURRENCIES = ['USDC','EURC']` in `data.js` is unchanged. The VND rate/format plumbing in `chain.js` + `qr.js` + `amountHint.js` is **deliberately left in place** but is now unreachable (nothing can select VND) - see the dead-code note in section 9A.
  - **Why VND was switched off first (a real bug, 08-12):** `QRScanner.parseQR()` defaulted to `currency: 'VND'` for a QR with no currency (a bare `0x` address / a link missing `&cur`). While VND was locked, `SendAmount` treated `'VND'` as "unknown" → it fell back to USD, so it was harmless. Enabling VND on 08-04 made that string valid → **scanning a QR in an English/USD app opened the amount screen in VND**. The default is now `'USD'`, and that is still the case after the i18n removal.

---

## 3. Features (final state - ✅ genuinely working / verified on-chain or on a deploy)

- **Email login → wallet creation** (userId=email, authMode PIN) + security questions. **Wallet unlock:** reopening the app → `PinGate` opens the Circle PIN automatically (signing an empty message, no gas). Google login is **hidden from the UI** (the plumbing is kept, including the `cookies-next` dependency + `refreshSocialToken`). Email OTP is built but **PERMANENTLY OFF because of a Circle constraint (user decision 07-29): Circle only allows a PIN with the plain `userId=email` flow; Email-OTP/SSO users have NO PIN** (see section 7) → enabling OTP means losing the PIN, which means losing the core UX. **Do NOT propose "turn on Email OTP" as the answer to anything again** (`EMAIL_OTP_ENABLED=false`).
- **BACKUP of contacts + the QR library to Cloudflare KV (07-29):** `functions/api/sync.js` + `src/sync.js`. localStorage is STILL the source of truth; KV is only a copy against losing data on a new machine / cleared cache / a domain change. Pulled once at app start (`App.jsx`), pushed after each edit (1.5s debounce). **Merging = THE MOST RECENT EDIT WINS** by the `ez_sync_at_<addr>` stamp (union is not used, because union means a DELETE never sticks). **The KV key is the WALLET ADDRESS, which the server obtains itself by asking Circle `GET /wallets` with the userToken - the client's claim is NOT trusted**. **AVATARS NEVER REACH THE SERVER** (the server whitelists fields: contacts carry only `id/name/address`); on pull, the pictures already on the device are kept by `id`. With no KV binding → the API returns 503 `sync-disabled`, the client silently skips, and the app behaves as before. It needs a binding named **`EZ_SYNC`** (Workers & Pages → ezwallet → Settings → Bindings → KV namespace). Locally, `dev-server.js` has an in-RAM fake KV. Tests: `test/sync.test.mjs` (9/9, locking the invariants above).
  ✅ **THE 07-29 TECHNICAL DEBT IS PAID (08-06) - AUTH = PIN SIGNATURE.** The door is no longer a `userToken` (which anyone knowing the email could obtain). The new flow: `/api/sync` action `nonce` issues a single-use nonce (TTL 5') → `PinGate` has Circle sign the sentence `Unlock EZwallet. Nonce: <uuid>` using **the PIN entry that already happens** (NO extra step for the user) → action `session` recovers the address from the signature with **viem's `recoverMessageAddress`** (stronger than `verifyMessage`, because the client never declares an address) → a session token with TTL 24h is issued and kept in `sessionStorage.ez_sync_token`. `pull`/`push` carry that token. **The server no longer calls Circle on the sync path** (there is a test locking that). The KV key is still `bak:<addr>` ⇒ data backed up by the old version reads back intact. **SAFETY CHECK:** `session` also returns `address`, and the client compares it with `ez_wallet_addr`; a mismatch → throw the token away and disable backup for that session (better OFF than writing to the wrong key). Tests: `test/sync.test.mjs` 15/15.
- **Sending** USDC/EURC/cirBTC (`send.js`): a plain transfer, or through the Memo contract when there is a note (UTF-8 fine). `idempotencyKey` prevents duplicate sends.
- **Swap** USDC↔EURC↔cirBTC - ENABLED, eth_simulateV1 verification passed + **the user tested it with REAL MONEY on a deploy (07-18)**. The Swap screen = a % slider (5 marks 0/25/50/75/100, magnet ±2%) + round-number chips (`roundHint.js`, tests `node test/roundHint.test.mjs` **26/26**). **The suggestion rule - user decision 08-13 (third revision, do not revert):** `value ≥ 30` → step **1 (whole units)** · `3 ≤ value < 30` → step **0.5** · `value < 3` → shrink with the magnitude. Take the **NEAREST** multiple as the centre + one step each side.
  ⇒ 9,15 → 8,5·9·9,5 · 17,3 → 17·17,5·18 · 101,3 → 100·101·102 · 0,0083 → 0,008·0,0085·0,009
  **Both earlier versions were WRONG, do not go back:** 07-17e pinned a 0.5 step for every value → 39,000 suggested "39,000.5". 08-04 used `u = 0.5 × 10^floor(log10(value))` → the step **jumped 10x right at the value 10** (9.99 stepped by 0.5 while 10.0 stepped by 5) ⇒ dragging to 14.55 suggested "10·15·20", reported by the user 08-13. **Lesson: a step tied to powers of 10 gives one tier per decade - far too coarse.** This version has exactly ONE jump (0.5 → 1 at 30) and it doubles rather than multiplying by ten.
  ⚠️ The `< 3` branch MUST STAY: cirBTC amounts are thousandths, and a pinned 0.5 step rounds the centre to 0 → everything is filtered out (`v > 0`) → an EMPTY chip row.
  ⚠️ **Lesson 08-13:** the 08-04 commit changed `roundHint.js` but **forgot `test/roundHint.test.mjs`** → 5 cases stayed on the old spec and `npm test` was red for 9 days while the app was correct; once you are used to red, the test stops warning you. Re-synced on 08-13. **Next time `roundHint.js` changes, change the test IN THE SAME COMMIT.**
- **SERVICE HUB (08-12)** - `src/screens/ServiceHub.jsx`, **NavBar tab 1** (icon `hub`, label "Services"), replacing the old Swap tab. A 2-column grid of raised SQUARE tiles in a grey box, geometry copied from the QR Storage screen. The service list is the `SERVICES` array in that file; adding a service = adding one line:
  - **Swap** → opens the `Swap` screen (that screen's content is unchanged).
  - **Piggy Bank** · **LuckyPot** (renamed from "Dollar-Cost Averaging" on 08-25, icon `icon/luckypot.svg`) → `screen: null` ⇒ the tile dims itself to 0.4 and is `disabled`. Not built yet.
  - ⚠️ **The Swap screen has no tab of its own any more** ⇒ its row 10 is **the word "Exit" in red, bold and centred** (NOT a pill button - user fix 08-13: the first version used a huge red `.btn-error` gradient that looked heavy and fought with the blue gradient Swap button above it). The touch area covers the whole row so older users can hit it. **Do NOT use the `.row10-single` class**: that class is `position:absolute; top:85dvh` = centred at **90dvh (the row 9 position)**, and Swap's row 9 already holds the "Swap" button → they would end up stuck together. It must be `gridRow 10` (centre 95dvh = exactly the band the NavBar vacated).
  - **Text/icon sizes in the hub - SETTLED AFTER 2 MISSES (user 08-13), do not push back to either extreme:** `icon 48 + text --fs-item 17` = the user called it **"too small"** → `icon 64 + text --fs-title 30` = **"too big"** → **SETTLED IN BETWEEN: `icon 56` + text `--fs-md-lg` 21** (= exactly the app's button text size, and these tiles are buttons). At that size "Piggy Bank" fits 2 lines and "LuckyPot" 1.
  - **Tiles are NOT forced square** (`aspectRatio:1`) - a tile comes out ~160×150 (near-square on a phone), but on the narrowest column (Android 360 → 145px) 150px of content is still taller than the column; forcing a square overflows the text, and `aspectRatio` does NOT grow with content. Use **`gridAutoRows:'1fr'`** so rows are equal height (left alone, the 3 tiles came out 147/180/213, badly uneven); leave `alignItems` at its default `stretch`, do not set `'start'`. The grey box has **`marginBottom:'2dvh'`** = the gap before the NavBar (the user reported it touching the navbar), matching the bottom-gap rule on every other screen. Measured with Playwright at 4 screen sizes: 3 tiles of equal height, no overflow of the tile, the box or the screen.
  - The **Service Hub entry in MenuScreen**: unlocked 08-12 → **REMOVED ENTIRELY 08-13** (user decision). It is already navbar tab 1, and a second door in the Menu means two ways into one place - redundant for everyday users. The Menu is back to **4 entries in rows 4-7 + Sign out in row 8** (exactly the pre-07-31 layout), with row 9 left empty as the gap before the NavBar.
- **On-chain balances + live rates** are cached (`_balCache`/`_ratesCache`) - switching screens shows the previous number immediately while a background fetch updates it.
- **TxHistory** (ArcScan + the memo event, a grey box, grouped by day), **Contacts** (per account, avatar cropper, a grey box), **QR** (create/scan/library), **in-app notifications** (NotifArea), **receipts** (canvas → Photos through Web Share), a per-account store (`store.js`).
- **Change PIN** (email users): `PUT /v1/w3s/user/pin` ✅. **`refreshSession()`** is called BEFORE any PIN action (a userToken lives 60').
- **DELETED 07-18 (dead code cleanup):** the `Onboarding` + `ComingSoon` screens (nothing had navigated to them for a long time - retrieve them from git history if needed), ~30 orphaned CSS classes (modal-*, pin-dot*, text-*, token-item…), and the `ez_onboarded` key.
- **AUDIT + CLEANUP ROUND 2 - 07-29** (audit scripts outside the repo: `C:\tmp\ezw-verify\audit*.mjs` - the import graph, orphaned exports, orphaned CSS classes/variables, icons, i18n, localStorage, dependencies). **Deleted:** 3 span classes `.row-2-3/.row-3-4/.row-3-6` · 4 CSS variables `--font-title/--fs-huge/--fs-sub/--is-title` · a redundant `import React` (Login.jsx - the automatic JSX transform makes it unnecessary) · the `shortenAddr` function (HomeReceive, dead since 07-19) · `fmtAmount` (chain.js) · **37 dead EN i18n keys** (the deleted ComingSoon screen, the "Swap coming soon" string, old hints, a duplicate key with a trailing space). **Icons:** 7 icons that no screen renders had their **import removed from `Icon.jsx`** (~2.9KB of raw SVG left the bundle) - `back · facebook · google · hint · left · right · swap` - **the .svg FILES ARE KEPT in `icon/`** (the user's drawings); to use one again, add an import line + a name to `ICONS`. (`dca` joined that list on 08-25 when the tile became LuckyPot.)
  **Icons added 08-12:** `exchange · pig · dca` (from the library at `D:\Files\Claude\Icons`) for the Service Hub, plus `luckypot` on 08-25. ⚠️ Those files use a **200×200 viewBox** while every other icon is 100×100 - **DELIBERATE, the user drew them at double size because they render LARGE** (so relatively thinner strokes are the intent). **Do NOT "normalise" them to 100×100 or double the `stroke-width`.** Normalising on import into the repo means only: `width/height` → `100%`, `stroke/fill="black"` → `currentColor`. ⚠️ `luckypot` is the exception: it is a FULL-COLOUR drawing (yellow #FFCC00 + green #16A34A + black outline) kept as drawn, so the `color` prop has no effect on it. The `trade` icon is STILL used (the reverse button on the Swap screen) even though the navbar dropped it.
  **DELIBERATELY KEPT (do not "clean" these, they are NOT junk):** the Google login plumbing (`refreshSocialToken`, `cookies-next`, the `ez_login_method` key, the `googleErr` state) - roadmap section 4 will bring it back · `design/logo-icon.svg` (held in reserve) · `public/tokens/*.png` (loaded DYNAMICALLY through `/tokens/${sym}.png` - a static scanner reporting them as "unused" is WRONG) · `.row-4`…`.row-7` (MenuScreen builds `` `row-${i+4}` `` at runtime) · internal-use exports in `_swapCore.js`/`chain.js`/`data.js` (do not touch the money path for cosmetic reasons). (The i18n entries that used to be listed here - `getLang/setLang`, the ZH map - no longer exist: the whole layer was removed 08-25.)
  **Verification after the cleanup:** `npm test` 17/17 · `npm run build` OK · a Playwright mock run through ALL 14 screens, counting the `<svg>` elements per screen to catch missing icons, with **0 console errors**.

---

## 4. Swap - how it works (⚠️ real money, read carefully)

> 🟢 **STATUS 2026-08-25: SWAP IS BACK UP** - the user tested it live on a deploy ("test swap rồi, êm" = tested, smooth) and it went through with no `331001`. The Circle/LI.FI-side routing outage described below (2026-08-13 → 2026-08-25) resolved itself; nobody touched `swap.js`/`_swapCore.js`/`circle.js` to fix it. The user had already drafted questions for Circle support and sent them during the outage - no reply needed any more, the issue is moot.
> **History, kept for the next outage (the same 331001 error may return):**
> 🔴 STATUS 2026-08-13: SWAP WAS DOWN - `No route available` (331001), AN ERROR ON THE CIRCLE/LI.FI SIDE, NOT IN OUR CODE.
> Measured on production: **every pair, every amount returned 331001** - 0.01 / 0.1 / 0.5 / 1 / 10 EURC→USDC · 10 USDC→EURC · 10 USDC→cirBTC.
> **The reasoning (reusable next time):** if it were about *amounts being too small*, large amounts would work → it is not that. If it were *our code*, the real-money swap on 07-18 would not have worked → not that either. `331001` is LI.FI's **ROUTING** code (LI.FI being the router underneath the Circle Stablecoin Kit), meaning **it cannot find a swap route on Arc Testnet** - most likely the testnet pools were drained of liquidity, and they were refilled/re-routed by 08-25.
> The 3 core swap files (`swap.js` · `_swapCore.js` · `circle.js`) **have not been touched since 05-08**. The 08-12/08-13 changes in `Swap.jsx` only replaced the NavBar with the Exit text - no logic was touched.
> **If `331001` returns:** re-measure the 3 pairs above first with `verify-swap.mjs` (eth_simulateV1, costs nothing) before touching any code - all 3 failing again means it is on Circle's side, same as before.


**The flow (`functions/api/_swapCore.js` - the core shared by swap.js + dev-server):**
1. `POST https://api.circle.com/v1/stablecoinKits/swap` (Bearer `KIT_KEY`) → returns **a SIGNED INTENT**. ⚠️ `amount` = **AN INTEGER IN BASE UNITS** (a decimal → 400; too small → 422 `331001` "No route").
2. Submit the intent to the **Swap Adapter**: `execute(executionParams, tokenInputs, signature)` with `approve(tokenIn→adapter)` first, batching `[approve, execute]` through **Multicall3From = 1 PIN**. The ABI is copied verbatim from the SDK source; encoding uses **viem** (nested tuples with dynamic bytes - hand-rolling offsets is easy to get wrong, and wrong means lost money).
3. The adapter pulls the tokens in, runs the route (a third-party provider - measured as `lifi`), and **COLLECTS the output, crediting the wallet** (settlement).

**⚠️ DO NOT REPEAT THE OLD MISTAKE:** do NOT unpack `instructions[]` and run them by hand - that skips settlement → the output is **STRANDED IN THE ADAPTER, MONEY LOST** (while the tx still reports status=1). Every swap change MUST be verified with `node verify-swap.mjs <wallet> EURC USDC 2` (eth_simulateV1, costs nothing) - ship only when the tokenOut balance rises correctly. Tip: the simulation needs a wallet with a balance → take any holder from the ArcScan API `/api/v2/tokens/<addr>/holders` (simulation needs no key).

**THE 0.1% APP FEE (user decision 07-23):** `_swapCore.js` sends `config.customFee = { percentageBps: FEE_BPS=10, recipientAddress: FEE_RECIPIENT=0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6 }` in the `/v1/stablecoinKits/swap` body (the official field - dissected from the source of `@circle-fin/provider-stablecoin-service-swap`, whose schema accepts `percentageBps` 1..10000 OR `amount` in base units, plus `recipientAddress`; the receiving address is public, not a secret). How it works: the fee is taken from the **INPUT TOKEN** and Circle's adapter contract forwards it to the recipient inside the swap tx (NO contract of ours is deployed); the returned `estimatedAmount` is **ALREADY NET OF THE FEE** → the "You receive" UI needed no change. Verified by simulation 07-23: swapping 2 EURC→USDC, the fee wallet gained +0.002 EURC (exactly 0.1%) and the user received what the estimate promised. `simulateSwap` now measures the FEE_RECIPIENT balances too (calls[1,2,5,6]), and verify-swap.mjs prints an "App fee" line. ⚠️ Per Circle's docs, Circle keeps 10% of a custom fee (90% to the wallet) - the testnet simulation showed 100% arriving, so MEASURE AGAIN ON MAINNET.

---

## 5. Design System (`src/index.css` :root) - FINAL STATE

**Font: ONE FONT ONLY = BARLOW** across the app (all 4 `--font-*` variables point at Barlow, keeping the old names so the JSX needs no edits). Weights loaded: `300;400;500;600`.
**Weights:** `--fw-light 300` = large HERO NUMBERS (balances, amounts - user decision 07-17f: KEEP Light, do not bold them) · `400` body · `500` buttons/items/labels/important values · `600` titles + active. **NEVER 700** (`--fw-bold` is locked at 600).
**Font sizes + THE NAMES THE USER USES:** amount 52 · huge 38 ("extra large", the number on the Swap screen) · title 30 ("large") · num 24 · md-lg 21 ("medium-large" = BUTTONS + the slogan + typed text) · body 19 ("medium" = content + the NAVBAR) · item 17 ("medium-small") · label 15 ("small") · tiny 13 ("mini"). When the user names a size, look it up here.
**Icons:** the `--is-*` scale pairs 1-to-1 with `--fs-*` - an icon beside text uses that text's size. Only icons STANDING ALONE use hardcoded numbers (the SendReceipt check at 76, the Contacts avatar, the QR delete button, the Swap reverse button, the numpad erase key). New icons MUST use `width/height="100%"` + `stroke="currentColor"`.

**Gradients (user decision 07-17d, vertical, lighter on top → darker at the bottom, both ends fully opaque - 0%/100% are STOP POSITIONS, do not describe them as "0% at the top", it implies a pale colour):**
- Brand: `#0088FF → #0B53BF` (the background of `.btn-primary` + `.action-card.primary`)
- Green `#34C759 → #16A34A` (`.btn-success`) · Red `#FF4D51 → #DC2626` (`.btn-error`) · Yellow `#FFCC00 → #F59E0B` (the token is kept, the btn-warning class was dropped as unused - if it returns, BLACK TEXT)
- **THE DROP SHADOW ON TAPPABLE BUTTONS (user decision 07-22d - final):** a **STRAIGHT-DOWN** shadow (offset-x 0, cast vertically) `box-shadow: 0 4px 6px rgba(0,0,0,ALPHA)` - **MEDIUM, NO SPREAD** (a small 6px blur), and BLACK (do not tint it to the button colour). **The ALPHA differs so they LOOK EQUAL (user decision 07-22g): GRADIENT buttons `.35`, WHITE buttons/chips `.25`** - a gradient button's dark fill "swallows" a black shadow, so it has to be deeper to look like the white one. Applied to: `.btn-primary/.btn-success/.btn-error/.btn-secondary` + `.action-card` + `.action-card.primary` (classes), AND **every inline tappable pill button/chip** (user decision 07-22f "every button gets a shadow so an older person understands"): the Swap token chips (`TokenRow`), "Hold to show tokens" (HomeSend), the copy-address button (HomeReceive), the currency chip (Currency screen). Do not tint it, do not increase the blur. **The white pill buttons "Hold to show tokens" + copy address use BLACK text (07-22f, previously muted).**
- **A BUTTON STANDING ALONE = 3/4 OF THE SCREEN WIDTH (user decision 07-29 - "make every lone button the same size for consistency"):** `width: min(75vw, calc(var(--screen-max) * 0.75))` (anchored to .screen, NOT a % - the parent frame is inset 20px, so a % gives a different number on every screen). Applied to: "Hold to show tokens" (HomeSend), "Tap to copy your wallet address" (HomeReceive), **the Swap button** (previously 66.67%). **Plus `.row10-single .btn` (index.css) changed from 66.67% → 3/4** (user decision 07-29, covering About/Currency/Security) **plus the Reload button on the ErrorBoundary screen**. Measured with Playwright 07-29: EVERY lone button = **293px @390 · 281px @375**, all equal; the `.row10-single` centre is still exactly 90dvh. The `.row10-dual` button pairs (44% each) are UNCHANGED - this rule is only for buttons standing ALONE. **A DELIBERATE exception: the "Sign in with Email" button on Login stays at 80%** - it matches the width of the slogan line above it (also 80%), and dropping it to 75% breaks that pairing; do not "harmonise" it by mistake.
  - ⛔ **REVERSED ON 08-13 FOR EXACTLY 2 WHITE PILL BUTTONS** (the user: *"I slightly regret making it this big"*): **"Hold to show tokens"** (HomeSend) and **"Tap to copy your wallet address"** (HomeReceive) **dropped the 3/4 width and now HUG THEIR TEXT** - `padding: '0 18px'` + `maxWidth` + `overflow/textOverflow` as the safety net. Measured button/text ratios of **1.26×** and **1.16×** (matching the user's "if the text is 50, the button is 60"). ⚠️ Those 2 buttons USED TO be deliberately equal ("a PAIR" at the same 55% coordinate on the two tabs) - **they are now DELIBERATELY unequal because the two sentences differ in length, so do not "even them up"**. ⚠️ Safe against the old 07-29 bug (text wrapping on older iPhones once the width was fluid) because both already carry `whiteSpace:'nowrap'`. The 3/4 rule STILL HOLDS for the remaining lone buttons (the Swap button, `.row10-single`, Reload).
- **Buttons in a `.row10-dual` pair are PLAIN TEXT, NO icon** (user decision 07-29: the "Add" button on Contacts used to carry the `add` icon → out of step with every other Back/<action> pair in the app).
- **The `down2` dropdown arrow uses `--color-brand`** (user decision 07-22c, previously muted): the Swap token chip (`TokenRow`) + the currency chip on Send (`SendAmount`) + the currency chip on the Currency screen (07-22f).

**Semantic colours:**
| Meaning | Token | Hex |
|---|---|---|
| Brand (CTAs, active nav, action/leading icons, SENDING) | `--color-brand`/`--color-info` | `#0B53BF` (+soft `#E2EAF7`) |
| Received/PNL/success | `--color-primary` | `#16A34A` (+soft `#DCFCE7`) |
| Money lost/errors | `--color-error` | `#DC2626` (+soft `#FEE2E2`) |
| Warning/hint | `--color-warning` | `#F59E0B` (+soft `#FEF3C7`) |
| Secondary text (DARK GREY, 6.0:1, passes AA) | `--color-muted` | `#636366` |
| Borders/dividers (NEVER a fill, NEVER a text colour) | `--color-gray` | `#E5E5EA` |
| **BOX/CARD FILL** | `--color-surface` | `#F2F2F7` |

**THE BOX RULES (the soul of the design - the standard comes from the Swap screen):**
- **Separate blocks with a surface FILL + border:none + radius 20 (large cards) / 8-12 (chips, input fields)** - never a grey border on white.
- **A TAPPABLE element INSIDE a grey box → WHITE + a 1.5px GREY BORDER** (the Swap token chips, the Hold button, the currency chip, the Contacts avatar placeholder...). The text inside still follows its role (Hold = muted).
- Grey boxes currently cover: the 2 cards on Swap (Fee/Rate has been bare text with NO box since 07-20) · the token area on HomeSend (rows 3→5.5, `height calc(100%+5dvh)`) · the Contacts/TxHistory lists (rows 2-8) · **SavedQRList (rows 2-8, 07-23): a 2-COLUMN grid (3 columns made the QRs too small), each QR a WHITE box with a 1.5 grey border, radius 16, a .25 drop shadow and a delete X top-right; the grey box has padding 10 + gap 10 (white boxes exactly 10px from the grey edge), and the QR SCALES with the box (svg width 100%, height AUTO - the viewBox keeps it square; forcing height 100%/aspectRatio was 3px off, and a hardcoded 104 frame distorted it) + the name at fs-item 17 + the amount at fs-label 15. ⚠️ 3 LESSONS: (1) do NOT use .scroll-thin INSIDE a grey box (its margin-right -20 overflows to the right - desktop compensates with scrollbar-gutter so it looks fine, iOS does NOT → broken; use .scroll-hidden); (2) layout verification must ALSO measure 375px, not only 390; (3) grid columns MUST be `minmax(0,1fr)` and the "+" tile must NOT use aspectRatio (bug 07-23c: 3 QRs → row 2 = [QR | +], and the + button's aspectRatio was stretched to the QR box height → INFLATED SIDEWAYS → the 2 columns went badly uneven; grid tests must test an ODD number of items).** · Currency (2-3) · Security (2-4) · About (2-8) · every input field (`.address-input`, `.memo-row`; errors = a red inset shadow).
- **Real NOTIFICATIONS** (received/sent/error) = **a pale coloured fill with NO border and BLACK text** (received green, sent blue, error red). **HINTS ARE COMPLETELY DIFFERENT (user decision 07-22d - THE APP-WIDE HINT STANDARD):** a **WHITE background + a 1.5px brand BLUE border + brand BLUE text/icons** (matching the amount chips on Swap). It applies to EVERY hint: the `HintBlock` (NotifArea on Home), the email + domain chips on EnterEmail, and the round-number chips + the "Slide to adjust…" hint on Swap. **NO yellow background, NO lightbulb icon** (user decision 07-22e: `hint.svg` was dropped so hints all look alike - border + text only). The Home hint block format: each line is `Label: desc`, the label is medium weight and TAPPABLE (going to the button of the same name in row 9), and long sentences wrap. **HINT FONT SIZE = `--fs-item` 17 FIXED across the app (user decision 07-22e: the sign-in chip was 21px and came down to 17 to match the Home/Swap hints) - never let a hint be bigger. CORNER RADIUS: hint chips are PILLS `borderRadius 999` (Swap/EnterEmail); the multi-line Home hint block is `12` (user decision 07-22g: the sign-in chip at radius 10 looked square and was changed to a pill).**
- **THE "TAPPABLE" SIGNAL = A WHITE FILL + A 1.5px GREY BORDER** (user decision 07-21 - a `--color-surface` grey fill reads as "recessed / not tappable"). Applied to: the secondary `.action-card`s (Contacts/Paste/QR Storage/Share; the `.primary` cards Scan QR/Create QR stay gradient with `border:none`) · the AMOUNT field on the "You pay" card on Swap (the "You receive" card stays bare - an output is not an input) · the email + domain chips on EnterEmail. Text input fields (`.address-input`) keep the surface fill - they are real inputs with a caret/placeholder, so there is no confusion.
- An ACTIVE toggle/filter = a white fill + a brand border + brand text. Primary buttons take 2/3 of the width, secondary 1/2.
- NO em dashes (use `–`), NO emoji. Scrollbars: `.scroll-thin`/`.scroll-hidden`.

**LINK PREVIEW CARDS (07-29):** `public/og.png` at **1200×630** + the full set of `og:*` / `twitter:*` / `description` / `canonical` tags in `index.html`. Before that the page had no meta tags at all → pasting the link into X/Telegram/Facebook produced **an empty box**. The image is a brand gradient background (#0088FF→#0B53BF) with a white knockout logo and a REAL app screenshot (`docs/app-home.jpg`) - built by screenshotting an HTML file with Playwright (the template lives at `C:\tmp\ezw-verify\og-card.html` + `make-og.mjs`). **This is a DRAFT and the user can replace it with their own design at any time** - it only has to stay **1200×630** and keep the name `og.png`. ⚠️ `og:image` MUST be an absolute URL; X/Facebook **cache the card** → after changing the image, use their debug tools to force a re-scan, or rename the file.

**THE SLOGAN CHANGE (08-02):** the settled slogan is now **"A crypto wallet simple enough for my mom to use."** ("your grandma" / "stablecoin wallet" are gone from brand sentences - the word "stablecoin" is still used where it states a product fact). Synced across: `<title>` + `og:title` + `twitter:title` + `og:image:alt` (`index.html`) · a rebuilt `public/og.png` · `package.json` · `README.md` · `PITCH.md` (sections 1 + 8) · `DECK-DESIGN-SPEC.md` (thesis + P1 + section 3). The voice rules are settled in the **Brand Voice** section of `CLAUDE.md`. **Every em dash `—` was also changed to an en dash `–`** in everything a reader sees (html, md, package.json, .env.example); since 08-25 the code comments in `src/` and `functions/` are English too, so the same rule is easy to keep there. `og:image` was bumped to `og.png?v=2` to force X/Facebook to re-scan (they cache by URL); **when the image changes again, bump it to `?v=3`**.

**Brand assets:** `design/logo.svg` (Login + receipts, viewBox 1160×380) · `design/logo-icon.svg` (held in reserve) · the favicon `/fav_icon.png` · the app icon `/icon.png` 512×512.

> 🎨 **Design: the user does the UI themselves, and draws the icons themselves (viewBox 100, stroke 10).** Do not redesign on your own; wait for the user's direction and then port it. The aesthetic reference: Coinbase Wallet - big light numbers, pale tiles, plenty of breathing room.

---

## 6. Layout Rules

- **A 10-row grid** (`.screen` grid 10×1fr, 100dvh, padding `0 20px`, `position:relative`). Sub-screens: the title in row 1, buttons in `.row10-single`/`.row10-dual` (absolute top 85dvh, forcing `grid-row:auto`). The 4 main screens: a full-bleed NavBar in row 10, text+icons at `--fs/is-body 19`. **An UNSELECTED tab = `--color-muted-2` #8E8E93 (MID grey, user decision 07-22d - the dark grey #636366 looked dull); the SELECTED tab = black + a brand bar above it.**
- **⚠️ `.screen` MUST have `grid-template-columns: minmax(0,1fr)`** - without it a single long `nowrap` string inflates the column and skews the whole screen. **A flex item holding nowrap text MUST have `minWidth:0`.**
- **THE APP-WIDE KEYBOARD RULE (user decision 07-23, "option A" - ending the two-keyboard conflict for good):** **ENTERING MONEY = the app numpad** (large, with a dot, independent of locale) · **ENTERING TEXT = the iPhone keyboard** · **NEVER both at once.** Concretely: SendAmount + CreateQR - focusing a text field (note/QR name/note popup) → `typingText` HIDES the numpad panel, and blur brings it back. The Add QR popup (SavedQRList) - the Amount field is no longer an `<input>` (the iPhone decimal keyboard on some locales shows a `,` that the regex swallows, and it breaks the app standard) but a div that opens the app numpad SHEET (geometry identical to the Swap sheet, rendered AFTER the popup so it floats above it, and the popup is anchored to the top half so they do not overlap; tapping the field blurs the Name field first so the iPhone keyboard drops). Do not add another screen that takes money input through the system keyboard.
- **The APP-WIDE numpad is the "MID GREY" style (user decision 07-22g: `--color-surface-2` #D1D1D6, no longer the pale surface #F2F2F7 - so the white keys pop):** the panel/sheet has a `--color-surface-2` background, full-bleed from HALF OF ROW 6 → the bottom of the screen, top corners at radius 20, with WHITE key tiles at radius 12 and an 8px gap - the shared class is `.numpad-gray` (index.css). SendAmount + CreateQR: `gridRow 6/11, margin 5dvh -20px 0, padding 24px 20px 0`, numpad flex 5.5 + the button/padding area flex 3.5, with the `.row10-dual` buttons floating on the grey. Swap: a sheet overlay with the same geometry (see the Swap section), flex 5.5/0.5/2/1. **24px of grey padding on top + SHORTER keys (numpad 5.5 parts, NOT 6)** - user decision 07-20c: if the keys are too big, reduce the key height; Back/Done ALWAYS stay anchored to the row 9-10 edge, do not move them.
- **The number-field caret is a blinking BLACK `_`** (class `.caret`, colour `--color-content`, user decision 07-22c: a grey caret clashed with the black text; it covers Swap/SendAmount/CreateQR). When EMPTY = the caret ONLY, with no faint 0 drawn (user decision 07-20b on Swap): do not draw a faint 0 beside the caret ("0 is 0, _ is _"). **"You receive" with NO amount entered = COMPLETELY EMPTY (the `idle` prop, user decision 07-23)** - "…" is ONLY for "an amount was entered and the estimate is loading" (it used to show "…" while idle too, which looked like a load that never finished). **The Swap screen - AREA LAYOUT (user decision 07-20e, FINAL):** the rows 2→9 area is one flex column with `justify-content: space-between` (paddingBottom 2dvh) split into **3 BLOCKS**, with the 2 gaps AUTOMATICALLY EQUAL (the user: "the You pay/receive group is as far from the hint+slider group as that group is from the Swap button", no lopsided space): (1) You pay + ⇅ + You receive + Fee/Rate; (2) the suggestion chips + PctSlider - **the chip row MUST have a FIXED `height: 40`** (bug 07-21: an empty `hints.map` → a 0-height row → space-between dragged the whole slider group down every time a hint appeared/disappeared; reserving the space keeps the slider still while the chips merely fade). **07-23 (reversing 07-22e): the "Slide to adjust…" hint pill was REMOVED - with NO amount chosen the row stays EMPTY (still height 40) and the instruction moved ONTO THE SWAP BUTTON: it reads "Slide or tap here to enter" (text at fs-item 17 - the default 21 gets ellipsised, verified with Playwright scrollW≤clientW) and tapping it opens the numpad (openPad); with an amount, the button returns to "Swap" and the round-number chips come back.** Verify by measuring `getBoundingClientRect().top` of the track + the Swap button at pct=0 and pct=50 - they must MATCH; (3) **the Swap button = the default `.btn` PILL** (radius 50, height 6dvh - user decision 07-21, REVERSING the 07-20e "square 8dvh" because it did not match the buttons on other screens) **CONCENTRIC with the Scan QR/Create QR action-cards**: its wrapper copies the `.action-grid` geometry exactly = `height 8dvh` + `marginBottom 2dvh`, last in the `2/10` flex space-between → a band of 80→88dvh with the button centred ⇒ **its centre at 84dvh** matches the action-card. **WIDTH = 3/4 OF THE SCREEN (07-29, previously 66.67%)** - see the "lone button" rule in section 5; the vertical centre is UNCHANGED (re-measured 07-29: the Swap button cy=709 = Create QR cy=709 @390). ⚠️ Do NOT add `paddingBottom` to the parent area (the block's marginBottom already reserves 2dvh) and do not change the height/radius back. Verify: measure the `centerY` of Scan QR (Send), Create QR (Receive) and Swap - they must be EQUAL (measured at 783px for all 3). The button is still the ONLY place the Preparing/Enter PIN/Submitted/error status appears. The You pay/receive cards are flex columns with **height `calc(20dvh - 5px)` + justify-content CENTER + gap 10** (user decision 07-22f: each card 20dvh-5px, plus the 10px ⇅ gap = exactly 40dvh → the 2 cards FIT rows 2-5 precisely and Rate/Fee lands in the top half of row 6; measured with Playwright at 390×844: You pay 10→29.4dvh, You receive 30.6→50dvh, Rate/Fee 51.2→53.6dvh - do NOT exceed 40dvh or Rate/Fee is pushed out of place). Center+gap pulls the label CLOSE to the token chip. **The balance line: You pay = "Available: <amount> <token>" (balLabel="Available"), You receive = "Balance: <amount> <token>" (balLabel="Balance") - on 07-22g the user asked to KEEP Available on You pay (do not remove it). The [SYM] token chip carries the black drop shadow like every button.** The ⇅ button uses margin **-17/-17** on a 44px button → a net 10px in flow = a 10px GAP between the cards (user decision 07-22b: touching looked bad; You receive moved to 31.2→51.2dvh and Rate/Fee to 52.4→54.7dvh, still in the top half of row 6). The button bridges the gap; **the ⇅ button (user decision 07-29 - REVERSING the 07-22h pale-blue-background/dark-blue-icon version): a `--grad-brand` GRADIENT circle + a WHITE `trade` icon + a .35 drop shadow (the gradient-button standard)** - the same family as `.btn-primary`/`.action-card.primary`; the button stays 44px and the 10px gap is unchanged. *(The icon here is `trade.svg`, NOT `swap.svg` - the user calls it "the swap icon", do not edit the wrong file.)* **Fee/Rate**: one fs-item 17 line, `Rate:` aligned LEFT · `Fee:` aligned RIGHT, grey labels with BLACK figures. Card content: the label · [token chip ▼ left | THE BIG NUMBER right, with no repeated token name] · [Available left | ~$ right]; **the You pay/receive labels are `--fs-body` 19 and the secondary Available + ~$ line is `--fs-item` 17** (07-21: making them equal DESTROYED the heavy/light hierarchy), the chip logo is 32 with 19 text, and the number is base 52 shrinking to fit. **The Swap numpad:** tapping the You pay AMOUNT → a sheet slides up covering **half of row 6 → row 10** (55→100dvh): a GREY surface background + WHITE key tiles at radius 12 with an 8px gap (raised buttons), NO wasted white space on top, and a TRANSPARENT overlay (user decision: a numpad rising while the main screen dims is WRONG); inside the sheet, the numpad takes 30dvh + the Back/Done pills at 44% sit at 85-95dvh (aligned with .row10-dual) + 5dvh of padding. Typing updates the amount + pct + estimate live; Back discards what was typed, Done/tapping outside keeps it; the slider and suggestion chips are unaffected.
- **SENDING TO YOURSELF IS FORBIDDEN (user decision 07-31 - "you must not let me send money to my own wallet"):** blocked in **3 places**, because there are 3 ways into the Send screen - `PasteAddress` (a well-formed address that is your own wallet → the button does not proceed + a red message, and the clipboard is NOT read over the top of it), `QRScanner` (scanning your own receive QR → say so and keep scanning, for both the camera and picked images), and `SendAmount` (**the final guard** for the Contacts route - the user can save their own wallet as a contact; it uses `walletAddr` fetched from Circle and NOT localStorage, because a PWA may be missing the key). The shared helper is `isOwnAddress()` in `data.js`.
- **A SELF-SEND IS NOT A SWAP (bug 07-31):** a self-send transaction has `from == to` on **ONE SINGLE ROW**, and `swapHashes` only required "an out and an in" → it was labelled **"Swapped 5.00 USDC to USDC"**, so the user searching for "Sent" found nothing and thought the transaction had VANISHED. The fix: any row that is both out and in is SKIPPED (a real swap always has 2 SEPARATE ROWS), and TxRow shows **"Sent to yourself"**. The mock includes this case (`0xmockself1`) so it can be retested.
- **TxHistory MUST SORT ITSELF + DateHeader keys need an index (bug 07-31):** the list renders straight from the array, and a repeated date label meant 2 `DateHeader`s with the **same key** → React warned *"children to be duplicated and/or omitted"* = **transaction rows can be dropped**. Fixed by sorting `timeStamp` descending on the client + `key={h-<date>-<i>}`.
- **TxHistory ALWAYS shows the FULL history** (user decision 07-20, correcting the 07-19 misunderstanding: it was once cut to 24h with a usage hint → WRONG). Only NOTIFICATIONS (NotifArea) are "today's" things; history is the reconciliation ledger - never truncated, and NO hints inside it.
- **TxHistory: a swap is 2 SEPARATE ROWS, never merged** (user decision 07-20d, reversing the 07-19 merge decision - merging into "Swapped X → Y" LOST both the -X / +Y figures on the right). Each leg is a TxRow: the out leg "-$X / X EURC" (red), the in leg "+$Y / Y USDC" (green). **Both rows are titled "Swapped <outAmt> <outSym> to <inSym>"** (e.g. "Swapped 20.00 USDC to EURC" - user decision 07-20d, a bare "Swapped" told you nothing) + **the subtitle "Swap completed · At <time>"**. It needs `swapPairs` (a map hash→{outAmt,outSym,inSym}, derived from `txs` so the Sent/Received tabs still have both directions) passing `swapInfo` into TxRow. `SwapRow` + `buildDisplayList` were deleted. TxRow fonts were REDUCED to fit the screen: icon 40→34, the money on the right fs-num 24→fs-md-lg 21, token/time/note at fs-tiny 13, vertical padding 11, gap 10.
- **MERGING applies to the 2 swap NOTIFICATIONS (NotifArea), NOT to history** (the user's reminder 07-20d): one notification, `Swapped X EURC to ~Y USDC (complete)` (or `(failed)`), fired from `Swap.jsx handleSwap`; `NotifArea.pollIncoming` has its `outHashes` branch DISABLED (no separate "Swap complete·received" any more).
- **The % slider (PctSlider):** magnet snapping depends on the GESTURE (user decision 07-20d) - CLICK/TAP `SNAP_TAP = ±9%` (easy to hit a mark), DRAGGING `SNAP_DRAG = ±2%` (does not fight the drag). `pctFromEvent(e, snapZone)`: down()→SNAP_TAP, move()→SNAP_DRAG. Verified with Playwright: click@47%→50, drag→47% stays put. Mark dots are 14px, the % labels are fs-item 17 and TAPPABLE (tapping a label jumps to that mark). Markers at 0/25/50/75/100.
- **ShowQR (viewing/creating a receive QR):** the big QR = `min(30dvh,78vw)` (the same size as on the Receive screen), 3 rows tall (2-4); rows 5→8 hold the big amount at `fs-amount` light + a `fs-md-lg` caption; the Share/Back buttons are in `.row10-dual` (9-10). The title is DYNAMIC based on the `fromStorage` flag (07-20d, NOT based on whether there is a name): opening a SAVED QR from the library → `QR Storage: <name>` (unnamed → `QR Storage: Item`); a newly created QR (Receive/custom) → `Create receive QR`. SavedQRList's onClick MUST pass `name: q.name` + `fromStorage: true`. **Add-to-QR-Storage (the SavedQRList popup, retitled from "Add to library" on 07-23):** the Amount field is a div that opens the app numpad sheet (see THE KEYBOARD RULE), with a placeholder carrying the default currency symbol - `Amount (${displaySymbol(getDisplayCurrency())})` (USDC→$, EURC→€).
- **A HINT (NotifArea) is `Label: description`, with the label BOLD (medium), NO underline, and TAPPABLE** (user decision 07-21, final - underlining was tried and dropped, the bold stayed): each line is `{label, desc, onClick}`, and tapping the label goes exactly where the button of the same name in row 9 goes; long sentences MAY WRAP (no nowrap/ellipsis - only REAL notifications keep to one line with "…"). **A hint's label MUST MATCH the row 9 button's label.**
  **The settled text (do not edit it yourself):** Send - `Paste: Paste a wallet address` → PasteAddress · `Scan QR: Scan a QR code to send` → QRScanner · `Contacts: Save people you send to often` → Contacts (the hint order matches the row 9 button order left→right, user decision 07-23: Contacts is used most → it sits on the RIGHT). Receive - `QR Storage: Save your favorite QR codes` → SavedQRList · `Create QR: Create a QR to receive money` → CreateQR · `Share: Share your wallet address` → handleShare.
  ⚠️ When a real notification arrives, the hint is pushed up and fades at the top edge (by design: the hint has the lowest priority). The token box on Send STILL scrolls with many tokens (do not remove the overflow).
- **SendAmount - THE DEFAULT NOTE** (user decision 07-20e): the Send-to/amount/note group is one flex column at `gridRow 2/6` with **gap 4dvh** (07-22c: 2dvh felt cramped → opened up while staying one centred group). The note field has an **`option` icon on the RIGHT** (a 52×52 button with a surface background) → a "Set your default note" popup (an input reading "Type here", Back/Save), stored in `localStorage ez_default_note`. The memo initialises to the default note → shown as a real VALUE (not a faded placeholder); **tapping the note field for the first time (onFocus) while it holds the default note CLEARS it for fresh typing** (`noteTouched` prevents it being cleared again). Every send then carries the default note in its memo.
- **CreateQR MATCHES SendAmount's GEOMETRY (user decision 07-23 "two screens with the same job must look the same"):** the same gridRow 2/6 flex column with gap 4dvh - line 1 "Amount to receive" (where "Send to: X" sits, BLACK medium text at fs-md-lg) · line 2 the amount + the [USD] chip copied verbatim from Send (chip fs-md-lg + a brand arrow) · line 3 the QR name field (fromLibrary) or **a placeholder of height 52** - without that third row, justify-center drags the whole group 43px down and the two screens no longer line up. Verify: measure the top of the label/caret/chip on both screens. ⚠️ UPDATED 08-25: they no longer match EXACTLY. The Send screen gained a `Balance:` line above `Send to:` (user request), which makes its centred block taller, so its amount/caret now sits **~15px higher** than CreateQR's (measured 229 vs 214 @390×844; the same ~15-16px at 375 and 360). The structure, the gaps and the 3-row rule are unchanged - only that one offset. Do NOT "fix" it by padding CreateQR: the two screens legitimately carry a different number of lines now.
- **The BIG balance in BalanceHeader** (user decision 07-20e, filling the empty space): `amountFontSize(str, 76, 7, 40)` - base 76px (previously fs-amount 52), shrinking with length (7 characters fit exactly, longer shrinks, floor 40), plus `whiteSpace nowrap` + padding 12 so a large number still fits the width. Shared by HomeSend/HomeReceive/MenuScreen.
- **The ShowQR title = `QR: <name>`** (user decision 07-20e, dropping the word "Storage" for compactness - long names need the room); an unnamed QR → `QR: Item`; a new one → `Create receive QR`.
- **SavedQRList row 9 = `.row10-dual`: [Back WHITE] + [Add BLUE]** (user decision 07-29, replacing the old `.row10-single` blue Back). Add opens the exact "Add to QR Storage" popup that the "+" tile in the grid opens (`setAdding(true)`) - adding a QR is the screen's main action, so the user should not have to scroll to find the "+".
- **Deleting a QR in SavedQRList uses a CONFIRM POPUP** (user decision 07-20e, guarding against mis-taps): tapping × → a `Delete QR: <name>` popup (unnamed → the amount) + [Back][Confirm in red], never an instant delete. The standard popup, centred over rows 1-6.
- **The `right2` chevron (a row that goes somewhere) uses `--color-brand`** (07-20, previously `--color-faint`, which read as disabled); `--color-faint` is now only for placeholders/hidden icons. The standard text field is height 52 + `--fs-md-lg` (email/memo/paste address are all aligned).
- **Text inputs live in rows 1-4, or in a popup anchored to the top half** (`.popup-card` centred at 30dvh) - the iPhone keyboard covers the bottom half. No autoFocus inside a popup. **Page scrolling is pinned** (an `App.jsx` listener) - DO NOT remove it.
- **The 55dvh position = "the secondary line in the middle of the screen"**, shared: the Hold-to-show button (Send) and the address+copy line (Receive) are absolutely positioned at top 55% → switching tabs, nothing jumps. The QR on Receive = `min(30dvh, 78vw)`, occupying rows 3-6.
- **HomeSend:** rows 1-2 the balance · 3-5.5 the token box · 7-8 NotifArea · 9 the 3 action-cards (left→right **Paste · Scan QR · Contacts**, user decision 07-23) · 10 the NavBar. **QRScanner (07-29):** row 1 = the TITLE "Scan QR" (consistent with every sub-screen - this screen used to have no title and the scan box took row 1 as well); the scan box + 2 caption lines moved down to be centred on **rows 2-7**; the right (blue) button is **"Done" and NOT "Back"** (user decision 07-29: a blue button is the primary/finishing action, and "Back" on a blue button reads as the wrong role - Back is always the secondary WHITE button).
- **SendReceipt (07-23):** the confirm box + the receipt canvas carry an **Address row with the SHORTENED address `0x1234…5678`** (user decision: NOT the full one - long and ugly), and it is **shown ONLY when Send to is a contact NAME** (without a name, Send to is already the shortened address, so repeating it is redundant). The canvas is `H = 590 + 60·(has Address) + 60·(has Note)` - the bottom of the last row + **50px of breathing space + the logo + a 22 margin** (the logo used to touch the last row's divider - do not let that return).
- **A TxHistory row:** on the left `[icon] Sent/Received` + the time + [Add to Contacts] + the Note; on the right `±$` (red/green) + the real token in grey. **NO grey separator lines** in lists/boxes (except the NavBar + the Rate/Fee row).
- **`<button>/<input>` must inherit the font** - there is a global `font-family: inherit` rule, do not remove it.

---

## 7. Circle/Arc gotchas (hard-won - keep forever)

**Circle W3S:**
- **The PIN screen is a `pw-auth.circle.com` iframe (cross-origin):** its UI structure cannot be changed, and **the numeric keyboard CANNOT be opened automatically** (browsers forbid cross-origin focus, and iOS requires a direct tap - the user already asked, do NOT dig it up again). **The iframe also CANNOT be closed sooner after the PIN is entered** (the user asked 07-20): the SDK already removes the iframe IMMEDIATELY on the `onComplete` message (read the `messageHandler` source); the 1-3s "pause" after typing is Circle's spinner processing the challenge inside the iframe. Removing the iframe before the challenge settles loses the signature (the root cause of the old PIN bug) - DO NOT do it.
- **⚠️ HISTORICAL (08-04, no longer in the code): Vietnamese was once enabled for the PIN/security screens through `setLocalizations`** (the translations lived in `src/circleLocalizations.js`, called from `circle.js:getSDK()` + the 2 SDK constructions in `Login.jsx`). That reversed the earlier "pure English because Circle only half-localises" decision (07-01), which was WRONG: reading the docs carefully (customization.md + web-sdk-ui-customizations, checked 08-04) showed the Recovery Method + security questions ARE localisable, not hardcoded as previously assumed. **The part that was right:** there is no field for runtime ERROR text (wrong/locked PIN...) → that stays English, which is acceptable because it rarely appears. **Never localised:** `transactionRequest`/`contractInteraction`/`signatureRequest`/`emailOtp` (the SDK supports them, but those fields mix static labels with dynamic values and need careful testing). **All of this was removed on 08-25 together with the i18n layer** - the app is English-only and English is Circle's own default, so nothing is called. If multi-language ever returns, the file and the correct call are in git history.
- **2 bugs found while testing the Vietnamese Circle screens (08-04), both fixed at the time (kept as SDK lessons):**
  1. `requiredMark` (the "Required" word beside Question/Answer) was concatenated by the SDK DIRECTLY onto the preceding label with no space inserted ("QuestionRequired") → fixed with `requiredMark: ' (required)'` (padding the space + brackets yourself).
  2. The 3 risk-warning lines on the "Security confirmation" screen stayed English despite `setLocalizations` - because they belong to the `securityConfirmItems` field of a **DIFFERENT** method (`setCustomSecurityQuestions`), not to the `Localizations` object. That method had to be called as well (in 3 places, like `setLocalizations`).
- **✅ 08-04c - CONFIRMED FOR REAL: `inputMatch` (the "Security confirmation" screen) DOES change the phrase the SDK validates against.** Setting a custom `inputMatch` and typing that exact phrase on a deploy genuinely enabled the Continue button. It is not merely displayed text, as first feared.
- **🔴🔴 08-04 - THE ROOT CAUSE of the "EMPTY security questions screen": CALLING `setCustomSecurityQuestions` WITH THE WRONG SIGNATURE. Our mistake, NOT Circle's.** That method takes **POSITIONAL ARGUMENTS**, not an object:
  ```js
  setCustomSecurityQuestions(questions?: SecurityQuestion[] | null, requiredCount = 2, securityConfirmItems?: string[])
  ```
  (verify: `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/index.d.ts:91`; the body at `index.js:254` assigns `this.securityQuestions = questions` directly, with NO destructuring.) Calling it object-style as `setCustomSecurityQuestions({ questions, securityConfirmItems })` → the SDK received the whole **object** where an **array** of `questions` was expected → a broken question list → **an empty screen that blocked the entire wallet-creation flow**; and at the same time `securityConfirmItems` (the THIRD argument) never arrived → the 3 warning lines stayed English. **One bug explaining both symptoms.** Fixed by passing positionally in all 3 places. Check: `grep -rn "setCustomSecurityQuestions({" src/` must be EMPTY.
  **The lesson:** the 3 attempts before that all changed the WRONG variable (removing `questions`, then disabling the method, then disabling `Localizations.securityQuestions`) because they reasoned from symptoms instead of READING THE FUNCTION SIGNATURE in `node_modules` - which was there from the start and takes 30 seconds to read. When an SDK behaves strangely: read the `.d.ts` + the function body FIRST, do not guess and trial-and-error on production.
- **`Localizations.securityQuestions` WAS INNOCENT** - it was fully re-enabled. The user's screenshot at `f02cd86` (when only `setLocalizations` was called, before `setCustomSecurityQuestions`) showed the screen rendering the full dropdown + input → that block never emptied the screen.
- **✅ 08-04e - the same `securityIntros` concatenation bug fixed too:** two headline strings running together, the same disease as `requiredMark` (the SDK joins `headline`+`headline2` without inserting a space) → pad a leading space onto `headline2`.
- **`getSDK()` is ASYNC (lazily loading 740KB of SDK+polyfill)** - every call site MUST `await getSDK()`. Forgetting the await kills the PIN silently. Check: `grep -rn "getSDK()" src/ | grep -v await` must be EMPTY.
- **A userToken lives 60'** → call `refreshSession()` before ANY PIN action.
- **A wrong PIN does NOT close the iframe** - `executeChallenge` IGNORES `RETRYABLE_CODES` (155112/155703/155704/155115/155705) and only settles on success or a terminal error. `155701` = the user cancelled → stay silent.
- The 3 PIN endpoints: `POST /user/pin` to set · `PUT` to change · `POST /user/pin/restore` for a forgotten PIN. SSO/OTP users have no PIN → 403.
- `contractExecution`: flat fields with `feeLevel:'MEDIUM'`, accepting `abiFunctionSignature`+`abiParameters` or `callData`. Circle errors: return them verbatim as `message (HTTP status, code)`; read `e?.message || e?.error?.message`.
- 2 format chainId: W3S = `ARC-TESTNET`, Stablecoin Kit = `Arc_Testnet`.

**Arc / Stablecoin Kit:**
- **The public RPC is STRICTLY RATE LIMITED (HTTP 429):** reading several things MUST be folded into Multicall3 (`publicClient.multicall()` does it for you); retries spaced ≥600ms; frequent retries walk into a permanent 429 (lesson 07-17b). **A failed read shows `…`, it NEVER draws 0.**
- Gas is paid in USDC (18 decimals internally) and is very cheap - show `< $0.01` rather than `$0.00`.
- **ArcScan (Blockscout) IGNORES `limit` - use `page` + `offset`** (measured for real 07-31 on a busy wallet): `&limit=50` → returns **10,000 rows / 11.7s**; `&page=1&offset=50` → 50 rows / **0.4s**; `offset=1000` → 1.7s. TxHistory used to pass `limit=50` and was therefore **silently downloading the wallet's ENTIRE history** on every open. ArcScan DOES honour `sort=desc` - but the list still **sorts on the client**, because the API order must not be trusted.
- **Do NOT merge `txlist` (native transfers) into history** (tried and REJECTED 07-31): Arc uses USDC as its native token, so it seemed `tokentx` might be missing native transfers → measurement showed **0 missing transactions** over the same window (Blockscout always indexes native transfers as token transfers). Adding `txlist` would **DOUBLE-COUNT 70 of 75 transactions**.
- **A COLD Arc RPC call takes ~3.3s** (subsequent ones 130-360ms; measured 07-31). So EVERY screen that reads balances MUST seed from the module-level cache (`cachedBalances`) and fetch in the background - HomeSend/HomeReceive/Swap all do. A screen that starts from `{}` leaves the user staring at `…` for seconds.
- **RPC CORS: fine on production, NOT on localhost.** `rpc.testnet.arc.network` echoes `access-control-allow-origin` for the real Origin (verified from a browser running INSIDE the `ezwallet.cash` origin: 200, 535ms) but blocks `http://localhost:5173`. → red CORS logs from the RPC during `npm run mock` are **NORMAL**, not a production bug, so do not go fixing them.
- The Kit's `amount` is in base units (section 4).

**PWA (added to the iOS home screen):**
- **The grey band at the top of the status bar is the `body` background.** An iOS standalone PWA without `viewport-fit=cover` (index.html) keeps content inside the safe area; the status bar region (outside the viewport) is filled by iOS with the **`body` background colour**. It used to be `--color-gray` → a visible grey band. Fixed 07-19: `body background = --color-white` (index.css) → it blends with `.screen`. **Do NOT set the default body background back to grey.** ⚠️ Updated 07-22: the area OUTSIDE the app frame on desktop/tablet is a SOFT PASTEL BLUE through `@media (min-width: 481px) { body { background: #D6EAFB } }` (user decision 07-22c - from #0B53BF→#0088FF→#D6EAFB, paler each time to stop it glaring; reversing the 07-21 grey) - safe because phones are always ≤430px and never reach the threshold; `.screen` has its own white background so the app frame is not tinted. For a native-style full-bleed look, add `viewport-fit=cover` + `env(safe-area-inset-*)` padding to `.screen` (which touches the 10-row grid - the user chose NOT to, keeping the white background). ⚠️ NOTE 08-25: `body` is currently set to `#D6EAFB` at the default (non-media-query) level too - a TEMPORARY change for filming a clip, marked in index.css:114. Change it back to `var(--color-white)` once filming is done.
- iOS caches the meta/manifest at "Add to Home Screen" → manifest/meta changes do not take effect until the app is **deleted and re-added** (CSS changes like the above take effect on the next open).

**Other:**
- iOS Safari: no BarcodeDetector → jsQR; the Web Share API saves to Photos; do not use `clipboard.readText()` (an annoying dialog). **The single exception: the Paste button in PasteAddress** - and it only reads when the field is empty (07-23): the "Paste|Speak" popup is an iOS 16+ CONFIRMATION (clipboard security, the web cannot disable it, and it cannot be replaced with our own popup either - ours would come BEFORE the iOS one, making it two taps; "Speak" appears because Spoken Content is enabled on the device); if the field already holds a valid EVM address → **the button label flips "Paste"→"Confirm"** and it proceeds directly without touching the clipboard → no popup. The user has asked twice; stop looking for a way to "disable/replace the popup".
- Screens without a NotifArea show errors through `ErrorToast` (passing `sendError` through navigate).
- Sign-out only clears the session keys, KEEPING `ez_contacts/ez_saved_qrs/ez_currency`.
- **localStorage IS TIED TO THE ORIGIN → changing domain "loses" local data (07-29, not a bug):** anyone who used the app on `ezwallet.pages.dev` will arrive at `ezwallet.cash` **signed out, with empty contacts / QR library / notifications** - because the `ez_*` keys live on the old origin. **THE WALLET AND THE MONEY ARE NOT LOST** (the wallet is tied to the email at Circle: sign in with the same email + PIN and it is back). Only `ez_contacts`/`ez_saved_qrs` have to be re-entered by hand, or viewed by opening the old link. Do not promise the user that everything carries over.

---

## 7b. QR - LOCKED TO THE ARC NETWORK (user decision 2026-08-13)

**`src/qr.js` IS THE SINGLE SOURCE OF TRUTH for the QR format.** Every drawing site (HomeReceive · ShowQR · SavedQRList) calls `buildQR()`, and the reading site (QRScanner) calls `parseQR()`. **Do NOT hand-build `ezwallet:...` strings in any screen** - before 08-13 it lived in 3 places, and fixing one left the others wrong.

```
ezwallet:0xABC…@5042002                      ← the default QR on the Receive screen
ezwallet:0xABC…@5042002?amount=25&cur=USD    ← a QR with a preset amount
```

**Why it is locked:** the default QR USED TO draw a **bare `0x…` address**. EVM addresses are identical on EVERY chain ⇒ any wallet sitting on Ethereum/Base/BSC can scan it and send, and money that lands on another chain is **gone for good**. The app's audience is older people with no way of noticing the wrong chain. The user's position: **"for now we use one network only"**; CCTP Unified Balance may come later, possibly under the model *"a different chain is a different bank"*.

**The asymmetry is DELIBERATE (do not "make it consistent"):**
- **The QR is LOCKED** to Arc. It is the one-tap-and-it-sends path, so it must be blocked.
- **The address as text (the copy button / Share) is LEFT BARE**, with no chain attached. That is the escape hatch for topping up from an exchange or another wallet. The user's ruling: *"the wallet address itself is fine".*

**⚠️ EIP-681 (`ethereum:0x…@5042002`) IS DELIBERATELY NOT USED:** that standard does have a chainId field, but plenty of wallets implement it sloppily - they read the address and **ignore `@chainId`**, sending on whatever chain is open ⇒ more dangerous than a bare address, because we would believe it was locked. Faced with the unknown `ezwallet:` scheme, other wallets have only one option: **refuse**.

**parseQR accepts 3 shapes** (round-trip tested): the standard `ezwallet:…@5042002` · `ezwallet:…` **with no @chain** (OLD QRs printed/shared/saved as images before 08-13 - treated as Arc, they must keep working) · **a bare `0x…`** (a QR from an outside wallet that we scan IN ORDER TO SEND - locking this would leave the user unable to send to outsiders). An EZwallet QR from another chain → returns `{ wrongChain }` → the scan screen says *"QR from another network – this wallet currently only works on Arc"*. **`{ wrongChain }` has NO `.address`** - catch it before the valid branch, or you land on the amount screen with `undefined`.

**Changing chain (mainnet / adding a chain) → edit `ARC_CHAIN_ID` in `src/qr.js`** (`chain.js` imports that constant for `defineChain`, so it is not declared twice).

---

## 7e. MONEY-RECEIVED NOTIFICATIONS - the polling interval (bug reported 2026-08-13)

**The symptom:** *"the money-received notification takes forever to appear"*, while **sending shows instantly**.

**The root cause:** `NotifArea.pollIncoming` - named *poll* (ask repeatedly) but called **EXACTLY ONCE** on mount (`useEffect(..., [])`), with **no `setInterval` anywhere in the app**. Sitting still on Send/Receive, money could arrive with nobody asking again → the notification only appeared when the user happened to switch tabs (a component remount). **SENDING** appeared instantly because `SendReceipt` calls `addNotif` itself with no network involved - so only RECEIVING was slow.

**⚠️ WHY THIS IS NOT A SMALL BUG:** this app is for older people. Being told *"I sent you the money"* and opening the app to nothing makes them **WORRY**, then call to ask, then tap randomly. Silence on a money screen is a serious bug. Do not "optimise" the repeated polling away.

**THE INTERVAL FOLLOWS WHAT THE USER IS DOING (user decision):**

| Screen | Interval | Why |
|---|---|---|
| **Receive** | **5s** (`pollMs={5000}`) | The QR has just been held out to someone; they are **standing there waiting** for the money |
| **Send** | **15s** (default) | Nobody is waiting for incoming money on this screen |

- **Skip the tick while the tab is hidden** (it costs battery/data and nobody is looking) + **ask IMMEDIATELY on returning to the app** (`visibilitychange`) - the most common scenario is: told the money was sent → open the app → it must be there.
- A module-level `polling` flag prevents overlapping requests on a slow network.
- ⚠️ **If one screen needs to be faster, pass `pollMs` to THAT screen only**, do NOT lower the default: each tick is a request multiplied by every device with the app open.
- ⚠️ The effect's deps are `[pollMs]`, not `[]`.

**Measured with Playwright:** over the same 22s → the Receive screen polled **4 times, evenly spaced 5.0s apart**; the Send screen **once**. Hiding/showing the tab triggered an immediate poll.

**STILL MISSING:** the polling only runs on the **Send or Receive screens** (the only 2 that render `NotifArea`). Money arriving while the user is in History/Menu/Swap goes unannounced until they return Home. Announcing it on every screen means moving the polling up into `App.jsx` - **not done, it needs the user's approval because it touches the architecture**.

---

## 7d. THE BUG-REPORT BUTTON → TELEGRAM (2026-08-13) - LIVE IN PRODUCTION

A **grey** 🐛 icon (`--color-muted-2`) flush right, centred on **row 1**, present on **EVERY screen including Login/PinGate** (errors are most likely exactly when you cannot get into the app). Rendered once in `App.jsx` inside an anchor frame of `maxWidth: var(--screen-max)` → it hugs the right edge **of the app**, not the desktop screen edge.

⚠️ **COLOUR: do not change it to blue/red** (the user weighed all 3): brand blue = the "tap this" colour → it would compete with the main content on every screen; red = the error/danger colour → a red dot next to the balance makes older users think **their money** is in trouble. Grey = "a tool sitting there, not needed yet" (= an unselected navbar icon).

**`functions/api/bug.js` - the bot IS ONLY A TOKEN, it does NOT run in the background and needs NO VPS.** It does not listen, poll or use a webhook: each button press is one `fetch` to `api.telegram.org` and then it ends. (Completely unlike the TemBro bots on the VPS that must run 24/7.)

- ⚠️ **Do NOT use `parse_mode`** - the user types freely, and turning on Markdown/HTML breaks the message (`*_\`<>`) or allows tag injection. Plain text needs no escaping.
- ⚠️ **Whitelist exactly 5 fields** (`message/screen/wallet/device/version`). The client must **NOT collect localStorage** and send it. `ez_user_token` / `ez_encryption_key` / `ez_refresh_token` / `ez_sync_token` getting out means **LOSING THE WALLET**. The wallet address is sent (it is public, and without it a failed transaction cannot be looked up).
- Flood protection of **5 per hour per IP** through the `EZ_SYNC` KV. **With no KV, SKIP the guard rather than blocking everything**: better to take spam than to lock out someone genuinely calling for help.
- Telegram returns **200 with `ok:false`** for a wrong chat_id / a blocked bot ⇒ you must read `ok`, never trust the HTTP status alone.
- With the variables unset → **503 `bug-report-disabled`** and the app runs normally (the same pattern `sync.js` uses without a KV binding).

**Environment variables (ALREADY SET on Cloudflare Pages production, encrypted):** `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID`. The bot is `@ezwallet_report_bot` ("EZwallet Bug Report"). The values are also in the local `.env.txt` (gitignored) so `dev-server.js` works.
⚠️ **Pages only applies new variables to NEW deployments** - after setting them, create a new deployment (`POST …/pages/projects/ezwallet/deployments -F branch=main`); the running build will **not** pick them up.
⚠️ Telegram **blocks a bot from messaging anyone who has not pressed Start with it** - if the recipient changes, that person must press Start first.

**The version in a bug report** = 7 characters of the commit, embedded at build time (`vite.config.js` → `__APP_VERSION__`): Cloudflare provides `CF_PAGES_COMMIT_SHA`, locally it asks `git`, and if both fail → `'dev'` (never let the build die over it).

**Verified on production:** a real POST → `{"ok":true}` + the message arriving in Telegram. An empty message → 400 `empty-message`. *(The 5-per-hour limit has only been read in the code, not fired for real, because testing it means spamming the user's Telegram.)*

---

## 7bb. Web Share on iOS - `files` + `text` REMOVES SOME TARGET APPS (bug reported 2026-08-13)

**The symptom:** tapping Share on the Receive screen → the iOS share sheet **appears normally** but **Messages/Zalo are MISSING** from the list of target apps.

**How it was narrowed down (reusable for future share bugs):** ask the user 2 questions - *does the sheet appear at all* (it does ⇒ `navigator.share()` is NOT blocked, ruling out "share called outside a gesture") and *do the other 2 share buttons still work* (they do ⇒ the fault is only here, not in `saveImage.js`). Then `grep saveImageToPhotos(` → **the Receive screen is the ONLY caller passing a `text` argument**; ShowQR and SendReceipt send only the image and work fine. ⇒ `text` is the culprit.

**The rule learned:** `navigator.share({ files, text })` makes iOS **filter the target apps**. Sending only `{ files }` brings Messages back.

**⚠️ THE FIRST FIX WAS REJECTED BY THE USER - read carefully so you do not loop back to it.** That version dropped `text` and **drew the address onto the image**; the user disliked it (*"putting the address on the QR looks awful"*) and ruled: ***"as long as it shares 2 things, not 1"***.

**FINAL STATE (user decision 08-13):**

| Share site | What is sent | Note |
|---|---|---|
| **Receive screen** | **THE IMAGE + the wallet address as TEXT** | ⚠️ Including text ⇒ iOS filters the target apps (Messages can disappear). **The user KNOWS and ACCEPTS this.** Do NOT drop `text` to "fix" it again. |
| **ShowQR / QR library** | **IMAGE ONLY** | Here the amount inside the QR is what matters; scanning yields the address, so attaching it is both redundant and costs target apps. |
| **Receipt** | IMAGE ONLY | unchanged |

**The QR image comes from the shared `saveImage.brandedQrCanvas()`** - the QR + the words **"Only Arc Testnet"** + the EZwallet logo. **The address is NEVER drawn onto the image.** Both the Receive screen and ShowQR go through that function, so do not hand-draw it anywhere.
**This also closed pending item B in section 9:** shared images now carry the network label. The screen itself still does not (the user still has to choose where to put it).

---

## 7c. THE SUCCESS SOUND (user decision 2026-08-13) - ⚠️ STILL UNFINISHED

**Status:** `src/sound.js` is written. **NOT wired into any screen, NO off switch yet, NOT tested, NOT committed.** The remaining work is in section 9.

**The user's 4 decisions (alternatives were weighed before deciding - do not propose them again):**

| | Decision | REJECTED, and why |
|---|---|---|
| Where it plays | **After sending money** (SendReceipt) · **after a swap** | ❌ *Money received*: it arrives on its own with NO user gesture ⇒ iOS blocks playback, requiring an AudioContext kept alive for the whole session. ❌ *Copy/save QR/small actions*: too many chimes and the sound **loses its meaning**, so the moment money leaves the wallet no longer stands out |
| Where the sound comes from | **Generated with Web Audio** (2 rising sine notes C6→E6, ~0.3s) | ❌ *An mp3 file*: it has to be sourced, it adds weight, it carries licensing questions, and the first play can lag |
| An off switch | **YES** - add a row to the `Currency` screen (formerly Language & Currency) | ❌ *No off switch*: if iOS plays sound even on a silenced phone, the user would have no way out |
| Default | **ON** (`localStorage.ez_sound`, only written as `'off'` when muted) | — |

**⚠️ THE iOS RULE - why `unlockOnFirstTouch()` exists:** an `AudioContext` is born `suspended` and **can only be `resume()`d INSIDE a user gesture**. By the time a send completes, several `await`s have passed (PIN signing inside the Circle iframe, waiting on-chain) ⇒ **the gesture chain is BROKEN** and calling `resume()` there is too late. So it must be unlocked on the **FIRST touch anywhere in the app** (App.jsx calls it once). Touching Circle's PIN iframe does **not** count for our page.

**⚠️ UNKNOWN, must be tested on the user's real device:** whether iOS honours the **silent switch** for Web Audio - it varies by iOS version. That is exactly why an in-app off switch is mandatory.

**⚠️ Vibration (`navigator.vibrate`) IS NOT POSSIBLE on iPhone** - Safari iOS does not support it, only Android does. Do not promise "vibrate + chime".

**The golden rule:** `playSuccess()` must **fail silently** (everything wrapped in try/catch, returning when there is no `AudioContext`) - **a chime must NEVER break the money flow**.

---

## 8. localStorage keys

**Session:** `ez_user_token`, `ez_encryption_key`, `ez_wallet_addr`, `ez_wallet_id`, `ez_email` (email login), `ez_refresh_token`/`ez_google_email`/`ez_google_deviceId`/`ez_login_method` (Google), `ez_notifs`, `ez_last_recv_ts`, `ez_email_history`, `ez_notified_hashes`, `ez_faucet_pending`. `sessionStorage.ez_pin_ok` = the session unlock flag; **`sessionStorage.ez_sync_token`** = the contacts-backup token, traded for a PIN signature in `PinGate` (08-06) - **deliberately in sessionStorage** so it dies with the app session and reopening the app signs again.
**Persistent:** `ez_contacts_<addr>`, `ez_saved_qrs_<addr>` (per account, see `store.js`), `ez_currency`, `ez_default_note`, **`ez_sync_at_<addr>`** (the last-edit stamp - the arbiter of the "newest wins" rule for KV backups). (`ez_lang` no longer exists: the i18n layer was removed 08-25.)

---

## 9. What comes next

### 📒 WHAT SESSION 2026-08-25 (PART 2, UI POLISH BATCH) DID

| # | Work | Written up in |
|---|---|---|
| 1 | **Swap confirmed working again** - the user tested a real swap on a deploy, no `331001`. The Circle support questions were sent (no reply needed any more, the outage resolved itself) | 4 |
| 2 | **24h price-change indicator**: a small green/red triangle after each token's amount on the Send tab, tap → a popup with the exact % and "Value changed from X to Y". Backed by CoinGecko's `usd_24h_change` (added to the existing `simple/price` call in `chain.js:fetchPrices` - no extra request) · `TOKENS`/`getTokenBalances` now also return `change24h` per token · hidden when the move is under 0.005%. **VOLATILE TOKENS ONLY (user correction, first pass showed it on USDC/EURC too - "stablecoin thì đâu có biến động")**: `STABLECOINS = ['USDC','EURC']` in `HomeSend.jsx` gates it, so today only cirBTC gets the arrow. **Gap is EXACTLY 15px** (user correction - the first pass's flex-gap + button padding stacked to more than that): the button's own `margin: '-6px -6px -6px 9px'` cancels its 6px touch-padding on 3 sides and leaves precisely 9+6=15px on the left; no arrow for a token → no gap at all, the amount sits flush at the row edge exactly as before the feature | HomeSend.jsx, chain.js |
| 3 | **Home hint block reworded**: `Available Network: Arc Testnet` → `Current Available Network: Arc Testnet` (user request) | NotifArea.jsx |
| 4 | **The Paste / Scan QR / Contacts hint titles on the Send tab are no longer tappable** - the user reported they navigated to "random" places; the row-9 buttons below already do the same job, so the `onClick` on the hint labels was simply dropped | HomeSend.jsx |
| 5 | **Scan QR caption reworded**: "Scan crypto wallet QRs only" → "Scan Arc Testnet QRs only" (matches the network-lock wording used elsewhere) | QRScanner.jsx |
| 6 | **Security's icon replaced** with a new hexagon shield drawing from `D:\Files\Claude\Icons\shield.svg`, normalised on import (stroke `black`→`currentColor`, as the header comment in `Icon.jsx` prescribes) - same filename `icon/shield.svg`, so no code change needed elsewhere | icon/shield.svg |
| 7 | **Menu's "Currency" entry + the screen's own title became "Language & Currency"** (user request - the name should say what the screen still half-implies even though the language picker itself is gone) | MenuScreen.jsx, Currency.jsx |
| 8 | **Send screen: the `Balance:` line moved** from beside "Send to" (added just last session, 9A above) down into the blank space right below the note field - the user found the original grouping "hơi xấu" (a bit ugly). "Send to" now stands alone where the pair used to be | SendAmount.jsx |
| 9 | **The USDC gas reserve lowered 1 → 0.1** (user decision) - `GAS_RESERVE_USDC` in `data.js` is the single source of truth (`spendableOf()` uses it everywhere "available to send/swap" is computed), so this one constant change updates Send, Swap and the Balance line together. The `<=1` low-balance warning threshold on HomeSend (separate hardcoded number, "out of USDC for fees") was deliberately left at 1 - it is an early warning, not the reserve itself | data.js |

**Decisions the user settled this session (do NOT ask again):**
- `- 08-25: hint-block titles (Paste/Scan QR/Contacts) are plain text, not links` - reason: they duplicated the row-9 buttons and just added a second, confusing way to navigate.
- `- 08-25: Currency screen is named "Language & Currency"` - reason: kept as the umbrella name even with only a currency picker inside, in case language ever returns there.
- `- 08-25: the 24h change arrow hides below a 0.005% move, AND only shows for non-stablecoins` - reason: USDC/EURC are pegged 1:1 and barely move day to day; an arrow "moving" on peg noise would mislead rather than inform. Today this means cirBTC only.
- `- 08-25: GAS_RESERVE_USDC = 0.1 (was 1)` - reason: 1 USDC held back was far more than real gas costs on Arc, over-reserving on a small balance.

**Verification:** `npm run build` OK · `npm test` 16/16 · a Playwright pass on the mock at 390×844 and 375×812 (HomeSend token list + the price-change popup, Menu, Language & Currency, Send money with the relocated Balance line) - no console errors on any screen. The Scan QR camera cannot be exercised headless (`getUserMedia` fails in that environment, an existing limitation, not a regression), so its 3-line caption was verified by reading the source instead of a screenshot.

---

### 📒 WHAT SESSION 2026-08-25 DID (8 commits, `f467b6d` → `dbce9bd`)

| # | Work | Written up in |
|---|---|---|
| 1 | **Service Hub: the DCA tile became LuckyPot** (still hidden/`screen: null`), using the user's own `icon/luckypot.svg` - the first FULL-COLOUR icon in the set | 3 · `Icon.jsx` |
| 2 | **Vietnamese and Chinese removed from the project entirely.** The i18n layer is gone, not merely switched off: `src/i18n.js` + `src/circleLocalizations.js` deleted, 219 `t('...')` calls replaced by plain English, `check-lang` deleted, `Language.jsx` → `Currency.jsx` (currency only, CNY/VND options dropped) | 2 |
| 3 | **Every comment and document translated to English** - all 46 files under `src/`, `functions/`, `test/`, the CI workflow, the root scripts, `README.md`, `PITCH.md`, `CLAUDE.md` and this file. `.env.txt` was deliberately left alone (gitignored, holds secrets) | - |
| 4 | **2 notification bugs fixed** (reported by the user): a faucet payout showing "received 0.00 cirBTC" (a hardcoded `toFixed(2)` against cirBTC dust → the new shared `data.js:fmtTokenAmount`), and long notifications being cut off with "…" (the row was pinned to one line → it now wraps) | 7e |
| 5 | **The network line in the hint block became `Available Network: Arc Testnet`** - two passes: the user first asked for "currently" so the sentence would leave room for more networks, then cut it to this label form because the longer sentence wrapped onto 2 lines. It now matches the `Label: value` shape of the 3 hint lines under it and fits one line down to 360px. The QRScanner wrong-network message keeps the sentence form ("this wallet currently only works on Arc") | 7b |
| 6 | **The CI workflow finally landed** (`.github/workflows/ci.yml`) after switching the git identity to the `KattyFury` account, whose token carries the `workflow` scope | 9 · item 2b |
| 7 | **The Send screen shows the balance**: a `Balance: $126.66` line directly above `Send to:` (user request - "the Send screen is missing Balance"). It shows the SPENDABLE amount (the same number the "Insufficient balance" message quotes, i.e. minus the 1 USDC gas reserve), formatted with `fmtMoney` so it follows the selected currency: `$126.66` / `84.20 EURC` / `0.01542000 cirBTC`. Loading → `…`, never a drawn 0 | 6 |

**Decisions the user settled this session (do NOT ask again):**
- `- 08-25: remove Vietnamese and Chinese from the project` - reason: the app has been English-only in production since 08-13, and keeping an i18n layer whose keys are Vietnamese strings meant carrying a whole translation system for one language.
- `- 08-25: translate every comment and document, this file included` - reason: if the project is English, it is English everywhere, the same all-or-nothing rule that governed the languages.
- `- 08-25: keep LuckyPot hidden` - the tile is renamed, but the service is still not built.
- `- 08-25: notifications may grow taller rather than lose words` - reason: a truncated notification hid the token being received.

**Known consequences to keep in mind:**
- The VND plumbing (`chain.js` rates, `qr.js` parsing, `amountHint.js`) is still in the code but is now UNREACHABLE - nothing can select VND. It was left in place deliberately rather than ripped out on the same day as everything else; delete it in its own session if it is ever confirmed unwanted.
- `Swap.jsx` and `SendAmount.jsx` still carry their own local `decimalsFor()` alongside the new shared `fmtTokenAmount` - out of scope for the bug fix, worth unifying later.
- The `Balance:` line makes the Send screen's amount row sit ~15px higher than CreateQR's, breaking the pixel alignment those 2 screens had (section 6). Deliberate.
- The hint block is back to 4 single lines (115px at ≥375px, 138px at 360px) after the network line was shortened, so nothing has to be scrolled to be read. Keep that line SHORT if it is ever reworded - the block shares a fixed-height area with the notifications.

**Decisions the user settled this session (continued):**
- `- 08-25: the Send screen shows the SPENDABLE balance, not the raw one` - reason: the raw balance would promise money that Continue then refuses. Consequence accepted: Send can read $126.66 while Home reads $127.66.
- `- 08-25: the network line is a label, not a sentence` - `Available Network: Arc Testnet`, one line at every width.

**🧪 DEPLOY CHECKLIST FOR THIS SESSION (nothing below has been touched on a real device yet).**
Everything was verified with Playwright on the mock at 390/375/360px, `npm test` 16/16 and a production build - but the mock cannot exercise Circle, the faucet or a real share sheet:
- [ ] Open `https://ezwallet.cash` on the phone → login + PIN still work (the Circle localisation calls were removed; the PIN screen must come up in Circle's own English, not blank or broken).
- [ ] Tap the faucet on HomeSend → wait for the payout → the notification must read **`Faucet successful · received 0.000549 cirBTC`** style, NOT `0.00 cirBTC`. This is the exact bug reported; it can only be confirmed with a real faucet payout.
- [ ] The same notification must show its FULL text over 2 lines with no `…`.
- [ ] Send screen: the `Balance:` line shows a real number (not a stuck `…`), and it matches what the Continue button accepts - type the exact balance shown and Continue must stay enabled.
- [ ] Switch the currency chip through USD / USDC / EURC / cirBTC - the Balance line must follow it and never overflow.
- [ ] Menu → the entry now reads **Currency** (not "Language & Currency") and the screen has one row, with no leftover language picker.
- [ ] Home hint block: `Available Network: Arc Testnet` on one line, red, above the 3 hint lines.
- [ ] Nothing anywhere in the app renders Vietnamese or Chinese any more.


### 📒 WHAT SESSION 2026-08-13 DID (9 commits, `c80db30` → `1c348a2`)

| # | Work | Written up in |
|---|---|---|
| 1 | **Turned Vietnamese + VND off.** The root bug: `QRScanner` defaulted the currency to `'VND'` for a QR with no unit → an English/USD app scanning a QR produced VND | 2 |
| 2 | **Service Hub** became navbar tab 1, with Swap a service inside it; the Swap screen's row 10 became the red Exit text | 3 |
| 3 | **Locked QRs to the Arc network** (`src/qr.js` = the single source of truth) | 7b |
| 4 | **QR sharing**: the Receive screen sends the image + the address as text; ShowQR sends the image only; both carry the logo + "Only Arc Testnet" | 7bb |
| 5 | **The bug-report button → Telegram**, live in production | 7d |
| 6 | **Fixed the very slow money-received notification** + a per-screen polling interval (Receive 5s / Send 15s) | 7e |
| 7 | **Fixed the round-number suggestion bug** where the step jumped 10x at the value 10 | 3 · `roundHint` |
| 8 | The 2 white pill buttons now hug their text; Service Hub removed from the Menu | 6 · 3 |
| 9 | `src/sound.js` written **but not wired into the app** | 7c |

**Decisions the user settled during that session (do NOT ask again, do NOT change them):**
- `- 08-13: turn 'vi' + VND off` - reason: both machines run English/USD, and leaving them on caused currency confusion. **(Superseded 08-25: Vietnamese and Chinese were removed from the project entirely.)**
- `- 08-13: lock the QR to Arc but leave the address as plain text` - reason: a QR is the one-tap-and-it-sends path and must be blocked; the plain address is the escape hatch for topping up from an exchange.
- `- 08-13: the Receive screen shares the IMAGE + TEXT even though iOS filters target apps` - reason: *"as long as it shares 2 things, not 1"*.
- `- 08-13: the bug icon is GREY` - reason: blue would compete with the main content, red would make older users think their money is in trouble.
- `- 08-13: round-number suggestions - ≥30 step 1, 3-30 step 0.5, <3 shrinks; take the NEAREST multiple` - reason: the old version jumped 10x at the value 10.
- `- 08-13: Service Hub icon 56 + text 21px` - reason: 48+17 was "too small", 64+30 "too big".

**TRIED AND FAILED, do not repeat:**
- `- 08-13: drop text from the share payload + DRAW the address onto the QR image` → the user disliked it (*"putting the address on the QR looks awful"*) → back to including text, accepting that iOS filters the target apps.
- `- 08-13: make the Swap Exit button a .btn-error (a big red gradient block)` → the user found it heavy and clashing with the blue Swap button → changed to centred red TEXT.
- `- 08-13: use .row10-single for the Exit button` → that class centres at 90dvh = the row 9 position, colliding with the Swap button → it must be `gridRow 10`.
- `- 08-13: list what a bug report sends as one long sentence` → the user: *"reporting a bug and it is this demanding?"* → cut to one line → the user then wanted a numbered list → the third version was settled.
- `- 08-13: force Service Hub tiles square (aspectRatio 1)` → 30px text overflowed → aspectRatio dropped in favour of `gridAutoRows: '1fr'`.

---

### 🟠 UNFINISHED - session 2026-08-13 (do this FIRST)

**A. The success sound** (the full decisions are in section 7c, do not ask the user again):
1. `App.jsx` → call `unlockOnFirstTouch()` once in a `useEffect` at startup.
2. `SendReceipt.jsx` → `playSuccess()` on entering the screen (next to the `addNotif('Sent…')` call).
3. `Swap.jsx` → `playSuccess()` right after `setSuccess(true)` (the "submitted" step, where the user sees the button turn green).
4. `Currency.jsx` → add a second row **"Sound: On/Off"**, reusing the existing `Picker` component + `CHIP` style (do not invent a new toggle). The grey box must grow from `gridRow: '2 / 3'` → `'2 / 4'` for 2 equal rows.
5. **Rename the screen** `Currency` → **"Settings"**: the label in `MenuScreen` ITEMS + the screen title. Reason: it would no longer hold only the currency. ⚠️ Splitting this screen off from Security (08-04) still stands, do not merge them back.
6. (The old step 6 - adding i18n keys - no longer applies: the i18n layer was removed 08-25, so the new strings are written directly in English.)
7. **Test on the user's real device** (headless Playwright cannot HEAR anything; it can only verify that nothing throws and that the off switch writes localStorage correctly): check whether iOS honours the **silent switch**.

**B. The network label ON SCREEN on the Receive screen - WAITING FOR THE USER TO CHOOSE WHERE IT GOES.** *(Shared images have carried "Only Arc Testnet" since 08-13 - see 7bb. Only the on-screen part is missing.)* The QR is locked to Arc at the data level (section 7b), but **nothing on screen says which network this is** - a machine can read `@5042002`, a person only sees a black-and-white square. It fits the model the user is considering: *"a different chain is a different bank"*. The obstacle: the Receive screen is already full (row 6 the copy button, 7-8 the hint area, 9 the three buttons) → **where it goes is the user's layout decision, do not insert it yourself**.

**C. Money-received notifications only run on the Send/Receive screens - WAITING FOR THE USER'S APPROVAL (it touches the architecture).** Those two are the only screens rendering `NotifArea` (section 7e). Money arriving while the user is in History / Menu / Swap goes unannounced until they return Home. Announcing it everywhere means moving the polling up into `App.jsx` - ~20 minutes, but it relocates the logic, so the user has to agree.

**D. Swap `No route available` - NOT OUR PROBLEM, WAIT FOR CIRCLE.** See the red block at the top of section 4. Do not edit the code; re-measure the 3 pairs periodically and stop when it works again.

### 🔴 WAITING FOR THE USER TO CLICK - settled in session 2026-07-31 (read this section FIRST)

> The code is all written and pushed. **2 things can only be done in the Cloudflare Dashboard** (Claude cannot log in: `wrangler login` needs OAuth through a browser, and **wrangler v4 has NO command for attaching a custom domain to Pages** - checked `wrangler pages --help`, it only has project/deployment/deploy/secret/download).

**0. `www.ezwallet.cash`** - ✅ **DONE 08-01, by Claude** (added the custom domain to Pages through REST + created a proxied `CNAME www → ezwallet.pages.dev` with the `claude-code` token). Measured afterwards: www came up in **15 seconds**, both domains HTTP **200**, valid SSL (`ssl_verify_result=0`), serving the same app. **No www → apex redirect is needed**: `index.html` already has `<link rel="canonical">` pointing at `https://ezwallet.cash/`, so SEO sees no duplicate content.

**1. Attaching the domain `ezwallet.cash`** - ✅ **DONE** (measured the evening of 07-29: A `172.67.168.76`/`104.21.94.133` + AAAA, HTTPS **200**, valid SSL, Cloudflare serving it). ⚠️ **`www.ezwallet.cash` was NOT attached at the time** (it did not resolve) - to make www work, go to Custom domains → add `www.ezwallet.cash`.

**2. Creating the KV binding for the contacts backup** - ✅ **DONE 08-06, by Claude** (no Dashboard needed: `wrangler` was already signed in through OAuth with the scopes `workers_kv (write)` + `pages (write)`).
  - Namespace `EZ_SYNC` id `5aec627d80c74c3981944dc070b3bbf0` (`wrangler kv namespace create EZ_SYNC`).
  - Attached to the Pages project through REST `PATCH /accounts/{acct}/pages/projects/ezwallet` with `deployment_configs.production.kv_namespaces` (+ `preview`). **PATCH merges** - the 3 env vars `API_KEY`/`KIT_KEY`/`VITE_CIRCLE_APP_ID` were re-checked after the PATCH: intact.
  - Redeployed through REST `POST .../deployments` (branch `main`) → deployment `7dd93cfe`, commit `d01f7b6`.
  - **⚠️ Do NOT use `wrangler pages deploy` or add `pages_build_output_dir` to `wrangler.toml`** for this project: it is connected to GitHub (`source: github/ezwallet`, prod branch `main`). Deploying directly creates a direct-upload deployment outside the Git flow; switching to a `wrangler.toml` configuration can make the Dashboard env vars be ignored → breaking `API_KEY` = breaking login/swap. The REST route above is the safe one, reuse it.
  - **Verified on production (08-06):** `POST https://ezwallet.cash/api/sync {"action":"nonce"}` → **200** (previously 503). The whole flow was exercised with a viem test key: nonce → sign → session (the recovered `address` matched the signing wallet) → push → pull (the avatar was correctly stripped) → replaying the nonce **401 bad-nonce** → a made-up token **401 bad-token**. **All 3 test keys were deleted from KV afterwards** (`wrangler kv key list` returns `[]`).
  - **WHAT REMAINS = one single thing a machine cannot verify:** whether Circle's REAL signature follows EIP-191 as the server assumes (the Circle SDK does not run on localhost, and a test key cannot stand in for MPC). → the 🔴 checklist in section 3.

**2b. CI** - `.github/workflows/ci.yml` was written and sat LOCAL and uncommitted for a while: GitHub refused the push because the `gh` token lacked the `workflow` scope. ✅ **Committed and pushed 08-25** after switching to the `KattyFury` account (`gh auth switch --user KattyFury` + `gh auth setup-git`), whose token has that scope. The CI badge can go back into the README now that the workflow exists.

*(To let Claude do the two items above: create a Cloudflare API token with **Account → Cloudflare Pages → Edit**, write it into `.env.txt` as `CF_API_TOKEN=` + `CF_ACCOUNT_ID=` - the file is gitignored, so the token never has to be pasted into chat - then ask Claude to call the REST API.)*

**3. The ON-DEPLOY test checklist** (things localhost cannot test, because the Circle SDK does not run there):
- [ ] Open `https://ezwallet.cash` → email login + **PIN** work normally on the new domain
- [ ] Send once + swap once (making sure the domain change did not break the money path)
- [ ] **Fix 07-31 - history:** a transaction the user accidentally sent to themselves must read **"Sent to yourself"** (NOT "Swapped … USDC to USDC"), the newest-to-oldest order is right, and it opens noticeably faster
- [ ] **Fix 07-31 - self-send guard:** pasting your own address → a red message and no way forward · scanning your own receive QR → a message and no way forward
- [ ] **Fix 07-31 - smoothness:** opening the Swap screen shows the balance **immediately** (no frozen `…`) · opening History a second time is instant (the memos are remembered)
- [ ] The link preview card: paste `ezwallet.cash` into Telegram to yourself → an image + a title must appear (X/Facebook cache the card, see section 5)
- [ ] The 6 UI fixes of 07-29: 3/4-width buttons (Swap · Tap-to-copy · Hold-to-show · Back on About/Currency/Security) · the ⇅ gradient button with a white icon · Scan QR has a row 1 title + a **Done** button · the Contacts Add button has no icon · QR Storage has the **Back | Add** pair
- [ ] ⚠️ A reminder: existing users on `ezwallet.pages.dev` arriving at the new domain will be **signed out with empty contacts** (localStorage is per origin). The wallet and the money are not lost. See the gotcha in section 7.
- [ ] ~~08-04 - the localised PIN screens~~ **NO LONGER APPLIES:** the Circle localisation was removed on 08-25 along with the i18n layer, and the PIN screens are back to Circle's English default.
- [ ] **🔴 08-06 - CONTACTS BACKUP AUTH.** The KV binding + the deploy + the server side are verified with a test key (section 9 item 2). What follows can **only be measured on a real device**, because it needs a PIN + Circle MPC signing:
  - [ ] Open the app → through PinGate → **the console must NOT contain `[sync] address recovered from signature does NOT match the open wallet`**. That line means Circle does NOT sign per EIP-191 as assumed → backup disables itself (the app still works, nothing breaks) but **report it immediately**, because the verification in `functions/api/sync.js` would have to change.
  - [ ] Device A adds a contact → device B (same email + PIN) opens the app → the contact appears, **with NO picture** (by design, avatars never reach the server).
  - [ ] Delete that contact on device B → reopen device A → it must **be gone there too** (last-write-wins; it coming back means the merge rule is broken).
  - [ ] Enter the WRONG PIN once then the right one → you still get into the app **and** backup still works (the nonce is not spent by a failed signature).
  - [ ] Sign out → `sessionStorage.ez_sync_token` must be gone; sign in with a different email → the previous account's contacts must **not** appear.
- [ ] ~~08-04b - the security question screens in Vietnamese~~ **NO LONGER APPLIES** (removed 08-25 with the i18n layer). The SDK lessons behind those fixes are kept in section 7.

**Completed in session 08-04:** Vietnamese `setLocalizations` was enabled for Circle's PIN/security screens (a new `src/circleLocalizations.js` wired into `circle.js`/`Login.jsx`) - reversing the 07-01 English-only decision after the docs confirmed the localisable scope was wider than believed (see the gotcha in section 7). The production build passed. **(All of this was removed on 08-25 - kept here as the record of why the decision flipped twice.)**
After testing for real, the user reported 2 bugs (with screenshots): the "Required" word running into the label, and the Security confirmation screen still showing 3 English lines. Both were fixed (see the gotcha in section 7) + `setCustomSecurityQuestions` had to be called as well (a separate method, not part of `setLocalizations`).
8 Vietnamese security questions were then written (`CIRCLE_SECURITY_QUESTIONS`) and wired through `setCustomSecurityQuestions({ questions })`. On retesting: `inputMatch` GENUINELY WORKED (the button lit up) ✅ - but `questions` EMPTIED the entire security-questions screen ❌ (blocking wallet creation) and dragged `securityConfirmItems` back to English. Removing `questions` while keeping `securityConfirmItems` and fixing the `securityIntros` concatenation, then redeploying → **STILL EXACTLY AS EMPTY** (the user: "still no security questions to fill in"). The conclusion at the time: it was not `questions` but the very act of calling `setCustomSecurityQuestions()` (see the gotcha in section 7). The method was **DISABLED in all 3 call sites** - the security-questions screen went back to Circle's English default.

Then the REAL root cause was found: **calling `setCustomSecurityQuestions` with the WRONG SIGNATURE** (positional arguments, not an object) - see the gotcha in section 7. With that fixed, both the question set and the 3 warning lines worked. That unlocked the multi-language work that followed - all of which was removed on 08-25.

---

### 👤 OWNERSHIP: ADDING LANGUAGES was assigned to **LongDC** (user decision 08-04) - ⚠️ ON HOLD SINCE 08-25

> 🔴 **SUPERSEDED 08-25:** the whole i18n layer was removed from the project (see section 2), so the process below no longer matches the code - `src/i18n.js`, `src/circleLocalizations.js`, `READY_LANGS` and `npm run check-lang` no longer exist. It is kept as the record of how it worked, and of the traps found along the way. Anyone bringing multi-language back should design it fresh and read this first.
>
> **What existed then:** `vi` (Vietnamese, the source language) and `en` were 100% complete and enabled. `zh` covered **35%** of the dictionary and had **no** Circle translation → it stayed locked.
>
> **The mandatory rules (settled by the user, non-negotiable):**
> - **"If it is Vietnamese, it is Vietnamese everywhere; if English, English everywhere"** - never let a user see a screen half in one language and half in another.
> - **"One language = one thorough build"** - finish the translation completely before enabling it, never enable it half-done.
>
> **The process for adding a language (e.g. `zh`):**
> 1. Extend the dictionary in `src/i18n.js` (`const ZH = {...}`). The keys were the original Vietnamese strings.
> 2. Add the Circle translation in `src/circleLocalizations.js`: all 3 constants `CIRCLE_LOCALIZATIONS`, `CIRCLE_SECURITY_QUESTIONS`, `CIRCLE_SECURITY_CONFIRM_ITEMS`. Skipping this leaves the app translated but the PIN screen English = a breach of the rule above.
> 3. Run **`npm run check-lang zh`** until it reported "ELIGIBLE".
> 4. ONLY THEN add `'zh'` to `READY_LANGS` (`src/i18n.js`). **Do not edit the `locked` flag in the Language screen** - it was derived from `READY_LANGS`.
> 5. Test on a **real deploy**, not localhost (the Circle SDK does not run on localhost).
>
> **4 traps that were hit, do not hit them again** (details in section 7) - these are CIRCLE SDK lessons and remain valid:
> - `setCustomSecurityQuestions` takes **positional arguments** `(questions, requiredCount, securityConfirmItems)` - calling it object-style leaves the security-questions screen COMPLETELY EMPTY, blocking wallet creation, **with no error reported**.
> - The SDK **concatenates directly**: `questionHeader` + `requiredMark` and `headline` + `headline2`, WITHOUT inserting a space → pad the space yourself (Chinese does not need it, as Han characters take no inter-word spaces).
> - `common.showPin`/`hidePin` are ignored by Circle (their bug, reported) - translating them has no effect, do not waste time digging.
> - Runtime error text inside the iframe **cannot be localised** (16 fields, none for errors). That is a real limitation.
>
> **Which branch:** everything was merged into `main` (08-04) and the `wip/circle-vi-localization` branch was deleted.
>
> **Rough edges in the Vietnamese:** the user reviewed the Vietnamese build and reported "plenty of rough edges" while accepting the merge. That cleanup was LongDC's - and it is moot now that Vietnamese is gone.

### 🌏 MULTI-LANGUAGE + VND CURRENCY - session 08-04 (⚠️ TURNED OFF 08-13, REMOVED 08-25, read section 2 first)

> 🔴 **WARNING: this section describes the state as of 08-04 and is NO LONGER TRUE.** On 08-13 the user turned Vietnamese and VND off, and on 08-25 the i18n layer was removed from the project altogether - see section 2. The section is kept as documentation for anyone rebuilding it.


> **MERGED into `main` 08-04** (commit `1c3a6c0`), the WIP branch deleted, running on `ezwallet.cash`.
> **The default was ENGLISH** - `detect()` no longer guessed from `navigator.language`, so a Vietnamese-configured device still opened in English. Vietnamese + VND sat in the Language & Currency screen for anyone who CHOSE them. The reason: the demo video + the intro deck are both in English, and the app had to match what people watch.
> ⚠️ **The Vietnamese + VND paths were never exercised on a real device** (the Circle SDK does not run on localhost). The risk was low because the default path was unchanged, but anyone enabling Vietnamese and hitting an error would have hit it on PRODUCTION.
> 💡 The env vars for preview deployments (any branch) already have `API_KEY`/`KIT_KEY` set through the Cloudflare API - a newly pushed branch gets a working preview with no extra configuration.

**THE RULES THE USER SETTLED 08-04 - permanent:**
> **"IF IT IS VIETNAMESE, IT IS VIETNAMESE EVERYWHERE; IF ENGLISH, ENGLISH EVERYWHERE"** - never let a user see a screen half in one language and half in another.
> **"ONE LANGUAGE = ONE THOROUGH BUILD"** - finish a language completely before enabling it, never half-done.

- **`READY_LANGS` (`src/i18n.js`) was the SINGLE source of truth** for both `detect()` and the locked/unlocked options on the Language screen. It held `['vi','en']`; `zh` was outside it because the dictionary covered 35% and there was no Circle translation. **The `locked` flag was never edited by hand** - it was derived from `READY_LANGS`.
- **The gatekeeper: `npm run check-lang`** (`scripts/check-lang.cjs`). It measured dictionary coverage + checked whether a Circle translation existed. **It had to reach 100% before a code could be added to `READY_LANGS`.** `en` was exempt from the Circle requirement (English is Circle's own default). Reading by eye MISSED things twice (the action cards on the 2 home screens, the "You pay/You receive" labels) → use a script, do not trust your eyes.
- **Circle errors come in 2 kinds** (documented in `circle.js`): errors drawn INSIDE the iframe (wrong PIN…) are English and CANNOT be changed; terminal errors that surface outside can be worded through `circleErrorMessage()`, mapped by NUMERIC CODE (never match English text - if Circle rewords it, matching goes silent).
- **An unfixed Circle bug:** `common.showPin`/`hidePin` are ignored by the iframe even though `common.continue` works (SDK 1.1.11, the latest). Reported to support.

**VND AS A CURRENCY (the user's decision: type VND directly and let the app convert to USDC):**
- Rates: `vnd` was added to the EXISTING CoinGecko call (`chain.js fetchPrices`) with **no extra request** - the free tier is strictly rate limited. A `VND_PER_USD_FALLBACK` covered a dead API. Stored as **"USD per 1 VND"** to match every other rate.
- **`CURRENCY_CFG` (`data.js`) is the single source of truth** for the symbol / its position / decimals / separators. **₫ goes AFTER the number** (`1.250.000 ₫`) while $ goes before → that is why `fmtDisplay()` exists and why `${symbol}${number}` must never be concatenated by hand (it is what forced 4 screens to be fixed).
- **⚠️ NEVER convert the rate A SECOND TIME:** `SendAmount` settles `tokenAmount` and passes it through `SendConfirm` → `SendReceipt`. Recomputing on a later screen means the number the user confirmed ≠ the number that actually leaves the wallet (rates refresh every 60s).
- Changing currency mid-entry on the Send screen **CLEARS what was typed** ("50" as dollars versus as dong differ by a factor of twenty thousand).
- The "fee too small" threshold must follow **each currency's decimals** (`decimalsOfCurrency`), never a hardcoded `0.01`: a 13 ₫ fee would print as "13,00 ₫", and Vietnamese money has no decimals.
- **2 DIFFERENT suggestion systems, do not merge them** (the user stressed this 08-04):
  - **Typing by hand** (`amountHint.js`, the Send screen): adds zeroes to what was typed - "50" → `5,000 · 50,000 · 500,000`. VND ONLY (typing "50" in USD already means 50 dollars, and suggesting ×100 would be a deadly trap).
  - **The slider** (`roundHint.js`, the Swap screen): rounds around the dragged value - 39,000 → `35,000 · 40,000 · 45,000`. The rounding unit **scales with the magnitude** (the old version pinned u=1, so dragging to 39,000 suggested "39,000.5" - broken). The trade-off the user accepted (option A): 24.4 now gives `20 · 25 · 30` instead of the 07-17e spec's `24 · 24.5 · 25`.
- **Auto font sizing:** `BalanceHeader` + `SendAmount` moved from `amountFontSize` (counting characters) to **`useFitFontSize`** (measuring real width on canvas) - VND numbers are twice as long as USD ones, so counting characters overflowed the layout.

**NEVER TESTED ON A REAL DEVICE** (the Circle SDK does not run on localhost): it would have needed a preview link - switch language, choose VND, type an amount on Send, and check the "Actually sent … USDC" line on Confirm + the Receipt.

**Left pending at the time:** (1) the message to Circle support, drafted but not sent; (2) merging that branch into `main` after testing; (3) Chinese - run `npm run check-lang zh` to 100% + add the Circle translation before adding `'zh'` to `READY_LANGS`. **(2) and (3) are moot since 08-25.**

**⚠️ THE MERGE CHECKLIST for that branch** - README/PITCH described `main` correctly at the time (English-only) but would have become wrong the moment it merged. It had to be updated AT THE SAME TIME as the merge, not before (a public README would otherwise advertise something not yet live). **The whole checklist is moot since 08-25: the app is English-only again, permanently, so the README statements below are true as written.**
- `README.md:183-184` - *"**English-only UI.** The Circle PIN screen is a cross-origin iframe that only renders in English, so the rest of the app is kept in English to match."* → it was to be DELETED on merge. **Since 08-25 the sentence is accurate again**, although the reasoning is now different: the app is English-only by decision, not because Circle forced it (Circle can be localised - see section 7).
- `README.md:101` - "Show balances in USDC or EURC" → VND was to be added. Moot.
- A "Full Vietnamese + VND display/entry" row was to be added to the README feature table. Moot.
- **PITCH.md was to be SKIPPED** (it also carried 4-5 "English-only" sentences): it was considered out of date, with the real introduction living in the video + the Canva deck. **Updated 08-25:** PITCH.md was rewritten in English and its facts refreshed, so it is usable again - but **the VIDEO and the DECK are still the things people actually watch**.

---

**Completed in session 08-03:** `6f6b2cb` **core value** - added the "0. Core value" section to this file plus its own section in `CLAUDE.md`/`README.md`/`PITCH.md` (the 3 English paragraphs the user settled), so that from then on every feature/decision has to answer "does this make crypto simpler for an everyday user?". It also caught and fixed the **GitHub repo description** accidentally using "your grandma" (breaking the Brand Voice rule locked in `CLAUDE.md`) → changed to the correct "my mom" slogan matching the core value. A grep confirmed the short slogan was already consistent in `package.json`/`index.html`/`SECURITY.md`/`DECK-DESIGN-SPEC.md`, so nothing else needed changing.

**Completed in sessions 07-29 → 07-31** (`git log` describes each one in full):
`81ee602` the 6 UI fixes the user reported · `c240911` `.row10-single` = 3/4 · `b181309` **PITCH.md** (the spec + messaging kit) · `9b183b2` audit + dead-code cleanup round 2 · `7f61888` the `ezwallet.cash` domain · `16dd010` the KV backup (OFF on production at the time) · `039faea` **professionalising the repo**: meta/OG + `public/og.png` + `SECURITY.md` + `package.json` metadata + the GitHub homepage · `ef7f7cc` **4 real bugs**: a self-send labelled as a Swap · wrong ArcScan pagination (10,000 rows/11.7s) · no sorting + duplicate React keys (rows could be dropped) · Swap not using the balance cache; **+ blocking self-sends** on all 3 entry paths · `b9a645e` memos: remembered permanently + at most 3 requests in flight (replacing the 30-at-once burst on every open). (From the other machine: `b8d5978` fixing QRs losing their decimals.)

---


> ✅ **07-18 the user CONFIRMED ON A DEPLOY: everything runs smoothly - the PIN (after making `getSDK` async) + a real-money swap both fine.** Nothing is blocked.

1. **The warning `!` icon looks smaller than other icons in the same slot** - the cause: the `!` glyph only occupies ~45/100 of the viewBox inside its circle. WAITING FOR THE USER TO CHOOSE: (a) scale it individually, (b) the user redraws it. The icons are the user's own set - ask first.
2. **A new QR Library icon** - the user will draw it (suggested: 2 stacked cards + a QR corner, viewBox 100, stroke 10). Once drawn, replace it in `HomeReceive`.
3. **Real transaction status** - poll the txHash after sending → "it is on the blockchain" (Swap already has the submitted/successful pair).
4. **Rebuild Google login** through Google Identity Services → routing into the email flow (an architecture change, its own session).
5. Batch sending to several people (Multicall3From, the encoder already exists).
7. ~~**REAL AUTH FOR THE KV BACKUP - THROUGH A PIN SIGNATURE**~~ ✅ **DONE 08-06** - details in section 3. The blocking question back then ("does `executeChallenge` return the signature?") was answered by reading the SDK types: **YES** - `node_modules/@circle-fin/w3s-pw-web-sdk/dist/src/types.d.ts:242` `SignMessageResult.data.signature`, with no extra endpoint needed. One difference from the old plan: `recoverMessageAddress` is used instead of `verifyMessage`, so the client never declares its own address. **WHAT REMAINS = testing on a deploy** (the section 3 checklist), because the Circle SDK does not run on localhost.
6. **Bundle optimisation:** the ~1MB SDK chunk is mostly crypto-browserify (the `crypto` polyfill in `vite.config.js`) - try removing `'crypto'` and see whether the SDK still runs, BUT it can only be tested on a deploy → give it its own session, do not bundle it with other work.
   - **DONE 07-22g (the user: "the app is not smooth yet"):** `App.jsx` PREFETCHES during `requestIdleCallback` - loading the frequently used screens in the background (HomeSend/Receive/Swap/Menu/SendAmount/Contacts/TxHistory) + the 1MB Circle SDK (skipped under MOCK) → switching tabs no longer flashes white, and the PIN step does not stall on a cold download. No logic changed (it only warms the cache; the dynamic import() still runs on real navigation). Measured bundles: `index`(SDK) 1026KB/gz281 · `chain`(viem) 270KB/gz83 · `QRScanner`(jsqr) 134KB - the latter two are correctly lazy. The smoothness has not been verified on a deploy (the mock does not load the SDK) - it needs measuring on a real device.

### Roadmap / future direction (brainstormed 07-24 - ⚠️ NOT settled, NOT started, notes only)

> The user raised the 4 directions below as a VISION, not a commitment. Do not build them on your own. The COMMON blocker for most of them: **how far Circle User-Controlled Wallets support native/biometric/EIP-712 - read the Circle docs and verify BEFORE building.**

1. **More Languages & Currencies (global users).** ⚠️ Updated 08-25: the i18n infrastructure NO LONGER EXISTS (it was removed with Vietnamese/Chinese - see section 2). Bringing this back means designing it again from scratch, plus real translations and rates for the new currencies (the base is USD).
2. **Privacy features (protecting the balance).** The idea: hide the balance (tap to reveal), a privacy mode. NEW, not designed.
3. **A native mobile app.** FaceID/fingerprint (instead of the PIN), real push notifications, Keychain/Keystore (safer token storage than localStorage), the App Store/Play Store. The approach that avoids a rewrite: wrap the existing React app with **Capacitor** + native plugins → reuse the code. ⚠️ Verify: (a) whether Circle's PIN iframe runs inside a Capacitor webview, (b) how Circle's native SDKs (iOS/Android) bind biometrics to a User-Controlled Wallet.
4. **In-app selective services (offering services to customers).** NOT a dApp browser open to every dApp (that contradicts "safe for older people" and is full of approvals and scams). Instead: wrap 1-2 SELECTED reputable DeFi/services into EZwallet's simple UI, hiding the complexity behind it. ⚠️ Verify: whether Circle can sign **EIP-712** + arbitrary transactions (only contractExecution + message signing are used today); it also needs mainnet + more chains (this is Arc Testnet). *(Promise no interest rates or specific products - design that separately when it is actually built.)*

> Considered and SET ASIDE: **a browser extension** - feasible, but desktop-only (against the mobile-first positioning for older users), plus the risk of the Circle SDK/PIN iframe clashing with Manifest V3's CSP, and the `chrome-extension://` origin possibly not being whitelisted by Circle. The PWA (already shipped) fits the target better.

---

## 10. Key lessons (distilled - the details are in git log)

- **A swap must go through `adapter.execute` with a signed intent** - unpacking the instructions and running them by hand LOSES MONEY (it happened).
- **Aggressive retries against a rate-limited RPC are self-destructive** - batch with Multicall + back off generously; when a number is not certain, show `…` and never draw 0.
- **Circle's iframe keeps the modal open when the user gets it wrong** - rejecting the promise early means the user enters it correctly and the result falls into the void.
- **A grid with no declared columns / a flex item without minWidth:0** = one long string wrecks the whole screen's layout.
- **A function named `poll…` with no `setInterval` is a lethal silence** (08-13): the money-received notification ran once on mount for weeks. Sending appeared instantly (it calls `addNotif` itself), so the bug hid well. **For an audience of older people, an app that goes silent on a money screen is a SERIOUS bug, not a small one.**
- **A rounding step tied to powers of 10 gives one tier per decade - far too coarse** (08-13): 9.99 stepped by 0.5 while 10.0 stepped by 5 → nudging by a cent changed the whole order of magnitude of the suggestions. It took 3 attempts to get right; see the `roundHint` part of section 3.
- **Changing code and forgetting the test disarms the test** (08-13): the 08-04 commit left `npm test` red for 9 days, and once you are used to red you stop seeing it. **Changing `roundHint.js` means changing its test IN THE SAME COMMIT.**
- **Measure before assigning blame** (08-13): three times in one session something looked like our bug and was not - (a) Vietnamese text losing its diacritics in Telegram = `curl` on Windows encoding it wrongly, while the server-generated labels were fine; (b) the Swap `No route` = Circle's side, with the 3 core files untouched for 8 days; (c) the hint block overflowing on a 360px Android = **it had already been overflowing before the change**, proven with `git stash`. **Always build an isolated measurement before fixing anything.**
- **Cloudflare Pages only applies environment variables to NEW deployments** (08-13) - after setting a variable, create a new deployment; the running build will not pick it up.
- **"Improvements" that are not verified step by step** (retries, catch-and-return-0) have caused regressions worse than the original bug - verify every UI change with the Playwright mock, and every swap change with eth_simulateV1.
