// Shared helpers for the admin API. The chain/token/contract values come from the SAME src/network.js the app uses,
// so the admin can never disagree with the app about a network.
import { getNetwork } from '../../../src/network.js'

// The public app of each network - its /api/health is part of the health page.
export const SITE = { testnet: 'https://testnet.ezwallet.cash', mainnet: 'https://ezwallet.cash' }

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// ?net=testnet|mainnet - anything else is refused (never a default).
export function netParam(value) {
  if (value !== 'testnet' && value !== 'mainnet') throw new Error('net must be testnet or mainnet')
  return getNetwork(value)
}

// ── Circle: READ ONLY (admin/SPEC.md §6.3) ──
// The Circle API key can mint a user token for ANY email (POST /users/token). The admin must never have a path to
// that or to any other write: this helper only issues GET, and only to the paths listed here.
const CIRCLE_API = 'https://api.circle.com/v1/w3s'
const CIRCLE_READ_PATHS = [
  /^\/config\/entity$/,
  /^\/users\?[^/]*$/,
  /^\/users\/[^/?]+$/,
  /^\/wallets\?[^/]*$/,
  /^\/transactions\?[^/]*$/,
]
export async function circleGet(env, net, path) {
  if (!CIRCLE_READ_PATHS.some(re => re.test(path))) throw new Error(`Circle path not allowed: ${path}`)
  const key = net.key === 'testnet' ? env.CIRCLE_TEST_API_KEY : env.CIRCLE_LIVE_API_KEY
  if (!key) throw new Error(`Circle API key for ${net.key} is not set`)
  const res = await fetch(`${CIRCLE_API}${path}`, { method: 'GET', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

// Every user of a network, Circle's page order. A Pages Function may make ~50 outbound requests per call (Workers
// free plan) → at most 45 pages of 50 users; past that `truncated` is set instead of returning a silently short list.
const PAGE_SIZE = 50, MAX_PAGES = 45
export async function listUsers(env, net) {
  const users = []
  let after = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = `pageSize=${PAGE_SIZE}` + (after ? `&pageAfter=${encodeURIComponent(after)}` : '')
    const { status, body } = await circleGet(env, net, `/users?${qs}`)
    if (status !== 200) throw new Error(`Circle HTTP ${status}`)
    const list = body?.data?.users || []
    users.push(...list)
    if (list.length < PAGE_SIZE) return { users, truncated: false }
    after = list[list.length - 1].id
  }
  return { users, truncated: true }
}

// ── Chain ──
export async function rpc(net, method, params = []) {
  const res = await fetch(net.rpc, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const j = await res.json()
  if (j.error) throw new Error(j.error.message || 'rpc error')
  return j.result
}

// Balance of every token the network lists, as decimal strings (exact - BigInt, never float).
export async function tokenBalances(net, address) {
  const data = '0x70a08231' + address.toLowerCase().replace(/^0x/, '').padStart(64, '0')   // balanceOf(address)
  const out = {}
  await Promise.all(Object.entries(net.tokens).map(async ([sym, t]) => {
    try { out[sym] = formatUnits(BigInt(await rpc(net, 'eth_call', [{ to: t.address, data }, 'latest'])), t.decimals) }
    catch (e) { out[sym] = null }
  }))
  return out
}

export function formatUnits(v, decimals) {
  const neg = v < 0n; if (neg) v = -v
  const s = v.toString().padStart(decimals + 1, '0')
  const int = s.slice(0, s.length - decimals), frac = s.slice(s.length - decimals).replace(/0+$/, '')
  return (neg ? '-' : '') + int + (frac ? '.' + frac : '')
}

// Token transfers of an address from the explorer (amounts - Circle's transaction list has none for our sends).
export async function explorerTransfers(net, address, limit = 20) {
  const url = `${net.explorer}/api?module=account&action=tokentx&address=${address}&sort=desc&page=1&offset=${limit}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const text = await res.text()
  let j
  try { j = JSON.parse(text) } catch { throw new Error(`explorer returned no JSON (HTTP ${res.status})`) }
  if (!Array.isArray(j.result)) return []   // "No transactions found" comes back as a string
  const me = address.toLowerCase()
  return j.result.map(t => ({
    hash: t.hash, time: Number(t.timeStamp) * 1000, token: t.tokenSymbol,
    direction: t.from.toLowerCase() === me ? 'out' : 'in',
    counterparty: t.from.toLowerCase() === me ? t.to : t.from,
    amount: formatUnits(BigInt(t.value), Number(t.tokenDecimal)),
  }))
}

export const isAddress = s => /^0x[0-9a-fA-F]{40}$/.test(s)
export const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
