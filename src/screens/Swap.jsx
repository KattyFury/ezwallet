import { useState, useEffect, useRef } from 'react'
import { useNav } from '../nav'
import Icon from '../components/Icon'
import PctSlider from '../components/PctSlider'
import Numpad from '../components/Numpad'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession, ensureWalletAddress, circleErrorMessage } from '../circle'
import { getTokenBalances, getDisplayRates, cachedRates, cachedBalances, estimateFeeUsd } from '../chain'
import { spendableOf, floorTo, getDisplayCurrency, displaySymbol, fmtDisplay, decimalsOfCurrency } from '../data'
import { useFitFontSize } from '../useFitFontSize'
import { roundHints, fmtHint } from '../roundHint'
import { addNotif } from '../notif'

// ✅ SWAP executes through ADAPTER.execute(a signed intent) - the correct path, and adapter settlement records
// the USDC arriving in the wallet (see the SWAP section of HANDOFF + functions/api/_swapCore.js). VERIFIED with eth_simulateV1
// (verify-swap.mjs, 2026-07-04): 2 EURC→USDC, the wallet's USDC balance rose +3.12254 = matching the Kit estimate.
// To switch it off again: set SWAP_ENABLED = false.
const SWAP_ENABLED = true

// ══ THE SWAP SCREEN - % slider + suggestion chips + a NUMPAD BOTTOM SHEET ══
// EZwallet's audience = newcomers and older people → by default they are NOT made to type digits: a SLIDER
// picks a % OF THE BALANCE ("how much of my money") + row 7 offers TAPPABLE ROUND NUMBERS.
// ADDED 07-20 (user request, overriding the earlier 07-17 "do not bring the numpad back"): tapping the AMOUNT on the
// "You pay" card → the numpad SLIDES UP FROM THE BOTTOM (like the PIN screen) for exact entry; as you type, the amount, the
// estimated output and the slider all follow; "Done"/the dim background closes it. The slider and chips are unchanged.
// ⚠️ Everything is computed in the TOKEN BEING PAID, not in USD (user decision 07-17c). The "~ $xx" line under the
// amount is only a convenience conversion - do NOT use it as the basis of any calculation.
// Row map (given by the user): 1 title · 2-6 You pay/You receive + Rate/Fee · 7 hints · 8 slider ·
// 9 the Swap button · 10 NavBar.
const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const decimalsFor = sym => (sym === 'cirBTC' ? 6 : 2)

function TokenRow({ sym, onClick }) {
  // Chips enlarged for older eyes (user decision 07-20 "make the elements bigger"): logo 32, text 19 (--fs-body)
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--color-gray)', borderRadius: 999, background: 'var(--color-white)', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 12px 5px 6px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)' }}>
      <img src={`/tokens/${sym.toLowerCase()}.png`} alt={sym} style={{ width: 32, height: 32, borderRadius: '50%' }} />
      <span className="num" style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{sym}</span>
      <Icon name="down2" size="var(--is-body)" color="var(--color-brand)" />
    </button>
  )
}

// Token picker popup - the same popup style as SendAmount's currency picker (anchored to the top half).
// Shows ALL 3 tokens (user decision: do not hide the token selected on the other side - picking the other side's token
// simply swaps the two sides, which selectToken already handles).
function TokenPicker({ current, onSelect, onClose }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={e => e.stopPropagation()}>
        <div className="popup-title">Select token</div>
        {SWAP_TOKENS.map(sym => (
          <button key={sym} onClick={() => { onSelect(sym); onClose() }} className={`btn ${sym === current ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src={`/tokens/${sym.toLowerCase()}.png`} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
            {sym}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Swap() {
  const { navigate } = useNav()                  // the row 10 Exit button → back to Service Hub
  const [fromSym, setFromSym] = useState('EURC') // default: the "out of USDC" rescue → swap another token INTO USDC
  const [toSym, setToSym] = useState('USDC')
  const [pct, setPct] = useState(0)              // the selected % OF BALANCE (0-100) - the single source of truth for the amount
  const [snapAmt, setSnapAmt] = useState(null)   // the ROUND amount the user tapped in row 7 (token units) - overrides pct
  const [estAmt, setEstAmt] = useState(null)
  // SEEDED FROM CACHE (07-31 - the user reported "swap loads slowly"): measured for real, a COLD Arc RPC call takes ~3.3s
  // (subsequent ones 130-360ms). The Swap screen used to start from {}, so "Available: …" sat frozen for
  // seconds on every open, even though the Send screen had just read the very same balances. It now reuses the module-level
  // cache (_balCache) like HomeSend/HomeReceive: show the previous number IMMEDIATELY, refresh in the background.
  const [balances, setBalances] = useState(() => {
    const c = cachedBalances(localStorage.getItem('ez_wallet_addr'))
    return c ? Object.fromEntries(c.map(tk => [tk.symbol, tk.amount])) : {}
  })
  const [rates, setRates] = useState(() => cachedRates())
  const [feeUsd, setFeeUsd] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState(false)   // true = a swap just completed → the button turns green to confirm
  const [picker, setPicker] = useState(null)
  const [pad, setPad] = useState(false)      // the numpad bottom sheet is open
  const [typed, setTyped] = useState('')     // the string being typed on the numpad (shown live on the You pay card)
  const padPrev = useRef(null)               // the amount before the numpad opened - the sheet's Back button restores it
  const debounceRef = useRef(null)

  const cur = getDisplayCurrency()
  const curSym = displaySymbol(cur)

  // SAFE wallet address: seeded quickly from localStorage, restored from Circle if missing (same as HomeSend).
  // Reading localStorage directly, as before → on mobile PWA ez_wallet_addr can be absent → empty balances →
  // overBalance always true → the Swap button never lights up.
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('ez_wallet_addr'))
  useEffect(() => { if (!walletAddress) ensureWalletAddress().then(a => a && setWalletAddress(a)).catch(() => {}) }, [])
  const walletId = localStorage.getItem('ez_wallet_id')

  // Available: USDC holds 1 back for network fees (Arc gas = USDC) - you cannot swap every last cent
  const hasBal = balances[fromSym] !== undefined
  const available = spendableOf(fromSym, balances[fromSym])

  // ── AMOUNT = % × available, UNLESS a round number was just tapped (snapAmt) ──
  // floorTo (not toFixed): toFixed rounds UP → 100% can produce more than the balance → the Kit answers "over balance".
  const amountNum = snapAmt !== null ? snapAmt : (hasBal ? floorTo(available * pct / 100, decimalsFor(fromSym)) : 0)

  // ── Converting to DISPLAY MONEY ($/€) ── rate = USD per token; display money = usd / rate[cur]
  const rateOf = sym => (rates && rates[sym]) || null
  const toDisplay = (tokenAmt, sym) => {
    const r = rateOf(sym), rc = rateOf(cur)
    return r && rc ? (tokenAmt * r) / rc : null
  }
  // v is currently a NUMBER OF DISPLAY-CURRENCY UNITS (already divided by the rate), while fmtDisplay expects a USD value → multiply
  // the rate back in and let fmtDisplay handle the symbol/decimals/separators per currency (VND differs completely).
  const fmtDisp = v => (v === null ? null : fmtDisplay(v * (rateOf(cur) || 1), cur, rates))

  const amountDisplay = toDisplay(amountNum, fromSym)

  // ── ROW 7: round-number suggestions - in the TOKEN BEING PAID (user decision 07-17c), NOT in USD ──
  // The chips are TAPPABLE (not "Release to use" - the user disliked that). Spec 07-17e "be generous with
  // hints": the TRIO floor·floor+0.5·ceil - 7.35 EURC → [7] [7.5] [8]. pct===100 = "swap everything" → no suggestions.
  const hints = (hasBal && pct < 100 && amountNum > 0 && !loading)
    ? roundHints(amountNum, available, decimalsFor(fromSym)) : []

  const overBalance = hasBal && amountNum > available + 1e-9
  const canSwap = SWAP_ENABLED && amountNum > 0 && !overBalance && !loading

  // ⚠️ A failed read writes NOTHING into balances (keeping "unknown" → showing "…"), never falling back to 0:
  // a fake 0 = "Available: 0" while the wallet has money (bug 07-17). Retry after 3s so it recovers once the RPC unclogs.
  function loadBalances() {
    if (!walletAddress) return
    let alive = true, retry
    const load = () => getTokenBalances(walletAddress)
      .then(ts => { if (!alive) return; const map = {}; ts.forEach(tk => { map[tk.symbol] = tk.amount }); setBalances(map) })
      .catch(() => { if (alive) retry = setTimeout(load, 3000) })
    load()
    return () => { alive = false; clearTimeout(retry) }
  }
  useEffect(loadBalances, [walletAddress])

  // Rate + fee (shown in the Rate/Fee block, which the spec requires to be ALWAYS visible)
  useEffect(() => { getDisplayRates().then(setRates).catch(() => {}) }, [])
  useEffect(() => { estimateFeeUsd().then(setFeeUsd).catch(() => {}) }, [])

  // Estimated output (debounced 600ms) - dragging the slider fires constantly, so it MUST be debounced or it floods the Kit API
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!amountNum || amountNum <= 0) { setEstAmt(null); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await estimateSwap({ walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
        // amountOut = the real token decimal (the server already converted from base units - the raw estimatedAmount is base units, do NOT show it directly)
        if (res?.amountOut) { setEstAmt(res.amountOut); setError('') }
        else if (res?.error) { setEstAmt(null); setError(res.error) }
        else setEstAmt(null)
      } catch (e) { setEstAmt(null); setError(e.message) }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [amountNum, fromSym, toSym])

  function resetAmount() { setPct(0); setSnapAmt(null); setEstAmt(null); setError(''); setTyped('') }

  // ── NUMPAD bottom sheet: tap the You pay amount → open it; whatever is typed applies immediately (snapAmt + the slider follows) ──
  function openPad() {
    if (!hasBal || loading) return
    if (success) { setSuccess(false); setStatus('') }
    padPrev.current = { snapAmt, pct }   // so the Back button can discard what was typed
    // Seed the typed string with the current amount (if any) so backspacing can edit it, instead of retyping from scratch
    setTyped(amountNum > 0 ? String(amountNum) : '')
    setPad(true)
  }
  function cancelPad() {   // Back: restore the amount as it was before the numpad opened
    const p = padPrev.current
    if (p) { setSnapAmt(p.snapAmt); setPct(p.pct) }
    setPad(false)
  }
  function applyTyped(s) {
    setTyped(s)
    const n = parseFloat(s)
    setSnapAmt(s === '' ? 0 : (isNaN(n) ? 0 : n))
    if (available > 0) setPct(Math.max(0, Math.min(100, ((isNaN(n) ? 0 : n) / available) * 100)))
  }
  function onPadKey(k) {
    if (k === 'BACK') { applyTyped(typed.slice(0, -1)); return }
    if (k === '.') {
      if (typed.includes('.')) return
      applyTyped(typed === '' ? '0.' : typed + '.')
      return
    }
    // Block absurdly long numbers: at most 9 integer digits, decimals per token (2 or 6)
    const [int = '', dec] = typed.split('.')
    if (dec !== undefined) { if (dec.length >= decimalsFor(fromSym)) return }
    else if (int.length >= 9) return
    applyTyped(typed === '0' ? k : typed + k)
  }

  // Dragging the slider → clear the old snap + clear the old success state
  function onPct(p) {
    if (success) { setSuccess(false); setStatus('') }
    setSnapAmt(null)
    setPct(p)
  }

  // Tapping a round-number chip → lock in that exact amount. The number is already in token units (roundHints works in tokens)
  // so NOTHING is converted - just clamp it for safety, then move pct so the thumb lines up.
  function pickHint(tokenAmt) {
    const final = Math.min(tokenAmt, floorTo(available, decimalsFor(fromSym)))
    if (!(final > 0)) return
    setSnapAmt(final)
    if (available > 0) setPct(Math.max(0, Math.min(100, (final / available) * 100)))
  }

  // Reverse direction: 180° for the button (spec) + reset the amount (the two token balances differ → keeping the old % is meaningless)
  const [flip, setFlip] = useState(0)
  function swapDir() { setFromSym(toSym); setToSym(fromSym); resetAmount(); setFlip(f => f + 180) }

  function selectToken(side, sym) {
    if (side === 'from') { if (sym === toSym) setToSym(fromSym); setFromSym(sym) }
    else { if (sym === fromSym) setFromSym(toSym); setToSym(sym) }
    resetAmount()
  }

  async function handleSwap() {
    setLoading(true); setError(''); setSuccess(false); setStatus('Preparing…')
    const beforeOut = balances[toSym] || 0   // the RECEIVING token's balance before the swap → used to confirm on-chain
    try {
      // A 60' token may have expired mid-session → refresh it BEFORE creating a challenge that needs the PIN
      const { userToken, encryptionKey } = await refreshSession()
      const res = await executeSwap({ userToken, walletId, walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
      if (res.error) throw new Error(res.error)
      setStatus('Enter PIN...')
      await executeChallenge(await getSDK(), userToken, encryptionKey, res.challengeId)

      // ✅ STATE 1 - the PIN is signed and the swap has been SUBMITTED to Arc ("successfully requested")
      // ONE SINGLE NOTIFICATION per swap (user decision 07-20: "Swapped..." + "Swap complete·received" were merged
      // into one) → "Swapped X EURC to ~Y USDC (complete)". NotifArea no longer adds a separate received notification
      // for the swap's incoming leg (that outHashes branch is disabled over there).
      const outTxt = res.amountOut ? ` to ~${parseFloat(res.amountOut).toFixed(decimalsFor(toSym))} ${toSym}` : ` to ${toSym}`
      addNotif(`Swapped ${amountNum} ${fromSym}${outTxt} (complete)`, 'sent', null, `swap-${Date.now()}`)   // NotifArea (Home)
      resetAmount()
      setSuccess(true); setStatus('Swap submitted')
      setLoading(false)

      // ✅ STATE 2 - ON-CHAIN confirmation (Arc finality is <1s, leaving room for RPC lag): poll until the RECEIVING
      // token's balance rises, then switch the button to "Swap successful". If the rise is not seen in time → keep "Swap submitted".
      let confirmed = false
      for (let i = 0; i < 6 && !confirmed; i++) {
        await new Promise(r => setTimeout(r, 1500))
        try {
          const ts = await getTokenBalances(walletAddress)
          const map = {}; ts.forEach(tk => { map[tk.symbol] = tk.amount }); setBalances(map)
          if ((ts.find(t => t.symbol === toSym)?.amount || 0) > beforeOut + 1e-9) confirmed = true
        } catch {}
      }
      setStatus(confirmed ? 'Swap successful' : 'Swap submitted')
      setTimeout(() => { setSuccess(false); setStatus('') }, 3500)   // auto-hide, back to the plain "Swap" button
    } catch (e) {
      setLoading(false)
      if (e?.code === 155701) { setStatus(''); return }  // the user cancelled the PIN themselves → stay silent
      // Swap failed → the same merged notification, ending in "(failed)" (user decision 07-20)
      addNotif(`Swapped ${amountNum} ${fromSym} to ${toSym} (failed)`, 'error', null, `swap-fail-${Date.now()}`)
      const msg = circleErrorMessage(e)
      setError(msg); setStatus('')
    }
  }

  // The card = a PALE GREY BACKGROUND, NO BORDER, large corner radius (user decision 07-17c, matching the mockup the user sent).
  // It used to be a grey border on white → which sank into .screen's white background and did not read as a block.
  // The token chip inside stays WHITE → standing out on the grey card (no heavy border needed).
  const CARD = { border: 'none', borderRadius: 20, background: 'var(--color-surface)', padding: '14px 16px' }

  // ONE MINIMAL 3-row card (user decision 07-20 "strip it back so the text can be bigger for older users"):
  //   the You pay/receive label
  //   [token chip ▼]  ————————  THE BIG NUMBER (the token name after the number was dropped - the chip already says it)
  //   Available: xx TOKEN  ————  ~ $converted
  // Secondary text raised to --fs-item 17. The big number = base 52, shrinking by REAL WIDTH (useFitFontSize - user decision
  // 07-22c: guessing by character count (the old amountFontSize) was wrong because the card shares its row with the chip, so 7 characters
  // ("1000000") already overflowed into "100000…" without shrinking - measuring on canvas now shrinks it to fit exactly).
  // onAmount (the You pay card only): tapping the NUMBER AREA (including the empty space right of the chip) → opens the numpad.
  // typing: the string being typed on the numpad (null = numpad closed).
  function SideCard({ label, sym, onPick, amount, disp, onAmount, typing, balLabel, idle }) {
    const known = amount !== null
    const balKnown = balances[sym] !== undefined
    const isTyping = typing !== null && typing !== undefined
    // idle (You receive, user decision 07-23): NO amount entered → nothing to estimate → leave it COMPLETELY EMPTY.
    // "…" is reserved for "not readable yet / loading" (an amount was entered, waiting on the estimate) - it used to show
    // "…" while idle too, which looked like a load that never finished and sat oddly against the big caret on You pay.
    // Drop redundant trailing decimal zeros (user decision 07-28: "10.00" is silly for a whole number) - keep decimals ONLY WHEN PRESENT
    // ("10"→10, "10.50"→10.5, "10.25"→10.25). Only the part after the dot is trimmed, the integer is untouched.
    const trimZeros = s => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s)
    const amtStr = isTyping ? (typing || '0') : known ? trimZeros(amount.toFixed(decimalsFor(sym))) : idle ? '' : '…'
    const amtColor = overBalance ? 'var(--color-error)'
      : isTyping ? (typing ? 'var(--color-content)' : 'var(--color-faint)')
      : known && amount > 0 ? 'var(--color-content)' : 'var(--color-faint)'
    // A card WITH onAmount (You pay) but NO amount yet (nothing typed, or 0) → hide "0.00" and leave room
    // only for the caret (user decision 07-22b: "0.00" NEXT TO a blinking caret looks redundant and cluttered, pick one).
    // The "You receive" card has no onAmount → it always shows amtStr as-is (0.00 / … / a real number), unchanged.
    const hasValue = isTyping ? !!typing : known && amount > 0
    const showZero = onAmount && !hasValue
    // The _ caret appears ONLY WHILE TYPING (numpad open) or when the field is EMPTY (the tap hint) - once there is a number it is OFF
    // (user decision 07-28: "10.00_" with a caret blinking after a finished number looks nonsensical).
    const showCaret = onAmount && (isTyping || !hasValue)
    const [fitRef, fitSize] = useFitFontSize((showZero ? '' : amtStr) + (showCaret ? '_' : ''), { max: 52, min: 18 })
    return (
      <div style={{ ...CARD, minWidth: 0, height: 'calc(20dvh - 5px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
        {/* Weight hierarchy (user decision 07-17e "important things get bold"): the card's role label = medium.
            The card is 2 ROWS tall, so secondary text goes to --fs-body 19 and the big number to base 52 (user decision 07-20, big for older eyes) */}
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <TokenRow sym={sym} onClick={onPick} />
          {/* THE AMOUNT FIELD. The white box's COLOUR/BORDER around the number was REMOVED (user decision 07-22: a bordered box looks rigid and long
              numbers easily spill outside the frame = ugly) - BUT ITS DIMENSIONS ARE KEPT (minHeight 56 + padding
              2/12) so the card does NOT get shorter (bug 07-22d: removing minHeight/padding as well dropped the whole You
              pay/You receive block from 2 rows to ~1.5 - the user re-confirmed: 2 rows/2 rows/Rate 0.5
              rows must stay exactly as they were, only hide the background/border, never touch the sizing). The "tappable"
              signal is instead a BLINKING CARET after the number (the "You pay" card has onAmount). The "You
              receive" card has no onAmount → no caret, no box, completely bare (as before).
              ref={fitRef} measures the width actually left beside the chip so the text shrinks to fit; overflow:hidden is
              the last-resort net (it only kicks in when a number is longer than even the smallest size). */}
          <div ref={fitRef} onClick={onAmount} style={{
            flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            cursor: onAmount ? 'pointer' : 'default',
            ...(onAmount ? { padding: '2px 12px', minHeight: 56 } : null),
          }}>
            <span className="num" style={{ fontSize: fitSize, fontWeight: 'var(--fw-light)', lineHeight: 1.05, color: amtColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {showZero ? null : amtStr}
              {showCaret && <span className="caret">_</span>}
            </span>
          </div>
        </div>
        {/* The secondary row = --fs-item 17 ("medium-small"), SMALLER than the You pay/receive label at 19 ("medium") - user decision
            07-21: making them equal destroyed the heavy/light hierarchy. Available and ~$ share the same size. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* balLabel: You receive = "Balance", You pay = null (hidden - user decision 07-22f: the Available line was
                dropped from You pay). A balance that cannot be read yet → "…", NEVER a drawn 0 (bug 07-17). */}
            {balLabel ? <>{balLabel}: <span className="num" style={{ color: 'var(--color-brand)', fontWeight: 'var(--fw-medium)' }}>
              {balKnown ? `${spendableOf(sym, balances[sym]).toFixed(decimalsFor(sym))} ${sym}` : '…'}
            </span></> : null}
          </span>
          <span className="num" style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{disp !== null ? `~ ${fmtDisp(disp)}` : ''}</span>
        </div>
      </div>
    )
  }

  // A real Arc gas fee is usually < 1 cent → .toFixed(2) renders "$0.00" = looks broken, or free.
  // A fee > 0 that rounds to 0 says "< $0.01" plainly instead (honest, and not alarming).
  // ⚠️ The "too small to show" threshold must follow EACH CURRENCY's decimals, do not hardcode 0.01: VND has no
  // decimals so its smallest unit is 1 ₫ - hardcoding 0.01 would treat a 13 ₫ fee as "showable" and print
  // "13,00 ₫" (nobody writes VND with decimals). The symbol is left to fmtDisplay too, because ₫ goes AFTER the number.
  const feeTxt = (() => {
    if (feeUsd === null) return '…'
    const rc = rateOf(cur) || 1
    const min = 10 ** -decimalsOfCurrency(cur)      // 0.01 for USD/EUR · 1 for VND
    const v = feeUsd / rc                            // the fee converted into the display currency
    if (v <= 0) return `~${fmtDisplay(0, cur, rates)}`
    return v < min ? `<${fmtDisplay(min * rc, cur, rates)}` : `~${fmtDisplay(feeUsd, cur, rates)}`
  })()

  const estNum = estAmt !== null ? parseFloat(estAmt) : null
  const rateTxt = (() => {
    // The REAL rate from the Kit quote once available (provider fees included); until then, the market rate
    if (estNum && amountNum > 0) return `1 ${fromSym} ~ ${(estNum / amountNum).toFixed(4)} ${toSym}`
    const rf = rateOf(fromSym), rt = rateOf(toSym)
    return rf && rt ? `1 ${fromSym} ~ ${(rf / rt).toFixed(4)} ${toSym}` : '…'
  })()

  return (
    <div className="screen">
      {picker && <TokenPicker current={picker === 'from' ? fromSym : toSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      {/* The numpad bottom sheet (user's layout 07-20): slides up TAKING half of row 6 + rows
          7-10, GREY background + WHITE keys, NO wasted space at the top, and it does NOT dim the main screen.
          Inside the sheet: numpad 30dvh + the Back/Done button row 10dvh (aligned with .row10-dual) + 5dvh of padding.
          Back = discard what was typed; Done / tapping outside = keep it. */}
      {pad && (
        <div className="sheet-overlay" onClick={() => setPad(false)}>
          <div className="sheet numpad-gray" onClick={e => e.stopPropagation()}>
            {/* 24px of grey padding on top + SHORTER keys (07-20c: numpad 5.5 parts instead of 6 - the old keys were too big),
                a 0.5 gap before the button row; Back/Done KEEP the row 9-10 edge (flex 2 = 85-95dvh). */}
            <div style={{ flex: 5.5, minHeight: 0, paddingTop: 24 }}>
              <Numpad onKey={onPadKey} showComma />
            </div>
            <div style={{ flex: 0.5 }} />
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-secondary" style={{ width: '44%' }} onClick={cancelPad}>Back</button>
              <button className="btn btn-primary" style={{ width: '44%' }} onClick={() => setPad(false)}>Done</button>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      )}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Swap
      </div>

      {/* The rows 2→9 AREA is split into 3 BLOCKS with justify-content:space-between (user decision 07-20e): the 2 gaps
          between blocks are AUTOMATICALLY EQUAL (the You-pay/receive block ↔ the hint+slider block ↔ the Swap button), with no
          lopsided empty space. paddingBottom 2dvh = matching the action-card margin-bottom on Send/Receive. */}
      <div style={{ gridRow: '2 / 10', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>

        {/* BLOCK 1: You pay ⇅ You receive + Fee/Rate */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <SideCard label={'You pay'} sym={fromSym} onPick={() => setPicker('from')} amount={hasBal ? amountNum : null} disp={amountDisplay}
            onAmount={openPad} typing={pad ? typed : null} balLabel="Available" />

          {/* The reverse button - OVERLAPPING the gap between the 2 cards, rotating 180° on each tap. A BRAND GRADIENT circle +
              a WHITE icon (user decision 07-29, reversing the 07-22h pale-blue/dark-blue-icon version) → same family as
              .btn-primary/.action-card.primary; shadow .35 per the gradient-button rule. margin -17/-17 on a
              44px button → it occupies 10px in flow = a 10px GAP between the cards, with the button bridging it (17px over each). */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-17px 0', position: 'relative', zIndex: 3 }}>
            <button onClick={swapDir} aria-label={'Reverse direction'}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--grad-brand)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transform: `rotate(${flip}deg)`, transition: 'transform .3s ease' }}>
              <Icon name="trade" size="var(--is-num)" color="var(--color-white)" />
            </button>
          </div>

          <SideCard label={'You receive'} sym={toSym} onPick={() => setPicker('to')} amount={estNum} disp={estNum !== null ? toDisplay(estNum, toSym) : null} balLabel="Balance" idle={!(amountNum > 0)} />

          {/* Fee + Rate - one SMALL fs-item 17 line: Rate aligned LEFT · Fee aligned RIGHT, the figures in BLACK so they stand out */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10, padding: '0 16px' }}>
            <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Rate: <span className="num" style={{ color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>{rateTxt}</span>
            </span>
            <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
              Fee: <span className="num" style={{ color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>{feeTxt}</span>
            </span>
          </div>
        </div>

        {/* BLOCK 2: round-number chips + the % slider - one group.
            ⚠️ The chip row MUST have a FIXED HEIGHT (height 40, never sized by its content): when `hints.map` is
            empty the row collapses to 0 → block 2 shrinks → space-between pushes the whole slider group down every time a hint
            appears/disappears (bug reported 07-21). Reserving the space = the slider STAYS PUT while the chips merely fade in and out. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1dvh', minWidth: 0 }}>
          {/* A FIXED height 40 row (so the slider does not jump - see the note below): with an amount → round-number chips;
              with NO amount chosen → the row stays EMPTY (user decision 07-23: the "Slide to adjust…" hint pill was dropped, the
              instruction MOVED ONTO THE SWAP BUTTON as "Slide or tap here to enter", which opens the numpad). */}
          <div style={{ height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0 }}>
            {hints.length ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {hints.map(v => (
                  <button key={v} onClick={() => pickHint(v)}
                    style={{ border: '1.5px solid var(--color-brand)', background: 'var(--color-white)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', minWidth: 0 }}>
                    <span className="num" style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>{fmtHint(v, decimalsFor(fromSym))}</span>
                    <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-brand)' }}> {fromSym}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ minWidth: 0 }}>
            <PctSlider pct={Math.round(pct)} onChange={onPct} disabled={!hasBal || loading} />
          </div>
        </div>

        {/* BLOCK 3: the Swap button - the default `.btn` pill (radius 50, height 6dvh) CONCENTRIC with the action-card
            Scan QR (Send) / Create QR (Receive) - user decision 07-21, reversing the 07-20e version (a square 8dvh looked
            out of step with the other screens). How it lines up: this block copies the geometry of `.action-grid` exactly
            (`height 8dvh` + `marginBottom 2dvh`, last in the flex space-between of the 2/10 area) → a band of
            80→88dvh, with the 6dvh button centred in it ⇒ its CENTRE at 84dvh = exactly the action-card centre. Do NOT add
            paddingBottom to the parent, the marginBottom here already reserves the 2dvh.
            The button remains the ONLY place status is shown. Priority: error > status > hint/'Swap'.
            NO amount entered yet (user decision 07-23, replacing the old hint pill in the chip row): the button reads
            "Slide or tap here to enter" and tapping it opens the numpad (openPad) instead of swapping. */}
        <div style={{ height: '8dvh', marginBottom: '2dvh', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {(() => {
            const needAmount = !error && !status && !(amountNum > 0)   // no amount chosen → the button becomes the hint that opens the numpad
            // 'Swap submitted' (sent, awaiting confirmation) = PALE green · 'Swap successful' (the received token balance has
            // risen) = SOLID green → telling the 2 steps apart avoids confusion (user decision 07-28, they used to share a colour).
            const confirmed = status === 'Swap successful'
            return (
          <button className={`btn ${error ? 'btn-secondary' : success ? 'btn-success' : 'btn-primary'}`}
            style={{
              // Width = 3/4 of the SCREEN width (user decision 07-29: every button STANDING ALONE gets the same size for consistency -
              // like "Hold to show tokens" on HomeSend + "Tap to copy" on HomeReceive). min(75vw, ...) anchors
              // straight to .screen, not to a % of the parent frame that is inset 20px.
              width: 'min(75vw, calc(var(--screen-max) * 0.75))', overflow: 'hidden',
              ...(error ? { color: 'var(--color-error)', borderColor: 'var(--color-error)' } : null),
              ...(success ? { opacity: confirmed ? 1 : 0.6 } : null),
            }}
            disabled={needAmount ? (!hasBal || loading) : (!canSwap && !error)}
            onClick={needAmount ? openPad : handleSwap}>
            {/* Hint text = fs-item 17 (the app-wide HINT SIZE rule - .btn's default 21 gets ellipsised) */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', ...(needAmount ? { fontSize: 'var(--fs-item)' } : null) }}>
              {success && <Icon name="check" size="var(--is-md-lg)" color="var(--color-white)" />}
              {error || status || (needAmount ? 'Slide or tap here to enter' : 'Swap')}
            </span>
          </button>
            )
          })()}
        </div>
      </div>

      {/* ROW 10 = THE EXIT BUTTON, not the NavBar (08-12): Swap now opens FROM the Service Hub, so it no
          longer has a tab of its own - it needs an obvious way out, never trapping the user in the screen. RED (user decision):
          the row 9 Swap button is already a blue gradient, and a blue Exit would make two identical-looking buttons sitting
          next to each other → easy to mis-tap. Red + the word "Exit" at .btn size (fs-md-lg 21) so older users spot it at once.
          ⚠️ IT IS TEXT, NOT A PILL BUTTON (user fix 08-13): the first version used .btn-error = a huge red gradient
          block, which looked heavy and fought with the blue gradient Swap button right above. What was wanted: the word "Exit" in red,
          bold, centred on row 10 - the same language as the NavBar text labels it replaced.
          ⚠️ Do NOT use .row10-single on this screen: that class is position:absolute anchored at centre 90dvh = THE
          ROW 9 POSITION (it is for screens whose row 9 is empty - About/Currency/Security). Swap's row 9 already
          HAS the "Swap" button → they would end up stuck together. gridRow 10 = exactly the 90-100dvh band the NavBar just
          vacated. The touch area covers the WHOLE ROW (not just the text width) so older users can hit it easily. */}
      <div className="row-10" style={{ display: 'flex' }}>
        <button onClick={() => navigate('ServiceHub')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-bold)',
            color: 'var(--color-error)', WebkitTextFillColor: 'var(--color-error)',
            WebkitTapHighlightColor: 'transparent',
          }}>Exit</button>
      </div>
    </div>
  )
}
