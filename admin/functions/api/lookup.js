// GET /api/lookup?net=&q=<email | wallet address> - one user, READ ONLY (admin/SPEC.md §5.2).
// By email: Circle user + wallets + Circle's transaction list (states) + balances and transfers from the chain.
// By address: balances and transfers only - Circle cannot map an address back to an email (verified 2026-09-29:
// GET /wallets?address= returns nothing for a wallet that exists).
import { json, netParam, circleGet, tokenBalances, explorerTransfers, isAddress, isEmail } from './_lib.js'

async function chainView(net, address) {
  const [balances, transfers] = await Promise.all([
    tokenBalances(net, address),
    explorerTransfers(net, address).catch(e => ({ error: e.message })),
  ])
  return { address, balances, transfers }
}

export async function onRequestGet(ctx) {
  const params = new URL(ctx.request.url).searchParams
  let net
  try { net = netParam(params.get('net')) } catch (e) { return json({ error: e.message }, 400) }
  const q = (params.get('q') || '').trim()

  if (isAddress(q)) return json({ network: net.key, kind: 'address', email: null, wallets: [await chainView(net, q)] })
  if (!isEmail(q)) return json({ error: 'Enter an email or a 0x wallet address' }, 400)

  const email = q.toLowerCase()
  const user = await circleGet(ctx.env, net, `/users/${encodeURIComponent(email)}`)
  if (user.status === 404 || user.status === 400) return json({ network: net.key, kind: 'email', notFound: true, email })
  if (user.status !== 200) return json({ error: `Circle HTTP ${user.status}` }, 502)

  const [w, t] = await Promise.all([
    circleGet(ctx.env, net, `/wallets?userId=${encodeURIComponent(email)}`),
    circleGet(ctx.env, net, `/transactions?userId=${encodeURIComponent(email)}&pageSize=20`),
  ])
  const wallets = (w.body?.data?.wallets || []).filter(x => x.blockchain === net.circleBlockchain)
  const circleTx = (t.body?.data?.transactions || []).map(x => ({
    time: x.createDate, state: x.state, type: x.transactionType, operation: x.operation, hash: x.txHash || null, fee: x.networkFee || null,
  }))

  return json({
    network: net.key, kind: 'email', email,
    user: user.body.data.user,
    wallets: await Promise.all(wallets.map(x => chainView(net, x.address).then(v => ({ ...v, walletId: x.id, state: x.state, created: x.createDate })))),
    circleTx,
  })
}
