// Test /api/sync (sao lưu danh bạ + kho QR lên KV) — gọi THẲNG handler, KV giả.
// Vì sao phải test kiểu này: luồng sync cần chữ ký PIN thật của Circle, mà Circle SDK không chạy
// localhost → không thử được qua app ở máy. Ở đây ký bằng khoá riêng của viem: cùng chuẩn EIP-191
// mà Circle dùng, nên phần server verify là ĐÚNG CÁI chạy trên production.
//
// Các bất biến bị khoá ở đây:
//  · identity = ĐỊA CHỈ RECOVER TỪ CHỮ KÝ (không tin client, không hỏi Circle, không cần email)
//  · nonce dùng MỘT LẦN (chặn replay)
//  · biết email KHÔNG còn mở được sổ danh bạ — server không gọi Circle nữa
//  · avatar KHÔNG bao giờ lên server
//  · chưa có KV binding thì trả 503 và app chạy như cũ
//  · dữ liệu sao lưu bằng bản CŨ (khoá `bak:<addr>`) vẫn đọc lại được
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { privateKeyToAccount } from 'viem/accounts'
import { onRequestPost } from '../functions/api/sync.js'

// 2 ví test cố định (khoá riêng công khai trong mọi ví dụ của viem/hardhat — không phải secret).
const me = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')
const attacker = privateKeyToAccount('0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba')
const OTHER = '0x1111111111111111111111111111111111111111'

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

const call = (env, body) => onRequestPost({ env, request: new Request('http://x/api/sync', { method: 'POST', body: JSON.stringify(body) }) })

// Mở phiên đúng cách: xin nonce → ký → đổi lấy token. Đây là luồng PinGate chạy thật.
async function openSession(env, account = me) {
  const { nonce, message } = await (await call(env, { action: 'nonce' })).json()
  const signature = await account.signMessage({ message })
  const res = await call(env, { action: 'session', nonce, signature })
  return { res, token: (await res.clone().json()).token, nonce, signature, message }
}

const envWithKV = (initial) => ({ EZ_SYNC: fakeKV(initial) })

test('chưa tạo KV binding → 503 sync-disabled (app phải chạy như cũ)', async () => {
  const res = await call({}, { action: 'nonce' })
  assert.equal(res.status, 503)
  assert.equal((await res.json()).error, 'sync-disabled')
})

test('nonce → session: khoá KV = địa chỉ RECOVER TỪ CHỮ KÝ', async () => {
  const env = envWithKV()
  const { token } = await openSession(env)
  assert.ok(token)

  await call(env, { action: 'push', token, payload: { updatedAt: 1234, contacts: [{ id: 1, name: 'Grandma', address: OTHER }] } })
  assert.ok(env.EZ_SYNC.store.has(`bak:${me.address.toLowerCase()}`), 'khoá phải là địa chỉ của ví đã ký')

  const got = (await (await call(env, { action: 'pull', token })).json()).data
  assert.equal(got.updatedAt, 1234)
  assert.deepEqual(got.contacts, [{ id: 1, name: 'Grandma', address: OTHER }])
})

test('session trả kèm địa chỉ để client tự đối chiếu với ví đang mở', async () => {
  const env = envWithKV()
  const { res } = await openSession(env)
  const body = await res.json()
  assert.equal(body.address, me.address.toLowerCase())
})

test('REPLAY: nonce đã tiêu thì dùng lại KHÔNG được', async () => {
  const env = envWithKV()
  const { nonce, signature } = await openSession(env)
  const again = await call(env, { action: 'session', nonce, signature })
  assert.equal(again.status, 401)
  assert.equal((await again.json()).error, 'bad-nonce')
})

test('nonce bịa ra → 401, không cấp token', async () => {
  const env = envWithKV()
  const message = 'Unlock EZwallet. Nonce: 00000000-0000-0000-0000-000000000000'
  const signature = await me.signMessage({ message })
  const res = await call(env, { action: 'session', nonce: '00000000-0000-0000-0000-000000000000', signature })
  assert.equal(res.status, 401)
})

test('chữ ký rác → 401 bad-signature (không nổ 500)', async () => {
  const env = envWithKV()
  const { nonce } = await (await call(env, { action: 'nonce' })).json()
  const res = await call(env, { action: 'session', nonce, signature: '0xdeadbeef' })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).error, 'bad-signature')
})

test('KẺ KHÁC ký hợp lệ vẫn KHÔNG đọc được sổ của mình (mỗi chữ ký mở đúng sổ của nó)', async () => {
  const env = envWithKV()
  const mine = await openSession(env)
  await call(env, { action: 'push', token: mine.token, payload: { updatedAt: 9, contacts: [{ id: 1, name: 'Mẹ', address: OTHER }] } })

  const theirs = await openSession(env, attacker)
  const got = (await (await call(env, { action: 'pull', token: theirs.token })).json()).data
  assert.equal(got, null, 'ví khác phải thấy sổ TRỐNG, không thấy danh bạ của người ta')
})

test('BIẾT EMAIL KHÔNG CÒN LÀ CỬA VÀO — server không gọi Circle nữa', async () => {
  // Nợ kỹ thuật 07-29: cửa vào cũ là userToken, mà userToken chỉ cần biết email là xin được.
  // Bản mới không được đụng tới Circle ở đường sync nữa → mọi fetch ra ngoài là hồi quy.
  const orig = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('sync KHÔNG được gọi mạng ra ngoài nữa') }
  try {
    const env = envWithKV()
    const { token } = await openSession(env)
    const res = await call(env, { action: 'pull', token })
    assert.equal(res.status, 200)
  } finally {
    globalThis.fetch = orig
  }
})

test('thiếu token → 400; token sai/hết hạn → 401, KHÔNG ghi gì', async () => {
  const env = envWithKV()
  assert.equal((await call(env, { action: 'pull' })).status, 400)
  const res = await call(env, { action: 'push', token: 'không-phải-token', payload: { contacts: [] } })
  assert.equal(res.status, 401)
  assert.equal([...env.EZ_SYNC.store.keys()].filter(k => k.startsWith('bak:')).length, 0)
})

test('AVATAR + field lạ bị loại — ảnh người thật KHÔNG lên server', async () => {
  const env = envWithKV()
  const { token } = await openSession(env)
  await call(env, {
    action: 'push', token,
    payload: { contacts: [{ id: 1, name: 'Mẹ', address: OTHER, avatar: 'data:image/jpeg;base64,AAAA', secret: 'x' }] },
  })
  const raw = env.EZ_SYNC.store.get(`bak:${me.address.toLowerCase()}`).v
  assert.equal(raw.includes('avatar'), false, 'avatar KHÔNG được có trong KV')
  assert.equal(raw.includes('base64'), false)
  assert.equal(raw.includes('secret'), false)
})

test('địa chỉ rác trong danh bạ bị bỏ, tên dài bị cắt 60 ký tự', async () => {
  const env = envWithKV()
  const { token } = await openSession(env)
  await call(env, {
    action: 'push', token,
    payload: { contacts: [{ id: 1, name: 'x'.repeat(200), address: OTHER }, { id: 2, name: 'rác', address: 'không-phải-địa-chỉ' }] },
  })
  const doc = JSON.parse(env.EZ_SYNC.store.get(`bak:${me.address.toLowerCase()}`).v)
  assert.equal(doc.contacts.length, 1)
  assert.equal(doc.contacts[0].name.length, 60)
})

test('quá 500 danh bạ → cắt còn 500, vẫn ghi được', async () => {
  const env = envWithKV()
  const { token } = await openSession(env)
  const contacts = Array.from({ length: 620 }, (_, i) => ({ id: i, name: `n${i}`, address: OTHER }))
  const res = await (await call(env, { action: 'push', token, payload: { contacts } })).json()
  assert.equal(res.contacts, 500)
})

test('mốc 128KB chặn được payload phình qua field id (id không ràng buộc kiểu)', async () => {
  const env = envWithKV()
  const { token } = await openSession(env)
  // 500 danh bạ "sạch" chỉ ~75KB nên KHÔNG chạm mốc byte — mốc này để chặn đường khác:
  // `id` được giữ nguyên như client gửi, nhồi chuỗi dài vào đó là cách duy nhất làm phình KV.
  const contacts = Array.from({ length: 500 }, () => ({ id: 'x'.repeat(300), name: 'n', address: OTHER }))
  const res = await call(env, { action: 'push', token, payload: { contacts } })
  assert.equal(res.status, 413)
  assert.equal([...env.EZ_SYNC.store.keys()].filter(k => k.startsWith('bak:')).length, 0, 'chặn thì KHÔNG được ghi gì vào KV')
})

test('pull khi server trống → data = null', async () => {
  const env = envWithKV()
  const { token } = await openSession(env)
  assert.equal((await (await call(env, { action: 'pull', token })).json()).data, null)
})

test('ĐỔI AUTH KHÔNG MẤT DỮ LIỆU: bản sao lưu ghi bằng code cũ vẫn đọc lại được', async () => {
  // Khoá KV vẫn là `bak:<địa chỉ ví>` như bản userToken → không phải migrate gì.
  const old = JSON.stringify({ v: 1, updatedAt: 111, contacts: [{ id: 7, name: 'Bà ngoại', address: OTHER }], savedQrs: [] })
  const env = envWithKV({ [`bak:${me.address.toLowerCase()}`]: old })
  const { token } = await openSession(env)
  const got = (await (await call(env, { action: 'pull', token })).json()).data
  assert.equal(got.contacts[0].name, 'Bà ngoại')
})
