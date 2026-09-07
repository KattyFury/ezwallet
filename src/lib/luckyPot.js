import { publicClient } from '../chain'
import { MOCK } from '../mock'

// LUCKYPOT — M1 (READ-ONLY, 2026-09-07). Real numbers off the deployed contract, NO signing anywhere in
// this file. See Desktop/LUCKYPOT-INTEGRATION-SPEC.md for the full plan; only M1 is built so far.
export const LUCKYPOT_ADDRESS = '0xBdE568986a009eBaAE31Cb78033470c334Fad698'

// ABI subset actually used here - copied verbatim from the deployed contract's real ABI (not guessed).
const LUCKYPOT_ABI = [
  { name: 'balances',         type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'eligibleBalance',  type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'currentEpochId',   type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'currentAprBps',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'refBy',            type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'address' }] },
  { name: 'pendingRef',       type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'hasClaimed',       type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'owedTo',           type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  // Seconds after a draw during which claim(epochId) works; past that only the permissionless sweep(epochId) does -
  // copied verbatim from the deployed contract's ABI, same as every other entry here.
  { name: 'SWEEP_DELAY',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balancesTotal',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'participantCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'participants',    type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
  // ⚠️ 10 SEPARATE (flat) outputs, NOT one tuple/struct - verified against the real deployed contract's
  // ABI directly (D:\...\poolAbi.json) AND by an actual eth_call against live Arc Testnet RPC (2026-09-07):
  // wrapping these into a single `{type:'tuple', components:[...]}` DECODES WRONG (viem throws
  // "Position out of bounds" trying to read a tuple pointer that isn't there). viem returns a flat ARRAY
  // in this exact order for a call like this - index it positionally below, do not destructure by name.
  {
    name: 'getEpoch', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }],
    outputs: [
      { name: 'startTime', type: 'uint64' }, { name: 'endTime', type: 'uint64' }, { name: 'drawnAt', type: 'uint64' },
      { name: 'eligiblePoolSnapshot', type: 'uint256' }, { name: 'eligibleParticipants', type: 'uint256' },
      { name: 'weeklyYield', type: 'uint256' }, { name: 'numWinners', type: 'uint256' },
      { name: 'committed', type: 'bool' }, { name: 'drawn', type: 'bool' }, { name: 'winners', type: 'address[]' },
    ],
  },
]
// getEpoch's return order, named - see the ABI comment above for why this is positional, not `.startTime` etc.
const EPOCH_FIELDS = ['startTime', 'endTime', 'drawnAt', 'eligiblePoolSnapshot', 'eligibleParticipants', 'weeklyYield', 'numWinners', 'committed', 'drawn', 'winners']
const decodeEpoch = (arr) => Object.fromEntries(EPOCH_FIELDS.map((k, i) => [k, arr[i]]))
const USDC_DECIMALS = 6
const toUsdc = (raw) => Number(raw) / 10 ** USDC_DECIMALS
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

// Same discipline as chain.js's readAllBalances: Multicall3 (1 request, not N), retry on failure with
// growing backoff, and THROW rather than inventing a 0 - a failed read must never look like a real zero
// balance (see chain.js's big comment on bug 07-16 for why that specific mistake is dangerous here too).
async function multicallWithRetry(contracts, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      return await publicClient.multicall({ allowFailure: false, contracts })
    } catch (e) {
      lastErr = e
      if (i < tries - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw lastErr
}

// MOCK: fixed numbers so the screen is inspectable without hitting the real RPC (mirrors mock.js's style).
function mockInfo() {
  return {
    deposited: 42, eligible: 42, aprBps: 600,
    epochId: 3, epochEndTime: Math.floor(Date.now() / 1000) + 2 * 86400,
    epochDrawn: false, weeklyYieldUsd: 8.4,
    poolTotal: 5747, eligiblePoolTotal: 5732, numWinners: 2, eligibleParticipants: 14,
    prevEpochId: 2, wonLastEpoch: false, owedLastEpoch: 0, hasClaimedLastEpoch: false,
    prevEpochDrawnAt: Math.floor(Date.now() / 1000) - 86400, sweepDelay: 3 * 86400,
    referrer: null, pendingReferral: 0,
  }
}

// One call, one round trip (2 multicalls in truth: the 2nd depends on currentEpochId from the 1st -
// unavoidable, but still far better than reading each field separately). Returns null-safe fields;
// THROWS on a genuine read failure (caller must keep the previous value, never draw a fabricated number -
// same rule chain.js's getTokenBalances follows).
export async function getLuckyPotInfo(walletAddress) {
  if (MOCK) return mockInfo()
  if (!walletAddress) return null

  const base = { address: LUCKYPOT_ADDRESS, abi: LUCKYPOT_ABI }
  const [deposited, eligible, epochId, aprBps, referrer, pendingReferral, sweepDelay, poolTotalRaw, participantCountRaw] = await multicallWithRetry([
    { ...base, functionName: 'balances', args: [walletAddress] },
    { ...base, functionName: 'eligibleBalance', args: [walletAddress] },
    { ...base, functionName: 'currentEpochId' },
    { ...base, functionName: 'currentAprBps' },
    { ...base, functionName: 'refBy', args: [walletAddress] },
    { ...base, functionName: 'pendingRef', args: [walletAddress] },
    { ...base, functionName: 'SWEEP_DELAY' },
    { ...base, functionName: 'balancesTotal' },
    { ...base, functionName: 'participantCount' },
  ])

  // "TOTAL TICKETS / POOL" needs the LIVE pool, not getEpoch's eligiblePoolSnapshot - that field only gets
  // written when the epoch COMMITS (near draw time), reading 0 for the whole rest of the week. There is no
  // single view function for "eligible across everyone" either, so it's assembled the same way the real
  // luckypot.cc frontend does it (frontend/src/hooks/usePoolData.ts: useEligiblePoolTotal) - participants(i)
  // for every index, then eligibleBalance(addr) for each. Fine at this participant count (testnet-scale).
  const participantCountNum = Number(participantCountRaw)
  let eligiblePoolTotal = 0n
  if (participantCountNum > 0) {
    const addresses = await multicallWithRetry(
      Array.from({ length: participantCountNum }, (_, i) => ({ ...base, functionName: 'participants', args: [BigInt(i)] }))
    )
    const eligibles = await multicallWithRetry(
      addresses.map(addr => ({ ...base, functionName: 'eligibleBalance', args: [addr] }))
    )
    eligiblePoolTotal = eligibles.reduce((sum, v) => sum + (v ?? 0n), 0n)
  }

  const epochIdNum = Number(epochId)
  const prevEpochId = epochIdNum > 0 ? epochIdNum - 1 : null

  const epochCalls = [{ ...base, functionName: 'getEpoch', args: [epochId] }]
  if (prevEpochId !== null) {
    epochCalls.push(
      { ...base, functionName: 'hasClaimed', args: [BigInt(prevEpochId), walletAddress] },
      { ...base, functionName: 'owedTo', args: [BigInt(prevEpochId), walletAddress] },
      { ...base, functionName: 'getEpoch', args: [BigInt(prevEpochId)] },
    )
  }
  const [epochRaw, hasClaimedPrev, owedPrev, prevEpochRaw] = await multicallWithRetry(epochCalls)
  const epoch = decodeEpoch(epochRaw)

  return {
    deposited: toUsdc(deposited),
    eligible: toUsdc(eligible),
    aprBps: Number(aprBps),
    epochId: epochIdNum,
    epochEndTime: Number(epoch.endTime),
    epochDrawn: epoch.drawn,
    weeklyYieldUsd: toUsdc(epoch.weeklyYield),
    poolTotal: toUsdc(poolTotalRaw),
    eligiblePoolTotal: toUsdc(eligiblePoolTotal),
    numWinners: Number(epoch.numWinners),
    eligibleParticipants: Number(epoch.eligibleParticipants),
    sweepDelay: Number(sweepDelay),
    prevEpochId,
    prevEpochDrawnAt: prevEpochId !== null ? Number(decodeEpoch(prevEpochRaw).drawnAt) : null,
    wonLastEpoch: prevEpochId !== null ? (owedPrev ?? 0n) > 0n : false,
    owedLastEpoch: prevEpochId !== null ? toUsdc(owedPrev ?? 0n) : 0,
    hasClaimedLastEpoch: prevEpochId !== null ? !!hasClaimedPrev : false,
    referrer: referrer && referrer !== ZERO_ADDR ? referrer : null,
    pendingReferral: toUsdc(pendingReferral),
  }
}
