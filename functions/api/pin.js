// ══════════════════════════════════════════════════════════════════════════════
// MANDATORY PIN via Privy dual-approval (2026-09-04, user decision — EZWALLET-SIGNIN-DECISIONS.md)
//
// NOT THE OLD CIRCLE-ERA PIN. That one was a string compare with nothing behind it (Privy holds the
// wallet key, not this app) - bypassable from devtools, and removed 2026-08-30 for exactly that
// reason. THIS PIN is real: the wallet's key quorum requires TWO signatures to sign anything
// (authorization_threshold: 2) - the user's own embedded-wallet key, AND this server's "authorization
// key". A wrong PIN means this server refuses to produce its half, and Privy's own API rejects the
// transaction - there is no client-side gate to step around.
//
// THE FLOW (docs.privy.io/recipes/wallets/two-of-two-server-in-the-loop):
//   0. Client asks this server for its own wallet id (`wallet-id`), because the browser SDK cannot
//      produce one - see walletIdForAddress below for the proof and the history.
//   1. Client builds a `requestPayload` (the exact Privy wallet-RPC call it wants to make) and signs
//      it with the user's OWN key via `useAuthorizationSignature()` - this happens automatically
//      through Privy's existing MFA listener in App.jsx if passkey is on, untouched by this file.
//   2. Client POSTs { address, pin, requestPayload, userSignature } here.
//   3. THIS server checks the PIN (hash comparison, rate-limited), re-derives the wallet id FROM the
//      address it just checked the PIN against, and refuses if the client's signed URL names a
//      different wallet. Only then does it sign the SAME requestPayload with the authorization key
//      held in PRIVY_AUTH_KEY - producing the second, server-side signature.
//   4. This server calls Privy's REST API directly with BOTH signatures and relays the result.
//
// ⚠️ EVERY REQUEST IS SINGLE-USE. The user's signature covers the transfer with no expiry and no
// nonce of its own, so a captured pair would otherwise replay the same payment forever; its hash is
// recorded and re-presenting it is a 409. See the replay-guard note in the `sign` branch.
//
// `set` (changing the PIN itself) used to reuse sync.js's nonce → wallet-signature → session-token
// pattern - removed 2026-09-06 (PIN-FLOW-SPEC.md §3): it made Privy pop its own raw "Sign message"
// screen (showing the literal nonce) IN FRONT OF the actual PIN-entry sheet, ahead of the one thing
// the user came here to do. `set` now verifies the caller from a Privy IDENTITY TOKEN instead -
// every Privy account has exactly one embedded wallet, so the token (already issued at login,
// verified here against Privy's own JWKS, not merely decoded) proves who is asking just as securely,
// with no extra signature. See walletAddressFromIdentityToken below.
//
// KV: reuses ctx.env.EZ_SYNC (same binding sync.js/bug.js already use - no new binding to configure).
// WITHOUT PRIVY_AUTH_KEY/PRIVY_APP_SECRET/KV → 503, never a crash, same convention as every other
// endpoint in this directory.
// ══════════════════════════════════════════════════════════════════════════════
import { generateAuthorizationSignature, PrivyClient } from '@privy-io/node';
import { sendEmail } from './_email.js';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// Public, not a secret - it ships inside the JS bundle either way. Kept in step with src/privy.js's
// PRIVY_APP_ID by hand (both are the same one Privy app; no build-time sharing between src/ and
// functions/ exists in this project, see dev-server.js's own duplication of the swap-core pattern).
const PRIVY_APP_ID = 'cmtenk9en00250blabovll48e';

// The PUBLIC half of PRIVY_AUTH_KEY, in SPKI/DER base64. Public, not a secret - it is already
// registered on Privy's servers as a member of the PIN quorum and readable by anyone who can call
// `GET /v1/key_quorums/{id}` with the app secret. Hardcoded (read back from that same endpoint
// 2026-09-05) so `enable-pin` below never has to derive a public key from PRIVY_AUTH_KEY at request
// time - Web Crypto can import a PKCS8 private key but exporting its public half needs an extra
// non-extractable-key dance that buys nothing here.
const PRIVY_AUTH_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7nTz1TB+rDpYadopbda0PAP9uHnXId7SBe4DCuW8J8i63S1Btar4n0C1wrKK7SE/qqjKmnE8mq4nrvBeBvz3sw==';

// ⚠️ NO LONGER "the set/change-PIN session's lifetime" (that whole mechanism was removed 09-06, see
// PIN-FLOW-SPEC.md §3) - now only the TTL for `sign`'s replay-guard record (how long a used
// signature stays remembered). Kept the name and the 24h value rather than renaming/retuning it,
// since a used signature outliving one calendar day of reuse attempts is still the right window.
const SESSION_TTL = 86400;

// 4 wrong attempts / 5 minutes, per EZWALLET-SIGNIN-DECISIONS.md - "không cần khoá cứng kiểu ATM vì
// 6 số đã đủ entropy".
const LOCK_MAX = 4;
const LOCK_WINDOW = 300;

// PIN-FLOW-SPEC.md §4.2's 24h "Not me" window on a no-passkey PIN reset. Needed by `sign` (which
// runs earlier in the file than the forgot-pin actions that create these records) as well as by
// them, so it lives up here with the other top-level constants, not inline near its main use.
const RESET_LOCK_SECONDS = 24 * 3600;

// Work factor is stored PER-RECORD (not just here) specifically so it can be bumped later for new
// PINs without invalidating everyone's existing hash.
const PBKDF2_ITERATIONS = 100_000;

// ── PIN hashing - Web Crypto only (Cloudflare Workers has no native bcrypt) ──
async function derivePinBits(pin, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);
  return new Uint8Array(bits);
}
const toHex = (bytes) => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => { const b = new Uint8Array(hex.length / 2); for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16); return b; };

// A plain === on hashes is a timing side-channel (early-exit on first mismatched byte). This walks
// every byte regardless.
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Only a Privy wallet-RPC POST can come out of this signer - never an arbitrary URL. Without this, the
// endpoint would be an open proxy that signs+forwards whatever URL a caller supplies.
const WALLET_RPC_URL = /^https:\/\/api\.privy\.io\/v1\/wallets\/[a-zA-Z0-9]+\/rpc$/;

// ══ ADDRESS → PRIVY WALLET ID, RESOLVED ON THE SERVER (2026-09-05) ══
// This exists because the CLIENT CANNOT GET THE WALLET ID AT ALL. `Wallet.id` in the browser SDK is
// documented as "Null if the wallet is not delegated" (react-auth/dist/dts/types-Ck8tvlPZ.d.ts:1008)
// and this app never delegates - verified live: the account's wallets come back `delegated: false`.
// So the previous client-side `user.linkedAccounts[].id` lookup returned null for EVERY user and
// every PIN-gated Send/Swap threw `no-wallet-id`. The server, holding PRIVY_APP_SECRET, gets the id
// fine from the same account - confirmed against the real API, not assumed.
//
// It is ALSO the security fix: `sign` used to take the wallet id from the client (inside
// requestPayload.url) while checking the PIN against a SEPARATE client-supplied `address`, with
// nothing tying the two together. Anyone could register their own address + PIN and then ask for the
// server's quorum half aimed at SOMEONE ELSE'S wallet. Privy would still refuse the transfer (the
// victim's own signature is the other half), but the PIN would have been defeated in exactly the
// scenario it exists for: a stolen device where the wallet key is available and only the PIN is not.
// Now the id is derived FROM the address the PIN was checked against, and the client's URL has to
// match it.
async function walletIdForAddress(ctx, address) {
  const auth = `Basic ${btoa(`${PRIVY_APP_ID}:${ctx.env.PRIVY_APP_SECRET}`)}`;
  const res = await fetch(`https://api.privy.io/v1/wallets?address=${encodeURIComponent(address)}`, {
    headers: { Authorization: auth, 'privy-app-id': PRIVY_APP_ID },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  // Match the address again here rather than trusting the query filter: a future API change that
  // widened the filter must not silently hand back a different wallet's id.
  const hit = (data?.data || []).find(w => w?.address?.toLowerCase() === address.toLowerCase());
  return hit?.id || null;
}

// ══ IDENTITY TOKEN → WALLET ADDRESS (2026-09-06, PIN-FLOW-SPEC.md §3) ══
// Replaces the nonce → personal_sign → session-token proof that used to gate set/change-PIN. That
// proof made Privy pop its OWN raw "Sign message" confirmation screen (showing the literal nonce
// text) IN FRONT OF the actual PIN-entry sheet - a real signature over a string nobody reads, ahead
// of the one thing the user came here to do. The spec settles this: every Privy account has exactly
// one embedded wallet, so Privy's own identity token - already issued at login, already held by the
// client - proves who is asking just as securely, with no extra signature at all.
// `PrivyClient.users().get({ id_token })` VERIFIES the token cryptographically against Privy's own
// JWKS (it does not merely decode it - the SDK's own doc: "This verifies the token and parses the
// payload"), so a forged or expired token is rejected the same way a bad signature used to be.
// Returns { address, email } - `email` added 2026-09-06 (PIN-FLOW-SPEC.md §4) for the forgot-PIN
// flow's notification/cancel emails: the destination address is READ FROM THE VERIFIED TOKEN, never
// taken from the client, so a caller cannot redirect a security email to somewhere they control.
async function walletAddressFromIdentityToken(ctx, idToken) {
  if (!ctx.env.PRIVY_APP_SECRET) return null;
  const client = new PrivyClient({ appId: PRIVY_APP_ID, appSecret: ctx.env.PRIVY_APP_SECRET });
  let user;
  try { user = await client.users().get({ id_token: idToken }); } catch { return null; }
  const wallet = (user.linked_accounts || []).find(a => a.type === 'wallet' && a.chain_type === 'ethereum');
  if (!wallet?.address) return null;
  const email = (user.linked_accounts || []).find(a => a.type === 'email')?.address || null;
  return { address: wallet.address.toLowerCase(), email };
}

// SHA-256 hex, used to key the replay guard on the user's signature without storing the signature.
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return toHex(new Uint8Array(buf));
}

// ══ MAKING THE PIN LOAD-BEARING (2026-09-05) ══
// Everything above this line makes the PIN CHECK real - the server only produces its half of a
// signature when the PIN is right. But a check only matters if the WALLET actually demands both
// halves. Confirmed live against Privy's real API 09-05: every embedded wallet is owned, from
// creation, by Privy's own DEFAULT key quorum - `authorization_threshold: 1`, containing only that
// user. One signature (the user's alone) is already enough, so today the server's half is never
// actually required by Privy; the app choosing not to call sendTransaction() any more is a
// self-imposed rule, not something Privy enforces.
// `enable-pin` closes that gap FOR THE USER'S OWN QUORUM, in place - by raising ITS threshold to 2
// and adding the server's key. This is a QUORUM update, not a WALLET update: Privy's client SDK
// refuses wallet-OWNERSHIP changes outright (`owner_id` on a wallet), which is why reassigning a
// wallet to a DIFFERENT quorum was a dead end (see the removed 'assign-owner' note further down).
// Updating the quorum a wallet already points at never touches `owner_id` at all, so that guardrail
// does not apply - confirmed by reading the actual generateAuthorizationSignature implementation
// (@privy-io/js-sdk-core, function `N`): it canonicalizes whatever {method,url,body} it is given and
// signs it, with no inspection of the body's contents and no restriction to wallet-RPC URLs.
// ⚠️ NOT WIRED TO ANY BUTTON YET (2026-09-05) - see pinSigner.js's useEnableMandatoryPin and
// HANDOFF.md. This raises a real security bar on a real wallet; the first real click is deliberately
// left for the user to make themselves, not triggered by this session.
async function fetchOwnerQuorumId(ctx, address) {
  const auth = `Basic ${btoa(`${PRIVY_APP_ID}:${ctx.env.PRIVY_APP_SECRET}`)}`;
  const res = await fetch(`https://api.privy.io/v1/wallets?address=${encodeURIComponent(address)}`, {
    headers: { Authorization: auth, 'privy-app-id': PRIVY_APP_ID },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const hit = (data?.data || []).find(w => w?.address?.toLowerCase() === address.toLowerCase());
  return hit?.owner_id || null;
}

async function fetchQuorum(ctx, quorumId) {
  const auth = `Basic ${btoa(`${PRIVY_APP_ID}:${ctx.env.PRIVY_APP_SECRET}`)}`;
  const res = await fetch(`https://api.privy.io/v1/key_quorums/${quorumId}`, {
    headers: { Authorization: auth, 'privy-app-id': PRIVY_APP_ID },
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

// Builds the EXACT PATCH that raises `address`'s own quorum to require the PIN co-signer, from
// scratch, every time - never trusts a client-supplied copy of this payload (same principle as the
// wallet-id binding in `sign` above: the thing relayed to Privy is always re-derived server-side
// from data the server itself fetched, never taken on the client's word). Idempotent: if the quorum
// already has the server's key at threshold ≥ 2, there is nothing to sign or apply.
async function buildEnablePinPayload(ctx, address) {
  const quorumId = await fetchOwnerQuorumId(ctx, address);
  if (!quorumId) return { error: 'wallet-not-found' };
  const quorum = await fetchQuorum(ctx, quorumId);
  if (!quorum) return { error: 'quorum-not-found' };
  const hasServerKey = (quorum.authorization_keys || []).some(k => k.public_key === PRIVY_AUTH_PUBLIC_KEY);
  if (hasServerKey && (quorum.authorization_threshold || 0) >= 2) return { alreadyEnabled: true, quorumId };
  const publicKeys = hasServerKey
    ? (quorum.authorization_keys || []).map(k => k.public_key)
    : [...(quorum.authorization_keys || []).map(k => k.public_key), PRIVY_AUTH_PUBLIC_KEY];
  return {
    quorumId,
    payload: {
      version: 1,
      method: 'PATCH',
      url: `https://api.privy.io/v1/key_quorums/${quorumId}`,
      headers: { 'privy-app-id': PRIVY_APP_ID },
      // Keep the quorum's own membership (user_ids) untouched - this only ADDS the server as a
      // second required signer, it never changes WHO the wallet's owner is.
      body: { authorization_threshold: 2, user_ids: quorum.user_ids || [], public_keys: publicKeys },
    },
  };
}

export async function onRequestPost(ctx) {
  const kv = ctx.env.EZ_SYNC;
  if (!kv) return json({ error: 'pin-disabled' }, 503);

  let body; try { body = await ctx.request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { action } = body;

  // ⚠️ `nonce` / `session` REMOVED 2026-09-06 (PIN-FLOW-SPEC.md §3), along with the `pinnonce:` /
  // `pinsess:` KV keys they wrote - `set` below verifies the caller from a Privy identity token
  // instead of a wallet signature. See walletAddressFromIdentityToken's comment for the reasoning.

  // ── Address → Privy wallet id, so the client can BUILD the request it is about to sign ──
  // Needed because the browser SDK cannot supply it (see walletIdForAddress above). Deliberately
  // takes only an address and no token: a wallet id is an opaque handle, NOT a credential - it is
  // useless without BOTH authorization signatures, and the address it maps from is public on-chain
  // data anyway. Guarding it behind a session would cost every Send an extra wallet-signature prompt
  // (a passkey tap) to protect something that is not a secret.
  if (action === 'wallet-id') {
    if (!ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { address } = body;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) return json({ error: 'bad-address' }, 400);
    const walletId = await walletIdForAddress(ctx, address);
    if (!walletId) return json({ error: 'wallet-not-found' }, 404);
    return json({ walletId });
  }

  // ── Set/overwrite the PIN - identity token required, no wallet signature any more ──
  if (action === 'set') {
    if (!ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { idToken, pin } = body;
    if (!/^\d{6}$/.test(pin || '')) return json({ error: 'pin-must-be-6-digits' }, 400);
    if (typeof idToken !== 'string' || !idToken) return json({ error: 'id-token required' }, 400);
    const identity = await walletAddressFromIdentityToken(ctx, idToken);
    if (!identity) return json({ error: 'bad-identity-token' }, 401);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePinBits(pin, salt, PBKDF2_ITERATIONS);
    await kv.put(`pinhash:${identity.address}`, JSON.stringify({ v: 1, hash: toHex(hash), salt: toHex(salt), iterations: PBKDF2_ITERATIONS }));
    await kv.delete(`pinfail:${identity.address}`);   // a freshly-set PIN clears any old lockout
    return json({ ok: true });
  }

  // ── 4. Verify PIN + co-sign with the server's authorization key, relay to Privy ──
  if (action === 'sign') {
    if (!ctx.env.PRIVY_AUTH_KEY || !ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { address, pin, requestPayload, userSignature } = body;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) return json({ error: 'bad-address' }, 400);
    if (!/^\d{6}$/.test(pin || '')) return json({ error: 'pin-must-be-6-digits' }, 400);
    if (typeof userSignature !== 'string' || !userSignature) return json({ error: 'user-signature required' }, 400);
    if (!WALLET_RPC_URL.test(requestPayload?.url || '') || requestPayload?.method !== 'POST') {
      return json({ error: 'bad-request-payload' }, 400);
    }

    const addrKey = address.toLowerCase();

    // ── PENDING RESET (PIN-FLOW-SPEC.md §4.2) - checked FIRST, ahead of everything else ──
    // A no-passkey forgot-PIN request blocks EVERY send for 24h regardless of PIN correctness - the
    // whole point is that someone other than the account owner might know (or be guessing) the OLD
    // PIN during that window. There is no cron worker in this project, so the reset is applied
    // LAZILY here: if the window has already elapsed by the time anyone next tries to sign, this is
    // where the new hash actually gets written, before the sign attempt is evaluated against it.
    const resetRec = await kv.get(`pinreset:${addrKey}`);
    if (resetRec) {
      const reset = JSON.parse(resetRec);
      if (Date.now() < reset.expiresAt) return json({ error: 'pin-reset-pending', availableAt: reset.expiresAt }, 423);
      // The window has passed - apply it now, then fall through to the normal check using the PIN
      // the user just typed against the (now-current) new hash.
      await kv.put(`pinhash:${addrKey}`, JSON.stringify(reset.newHash));
      await kv.delete(`pinreset:${addrKey}`);
      await kv.delete(`pinfail:${addrKey}`);
    }

    // ── REPLAY GUARD ──
    // The user's signature covers the transfer and nothing else - no expiry, no nonce - so a captured
    // { requestPayload, userSignature } pair could be POSTed here again and again, and each replay
    // moved the money again. Privy has no idea it is a repeat; the payload is byte-identical and
    // legitimately signed. Recording the signature (hashed - there is no reason to store the real one)
    // makes it strictly single-use. The TTL matches the session lifetime: after 24h the user's own
    // signature is long stale and Privy's nonce handling refuses it anyway.
    // ⚠️ Do NOT move this check after the PIN check - a replayer already knows the PIN is right,
    // because they captured a request that succeeded.
    const sigKey = `usedsig:${await sha256Hex(userSignature)}`;
    if (await kv.get(sigKey)) return json({ error: 'replayed-request' }, 409);

    // ── LOCKOUT ──
    // ⚠️ HONEST LIMIT: Workers KV has no atomic increment, so N requests fired in parallel all read
    // the same counter and each sees "0 fails". `cacheTtl: 0` skips the edge cache and at least stops
    // a STALE read being served for up to a minute, but it does not make this atomic - only a Durable
    // Object would, and that is a binding this project does not have yet. What actually holds the
    // line meanwhile is PBKDF2 at 100k iterations (~100ms of CPU per guess, per request) plus the
    // 6-digit space; the counter is a speed bump, not the wall. Do not describe it as a hard lock.
    const failKey = `pinfail:${addrKey}`;
    const fails = parseInt((await kv.get(failKey, { cacheTtl: 0 })) || '0', 10);
    if (fails >= LOCK_MAX) return json({ error: 'pin-locked', retryAfterSec: LOCK_WINDOW }, 429);

    const rec = await kv.get(`pinhash:${addrKey}`);
    if (!rec) return json({ error: 'pin-not-set' }, 400);
    const { hash, salt, iterations } = JSON.parse(rec);
    const computed = await derivePinBits(pin, fromHex(salt), iterations);
    if (!constantTimeEqual(computed, fromHex(hash))) {
      await kv.put(failKey, String(fails + 1), { expirationTtl: LOCK_WINDOW });
      return json({ error: 'wrong-pin', attemptsLeft: Math.max(0, LOCK_MAX - fails - 1) }, 401);
    }
    await kv.delete(failKey);

    // ── THE PIN AND THE WALLET MUST BE THE SAME WALLET ──
    // The PIN was just checked against `addrKey`. Resolve THAT address to its Privy wallet id and
    // require the client's signed URL to name exactly it. Without this the two halves of the request
    // were unrelated: PIN for one address, signature aimed at another wallet's RPC endpoint.
    const walletId = await walletIdForAddress(ctx, addrKey);
    if (!walletId) return json({ error: 'wallet-not-found' }, 404);
    if (requestPayload.url !== `https://api.privy.io/v1/wallets/${walletId}/rpc`) {
      return json({ error: 'wallet-mismatch' }, 403);
    }

    // Burn the signature BEFORE relaying. If the relay then fails the user simply re-signs; the
    // alternative - recording it after a success - leaves a window where two concurrent replays both
    // pass the check and both spend.
    await kv.put(sigKey, '1', { expirationTtl: SESSION_TTL });

    let serverSignature;
    try {
      serverSignature = generateAuthorizationSignature({ authorizationPrivateKey: ctx.env.PRIVY_AUTH_KEY, input: requestPayload });
    } catch (e) {
      console.error('[pin] server signature failed:', e);
      return json({ error: 'sign-failed' }, 500);
    }

    let privyRes, data;
    try {
      privyRes = await fetch(requestPayload.url, {
        method: requestPayload.method,
        headers: {
          ...requestPayload.headers,
          // These 3 win over whatever the client sent (even though `useAuthorizationSignature` should
          // already build the same 'privy-app-id') - the server's own constant is the only value that
          // is actually TRUSTED here, same principle as sync.js never trusting a client-sent message.
          'privy-app-id': PRIVY_APP_ID,
          Authorization: `Basic ${btoa(`${PRIVY_APP_ID}:${ctx.env.PRIVY_APP_SECRET}`)}`,
          'Content-Type': 'application/json',
          'privy-authorization-signature': `${userSignature},${serverSignature}`,
        },
        body: JSON.stringify(requestPayload.body),
      });
      data = await privyRes.json().catch(() => ({}));
    } catch {
      return json({ error: 'privy-unreachable' }, 502);
    }
    if (!privyRes.ok) return json({ error: 'privy-failed', detail: data }, 502);
    return json({ hash: data?.data?.hash ?? data?.hash ?? null, raw: data });
  }

  // ══ FORGOT PIN (2026-09-06, PIN-FLOW-SPEC.md §4) - two branches, by whether a passkey exists ══
  // Both derive the address from a VERIFIED identity token, same trust model as `set` - a "forgot
  // PIN" request must never take an address the client merely claims, or a stranger could reset
  // anyone's PIN by naming their address.

  // ── §4.1 step 1: prove the passkey is being used RIGHT NOW ──
  // A `personal_sign` over a FIXED message, relayed through the exact same
  // generateAuthorizationSignature → server-cosign → Privy-relay pipeline `sign` already uses for
  // real sends - Privy's own SDK refuses to produce this signature unless MFA is satisfied, and
  // Privy's REST API independently verifies it belongs to the claimed wallet's registered key when
  // relayed. "Did Privy accept it" IS the proof; nothing is verified locally that could be spoofed.
  // The server ALWAYS produces its half for this one fixed message, unconditionally - no PIN check -
  // because the entire point of this branch is that the PIN is unknown.
  const FORGOT_PIN_PASSKEY_MESSAGE = 'Verify passkey to reset EZwallet PIN';
  if (action === 'forgot-pin-verify-passkey') {
    if (!ctx.env.PRIVY_AUTH_KEY || !ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { idToken, requestPayload, userSignature } = body;
    if (typeof idToken !== 'string' || !idToken) return json({ error: 'id-token required' }, 400);
    const identity = await walletAddressFromIdentityToken(ctx, idToken);
    if (!identity) return json({ error: 'bad-identity-token' }, 401);
    if (typeof userSignature !== 'string' || !userSignature) return json({ error: 'user-signature required' }, 400);
    if (!WALLET_RPC_URL.test(requestPayload?.url || '') || requestPayload?.method !== 'POST') {
      return json({ error: 'bad-request-payload' }, 400);
    }
    // Only this ONE fixed message can be relayed here - never an open signer for arbitrary content.
    if (requestPayload?.body?.method !== 'personal_sign' || requestPayload?.body?.params?.message !== FORGOT_PIN_PASSKEY_MESSAGE) {
      return json({ error: 'bad-request-payload' }, 400);
    }

    const sigKey = `usedsig:${await sha256Hex(userSignature)}`;
    if (await kv.get(sigKey)) return json({ error: 'replayed-request' }, 409);

    const walletId = await walletIdForAddress(ctx, identity.address);
    if (!walletId) return json({ error: 'wallet-not-found' }, 404);
    if (requestPayload.url !== `https://api.privy.io/v1/wallets/${walletId}/rpc`) {
      return json({ error: 'wallet-mismatch' }, 403);
    }

    await kv.put(sigKey, '1', { expirationTtl: SESSION_TTL });

    let serverSignature;
    try {
      serverSignature = generateAuthorizationSignature({ authorizationPrivateKey: ctx.env.PRIVY_AUTH_KEY, input: requestPayload });
    } catch (e) {
      console.error('[pin] server signature failed:', e);
      return json({ error: 'sign-failed' }, 500);
    }

    let privyRes, data;
    try {
      privyRes = await fetch(requestPayload.url, {
        method: requestPayload.method,
        headers: {
          ...requestPayload.headers,
          'privy-app-id': PRIVY_APP_ID,
          Authorization: `Basic ${btoa(`${PRIVY_APP_ID}:${ctx.env.PRIVY_APP_SECRET}`)}`,
          'Content-Type': 'application/json',
          'privy-authorization-signature': `${userSignature},${serverSignature}`,
        },
        body: JSON.stringify(requestPayload.body),
      });
      data = await privyRes.json().catch(() => ({}));
    } catch {
      return json({ error: 'privy-unreachable' }, 502);
    }
    if (!privyRes.ok) return json({ error: 'privy-failed', detail: data }, 502);

    // Privy accepted the signature - passkey re-auth is proven. Issue a SHORT-LIVED, single-use
    // token for the actual reset (forgot-pin-apply-passkey) rather than trusting the client to
    // remember "I proved it" - the token IS the proof, not a client-side flag.
    const proofToken = crypto.randomUUID();
    await kv.put(`pinproof:${proofToken}`, JSON.stringify({ address: identity.address, email: identity.email }), { expirationTtl: 300 });
    return json({ ok: true, proofToken });
  }

  // ── §4.1 step 2: spend the proof, set the new PIN immediately, no lock ──
  if (action === 'forgot-pin-apply-passkey') {
    const { proofToken, newPin } = body;
    if (!/^\d{6}$/.test(newPin || '')) return json({ error: 'pin-must-be-6-digits' }, 400);
    if (typeof proofToken !== 'string' || !proofToken) return json({ error: 'proof-token required' }, 400);
    const proofRec = await kv.get(`pinproof:${proofToken}`);
    if (!proofRec) return json({ error: 'bad-proof-token' }, 401);
    await kv.delete(`pinproof:${proofToken}`);   // single use
    const { address: addrKey, email } = JSON.parse(proofRec);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePinBits(newPin, salt, PBKDF2_ITERATIONS);
    await kv.put(`pinhash:${addrKey}`, JSON.stringify({ v: 1, hash: toHex(hash), salt: toHex(salt), iterations: PBKDF2_ITERATIONS }));
    await kv.delete(`pinfail:${addrKey}`);
    await kv.delete(`pinreset:${addrKey}`);   // clears any stale §4.2 pending request

    // Informational only, no action button - unlike §4.2's cancel email, there is nothing to undo:
    // by the time this sends, the new PIN is already live. A failed send must not undo it.
    if (email) {
      await sendEmail(ctx, {
        to: email, subject: 'Your EZwallet PIN was changed',
        text: 'Your EZwallet PIN was just changed using your passkey. If this was not you, your device or passkey may be compromised - review your account immediately.',
      });
    }
    return json({ ok: true });
  }

  // ── §4.2 step 1: no passkey - register a PENDING reset, cancellable by email for 24h ──
  // The new PIN is chosen NOW (not after the wait) and only takes EFFECT after 24h - see `sign`'s
  // own pending-reset check above/below for where it actually gets applied (lazily, on next use,
  // rather than needing a cron worker this project does not have).
  if (action === 'forgot-pin-start') {
    if (!ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { idToken, newPin } = body;
    if (!/^\d{6}$/.test(newPin || '')) return json({ error: 'pin-must-be-6-digits' }, 400);
    if (typeof idToken !== 'string' || !idToken) return json({ error: 'id-token required' }, 400);
    const identity = await walletAddressFromIdentityToken(ctx, idToken);
    if (!identity) return json({ error: 'bad-identity-token' }, 401);
    const addrKey = identity.address;

    const existing = await kv.get(`pinhash:${addrKey}`);
    if (!existing) return json({ error: 'pin-not-set' }, 400);   // nothing to "forget"

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const newHash = await derivePinBits(newPin, salt, PBKDF2_ITERATIONS);
    const cancelToken = crypto.randomUUID();
    const now = Date.now();
    const record = {
      newHash: { hash: toHex(newHash), salt: toHex(salt), iterations: PBKDF2_ITERATIONS },
      requestedAt: now, expiresAt: now + RESET_LOCK_SECONDS * 1000, cancelToken,
    };
    // TTL outlives the lock window by 1h so a check running right at the edge still finds the
    // record (to apply it) instead of it having already vanished from KV.
    await kv.put(`pinreset:${addrKey}`, JSON.stringify(record), { expirationTtl: RESET_LOCK_SECONDS + 3600 });
    await kv.put(`pinresettoken:${cancelToken}`, addrKey, { expirationTtl: RESET_LOCK_SECONDS + 3600 });

    // The origin is read from THIS REQUEST, not hardcoded - so a cancel link generated on a preview
    // deploy points back at that same preview, and one generated in production points at production.
    const origin = new URL(ctx.request.url).origin;
    const cancelUrl = `${origin}/cancel-pin-reset?token=${cancelToken}`;
    let emailSent = false;
    if (identity.email) {
      const mail = await sendEmail(ctx, {
        to: identity.email, subject: 'EZwallet PIN reset requested',
        html: `<p>A PIN reset was requested for your EZwallet account. It will take effect in 24 hours.</p><p>If this was not you, <a href="${cancelUrl}">click here to cancel it</a>.</p>`,
        text: `A PIN reset was requested for your EZwallet account. It will take effect in 24 hours.\n\nIf this was not you, cancel it here: ${cancelUrl}`,
      });
      emailSent = mail.ok;
    }
    return json({ ok: true, pendingUntil: record.expiresAt, emailSent });
  }

  // ── §4.2 step 2: the "Not me" link - PUBLIC, no auth. The token itself IS the credential, same as
  // any email unsubscribe/reset-cancel link; requiring login here would strand someone clicking it
  // from a different device or a signed-out browser, which is exactly when they need it to work. ──
  if (action === 'forgot-pin-cancel') {
    const { token } = body;
    if (typeof token !== 'string' || !token) return json({ error: 'token required' }, 400);
    const addrKey = await kv.get(`pinresettoken:${token}`);
    if (!addrKey) return json({ error: 'bad-or-expired-token' }, 404);
    await kv.delete(`pinresettoken:${token}`);
    await kv.delete(`pinreset:${addrKey}`);
    return json({ ok: true });
  }

  // NOTE: an 'assign-owner' action lived here briefly (2026-09-04) to reassign an EXISTING wallet's
  // owner to the PIN quorum. Removed - that reassigns `owner_id` (a WALLET update), which Privy's
  // client SDK refuses outright ("Wallet ownership updates are not supported"), a deliberate
  // guardrail. `enable-pin` below takes the different path this made necessary: it updates the
  // QUORUM the wallet already points at instead of repointing the wallet, which does not touch
  // `owner_id` and so does not hit that guardrail - see the long note above buildEnablePinPayload.

  // ── 5. Read-only: is this wallet's quorum already upgraded, and if not, what needs signing? ──
  // No PIN and no signature required to ASK this - it only reveals a payload; nothing changes until
  // that exact payload comes back signed through 'enable-pin-apply' below.
  if (action === 'enable-pin-plan') {
    if (!ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { address } = body;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) return json({ error: 'bad-address' }, 400);
    const result = await buildEnablePinPayload(ctx, address);
    if (result.error) return json(result, 404);
    return json(result);
  }

  // ── 6. Apply it: the wallet's own key (1 signature is enough - the current threshold is 1)
  //      authorizes raising its own quorum's threshold to 2. ──
  if (action === 'enable-pin-apply') {
    if (!ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    const { address, requestPayload, userSignature } = body;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address || '')) return json({ error: 'bad-address' }, 400);
    if (typeof userSignature !== 'string' || !userSignature) return json({ error: 'user-signature required' }, 400);

    // Re-derive the payload from scratch rather than trust the client's copy - if the two disagree,
    // either the quorum changed between plan and apply, or the client is trying to sign/relay
    // something other than what it was shown. Either way, refuse rather than guess which is right.
    const expected = await buildEnablePinPayload(ctx, address);
    if (expected.error) return json(expected, 404);
    if (expected.alreadyEnabled) return json({ ok: true, alreadyEnabled: true });
    if (JSON.stringify(requestPayload) !== JSON.stringify(expected.payload)) {
      return json({ error: 'payload-mismatch' }, 409);
    }

    const auth = `Basic ${btoa(`${PRIVY_APP_ID}:${ctx.env.PRIVY_APP_SECRET}`)}`;
    let res, data;
    try {
      res = await fetch(expected.payload.url, {
        method: 'PATCH',
        headers: {
          Authorization: auth,
          'privy-app-id': PRIVY_APP_ID,
          'Content-Type': 'application/json',
          'privy-authorization-signature': userSignature,
        },
        body: JSON.stringify(expected.payload.body),
      });
      data = await res.json().catch(() => ({}));
    } catch {
      return json({ error: 'privy-unreachable' }, 502);
    }
    if (!res.ok) return json({ error: 'privy-failed', detail: data }, 502);
    return json({ ok: true, quorum: data });
  }

  return json({ error: 'unknown action' }, 400);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
