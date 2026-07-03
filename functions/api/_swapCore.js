// Lõi swap DÙNG CHUNG cho functions/api/swap.js (Cloudflare) + dev-server.js (Node local).
// File prefix "_" → Cloudflare Pages KHÔNG route thành endpoint nhưng vẫn import được.
// Một nguồn sự thật cho phần encode/verify (đoạn dễ mất tiền) — khỏi phải sync tay 2 chỗ.
//
// CÁCH ĐÚNG gọi swap (S15, mổ từ source SDK @circle-fin/adapter-viem-v2 +
// provider-stablecoin-service-swap — KHÔNG đoán):
//   /v1/stablecoinKits/swap trả 1 INTENT CÓ CHỮ KÝ (transaction.executionParams + .signature).
//   Nộp cho ADAPTER contract: execute(ExecutionParams params, TokenInput[] tokenInputs, bytes sig).
//   Adapter kéo token vào, chạy instructions, GOM output, GHI CÓ cho beneficiary=ví (settlement).
//   Ví PIN → chiến lược 'approve': tokenInputs=[{permitType:0,token:tokenIn,amount,permitCalldata:'0x'}]
//   + approve(tokenIn→adapter, amount) TRƯỚC. Batch [approve, execute] qua Multicall3From = 1 PIN.
// ⚠️ Bóc instructions chạy tay (cách cũ S11-14) BỎ QUA settlement → USDC kẹt ở adapter, MẤT TIỀN.
import { encodeFunctionData } from 'viem'

export const CIRCLE_API = 'https://api.circle.com'
export const ARC_RPC    = 'https://rpc.testnet.arc.network'

// Predeploy trên Arc Testnet. ADAPTER = ADAPTER_CONTRACT_EVM_TESTNET (kitContracts.adapter)
// trong @circle-fin/adapter-viem-v2.
export const ADAPTER        = '0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b'
export const MULTICALL3FROM = '0x522fAf9A91c41c443c66765030741e4AaCe147D0'

export const TOKEN_ADDR = {
  USDC:   '0x3600000000000000000000000000000000000000',
  EURC:   '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf',
}
// ⚠️ Kit nhận amount = SỐ NGUYÊN BASE UNITS (decimal → 400; số nhỏ → "No route"). Client gửi
// decimal, server quy base units trước khi gọi Kit; quy estimatedAmount ngược lại khi trả.
export const TOKEN_DEC = { USDC: 6, EURC: 6, cirBTC: 8 }
export const toBase = (decStr, sym) => BigInt(Math.round(parseFloat(decStr) * 10 ** TOKEN_DEC[sym]))
export const fromBase = (baseStr, sym) => (Number(baseStr) / 10 ** TOKEN_DEC[sym]).toString()

// IAdapter.execute — ABI copy nguyên từ @circle-fin/adapter-viem-v2 (adapterContractAbi).
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

// Gọi Stablecoin Kit /swap → { ok, status, data }. data.transaction có executionParams + signature.
export async function fetchSwapIntent(kitKey, fromAddr, toAddr, walletAddress, amountBase) {
  const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/swap`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${kitKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
      tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
      fromAddress: walletAddress, toAddress: walletAddress,
      amount: amountBase.toString(), slippageBps: 300,
    }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// Dựng callData Multicall3From.aggregate3([approve(tokenIn→ADAPTER, amount), ADAPTER.execute(...)]).
// Trả { batchData, totalValue, estOut } hoặc { error }.
export function buildSwapBatch(swapData, fromAddr, amountBase) {
  const tx = swapData?.transaction || swapData?.data?.transaction
  const ep = tx?.executionParams
  const signature = tx?.signature
  if (!ep || !signature) return { error: 'response thiếu executionParams/signature', swapData }

  const executeParams = {
    instructions: ep.instructions.map(i => ({
      target: i.target, data: i.data, value: BigInt(i.value || 0),
      tokenIn: i.tokenIn, amountToApprove: BigInt(i.amountToApprove || 0),
      tokenOut: i.tokenOut, minTokenOut: BigInt(i.minTokenOut || 0),
    })),
    tokens: ep.tokens.map(t => ({ token: t.token, beneficiary: t.beneficiary })),
    execId: BigInt(ep.execId), deadline: BigInt(ep.deadline), metadata: ep.metadata || '0x',
  }
  // Same-chain ERC20 (USDC/EURC/cirBTC): value luôn 0 → adapter.execute không cần msg.value.
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

// eth_simulateV1 bundle [balanceOf(tokenOut) trước, batch, balanceOf(tokenOut) sau] → verdict.
// Không tốn tiền, không PIN. ok = swap không revert VÀ số dư tokenOut của ví TĂNG.
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
  const simBody = {
    jsonrpc: '2.0', id: 1, method: 'eth_simulateV1',
    params: [{
      blockStateCalls: [{ calls: [
        { to: toAddr, data: balOf(walletAddress) },
        { from: walletAddress, to: MULTICALL3FROM, data: built.batchData, value: '0x0' },
        { to: toAddr, data: balOf(walletAddress) },
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
  if (!calls || calls.length < 3) return { error: 'sim: thiếu kết quả calls', detail: sim }
  const hexToBig = (r) => (r && r !== '0x') ? BigInt(r) : 0n // returnData rỗng khi call revert
  const before = hexToBig(calls[0].returnData)
  const swapCall = calls[1]
  const after = hexToBig(calls[2].returnData)
  const delta = after - before
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
  }
}
