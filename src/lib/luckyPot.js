import { decodeEventLog } from 'viem'
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

// "N winners out of M players" during a LIVE (undrawn) epoch cannot come from getEpoch - numWinners/
// weeklyYield only get written when the epoch commits, near draw time, reading 0 for the rest of the
// week (same class of bug as eligiblePoolSnapshot). Mirrors the real luckypot.cc frontend exactly
// (frontend/src/lib/prize.ts: projectedWeeklyYield + estimateNumWinners) - keep these two in sync with
// that file, not with the contract's own post-draw fields.
const WEEKS_PER_YEAR = 52n
const DOLLARS_PER_WINNER_STEP = 1000n * 1_000_000n // $1000, 6 decimals
function sqrtBigint(value) {
  if (value < 2n) return value
  let x = value, y = (x + 1n) / 2n
  while (y < x) { x = y; y = (x + value / x) / 2n }
  return x
}
function projectedWeeklyYield(eligibleTotalRaw, aprBpsRaw) {
  return (eligibleTotalRaw * aprBpsRaw) / 10_000n / WEEKS_PER_YEAR
}
function estimateNumWinners(eligibleTotalRaw, weeklyYieldRaw) {
  if (eligibleTotalRaw === 0n || weeklyYieldRaw === 0n) return 0n
  const n = sqrtBigint(eligibleTotalRaw / DOLLARS_PER_WINNER_STEP)
  return n === 0n ? 1n : n
}

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
    poolTotal: 5747, eligiblePoolTotal: 5732, numWinners: 2, participantCount: 15,
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
  let eligiblePoolTotalRaw = 0n
  if (participantCountNum > 0) {
    const addresses = await multicallWithRetry(
      Array.from({ length: participantCountNum }, (_, i) => ({ ...base, functionName: 'participants', args: [BigInt(i)] }))
    )
    const eligibles = await multicallWithRetry(
      addresses.map(addr => ({ ...base, functionName: 'eligibleBalance', args: [addr] }))
    )
    eligiblePoolTotalRaw = eligibles.reduce((sum, v) => sum + (v ?? 0n), 0n)
  }
  const weeklyYieldRaw = projectedWeeklyYield(eligiblePoolTotalRaw, aprBps)
  const numWinnersEstimate = Number(estimateNumWinners(eligiblePoolTotalRaw, weeklyYieldRaw))

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
    weeklyYieldUsd: toUsdc(weeklyYieldRaw),
    poolTotal: toUsdc(poolTotalRaw),
    eligiblePoolTotal: toUsdc(eligiblePoolTotalRaw),
    numWinners: numWinnersEstimate,
    participantCount: participantCountNum,
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

// DRAW HISTORY - past epochs, newest first, DRAWN ones only (a currently-running epoch has nothing to
// show yet). Mirrors the real luckypot.cc frontend's useEpochHistory (usePoolData.ts).
export async function getEpochHistory(currentEpochId, count = 10) {
  if (MOCK) {
    return [
      { epochId: 2, drawnAt: Math.floor(Date.now() / 1000) - 8 * 86400, weeklyYield: 9.1, numWinners: 2 },
      { epochId: 1, drawnAt: Math.floor(Date.now() / 1000) - 15 * 86400, weeklyYield: 7.4, numWinners: 1 },
    ]
  }
  const ids = []
  for (let i = currentEpochId - 1; i >= 1 && ids.length < count; i--) ids.push(i)
  if (!ids.length) return []

  const base = { address: LUCKYPOT_ADDRESS, abi: LUCKYPOT_ABI }
  const raws = await multicallWithRetry(ids.map(id => ({ ...base, functionName: 'getEpoch', args: [BigInt(id)] })))
  return ids
    .map((id, i) => { const e = decodeEpoch(raws[i]); return { epochId: id, drawnAt: Number(e.drawnAt), weeklyYield: toUsdc(e.weeklyYield), numWinners: Number(e.numWinners), drawn: e.drawn } })
    .filter(e => e.drawn)
}

// MY HISTORY - this wallet's own Deposit/Withdraw/Claim actions. There is no on-chain "list my actions"
// view, so this reads the Deposited/Withdrawn/Claimed EVENT LOGS through ArcScan's Etherscan-compatible
// `getLogs` endpoint (same API family TxHistory.jsx already uses for regular sends) filtered by the
// user's address as the indexed topic - a plain eth_getLogs against the public RPC over the WHOLE
// history since deploy hits "requested range too large" (verified against the live RPC 2026-09-08);
// ArcScan's own indexer has no such range cap.
const ARCSCAN = 'https://testnet.arcscan.app'
const DEPLOY_BLOCK = 59715964 // block of the CURRENT proxy (0xBdE5...d698) - see HANDOFF.md in the LuckyPot repo
// keccak256 topic0 for each event's signature - computed with viem's toEventSelector, not guessed.
const TOPIC0 = {
  Deposited: '0x73a19dd210f1a7f902193214c0ee91dd35ee5b4d920cba8d519eca65a7b488ca',
  Withdrawn: '0x217c645ce2c5eb2497bdb6d9400205f1253e8607b2aea960637fa705f2130401',
  Claimed: '0x4ec90e965519d92681267467f775ada5bd214aa92c0dc93d90a5e880ce9ed026',
}
const HISTORY_EVENTS_ABI = [
  { type: 'event', name: 'Deposited', inputs: [
    { indexed: true, name: 'user', type: 'address' },
    { indexed: false, name: 'amount', type: 'uint256' },
    { indexed: false, name: 'newBalance', type: 'uint256' },
  ] },
  { type: 'event', name: 'Withdrawn', inputs: [
    { indexed: true, name: 'user', type: 'address' },
    { indexed: false, name: 'amount', type: 'uint256' },
    { indexed: false, name: 'newBalance', type: 'uint256' },
    { indexed: false, name: 'forfeitedTicket', type: 'bool' },
  ] },
  { type: 'event', name: 'Claimed', inputs: [
    { indexed: true, name: 'epochId', type: 'uint256' },
    { indexed: true, name: 'winner', type: 'address' },
    { indexed: false, name: 'amount', type: 'uint256' },
  ] },
]
const topicFromAddress = (addr) => '0x' + '0'.repeat(24) + addr.slice(2).toLowerCase()

async function fetchEventLogs(walletAddress, eventName, topicPos) {
  const topicParam = topicPos === 1
    ? `topic0=${TOPIC0[eventName]}&topic0_1_opr=and&topic1=${topicFromAddress(walletAddress)}`
    : `topic0=${TOPIC0[eventName]}&topic0_2_opr=and&topic2=${topicFromAddress(walletAddress)}`
  const res = await fetch(`${ARCSCAN}/api?module=logs&action=getLogs&address=${LUCKYPOT_ADDRESS}&fromBlock=${DEPLOY_BLOCK}&toBlock=latest&${topicParam}`)
  const json = await res.json()
  // ArcScan answers a genuine "nothing found" AND a rate-limit/error with the SAME status:"0" - the only
  // difference is the message. Treating both as "no history" would silently lie to a rate-limited user
  // ("No activity yet." when they actually have some) - same class of bug chain.js's balance reads guard
  // against (never let a failed read look like a real empty/zero state).
  if (json.status !== '1') {
    if (json.message === 'No logs found') return []
    throw new Error(json.message || 'Could not load history')
  }
  return json.result.map(log => {
    const decoded = decodeEventLog({ abi: HISTORY_EVENTS_ABI, data: log.data, topics: log.topics, eventName })
    return { amount: toUsdc(decoded.args.amount), timestamp: parseInt(log.timeStamp, 16), hash: log.transactionHash }
  })
}

export async function getMyHistory(walletAddress) {
  if (MOCK) {
    const now = Math.floor(Date.now() / 1000)
    return [
      { type: 'Deposit', amount: 42, timestamp: now - 3 * 86400, hash: '0xmock1' },
      { type: 'Claim', amount: 6.6, timestamp: now - 8 * 86400, hash: '0xmock2' },
    ]
  }
  const [deposits, withdrawals, claims] = await Promise.all([
    fetchEventLogs(walletAddress, 'Deposited', 1),
    fetchEventLogs(walletAddress, 'Withdrawn', 1),
    fetchEventLogs(walletAddress, 'Claimed', 2),
  ])
  const entries = [
    ...deposits.map(e => ({ ...e, type: 'Deposit' })),
    ...withdrawals.map(e => ({ ...e, type: 'Withdraw' })),
    ...claims.map(e => ({ ...e, type: 'Claim' })),
  ]
  entries.sort((a, b) => b.timestamp - a.timestamp)
  return entries
}
