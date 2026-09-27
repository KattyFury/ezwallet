// The swap core SHARED by functions/api/swap.js (Cloudflare) + dev-server.js (local Node).
// The "_" filename prefix → Cloudflare Pages does NOT route it as an endpoint, but it can still be imported.
// One source of truth for the encode/verify part (the part where money gets lost) - no hand-syncing two copies.
//
// THE CORRECT WAY to call swap (S15, dissected from the source of @circle-fin/adapter-viem-v2 +
// provider-stablecoin-service-swap - NOT guessed):
//   /v1/stablecoinKits/swap returns a SIGNED INTENT (transaction.executionParams + .signature).
//   Submit it to the ADAPTER contract: execute(ExecutionParams params, TokenInput[] tokenInputs, bytes sig).
//   The adapter pulls the tokens in, runs the instructions, COLLECTS the output and CREDITS beneficiary=the wallet (settlement).
//   A PIN wallet → the 'approve' strategy: tokenInputs=[{permitType:0,token:tokenIn,amount,permitCalldata:'0x'}]
//   + approve(tokenIn→adapter, amount) FIRST. Batching [approve, execute] through Multicall3From = 1 PIN.
// ⚠️ Unpacking the instructions and running them by hand (the old S11-14 approach) SKIPS settlement → the USDC is stranded in the adapter, MONEY LOST.
import { encodeFunctionData } from 'viem'

export const CIRCLE_API = 'https://api.circle.com'
export const ARC_RPC    = 'https://rpc.testnet.arc.network'

// A predeploy on Arc Testnet. ADAPTER = ADAPTER_CONTRACT_EVM_TESTNET (kitContracts.adapter)
// trong @circle-fin/adapter-viem-v2.
export const ADAPTER        = '0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b'
export const MULTICALL3FROM = '0x522fAf9A91c41c443c66765030741e4AaCe147D0'

// The app's swap fee (user decision 07-23): 0.1% of each swap to the owner's wallet. This is the Stablecoin Kit's
// OFFICIAL customFee (body `config.customFee`, dissected from the source of @circle-fin/provider-stablecoin-service-swap
// - the createSwapParamsSchema accepts percentageBps 1..10000 + recipientAddress). Circle keeps 10%
// of that fee, 90% goes to the recipient. The receiving address is PUBLIC (not a secret) → hardcoded like ADAPTER.
export const FEE_RECIPIENT = '0xEb2D222d28F35fE7BeB5387f8Bc4eBF65f2652F6'
export const FEE_BPS       = 10   // 10 bps = 0.1%

export const TOKEN_ADDR = {
  USDC:   '0x3600000000000000000000000000000000000000',
  EURC:   '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf',
}
// ⚠️ The Kit expects amount = an INTEGER IN BASE UNITS (a decimal → 400; a small number → "No route"). The client sends
// decimals, the server converts to base units before calling the Kit, and converts estimatedAmount back on the way out.
export const TOKEN_DEC = { USDC: 6, EURC: 6, cirBTC: 8 }
export const toBase = (decStr, sym) => BigInt(Math.round(parseFloat(decStr) * 10 ** TOKEN_DEC[sym]))
export const fromBase = (baseStr, sym) => (Number(baseStr) / 10 ** TOKEN_DEC[sym]).toString()

// IAdapter.execute - the ABI copied verbatim from @circle-fin/adapter-viem-v2 (adapterContractAbi).
const ADAPTER_ABI = [{
  type: 'function', name: 'execute', stateMutability: 'payable', outputs: [],
  inputs: [
    { name: 'params', type: 'tuple', components: [
      { name: 'instructions', type: 'tuple[]', components: [
        { name: 'target', type: 'address' }, { name: 'data', type: 'bytes' }, { name: 'value', type: 'uint256' },
        { name: 'tokenIn', type: 'address' }, { name: 'amountToApprove', type: 'uint256' },
        { name: 'tokenOut', type: 'address' }, { name: 'minTokenOut', type: 'uint256' },
      ] },
      { name: 'tokens', type: 'tuple[]', components: [
        { name: 'token', type: 'address' }, { name: 'beneficiary', type: 'address' },
      ] },
      { name: 'execId', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'metadata', type: 'bytes' },
    ] },
    { name: 'tokenInputs', type: 'tuple[]', components: [
      { name: 'permitType', type: 'uint8' }, { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }, { name: 'permitCalldata', type: 'bytes' },
    ] },
    { name: 'signature', type: 'bytes' },
  ],
}]
const ERC20_ABI = [{ type: 'function', name: 'approve', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] }]
const MULTICALL3_ABI = [{ type: 'function', name: 'aggregate3', stateMutability: 'payable',
  inputs: [{ name: 'calls', type: 'tuple[]', components: [
    { name: 'target', type: 'address' }, { name: 'allowFailure', type: 'bool' }, { name: 'callData', type: 'bytes' },
  ] }], outputs: [] }]
const BALANCE_OF_ABI = [{ type: 'function', name: 'balanceOf', stateMutability: 'view',
  inputs: [{ name: 'a', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }]

// Call the Stablecoin Kit /swap → { ok, status, data }. data.transaction holds executionParams + signature.
export async function fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, amountBase) {
  const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/swap`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${kitKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
      tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
      fromAddress: walletAddress, toAddress: walletAddress,
      amount: amountBase.toString(), slippageBps: 300,
      config: { customFee: { percentageBps: FEE_BPS, recipientAddress: FEE_RECIPIENT } },
    }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// Build the callData for Multicall3From.aggregate3([approve(tokenIn→ADAPTER, amount), ADAPTER.execute(...)]).
// Returns { batchData, totalValue, estOut } or { error }.
export function buildSwapBatch(swapData, fromAddr, amountBase) {
  const tx = swapData?.transaction || swapData?.data?.transaction
  const ep = tx?.executionParams
  const signature = tx?.signature
  if (!ep || !signature) return { error: 'response missing executionParams/signature', swapData }

  const executeParams = {
    instructions: ep.instructions.map(i => ({
      target: i.target, data: i.data, value: BigInt(i.value || 0),
      tokenIn: i.tokenIn, amountToApprove: BigInt(i.amountToApprove || 0),
      tokenOut: i.tokenOut, minTokenOut: BigInt(i.minTokenOut || 0),
    })),
    tokens: ep.tokens.map(t => ({ token: t.token, beneficiary: t.beneficiary })),
    execId: BigInt(ep.execId), deadline: BigInt(ep.deadline), metadata: ep.metadata || '0x',
  }
  // Same-chain ERC20 (USDC/EURC/cirBTC): value is always 0 → adapter.execute needs no msg.value.
  const totalValue = executeParams.instructions.reduce((a, i) => a + i.value, 0n)
  const tokenInputs = [{ permitType: 0, token: fromAddr, amount: amountBase, permitCalldata: '0x' }]

  const approveData = encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [ADAPTER, amountBase] })
  const executeData = encodeFunctionData({ abi: ADAPTER_ABI, functionName: 'execute', args: [executeParams, tokenInputs, signature] })
  const batchData = encodeFunctionData({ abi: MULTICALL3_ABI, functionName: 'aggregate3', args: [[
    { target: fromAddr, allowFailure: false, callData: approveData },
    { target: ADAPTER,  allowFailure: false, callData: executeData },
  ]] })
  const estOut = swapData?.estimatedAmount || swapData?.data?.estimatedAmount
  return { batchData, totalValue, estOut }
}

// An eth_simulateV1 bundle [balanceOf(tokenOut) before, the batch, balanceOf(tokenOut) after] → a verdict.
// Costs nothing, needs no PIN. ok = the swap does not revert AND the wallet's tokenOut balance RISES.
export async function simulateSwap({ kitKey, tokenIn, tokenOut, walletAddress, amountIn }) {
  const fromAddr = TOKEN_ADDR[tokenIn]
  const toAddr   = TOKEN_ADDR[tokenOut]
  if (!fromAddr || !toAddr || !walletAddress) return { error: 'missing params' }
  const amountBase = toBase(amountIn, tokenIn)
  const intent = await fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, amountBase)
  if (!intent.ok) return { error: `Stablecoin Kit ${intent.status}: ${intent.data?.message || 'swap failed'}`, detail: intent.data }
  const built = buildSwapBatch(intent.data, fromAddr, amountBase)
  if (built.error) return { error: built.error, detail: built.swapData }

  const balOf = (addr) => encodeFunctionData({ abi: BALANCE_OF_ABI, functionName: 'balanceOf', args: [addr] })
  // The FEE wallet is watched too (07-23): measure FEE_RECIPIENT's tokenIn + tokenOut before/after
  // to prove the 0.1% fee ACTUALLY arrives - never trust "it is configured, so it must work".
  const simBody = {
    jsonrpc: '2.0', id: 1, method: 'eth_simulateV1',
    params: [{
      blockStateCalls: [{ calls: [
        { to: toAddr,   data: balOf(walletAddress) },   // [0] user's tokenOut before
        { to: fromAddr, data: balOf(FEE_RECIPIENT) },   // [1] fee wallet's tokenIn before
        { to: toAddr,   data: balOf(FEE_RECIPIENT) },   // [2] fee wallet's tokenOut before
        { from: walletAddress, to: MULTICALL3FROM, data: built.batchData, value: '0x0' },  // [3] swap
        { to: toAddr,   data: balOf(walletAddress) },   // [4] user's tokenOut after
        { to: fromAddr, data: balOf(FEE_RECIPIENT) },   // [5] fee wallet's tokenIn after
        { to: toAddr,   data: balOf(FEE_RECIPIENT) },   // [6] fee wallet's tokenOut after
      ] }],
      validation: false, traceTransfers: true, returnFullTransactions: false,
    }, 'latest'],
  }
  const simRes = await fetch(ARC_RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(simBody),
  })
  const sim = await simRes.json()
  if (sim.error) return { error: `eth_simulateV1 error: ${sim.error?.message}`, detail: sim.error }
  const calls = sim?.result?.[0]?.calls
  if (!calls || calls.length < 7) return { error: 'sim: missing call results', detail: sim }
  const hexToBig = (r) => (r && r !== '0x') ? BigInt(r) : 0n // returnData is empty when a call reverts
  const before = hexToBig(calls[0].returnData)
  const feeInBefore  = hexToBig(calls[1].returnData)
  const feeOutBefore = hexToBig(calls[2].returnData)
  const swapCall = calls[3]
  const after = hexToBig(calls[4].returnData)
  const feeInAfter  = hexToBig(calls[5].returnData)
  const feeOutAfter = hexToBig(calls[6].returnData)
  const delta = after - before
  const feeInDelta  = feeInAfter - feeInBefore
  const feeOutDelta = feeOutAfter - feeOutBefore
  const expected = built.estOut ? BigInt(built.estOut) : null
  return {
    ok: swapCall.status === '0x1' && delta > 0n,
    swapStatus: swapCall.status,
    swapError: swapCall.error || null,
    tokenOut,
    before:   fromBase(before.toString(), tokenOut),
    after:    fromBase(after.toString(), tokenOut),
    delta:    fromBase(delta.toString(), tokenOut),
    expected: expected ? fromBase(expected.toString(), tokenOut) : null,
    gasUsed:  swapCall.gasUsed || null,
    // The app fee arriving at FEE_RECIPIENT (in tokenIn or tokenOut depending on where the route deducts it - measure both)
    feeRecipient: FEE_RECIPIENT,
    feeDeltaIn:  fromBase(feeInDelta.toString(),  tokenIn),
    feeDeltaOut: fromBase(feeOutDelta.toString(), tokenOut),
  }
}
