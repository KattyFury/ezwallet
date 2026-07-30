// Test /api/sync (sao lưu danh bạ + kho QR lên KV) — gọi THẲNG handler, KV giả + Circle giả.
// Vì sao phải test kiểu này: luồng sync cần userToken thật của Circle, mà Circle SDK không chạy
// localhost → không thử được qua app ở máy. Test này khoá các bất biến quan trọng: identity lấy
// từ Circle (không tin client), avatar KHÔNG bao giờ lên server, và chưa có KV thì trả 503.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../functions/api/sync.js'

const ADDR = '0xAbC0000000000000000000000000000000000001'
const OTHER = '0x1111111111111111111111111111111111111111'

function fakeKV(initial = {}) {
  const m = new Map(Object.entries(initial))
  return { store: m, get: async k => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) }
}

// Giả Circle: token 'good' → có ví Arc; token khác → không có ví (giống token sai/hết hạn)
function stubCircle() {
  const orig = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    const token = init?.headers?.['X-User-Token']
    const wallets = token === 'good'
      ? [{ id: 'w1', address: ADDR, blockchain: 'ARC-TESTNET' }]
      : []
    return new Response(JSON.stringify({ data: { wallets } }), { status: 200 })
  }
  return () => { globalThis.fetch = orig }
}

const call = (env, body) => onRequestPost({ env, request: new Request('http://x/api/sync', { method: 'POST', body: JSON.stringify(body) }) })

test('chưa tạo KV binding → 503 sync-disabled (app phải chạy như cũ)', async () => {
  const res = await call({}, { action: 'pull', userToken: 'good' })
  assert.equal(res.status, 503)
  assert.equal((await res.json()).error, 'sync-disabled')
})

test('userToken sai/hết hạn → 401, KHÔNG ghi gì', async () => {
  const restore = stubCircle()
  const kv = fakeKV()
  const res = await call({ EZ_SYNC: kv, API_KEY: 'k' }, { action: 'push', userToken: 'bad', payload: { contacts: [] } })
  assert.equal(res.status, 401)
  assert.equal(kv.store.size, 0)
  restore()
})

test('push rồi pull ra đúng dữ liệu, khoá KV = địa chỉ ví LẤY TỪ CIRCLE', async () => {
  const restore = stubCircle()
  const kv = fakeKV()
  const env = { EZ_SYNC: kv, API_KEY: 'k' }
  const payload = {
    updatedAt: 1234,
    contacts: [{ id: 1, name: 'Grandma', address: OTHER }],
    savedQrs: [{ id: 9, amount: 20, currency: 'USD', name: 'Rent', createdAt: '2026-07-29' }],
  }
  const pushed = await (await call(env, { action: 'push', userToken: 'good', payload })).json()
  assert.equal(pushed.ok, true)
  assert.equal(pushed.contacts, 1)

  // Khoá phải theo địa chỉ ví Circle trả về (chữ thường), KHÔNG theo thứ gì client gửi
  assert.deepEqual([...kv.store.keys()], [`bak:${ADDR.toLowerCase()}`])

  const got = (await (await call(env, { action: 'pull', userToken: 'good' })).json()).data
  assert.equal(got.updatedAt, 1234)
  assert.deepEqual(got.contacts, [{ id: 1, name: 'Grandma', address: OTHER }])
  assert.equal(got.savedQrs[0].name, 'Rent')
  restore()
})

test('AVATAR + field lạ bị loại — ảnh người thật KHÔNG lên server', async () => {
  const restore = stubCircle()
  const kv = fakeKV()
  const env = { EZ_SYNC: kv, API_KEY: 'k' }
  await call(env, {
    action: 'push', userToken: 'good',
    payload: { contacts: [{ id: 1, name: 'Mẹ', address: OTHER, avatar: 'data:image/jpeg;base64,AAAA', secret: 'x' }] },
  })
  const raw = kv.store.get(`bak:${ADDR.toLowerCase()}`)
  assert.equal(raw.includes('avatar'), false, 'avatar KHÔNG được có trong KV')
  assert.equal(raw.includes('base64'), false)
  assert.equal(raw.includes('secret'), false)
  restore()
})

test('địa chỉ rác trong danh bạ bị bỏ, tên dài bị cắt 60 ký tự', async () => {
  const restore = stubCircle()
  const kv = fakeKV()
  const env = { EZ_SYNC: kv, API_KEY: 'k' }
  await call(env, {
    action: 'push', userToken: 'good',
    payload: { contacts: [{ id: 1, name: 'x'.repeat(200), address: OTHER }, { id: 2, name: 'rác', address: 'không-phải-địa-chỉ' }] },
  })
  const doc = JSON.parse(kv.store.get(`bak:${ADDR.toLowerCase()}`))
  assert.equal(doc.contacts.length, 1)
  assert.equal(doc.contacts[0].name.length, 60)
  restore()
})

test('quá 500 danh bạ → cắt còn 500, vẫn ghi được', async () => {
  const restore = stubCircle()
  const kv = fakeKV()
  const env = { EZ_SYNC: kv, API_KEY: 'k' }
  const contacts = Array.from({ length: 620 }, (_, i) => ({ id: i, name: `n${i}`, address: OTHER }))
  const res = await (await call(env, { action: 'push', userToken: 'good', payload: { contacts } })).json()
  assert.equal(res.contacts, 500)
  restore()
})

test('mốc 128KB chặn được payload phình qua field id (id không ràng buộc kiểu)', async () => {
  const restore = stubCircle()
  const kv = fakeKV()
  const env = { EZ_SYNC: kv, API_KEY: 'k' }
  // 500 danh bạ "sạch" chỉ ~75KB nên KHÔNG chạm mốc byte — mốc này để chặn đường khác:
  // `id` được giữ nguyên như client gửi, nhồi chuỗi dài vào đó là cách duy nhất làm phình KV.
  const contacts = Array.from({ length: 500 }, () => ({ id: 'x'.repeat(300), name: 'n', address: OTHER }))
  const res = await call(env, { action: 'push', userToken: 'good', payload: { contacts } })
  assert.equal(res.status, 413)
  assert.equal(kv.store.size, 0, 'chặn thì KHÔNG được ghi gì vào KV')
  restore()
})

test('pull khi server trống → data = null', async () => {
  const restore = stubCircle()
  const res = await call({ EZ_SYNC: fakeKV(), API_KEY: 'k' }, { action: 'pull', userToken: 'good' })
  assert.equal((await res.json()).data, null)
  restore()
})
