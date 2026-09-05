// Tests for /api/pin (mandatory PIN via Privy dual-approval) - calling the handler DIRECTLY, with a
// fake KV and a stubbed Privy API, in the same shape as sync.test.mjs and for the same reason: the
// real flow needs Privy, and Privy does not run on localhost.
//
// 📌 WHY THIS FILE EXISTS. The feature shipped on 2026-09-04 with no test, and a review on 09-05
// found nine defects in it. Six of them are pinned down here so they cannot come back:
//  · the wallet id must come from the SERVER - the browser SDK returns null for it (`Wallet.id` is
//    "Null if the wallet is not delegated" and this app never delegates), which made every
//    PIN-gated Send and Swap throw `no-wallet-id` before it ever reached the PIN sheet
//  · the PIN and the wallet being signed for must be THE SAME WALLET (they were unrelated inputs)
//  · a signed request is SINGLE USE (it could be replayed to repeat a payment forever)
//  · only a wallet belonging to this Privy app may open a session (any stranger's keypair could)
//  · a wrong PIN counts down and locks out
//  · a missing PRIVY_AUTH_KEY/APP_SECRET is a 503, never a crash
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { privateKeyToAccount } from 'viem/accounts'
import { onRequestPost } from '../functions/api/pin.js'

// Fixed test wallets - private keys that appear publicly in every viem/hardhat example, not secrets.
const me = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')
const stranger = privateKeyToAccount('0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba')

const MY_WALLET_ID = 'uihroi7x6jthz2f7bsvcdyzh'
const OTHER_WALLET_ID = 'iha9ln1q0etk016i7sqghrtx'   // a second real wallet on the same account
const OTHER_ADDRESS = '0xA6c573647012D5A6AAb32CdB9911C5aCc3398790'

// A THROWAWAY P-256 key generated for this file only - it signs nothing real and guards nothing.
// PKCS8/base64 specifically: @privy-io/node rejects the SEC1 form `openssl ecparam` emits by default.
const TEST_AUTH_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgfgXj1xgh1HkqnFEbADpOV3LTL+GByuq36Mq3mrX5toehRANCAAT5F6lC9/Pz0sk9/GQmJD81/xoK+ZGN63zoMhO2pA6kP694xW0Yr0GR9oiWRbJeUR1w8d2v34n8WNGqUsQ4bIvb'

// ⚠️ MUST MATCH functions/api/pin.js's PRIVY_AUTH_PUBLIC_KEY exactly - it is public (not a secret,
// see that file's comment), so duplicating it here to assert against is fine, but there is no import
// to keep the two in sync automatically: if that constant ever changes, this one has to as well.
const REAL_SERVER_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7nTz1TB+rDpYadopbda0PAP9uHnXId7SBe4DCuW8J8i63S1Btar4n0C1wrKK7SE/qqjKmnE8mq4nrvBeBvz3sw=='

function fakeKV(initial = {}) {
  const m = new Map(Object.entries(initial).map(([k, v]) => [k, { v, exp: 0 }]))
  return {
    store: m,
    get: async k => {
      const rec = m.get(k)
      if (!rec) return null
      if (rec.exp && Date.now() > rec.exp) { m.delete(k); return null }
      return rec.v
    },
    put: async (k, v, opts) => void m.set(k, { v, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0 }),
    delete: async k => void m.delete(k),
  }
}

// The Privy endpoints the handler talks to. Only the addresses listed here are "wallets of this
// app", which is exactly what the not-an-app-wallet guard keys off. Each wallet's `owner_id` points
// at its own default quorum in QUORUMS below - Privy's real shape, where every embedded wallet is
// owned by its own 1-of-1 quorum from creation.
const MY_QUORUM_ID = 'tzaph36-test'
const OTHER_QUORUM_ID = 'other-quorum-test'
const APP_WALLETS = {
  [me.address.toLowerCase()]: { id: MY_WALLET_ID, owner_id: MY_QUORUM_ID },
  [OTHER_ADDRESS.toLowerCase()]: { id: OTHER_WALLET_ID, owner_id: OTHER_QUORUM_ID },
}
// A THROWAWAY server public key, distinct from the real PRIVY_AUTH_PUBLIC_KEY hardcoded in pin.js -
// these tests exercise the enable-pin LOGIC (idempotence, payload binding, re-derivation) without
// ever depending on that real constant matching anything.
const SERVER_PUBLIC_KEY_STUB = 'stub-server-pubkey'

// Real Privy default: every embedded wallet's OWN quorum starts 1-of-1, containing only that user.
function freshQuorum(userId) {
  return { authorization_threshold: 1, authorization_keys: [], user_ids: [userId] }
}

function stubPrivy({ relayOk = true, quorums } = {}) {
  const calls = []
  const store = quorums || { [MY_QUORUM_ID]: freshQuorum('did:privy:me'), [OTHER_QUORUM_ID]: freshQuorum('did:privy:other') }
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const u = String(url)
    if (u.startsWith('https://api.privy.io/v1/wallets?address=')) {
      const addr = decodeURIComponent(u.split('address=')[1]).toLowerCase()
      const w = APP_WALLETS[addr]
      return new Response(JSON.stringify({ data: w ? [{ id: w.id, address: addr, owner_id: w.owner_id }] : [] }), { status: 200 })
    }
    if (/\/v1\/wallets\/[a-zA-Z0-9]+\/rpc$/.test(u)) {
      return relayOk
        ? new Response(JSON.stringify({ data: { hash: '0xfeed' } }), { status: 200 })
        : new Response(JSON.stringify({ error: 'nope' }), { status: 400 })
    }
    const quorumMatch = u.match(/\/v1\/key_quorums\/([^/]+)$/)
    if (quorumMatch && (!init || init.method === undefined || init.method === 'GET')) {
      const q = store[quorumMatch[1]]
      return q ? new Response(JSON.stringify({ id: quorumMatch[1], ...q }), { status: 200 }) : new Response('{}', { status: 404 })
    }
    if (quorumMatch && init?.method === 'PATCH') {
      if (!init.headers['privy-authorization-signature']) return new Response(JSON.stringify({ error: 'Missing privy-authorization-signature header' }), { status: 401 })
      const body = JSON.parse(init.body)
      store[quorumMatch[1]] = {
        authorization_threshold: body.authorization_threshold,
        authorization_keys: body.public_keys.map(pk => ({ public_key: pk, display_name: null })),
        user_ids: body.user_ids,
      }
      return new Response(JSON.stringify({ id: quorumMatch[1], ...store[quorumMatch[1]] }), { status: 200 })
    }
    throw new Error('unexpected fetch: ' + u)
  }
  return { calls, store }
}

const envWith = (kv = fakeKV(), extra = {}) => ({
  EZ_SYNC: kv,
  PRIVY_APP_SECRET: 'test-secret',
  PRIVY_AUTH_KEY: TEST_AUTH_KEY,
  ...extra,
})
const call = (env, body) => onRequestPost({ env, request: new Request('http://x/api/pin', { method: 'POST', body: JSON.stringify(body) }) })
const jsonOf = async res => ({ status: res.status, body: await res.json() })

const payloadFor = walletId => ({
  version: 1,
  method: 'POST',
  url: `https://api.privy.io/v1/wallets/${walletId}/rpc`,
  headers: { 'privy-app-id': 'test-app' },
  body: { caip2: 'eip155:1', method: 'eth_sendTransaction', chain_type: 'ethereum', params: { transaction: { to: OTHER_ADDRESS } } },
})

// nonce → wallet signature → session → set. The real setup path.
async function setPin(env, pin, account = me) {
  const { nonce, message } = await (await call(env, { action: 'nonce' })).json()
  const signature = await account.signMessage({ message })
  const sess = await (await call(env, { action: 'session', nonce, signature })).json()
  assert.ok(sess.token, 'session should open for an app wallet')
  const res = await call(env, { action: 'set', token: sess.token, pin })
  assert.equal(res.status, 200)
  return sess.token
}

test('REGRESSION: the wallet id comes from the server - the browser cannot supply it', async () => {
  stubPrivy()
  const { status, body } = await jsonOf(await call(envWith(), { action: 'wallet-id', address: me.address }))
  assert.equal(status, 200)
  assert.equal(body.walletId, MY_WALLET_ID)
})

test('wallet-id: an address this app does not own is a 404, not a guess', async () => {
  stubPrivy()
  const { status, body } = await jsonOf(await call(envWith(), { action: 'wallet-id', address: '0x000000000000000000000000000000000000dEaD' }))
  assert.equal(status, 404)
  assert.equal(body.error, 'wallet-not-found')
})

test('a stranger\'s keypair cannot open a session (no free writes into the shared KV)', async () => {
  stubPrivy()
  const env = envWith()
  const { nonce, message } = await (await call(env, { action: 'nonce' })).json()
  const signature = await stranger.signMessage({ message })   // a perfectly valid signature...
  const { status, body } = await jsonOf(await call(env, { action: 'session', nonce, signature }))
  assert.equal(status, 403, '...but not for a wallet of this app')
  assert.equal(body.error, 'not-an-app-wallet')
})

test('the happy path: right PIN → both signatures → Privy relays a hash', async () => {
  const { calls } = stubPrivy()
  const env = envWith()
  await setPin(env, '123456')
  const { status, body } = await jsonOf(await call(env, {
    action: 'sign', address: me.address, pin: '123456',
    requestPayload: payloadFor(MY_WALLET_ID), userSignature: 'usersig-1',
  }))
  assert.equal(status, 200)
  assert.equal(body.hash, '0xfeed')
  // BOTH signatures must reach Privy, user's first - one alone is not enough for a 2-of-2 quorum.
  const relay = calls.find(c => /\/rpc$/.test(c.url))
  assert.match(relay.init.headers['privy-authorization-signature'], /^usersig-1,/)
})

test('REGRESSION: a PIN for MY wallet cannot sign for SOMEONE ELSE\'S wallet', async () => {
  stubPrivy()
  const env = envWith()
  await setPin(env, '123456')
  // Correct PIN, correct address - but the signed request points at the other wallet's RPC URL.
  const { status, body } = await jsonOf(await call(env, {
    action: 'sign', address: me.address, pin: '123456',
    requestPayload: payloadFor(OTHER_WALLET_ID), userSignature: 'usersig-2',
  }))
  assert.equal(status, 403)
  assert.equal(body.error, 'wallet-mismatch')
})

test('REGRESSION: a signed request is SINGLE USE - replaying it cannot repeat the payment', async () => {
  stubPrivy()
  const env = envWith()
  await setPin(env, '123456')
  const req = { action: 'sign', address: me.address, pin: '123456', requestPayload: payloadFor(MY_WALLET_ID), userSignature: 'usersig-3' }
  assert.equal((await call(env, req)).status, 200)
  const { status, body } = await jsonOf(await call(env, req))
  assert.equal(status, 409)
  assert.equal(body.error, 'replayed-request')
})

test('a wrong PIN counts down, and the 5th try is locked out', async () => {
  stubPrivy()
  const env = envWith()
  await setPin(env, '123456')
  for (const expected of [3, 2, 1, 0]) {
    const { status, body } = await jsonOf(await call(env, {
      action: 'sign', address: me.address, pin: '000000',
      requestPayload: payloadFor(MY_WALLET_ID), userSignature: 'wrong-' + expected,
    }))
    assert.equal(status, 401)
    assert.equal(body.attemptsLeft, expected)
  }
  const locked = await jsonOf(await call(env, {
    action: 'sign', address: me.address, pin: '123456',   // even the RIGHT PIN is refused now
    requestPayload: payloadFor(MY_WALLET_ID), userSignature: 'after-lock',
  }))
  assert.equal(locked.status, 429)
  assert.equal(locked.body.error, 'pin-locked')
})

test('a wrong PIN never burns the signature - the user can retry the same transaction', async () => {
  stubPrivy()
  const env = envWith()
  await setPin(env, '123456')
  const payload = payloadFor(MY_WALLET_ID)
  assert.equal((await call(env, { action: 'sign', address: me.address, pin: '000000', requestPayload: payload, userSignature: 'retry-sig' })).status, 401)
  // Same signature, right PIN this time: it must still go through, or a typo would cost the user a
  // fresh passkey prompt every time.
  assert.equal((await call(env, { action: 'sign', address: me.address, pin: '123456', requestPayload: payload, userSignature: 'retry-sig' })).status, 200)
})

test('no server keys configured → 503, never a crash', async () => {
  stubPrivy()
  const env = { EZ_SYNC: fakeKV() }
  assert.equal((await call(env, { action: 'sign', address: me.address, pin: '123456', requestPayload: payloadFor(MY_WALLET_ID), userSignature: 's' })).status, 503)
  assert.equal((await call({}, { action: 'nonce' })).status, 503)
})

test('an arbitrary URL cannot be smuggled through the signer', async () => {
  stubPrivy()
  const env = envWith()
  await setPin(env, '123456')
  const evil = { ...payloadFor(MY_WALLET_ID), url: 'https://evil.example/steal' }
  const { status, body } = await jsonOf(await call(env, { action: 'sign', address: me.address, pin: '123456', requestPayload: evil, userSignature: 'evil-sig' }))
  assert.equal(status, 400)
  assert.equal(body.error, 'bad-request-payload')
})

// ══ enable-pin: making the PIN LOAD-BEARING by raising the wallet's own quorum to 2-of-2 ══
// Added 2026-09-05 alongside the feature itself. Not wired to any button yet (see HANDOFF.md) - these
// tests exercise the SERVER LOGIC against a stubbed Privy, independent of whether the client SDK will
// actually sign a key-quorum PATCH in a real browser, which is a separate, still-open question.

test('enable-pin-plan: a fresh 1-of-1 quorum needs the real server key added, threshold 2', async () => {
  stubPrivy()
  const { status, body } = await jsonOf(await call(envWith(), { action: 'enable-pin-plan', address: me.address }))
  assert.equal(status, 200)
  assert.equal(body.alreadyEnabled, undefined)
  assert.equal(body.payload.method, 'PATCH')
  assert.equal(body.payload.url, 'https://api.privy.io/v1/key_quorums/tzaph36-test')
  assert.equal(body.payload.body.authorization_threshold, 2)
  assert.deepEqual(body.payload.body.public_keys, [REAL_SERVER_PUBLIC_KEY])
  assert.deepEqual(body.payload.body.user_ids, ['did:privy:me'], 'existing membership must be preserved, not replaced')
})

test('enable-pin-plan: an address this app does not own is a 404', async () => {
  stubPrivy()
  const { status, body } = await jsonOf(await call(envWith(), { action: 'enable-pin-plan', address: '0x000000000000000000000000000000000000dEaD' }))
  assert.equal(status, 404)
  assert.equal(body.error, 'wallet-not-found')
})

test('REGRESSION: enable-pin-apply refuses a payload that does not match what the server would build', async () => {
  stubPrivy()
  const env = envWith()
  const { body: plan } = await jsonOf(await call(env, { action: 'enable-pin-plan', address: me.address }))
  const tampered = { ...plan.payload, body: { ...plan.payload.body, authorization_threshold: 1 } }   // "upgrade" to nothing
  const { status, body } = await jsonOf(await call(env, { action: 'enable-pin-apply', address: me.address, requestPayload: tampered, userSignature: 'sig' }))
  assert.equal(status, 409)
  assert.equal(body.error, 'payload-mismatch')
})

test('enable-pin-apply: the happy path actually raises the quorum, with the real signature reaching Privy', async () => {
  const { calls, store } = stubPrivy()
  const env = envWith()
  const { body: plan } = await jsonOf(await call(env, { action: 'enable-pin-plan', address: me.address }))
  const { status, body } = await jsonOf(await call(env, { action: 'enable-pin-apply', address: me.address, requestPayload: plan.payload, userSignature: 'founder-sig' }))
  assert.equal(status, 200)
  assert.equal(body.ok, true)
  assert.equal(store['tzaph36-test'].authorization_threshold, 2, 'the stubbed Privy quorum store must actually be updated')
  const patch = calls.find(c => c.init?.method === 'PATCH')
  assert.equal(patch.init.headers['privy-authorization-signature'], 'founder-sig')
})

test('enable-pin-apply: no signature on the PATCH is a 401 from Privy, relayed as privy-failed', async () => {
  stubPrivy()
  const env = envWith()
  const { body: plan } = await jsonOf(await call(env, { action: 'enable-pin-plan', address: me.address }))
  const { status, body } = await jsonOf(await call(env, { action: 'enable-pin-apply', address: me.address, requestPayload: plan.payload, userSignature: '' }))
  assert.equal(status, 400, 'the server itself rejects an empty signature before ever calling Privy')
  assert.equal(body.error, 'user-signature required')
})

test('enable-pin-plan: an already-upgraded quorum (server key + threshold 2) is idempotent', async () => {
  const already = {
    'tzaph36-test': { authorization_threshold: 2, authorization_keys: [{ public_key: REAL_SERVER_PUBLIC_KEY, display_name: null }], user_ids: ['did:privy:me'] },
  }
  stubPrivy({ quorums: already })
  const { status, body } = await jsonOf(await call(envWith(), { action: 'enable-pin-plan', address: me.address }))
  assert.equal(status, 200)
  assert.equal(body.alreadyEnabled, true)
})

test('REGRESSION: enable-pin never touches the wallet\'s owner_id - only the quorum it already points at', async () => {
  stubPrivy()
  const { body: plan } = await jsonOf(await call(envWith(), { action: 'enable-pin-plan', address: me.address }))
  assert.ok(!('owner_id' in plan.payload.body), 'this must be a QUORUM update, never a WALLET-ownership update')
  assert.match(plan.payload.url, /\/v1\/key_quorums\//, 'not /v1/wallets/ - a wallet update is what Privy\'s client SDK refuses outright')
})
