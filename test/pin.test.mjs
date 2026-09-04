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

// The two Privy endpoints the handler talks to. Only the addresses listed here are "wallets of this
// app", which is exactly what the not-an-app-wallet guard keys off.
const APP_WALLETS = {
  [me.address.toLowerCase()]: MY_WALLET_ID,
  [OTHER_ADDRESS.toLowerCase()]: OTHER_WALLET_ID,
}
function stubPrivy({ relayOk = true } = {}) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    const u = String(url)
    if (u.startsWith('https://api.privy.io/v1/wallets?address=')) {
      const addr = decodeURIComponent(u.split('address=')[1]).toLowerCase()
      const id = APP_WALLETS[addr]
      return new Response(JSON.stringify({ data: id ? [{ id, address: addr }] : [] }), { status: 200 })
    }
    if (/\/v1\/wallets\/[a-zA-Z0-9]+\/rpc$/.test(u)) {
      return relayOk
        ? new Response(JSON.stringify({ data: { hash: '0xfeed' } }), { status: 200 })
        : new Response(JSON.stringify({ error: 'nope' }), { status: 400 })
    }
    throw new Error('unexpected fetch: ' + u)
  }
  return calls
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
  const calls = stubPrivy()
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
