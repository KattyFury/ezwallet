// LuckyPot deposit/withdraw/claim - Cloudflare Pages Function. Same shape as swap.js: encode calldata,
// call Circle's real contractExecution, the PIN itself is signed client-side via executeChallenge.
// Reads (balances/epoch/referral) are NOT here - src/lib/luckyPot.js reads those directly off Arc Testnet
// via viem multicall, no server round trip needed for a view call.
import { encodeFunctionData } from 'viem'
import { MULTICALL3FROM, TOKEN_ADDR, toBase } from './_swapCore.js'

const W3S_API = 'https://api.circle.com/v1/w3s'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const err = (msg, detail, status = 500) =>
  new Response(JSON.stringify({ error: msg, detail }), { status, headers: JSON_HEADERS })

// Same deployed contract src/lib/luckyPot.js reads from - keep the 2 in sync if it's ever redeployed.
const POOL_ADDRESS = '0xBdE568986a009eBaAE31Cb78033470c334Fad698'
const USDC_ADDRESS = TOKEN_ADDR.USDC

const ERC20_ABI = [{
  type: 'function', name: 'approve', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [],
}]
// ABI subset copied verbatim from the deployed contract (poolAbi.json in the KattyFury/LuckyPot repo) -
// same discipline as src/lib/luckyPot.js, not guessed.
const POOL_ABI = [
  { type: 'function', name: 'deposit',  stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'claim',    stateMutability: 'nonpayable', inputs: [{ name: 'epochId', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'sweep',    stateMutability: 'nonpayable', inputs: [{ name: 'epochId', type: 'uint256' }], outputs: [] },
]
// Multicall3From.aggregate3 - same interface/address ezwallet's Swap already batches approve+execute through.
const MULTICALL3_ABI = [{
  type: 'function', name: 'aggregate3', stateMutability: 'payable',
  inputs: [{ name: 'calls', type: 'tuple[]', components: [
    { name: 'target', type: 'address' }, { name: 'allowFailure', type: 'bool' }, { name: 'callData', type: 'bytes' },
  ] }], outputs: [],
}]

async function contractExecution({ apiKey, userToken, walletId, contractAddress, callData }) {
  const res = await fetch(`${W3S_API}/user/transactions/contractExecution`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken },
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), walletId, contractAddress, callData, feeLevel: 'MEDIUM' }),
  })
  const data = await res.json()
  const challengeId = data?.data?.challengeId
  if (!challengeId) {
    console.error('[luckypot] contractExecution returned no challengeId:', res.status, JSON.stringify(data))
    const msg = `${data?.message || data?.error?.message || 'no challengeId'} (HTTP ${res.status}${data?.code ? `, code ${data.code}` : ''})`
    throw new Error(msg)
  }
  return challengeId
}

export async function onRequestPost(ctx) {
  try {
    const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
    const body = await ctx.request.json()
    const { action, userToken, walletId, amountIn, epochId, useSweep } = body
    if (!userToken || !walletId) return err('missing params', null, 400)

    if (action === 'deposit') {
      if (!(parseFloat(amountIn) > 0)) return err('invalid amount', null, 400)
      const amountBase = toBase(amountIn, 'USDC')
      const approveData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [POOL_ADDRESS, amountBase] })
      const depositData = encodeFunctionData({ abi: POOL_ABI, functionName: 'deposit', args: [amountBase] })
      const callData = encodeFunctionData({ abi: MULTICALL3_ABI, functionName: 'aggregate3', args: [[
        { target: USDC_ADDRESS, allowFailure: false, callData: approveData },
        { target: POOL_ADDRESS, allowFailure: false, callData: depositData },
      ]] })
      const challengeId = await contractExecution({ apiKey, userToken, walletId, contractAddress: MULTICALL3FROM, callData })
      return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS })
    }

    if (action === 'withdraw') {
      if (!(parseFloat(amountIn) > 0)) return err('invalid amount', null, 400)
      const amountBase = toBase(amountIn, 'USDC')
      // No approve needed - withdraw pays out of the caller's own pool balance, not an ERC20 transferFrom.
      const callData = encodeFunctionData({ abi: POOL_ABI, functionName: 'withdraw', args: [amountBase] })
      const challengeId = await contractExecution({ apiKey, userToken, walletId, contractAddress: POOL_ADDRESS, callData })
      return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS })
    }

    if (action === 'claim') {
      if (epochId === undefined || epochId === null) return err('missing epochId', null, 400)
      const callData = encodeFunctionData({ abi: POOL_ABI, functionName: useSweep ? 'sweep' : 'claim', args: [BigInt(epochId)] })
      const challengeId = await contractExecution({ apiKey, userToken, walletId, contractAddress: POOL_ADDRESS, callData })
      return new Response(JSON.stringify({ challengeId }), { headers: JSON_HEADERS })
    }

    return err('unknown action', null, 400)
  } catch (e) {
    return err('unhandled', { message: e.message, stack: e.stack?.slice(0, 300) })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
