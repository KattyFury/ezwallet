// Swap qua Circle Stablecoin Kit REST (KHÔNG dùng App Kit — không có adapter cho
// User-Controlled Wallet, user đã chốt). Luồng:
//   1. POST /v1/stablecoinKits/swap → instructions[] (approve + swap)
//   2. Gộp TẤT CẢ instructions vào MỘT giao dịch qua Multicall3From.aggregate3(...)
//      (Arc Transaction Extension, giữ msg.sender qua CallFrom — cùng cơ chế Memo
//      contract mà luồng gửi tiền đã verify on-chain).
//   3. MỘT contractExecution challenge → user ký 1 lần PIN.
// Vì sao KHÔNG tạo 2 challenge approve/swap riêng (code cũ): swap simulate TRƯỚC khi
// approve lên chain → revert. Batch atomic trong 1 tx: approve chạy xong mới tới swap
// trong cùng execution → hết race. (Root cause đã nghi từ session 4, giờ xử đúng.)
const CIRCLE_API = 'https://api.circle.com'
const W3S_API   = 'https://api.circle.com/v1/w3s'

// Multicall3From — predeployed trên Arc (docs.arc.io /arc/concepts/batched-transactions):
// aggregate3((address target, bool allowFailure, bytes callData)[]) — selector 0x82ad56cb.
// Guardrails từ docs: gọi từ EOA (ví Circle = EOA ✓), allowFailure=false → 1 subcall fail
// là revert cả batch (đúng ý: approve fail thì đừng swap).
const MULTICALL3FROM = '0x522fAf9A91c41c443c66765030741e4AaCe147D0'

const TOKEN_ADDR = {
  USDC:   '0x3600000000000000000000000000000000000000',
  EURC:   '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0c4a4ce82a5746abaad9425360ab04fbba432bf',
}
// ⚠️⚠️ Kit API nhận amount = SỐ NGUYÊN BASE UNITS (verify bằng gọi thật 2026-07-03:
// "88.57" → 400 "amount must be an integer in base units"; còn "20" bị hiểu là 20 PHẦN TRIỆU
// token → dust → quote sai / swap "No route available"). Client gửi decimal (token thật),
// server quy ra base units TRƯỚC KHI gọi Kit, và quy estimatedAmount NGƯỢC LẠI khi trả về.
const TOKEN_DEC = { USDC: 6, EURC: 6, cirBTC: 8 }
const toBase = (decStr, sym) => String(BigInt(Math.round(parseFloat(decStr) * 10 ** TOKEN_DEC[sym])))
const fromBase = (baseStr, sym) => (Number(baseStr) / 10 ** TOKEN_DEC[sym]).toString()

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const err = (msg, detail, status = 500) =>
  new Response(JSON.stringify({ error: msg, detail }), { status, headers: JSON_HEADERS })

// Encode aggregate3(Call3[]) THỦ CÔNG (không kéo viem vào Cloudflare Function —
// tránh rủi ro bundle). ĐÃ VERIFY khớp byte-một với viem encodeFunctionData
// (3 test case: 2 call lệch độ dài, 1 call, 3 call có bytes rỗng — 2026-07-03).
function encodeAggregate3(calls) {
  const SELECTOR = '82ad56cb'
  const word = (hex) => hex.replace(/^0x/, '').padStart(64, '0')
  const num = (n) => BigInt(n).toString(16).padStart(64, '0')

  // tuple (address,bool,bytes): head 3 word (addr, bool, offset bytes = 0x60) + bytes tail
  const tuples = calls.map(c => {
    const data = c.callData.replace(/^0x/, '')
    const padded = data.padEnd(Math.ceil(data.length / 64) * 64, '0')
    return word(c.target) + num(c.allowFailure ? 1 : 0) + num(0x60) + num(data.length / 2) + padded
  })
  let offsets = '', running = calls.length * 32
  for (const t of tuples) { offsets += num(running); running += t.length / 2 }
  return '0x' + SELECTOR + num(0x20) + num(calls.length) + offsets + tuples.join('')
}

export async function onRequestPost(ctx) {
  try {
    const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY
    const kitKey = ctx.env.KIT_KEY
    const body = await ctx.request.json()
    const { action, userToken, walletId, walletAddress, tokenIn, tokenOut, amountIn } = body

    const fromAddr = TOKEN_ADDR[tokenIn]
    const toAddr   = TOKEN_ADDR[tokenOut]

    if (action === 'estimate') {
      if (!kitKey) return err('KIT_KEY not configured')
      if (!fromAddr || !toAddr) return err('unknown token', null, 400)
      const params = new URLSearchParams({
        tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
        tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
        fromAddress: walletAddress || '0x0000000000000000000000000000000000000001',
        amount: toBase(amountIn, tokenIn), slippageBps: '300',
      })
      const res = await fetch(`${CIRCLE_API}/v1/stablecoinKits/quote?${params}`, {
        headers: { 'Authorization': `Bearer ${kitKey}` },
      })
      const data = await res.json()
      if (!res.ok) return err(data?.message || `Circle API ${res.status}`, data)
      const q = data?.data?.quote || data?.quote || data?.data || data
      // amountOut = decimal token thật cho client hiển thị (estimatedAmount là base units)
      const amountOut = q?.estimatedAmount ? fromBase(q.estimatedAmount, tokenOut) : null
      return new Response(JSON.stringify({ estimate: data?.data || data, amountOut }), { headers: JSON_HEADERS })
    }

    if (action === 'execute') {
      if (!userToken || !walletId || !walletAddress || !fromAddr || !toAddr) {
        return err('missing params', null, 400)
      }
      // Bước 1: lấy instructions từ Stablecoin Kit
      const swapRes = await fetch(`${CIRCLE_API}/v1/stablecoinKits/swap`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${kitKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenInAddress: fromAddr, tokenInChain: 'Arc_Testnet',
          tokenOutAddress: toAddr,  tokenOutChain: 'Arc_Testnet',
          fromAddress: walletAddress, toAddress: walletAddress,
          amount: toBase(amountIn, tokenIn), slippageBps: 300,
        }),
      })
      const swapData = await swapRes.json()
      if (!swapRes.ok) return err(`Stablecoin Kit ${swapRes.status}: ${swapData?.message || 'swap failed'}`, swapData)
      const instructions = swapData?.transaction?.executionParams?.instructions
        || swapData?.data?.transaction?.executionParams?.instructions
      if (!instructions?.length) return err('no instructions', swapData)

      // Bước 2: 1 instruction → gọi thẳng; nhiều → gộp Multicall3From (1 tx, 1 PIN, atomic)
      let contractAddress, callData
      if (instructions.length === 1) {
        contractAddress = instructions[0].target
        callData = instructions[0].data
      } else {
        contractAddress = MULTICALL3FROM
        callData = encodeAggregate3(instructions.map(i => ({
          target: i.target, allowFailure: false, callData: i.data,
        })))
      }

      // Bước 3: MỘT contractExecution challenge
      const txRes = await fetch(`${W3S_API}/user/transactions/contractExecution`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken },
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          walletId, contractAddress, callData,
          feeLevel: 'MEDIUM',
        }),
      })
      const txData = await txRes.json()
      const challengeId = txData?.data?.challengeId
      if (!challengeId) {
        console.error('[swap] contractExecution không trả challengeId:', txRes.status, JSON.stringify(txData))
        const msg = `${txData?.message || txData?.error?.message || 'no challengeId'} (HTTP ${txRes.status}${txData?.code ? `, code ${txData.code}` : ''})`
        return err(msg, txData)
      }
      // amountOut (decimal token thật) để client hiện thông báo "nhận về ~X"
      // (swap response có estimatedAmount ở top-level — verify bằng gọi thật)
      const estOut = swapData?.estimatedAmount || swapData?.data?.estimatedAmount || swapData?.quote?.estimatedAmount
      const amountOut = estOut ? fromBase(estOut, tokenOut) : null
      return new Response(JSON.stringify({ challengeId, batched: instructions.length > 1, amountOut }), { headers: JSON_HEADERS })
    }

    return err('unknown action', null, 400)
  } catch (e) {
    return err('unhandled', { message: e.message, stack: e.stack?.slice(0, 300) })
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
}
