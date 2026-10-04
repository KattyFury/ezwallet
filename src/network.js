// THE NETWORK CONFIG - the ONLY place a chain id, RPC, explorer, token or contract address may be written.
// Imported by the client (src/*) AND the Pages Functions (functions/api/*), so the two can never disagree.
//
// ⚠️ WHY (MAINNET-AUDIT.md C2): on EVM a call to an address with no code SUCCEEDS and does nothing. Testnet
// addresses left in mainnet code do not fail loudly - a swap would "succeed" while granting an allowance to an
// unknown address, an EURC send would "succeed" while moving nothing. Every value below comes from
// docs.arc.io (contract-addresses, connect-to-arc) or Circle's own SDK source, and was checked live with
// eth_getCode on 2026-09-27. Never copy a value from the other network's block.
//
// Selecting the network: client = import.meta.env.VITE_NETWORK (build time), functions = env.NETWORK
// (runtime). There is NO default - an unset or unknown name throws, so a misconfigured deploy fails closed.
//
// MAINNET ONLY (owner decision 2026-10-02): the testnet build and testnet.ezwallet.cash are gone. Features are
// tried first on test.ezwallet.cash = the SAME mainnet config built from the `test` branch (Pages ezwallet-test,
// behind Cloudflare Access). The old testnet block (chain 5042002, App ID 518fec6a…, testnet EURC/swap adapter)
// is in git history before this commit - never paste its values back next to mainnet's.

export const NETWORKS = {
  mainnet: {
    key: 'mainnet',
    label: 'Arc',
    chainId: 5042,
    rpc: 'https://rpc.mainnet.arc.io',
    explorer: 'https://explorer.arc.io',
    // Verified 2026-09-27 with a LIVE Circle key: user/initialize blockchains:["ARC"] → 201 (MAINNET-AUDIT.md B1).
    circleBlockchain: 'ARC',
    circleAppId: '5ffb6dbb-ea01-5758-8780-2eb6b8cb2996',   // Circle Console (Mainnet) → User Controlled → App ID
    kitChain: 'Arc',                   // @circle-fin/adapter-viem-v2: SwapChain["Arc"]
    // Swap ON since 2026-10-04 (owner, docs/SWAP-PLAN.md Phase 1) after C5 (intent validation + simulation) and H2
    // (50 bps + stopLimit = the amount shown). The server builds the swap itself (functions/api/_swapCore.js) - it does
    // not need @circle-fin/adapter-circle-wallets' 'ARC' mapping.
    swap: true,
    // eth_simulateV1 (swap pre-check). rpc.mainnet.arc.io answers "method not supported"; dRPC supports it (2026-10-03).
    simRpc: 'https://rpc.drpc.mainnet.arc.io',
    // The VERIFIED tokens. v1 shipped USDC + EURC; cirBTC added back by the owner 2026-10-03 (address from
    // docs.arc.io contract-addresses; read on chain 2026-10-03: "Circle Wrapped Bitcoin", cirBTC, 8 decimals).
    // Any other token the wallet holds is listed as "unverified" (view only) - src/chain.js getUnverifiedTokens.
    tokens: {
      USDC: { address: '0x3600000000000000000000000000000000000000', decimals: 6 },
      EURC: { address: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1', decimals: 6 },
      cirBTC: { address: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0', decimals: 8 },
    },
    contracts: {
      memo:           '0x5294E9927c3306DcBaDb03fe70b92e01cCede505',
      multicall3From: '0x522fAf9A91c41c443c66765030741e4AaCe147D0',
      multicall3:     '0xcA11bde05977b3631167028862bE2a173976CA11',
      swapAdapter:    '0x7FB8c7260b63934d8da38aF902f87ae6e284a845',   // @circle-fin/adapter-viem-v2 ADAPTER_CONTRACT_EVM_MAINNET
    },
  },
}

export function getNetwork(name) {
  const net = NETWORKS[name]
  if (!net) throw new Error(`Unknown or unset network "${name}" - set VITE_NETWORK (client) / NETWORK (functions) to mainnet`)
  return net
}

// Every contract + token address of a network, for the startup self-check.
export function contractAddresses(net) {
  return [
    ...Object.entries(net.tokens).map(([sym, t]) => [`token ${sym}`, t.address]),
    ...Object.entries(net.contracts).map(([name, addr]) => [name, addr]),
  ]
}

// Live self-check against the chain: the RPC must report this network's chainId and EVERY address above must
// hold contract code. Returns { ok, problems[] }. Used by /api/health; a failure blocks sending.
export async function checkNetwork(net, fetchImpl = fetch) {
  const rpc = async (method, params) => {
    const res = await fetchImpl(net.rpc, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    const j = await res.json()
    if (j.error) throw new Error(`${method}: ${j.error.message}`)
    return j.result
  }
  const problems = []
  try {
    const id = parseInt(await rpc('eth_chainId', []), 16)
    if (id !== net.chainId) problems.push(`RPC chainId ${id} ≠ expected ${net.chainId}`)
    for (const [name, addr] of contractAddresses(net)) {
      const code = await rpc('eth_getCode', [addr, 'latest'])
      if (!code || code === '0x') problems.push(`${name} ${addr} has no contract code`)
    }
  } catch (e) {
    problems.push(`RPC unreachable: ${e.message}`)
  }
  return { ok: problems.length === 0, problems }
}
