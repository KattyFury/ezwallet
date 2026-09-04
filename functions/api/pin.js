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
// `set`/`nonce`/`session` (changing the PIN itself) reuse sync.js's exact nonce → wallet-signature →
// session-token pattern, under a SEPARATE key prefix (`pinnonce:`/`pinsess:`) so the two features
// cannot collide. A wallet signature is required to set/change a PIN so a stranger cannot grief a
// real user's PIN into something the real user doesn't know (Privy's second signature still stops
// them stealing funds either way, but a locked-out legitimate user is still a real annoyance to avoid).
//
// KV: reuses ctx.env.EZ_SYNC (same binding sync.js/bug.js already use - no new binding to configure).
// WITHOUT PRIVY_AUTH_KEY/PRIVY_APP_SECRET/KV → 503, never a crash, same convention as every other
// endpoint in this directory.
// ══════════════════════════════════════════════════════════════════════════════
import { recoverMessageAddress } from 'viem';
import { generateAuthorizationSignature } from '@privy-io/node';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// Public, not a secret - it ships inside the JS bundle either way. Kept in step with src/privy.js's
// PRIVY_APP_ID by hand (both are the same one Privy app; no build-time sharing between src/ and
// functions/ exists in this project, see dev-server.js's own duplication of the swap-core pattern).
const PRIVY_APP_ID = 'cmtenk9en00250blabovll48e';

const NONCE_TTL = 300;      // same 5' as sync.js - long enough to type a PIN slowly
const SESSION_TTL = 86400;  // 24h server-side; client keeps it in sessionStorage so it dies with the tab

// 4 wrong attempts / 5 minutes, per EZWALLET-SIGNIN-DECISIONS.md - "không cần khoá cứng kiểu ATM vì
// 6 số đã đủ entropy".
const LOCK_MAX = 4;
const LOCK_WINDOW = 300;

// Work factor is stored PER-RECORD (not just here) specifically so it can be bumped later for new
// PINs without invalidating everyone's existing hash.
const PBKDF2_ITERATIONS = 100_000;

const messageFor = (nonce) => `Set EZwallet PIN. Nonce: ${nonce}`;

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

// SHA-256 hex, used to key the replay guard on the user's signature without storing the signature.
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return toHex(new Uint8Array(buf));
}

export async function onRequestPost(ctx) {
  const kv = ctx.env.EZ_SYNC;
  if (!kv) return json({ error: 'pin-disabled' }, 503);

  let body; try { body = await ctx.request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { action } = body;

  // ── 1. Issue a nonce (set/change PIN only) ──
  if (action === 'nonce') {
    const nonce = crypto.randomUUID();
    await kv.put(`pinnonce:${nonce}`, '1', { expirationTtl: NONCE_TTL });
    return json({ nonce, message: messageFor(nonce) });
  }

  // ── 2. Trade a wallet signature for a session token (set/change PIN only) ──
  if (action === 'session') {
    const { nonce, signature } = body;
    if (typeof nonce !== 'string' || typeof signature !== 'string') return json({ error: 'nonce + signature required' }, 400);
    const pending = await kv.get(`pinnonce:${nonce}`);
    if (!pending) return json({ error: 'bad-nonce' }, 401);
    await kv.delete(`pinnonce:${nonce}`);
    let addr;
    try { addr = await recoverMessageAddress({ message: messageFor(nonce), signature }); } catch { return json({ error: 'bad-signature' }, 401); }
    if (!addr) return json({ error: 'bad-signature' }, 401);
    // ⚠️ THE RECOVERED ADDRESS MUST BE A WALLET OF THIS PRIVY APP (2026-09-05).
    // Recovery proves the caller controls the key it signed with - which is sound, and is all SIWE
    // ever proves - but it says nothing about that wallet having anything to do with EZwallet. Any
    // stranger with any keypair could mint a session and, through `set`, write a permanent (no TTL,
    // because a PIN has to outlive a session) `pinhash:` record into the EZ_SYNC namespace this app
    // shares with the contacts backup and bug reports. Unbounded free writes into shared storage.
    // Requiring the address to be one of the app's own wallets closes it with a lookup we now do
    // anyway, and costs a real user nothing.
    if (!ctx.env.PRIVY_APP_SECRET) return json({ error: 'pin-signing-disabled' }, 503);
    if (!(await walletIdForAddress(ctx, addr))) return json({ error: 'not-an-app-wallet' }, 403);
    const token = crypto.randomUUID();
    await kv.put(`pinsess:${token}`, addr.toLowerCase(), { expirationTtl: SESSION_TTL });
    return json({ token, address: addr.toLowerCase() });
  }

  // ── 2b. Address → Privy wallet id, so the client can BUILD the request it is about to sign ──
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

  // ── 3. Set/overwrite the PIN, session token required ──
  if (action === 'set') {
    const { token, pin } = body;
    if (!/^\d{6}$/.test(pin || '')) return json({ error: 'pin-must-be-6-digits' }, 400);
    if (typeof token !== 'string' || !token) return json({ error: 'token required' }, 400);
    const addr = await kv.get(`pinsess:${token}`);
    if (!addr) return json({ error: 'bad-token' }, 401);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePinBits(pin, salt, PBKDF2_ITERATIONS);
    await kv.put(`pinhash:${addr}`, JSON.stringify({ v: 1, hash: toHex(hash), salt: toHex(salt), iterations: PBKDF2_ITERATIONS }));
    await kv.delete(`pinfail:${addr}`);   // a freshly-set PIN clears any old lockout
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

  // NOTE: an 'assign-owner' action lived here briefly (2026-09-04) to reassign an EXISTING wallet's
  // owner to the PIN quorum. Removed - Privy's client SDK refuses outright to sign any
  // ownership-changing request ("Wallet ownership updates are not supported"), a deliberate guardrail,
  // not something to build a workaround for. New wallets get owner_id set AT CREATION instead (server
  // API, no client signature needed for that) - see HANDOFF.md for the founder-wallet migration status.

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
