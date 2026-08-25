// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS + QR LIBRARY BACKUP to Cloudflare KV (2026-07-29, user decision "do it with KV for now")
//
// WHY IT IS NEEDED: `ez_contacts`/`ez_saved_qrs` live only in localStorage → lost on a new machine,
// a different browser, clearing site data, or a DOMAIN CHANGE (which just happened moving to ezwallet.cash), and
// Safari clears localStorage after 7 days without interaction (a PWA added to the home screen is exempt).
// The wallet and the money are NOT involved (they live at Circle + on-chain) - this is only the address book.
//
// ══ AUTH = PIN SIGNATURE (2026-08-06) - the 07-29 technical debt is PAID OFF ══
// THE OLD VERSION used Circle's `userToken` as the door, and `/api/session` issues a userToken KNOWING ONLY
// THE EMAIL → anyone who knows a user's email could read/write their address book. That is why this
// feature was left OFF the whole time (no KV binding created), not because anyone forgot to enable it.
//
// THIS VERSION drops userToken entirely. The door is a SIGNATURE from the wallet itself:
//   1. `nonce`   → the server issues a single-use nonce (TTL 5') + the sentence to sign.
//   2. PinGate   → the user enters their PIN and Circle MPC signs that sentence (EIP-191, no gas, never on chain).
//                  This is the PIN the user HAS TO enter to open the app anyway → NO extra step for them.
//   3. `session` → the server recovers the address FROM THE SIGNATURE (viem), burns the nonce, issues a session token (TTL 24h).
//   4. pull/push → carry the session token. The KV key is still the WALLET ADDRESS, so the schema is UNCHANGED and
//                  data backed up by the old version reads back intact.
// Knowing the email is now USELESS: no PIN means Circle does not sign, and no signature means no address.
// The address is no longer obtained through Circle either - it falls out of the signature, and nobody can declare it for you.
//
// KEPT FROM v1 (still needed):
//  1. FIELD WHITELIST: only id/name/address (contacts) + id/amount/currency/name/createdAt
//     (QRs) are written. AVATAR IMAGES NEVER GO TO THE SERVER (real photos of family members = the heaviest
//     PII there is, and also the heaviest payload) - avatars stay on the device.
//  2. Junk guard: a limit of 128KB per account + 500 contacts + 200 QRs.
//
// WITH NO KV BINDING the endpoint returns 503 `sync-disabled` and the client silently skips →
// the app behaves exactly as before, with NO error. To create the binding: Cloudflare → Workers & Pages → ezwallet →
// Settings → Bindings → KV namespace, Variable name = `EZ_SYNC`, THEN REDEPLOY
// (Pages only applies bindings to NEW deployments).
// ══════════════════════════════════════════════════════════════════════════════
import { recoverMessageAddress } from 'viem';

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

// 128KB is the LAST-RESORT CAP, not a number anyone normally approaches: 500 contacts + 200 "clean" QRs is only ~95KB.
// It exists because `id` is kept exactly as the client sent it (no type constraint) - stuffing a long string into
// `id` is the only way to bloat KV. There are tests locking down both directions: test/sync.test.mjs.
const MAX_BYTES = 128 * 1024;
const MAX_CONTACTS = 500;
const MAX_QRS = 200;

// The nonce lives 5' (long enough for an older person typing a PIN slowly, short enough to keep the replay window narrow).
// The session token lives 24h on the server, but the client keeps it in sessionStorage, so in practice it dies
// with the app session - reopening the app goes through PinGate, signs again, and gets a new token.
const NONCE_TTL = 300;
const SESSION_TTL = 86400;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

// The sentence to be signed. ALWAYS rebuilt on the server from the nonce - NEVER accept a message string sent by the client
// (accepting the client's string would allow pre-signing a different sentence and replaying it here).
// The wording "Unlock EZwallet" is kept because that is genuinely the PIN unlocking the app.
const messageFor = (nonce) => `Unlock EZwallet. Nonce: ${nonce}`;

// Keep ONLY the necessary fields - stopping any client (including a future version) from pushing avatars or unknown fields into KV.
function clean(payload) {
  const contacts = (Array.isArray(payload?.contacts) ? payload.contacts : [])
    .slice(0, MAX_CONTACTS)
    .filter(c => typeof c?.address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(c.address.trim()))
    .map(c => ({ id: c.id, name: String(c.name || '').slice(0, 60), address: c.address.trim() }));
  const savedQrs = (Array.isArray(payload?.savedQrs) ? payload.savedQrs : [])
    .slice(0, MAX_QRS)
    .map(q => ({
      id: q.id,
      amount: Number(q.amount) || 0,
      currency: String(q.currency || 'USD').slice(0, 8),
      name: String(q.name || '').slice(0, 60),
      createdAt: q.createdAt,
    }));
  return { v: 1, updatedAt: Number(payload?.updatedAt) || Date.now(), contacts, savedQrs };
}

export async function onRequestPost(ctx) {
  const kv = ctx.env.EZ_SYNC;
  if (!kv) return json({ error: 'sync-disabled' }, 503);   // no KV binding yet → the app skips this, no error

  let body; try { body = await ctx.request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const { action } = body;

  // ── 1. Issue a nonce ───────────────────────────────────────────────────────
  // No auth needed: a nonce alone is worthless, it takes a wallet signature to turn it into a token.
  if (action === 'nonce') {
    const nonce = crypto.randomUUID();
    await kv.put(`nonce:${nonce}`, '1', { expirationTtl: NONCE_TTL });
    return json({ nonce, message: messageFor(nonce) });
  }

  // ── 2. Trade a signature for a session token ───────────────────────────────
  if (action === 'session') {
    const { nonce, signature } = body;
    if (typeof nonce !== 'string' || typeof signature !== 'string') return json({ error: 'nonce + signature required' }, 400);

    // The nonce must have been issued by THIS server and not yet spent. It is deleted as soon as it is spent → an old captured
    // signature cannot be used a second time.
    const pending = await kv.get(`nonce:${nonce}`);
    if (!pending) return json({ error: 'bad-nonce' }, 401);
    await kv.delete(`nonce:${nonce}`);

    let addr;
    try {
      addr = await recoverMessageAddress({ message: messageFor(nonce), signature });
    } catch {
      return json({ error: 'bad-signature' }, 401);
    }
    if (!addr) return json({ error: 'bad-signature' }, 401);

    const token = crypto.randomUUID();
    await kv.put(`sess:${token}`, addr.toLowerCase(), { expirationTtl: SESSION_TTL });
    // The recovered address is returned too (it is the CALLER's own wallet, not a secret) so the client can compare it
    // with `ez_wallet_addr`. A mismatch means Circle's signing convention differs from the EIP-191 assumption here
    // → the client throws the token away and backup stays idle. Better OFF than writing data under the wrong key.
    return json({ token, address: addr.toLowerCase(), expiresIn: SESSION_TTL });
  }

  // ── 3. Read/write, session token required ──────────────────────────────────
  const { token } = body;
  if (typeof token !== 'string' || !token) return json({ error: 'token required' }, 400);
  const addr = await kv.get(`sess:${token}`);
  if (!addr) return json({ error: 'bad-token' }, 401);   // wrong token or expired session → the client signs again
  const key = `bak:${addr}`;

  if (action === 'pull') {
    const raw = await kv.get(key);
    return json({ data: raw ? JSON.parse(raw) : null });
  }

  if (action === 'push') {
    const doc = clean(body.payload);
    const text = JSON.stringify(doc);
    if (text.length > MAX_BYTES) return json({ error: 'payload too large' }, 413);
    await kv.put(key, text);
    return json({ ok: true, updatedAt: doc.updatedAt, contacts: doc.contacts.length, savedQrs: doc.savedQrs.length });
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
