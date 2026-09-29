// The admin's second lock (admin/functions/_access.js): only a correctly signed Access ticket for ADMIN_EMAIL passes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyAccessJwt, _resetCertsCache } from '../admin/functions/_access.js'

const DOMAIN = 'team.cloudflareaccess.com', AUD = 'aud-tag-123', ADMIN = 'owner@example.com'
const ENV = { ACCESS_TEAM_DOMAIN: DOMAIN, ACCESS_AUD: AUD, ADMIN_EMAIL: ADMIN }

const b64url = bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const enc = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)))

async function makeKey(kid) {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid }
  return { pair, jwk, kid }
}
async function sign(k, claims, header = {}) {
  const h = enc({ alg: 'RS256', kid: k.kid, ...header }), p = enc(claims)
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k.pair.privateKey, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`
}
const certsFetch = keys => async url => {
  assert.equal(url, `https://${DOMAIN}/cdn-cgi/access/certs`)
  return { ok: true, json: async () => ({ keys }) }
}
const nowS = () => Math.floor(Date.now() / 1000)
const good = over => ({ aud: [AUD], iss: `https://${DOMAIN}`, exp: nowS() + 600, email: ADMIN, ...over })

test('valid ticket passes', async () => {
  _resetCertsCache(); const k = await makeKey('k1')
  const r = await verifyAccessJwt(await sign(k, good({ email: 'Owner@Example.com' })), ENV, { fetchImpl: certsFetch([k.jwk]) })
  assert.equal(r.email, ADMIN)
})

test('rejections', async () => {
  const k = await makeKey('k1'), other = await makeKey('k1')
  const cases = [
    ['missing config', await sign(k, good()), {}],
    ['no token', null, ENV],
    ['wrong email', await sign(k, good({ email: 'someone@else.com' })), ENV],
    ['wrong audience', await sign(k, good({ aud: ['other'] })), ENV],
    ['wrong issuer', await sign(k, good({ iss: 'https://evil.cloudflareaccess.com' })), ENV],
    ['expired', await sign(k, good({ exp: nowS() - 1 })), ENV],
    ['signed by another key', await sign(other, good()), ENV],
    ['alg none', (await sign(k, good(), { alg: 'none' })), ENV],
    ['unknown kid', await sign({ ...k, kid: 'zzz' }, good()), ENV],
    ['garbage', 'a.b', ENV],
  ]
  for (const [name, token, env] of cases) {
    _resetCertsCache()
    await assert.rejects(verifyAccessJwt(token, env, { fetchImpl: certsFetch([k.jwk]) }), undefined, name)
  }
})

test('tampered payload fails signature', async () => {
  _resetCertsCache(); const k = await makeKey('k1')
  const [h, , s] = (await sign(k, good({ email: 'someone@else.com' }))).split('.')
  await assert.rejects(verifyAccessJwt(`${h}.${enc(good())}.${s}`, ENV, { fetchImpl: certsFetch([k.jwk]) }), /bad signature/)
})
