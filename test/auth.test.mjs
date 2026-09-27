// Locks MAINNET-AUDIT.md C1: a Circle token is only minted for an email whose owner proved it with a code.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startChallenge, verifyChallenge, readToken, issueToken, newCode, normEmail, isEmail } from '../functions/api/_auth.js'

const SECRET = 'x'.repeat(40)
function fakeKV() {
  const m = new Map()
  return {
    async get(k, type) { const v = m.get(k); return v === undefined ? null : type === 'json' ? JSON.parse(v) : v },
    async put(k, v) { m.set(k, v) },
    async delete(k) { m.delete(k) },
  }
}

test('right code → token for THAT email only; one use', async () => {
  const kv = fakeKV(), email = 'alice@example.com'
  const s = await startChallenge({ kv, secret: SECRET, email, ip: '1.1.1.1' })
  assert.ok(s.ok && /^\d{6}$/.test(s.code))
  const v = await verifyChallenge({ kv, secret: SECRET, email, code: s.code })
  assert.ok(v.ok)
  assert.equal(await readToken(SECRET, v.authToken), email)
  const again = await verifyChallenge({ kv, secret: SECRET, email, code: s.code })
  assert.equal(again.ok, false)                    // consumed
})

test("a code for one email cannot unlock another", async () => {
  const kv = fakeKV()
  const s = await startChallenge({ kv, secret: SECRET, email: 'alice@example.com' })
  await startChallenge({ kv, secret: SECRET, email: 'bob@example.com' })
  const v = await verifyChallenge({ kv, secret: SECRET, email: 'bob@example.com', code: s.code })
  // the two codes could collide 1 in a million - accept only the case where they differ
  if (v.ok) assert.fail('alice\'s code unlocked bob (codes collided?)')
})

test('wrong codes: 5 tries then locked', async () => {
  const kv = fakeKV(), email = 'c@example.com'
  const s = await startChallenge({ kv, secret: SECRET, email })
  const wrong = s.code === '000000' ? '111111' : '000000'
  for (let i = 1; i <= 5; i++) {
    const r = await verifyChallenge({ kv, secret: SECRET, email, code: wrong })
    assert.equal(r.ok, false)
  }
  const r = await verifyChallenge({ kv, secret: SECRET, email, code: s.code })   // even the right code is refused now
  assert.equal(r.ok, false)
})

test('expired code is refused', async () => {
  const kv = fakeKV(), email = 'd@example.com', t0 = Date.now()
  const s = await startChallenge({ kv, secret: SECRET, email, now: t0 })
  const r = await verifyChallenge({ kv, secret: SECRET, email, code: s.code, now: t0 + 11 * 60e3 })
  assert.equal(r.ok, false)
})

test('rate limits: 45s gap, 5 per hour per email', async () => {
  const kv = fakeKV(), email = 'e@example.com', t0 = Date.now()
  assert.ok((await startChallenge({ kv, secret: SECRET, email, now: t0 })).ok)
  assert.equal((await startChallenge({ kv, secret: SECRET, email, now: t0 + 10e3 })).status, 429)
  for (let i = 1; i <= 4; i++) assert.ok((await startChallenge({ kv, secret: SECRET, email, now: t0 + i * 60e3 })).ok)
  assert.equal((await startChallenge({ kv, secret: SECRET, email, now: t0 + 5 * 60e3 })).status, 429)
  assert.ok((await startChallenge({ kv, secret: SECRET, email, now: t0 + 61 * 60e3 + 1 })).ok)   // an hour later
})

test('tokens: forged, tampered, expired, wrong secret → rejected', async () => {
  const t = await issueToken(SECRET, 'f@example.com')
  assert.equal(await readToken(SECRET, t), 'f@example.com')
  const [body, sig] = t.split('.')
  const forgedBody = Buffer.from(JSON.stringify({ e: 'victim@example.com', exp: 9999999999 })).toString('base64url')
  assert.equal(await readToken(SECRET, `${forgedBody}.${sig}`), null)
  assert.equal(await readToken(SECRET, `${body}.${sig.slice(0, -2)}AA`), null)
  assert.equal(await readToken('y'.repeat(40), t), null)
  assert.equal(await readToken(SECRET, await issueToken(SECRET, 'g@example.com', Date.now() - 31 * 86400e3)), null)
  assert.equal(await readToken(SECRET, 'garbage'), null)
  assert.equal(await readToken(SECRET, ''), null)
})

test('codes are 6 digits and vary', () => {
  const seen = new Set(Array.from({ length: 200 }, newCode))
  for (const c of seen) assert.match(c, /^\d{6}$/)
  assert.ok(seen.size > 190)
})

test('email normalisation + shape check', () => {
  assert.equal(normEmail('  Alice@Example.COM '), 'alice@example.com')
  assert.ok(isEmail('a@b.co'))
  for (const bad of ['', 'a', 'a@b', 'a b@c.com', '@b.com']) assert.ok(!isEmail(bad), bad)
})
