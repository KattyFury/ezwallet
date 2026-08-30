export function fmtVND(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VND'
}

// ⚠️ Gas on Arc is paid in USDC → ALWAYS hold some USDC back as unspendable (sending/swapping),
// otherwise a customer taps "send everything"/"swap everything" and is left with no fee money, wallet stuck (user decision 2026-07-03).
// Applies to USDC only (the gas token); EURC/cirBTC can be spent to zero. Used EVERYWHERE "available" is computed.
// Lowered 1 → 0.1 (user decision 08-25): 1 USDC was far more than any real gas cost, holding back too much of a small balance.
export const GAS_RESERVE_USDC = 0.1

// Is this address the user's own wallet? (user decision 07-31: "you must not let me send money to my own wallet").
// Sending to yourself only burns the network fee, leaves the balance unchanged, and clutters
// history - so block it right at address ENTRY instead of letting the user find out after losing the fee.
// No address in localStorage → return false (do NOT block by mistake); the SendAmount screen has a final
// guard using the address fetched from Circle, so it is still safe.
export function isOwnAddress(addr) {
  const me = (localStorage.getItem('ez_wallet_addr') || '').trim().toLowerCase()
  return !!me && !!addr && addr.trim().toLowerCase() === me
}
export function spendableOf(symbol, balance) {
  const b = balance || 0
  return symbol === 'USDC' ? Math.max(0, b - GAS_RESERVE_USDC) : b
}

// Amount font size AUTO-SHRINKS with string length (~0.5em per character) so a long number does NOT overflow or break
// the layout (e.g. typing "0.00000001"). base = the maximum size (px); maxChars = how many characters fit exactly at base;
// beyond that it shrinks linearly, with a minPx floor so it never becomes unreadable.
export function amountFontSize(str, base, maxChars, minPx = 20) {
  const len = (str || '').length || 1
  return len <= maxChars ? base : Math.max(minPx, Math.round(base * maxChars / len))
}

// Round DOWN to `dec` decimals - used by the Max/100% button: toFixed() rounds UP, so the result
// can exceed the real balance → rejected as "over balance". Flooring is always ≤ the balance, so it can be sent/swapped.
export function floorTo(n, dec) {
  const p = 10 ** dec
  return Math.floor((n || 0) * p) / p
}

// FRIENDLY currency symbols for everyday users: USDC≈USD, EURC≈EUR (stablecoins, 1:1).
// Older people know $/€ but not USDC/EURC → only the DISPLAYED TEXT changes (the prefix, e.g. "$127.66");
// the chain/API/storage still use the real symbols (USDC/EURC). ONLY for DISPLAYED MONEY (totals, conversions,
// fees) - NOT for real token names (USDC/EURC/cirBTC still appear as themselves in the token list).
// ⚠️ DISPLAY CURRENCY CONFIG - the SINGLE source of truth for symbol / decimals / number formatting.
// Adding a currency = adding one line here; do NOT scatter "if it is VND then..." branches across the screens.
//   symbol : the symbol to display
//   after  : true = the symbol goes AFTER the number (1.250.000 ₫ - correct Vietnamese typography).
//            false = BEFORE ($127.66). This is exactly why a shared fmtDisplay() exists:
//            screens used to concatenate `${symbol}${number}` themselves, so the symbol was always in front.
//   dec    : decimal places. VND = 0 (nobody writes "1.250.000,00 ₫").
//   locale : separator rules - 'vi-VN' groups thousands with a DOT (1.250.000),
//            'en-US' with a comma (1,250,000).
const CURRENCY_CFG = {
  USDC: { symbol: '$', after: false, dec: 2, locale: 'en-US' },
  EURC: { symbol: '€', after: false, dec: 2, locale: 'en-US' },
  VND:  { symbol: '₫', after: true,  dec: 0, locale: 'vi-VN' },
}
const cfgOf = cur => CURRENCY_CFG[cur] || CURRENCY_CFG.USDC

export function displaySymbol(sym) { return CURRENCY_CFG[sym]?.symbol || sym }
// Does the symbol trail the number? (BalanceHeader renders the symbol separately for the big-number layout, so it needs to know)
export function symbolAfter(cur) { return cfgOf(cur).after }
export function decimalsOfCurrency(cur) { return cfgOf(cur).dec }

// A COMPLETE money string (number + symbol on the right side) from a USD value. Use this instead of
// concatenating `${displaySymbol(cur)}${displayNum(...)}` by hand - by hand puts the VND symbol on the wrong side.
export function fmtDisplay(usd, cur, rates) {
  const c = cfgOf(cur)
  const n = displayNum(usd, cur, rates)
  return c.after ? `${n} ${c.symbol}` : `${c.symbol}${n}`
}

// A real TOKEN amount (unlike fmtDisplay/displayNum, which are MONEY CONVERTED into the display currency).
// Decimals by token: cirBTC 6, everything else 2 - the same scale as decimalsFor() in Swap.jsx.
// ⚠️ USER BUG REPORT 2026-08-25: the faucet notification read "received 0.00 cirBTC" because that code used a hardcoded
// toFixed(2) for EVERY token, while the Circle faucet pays cirBTC as dust (0.000549) → rounded to 0.00, so the
// user thought the money never arrived. So: any amount smaller than its own decimal step widens to 8 decimals and then
// trims the trailing zeros - slightly longer beats showing a zero that is not true.
export function fmtTokenAmount(n, symbol) {
  const v = Number(n) || 0
  const dec = symbol === 'cirBTC' ? 6 : 2
  const trim = str => (str.includes('.') ? str.replace(/0+$/, '').replace(/\.$/, '') : str)
  if (v > 0 && v < 10 ** -dec) return trim(v.toFixed(8))
  return dec > 2 ? trim(v.toFixed(dec)) : v.toFixed(dec)
}

// Money formatted as ONE STRING IN ONE STYLE: "$2" (not "2 USD" with a bold number and a regular unit -
// user decision 2026-07-03: differing font weight/size between the number and the unit is a BUG). USD/EUR go FIRST
// as a symbol; real tokens (USDC/EURC/cirBTC) go AFTER, separated by a space.
export function fmtMoney(amount, currency) {
  if (currency === 'USD' || currency === 'USDC') return `$${amount}`
  if (currency === 'EUR') return `€${amount}`
  return `${amount} ${currency}`
}

// The app-wide display currency (balances, conversions, fees) - chosen on the Currency screen.
// USDC/EURC = stablecoins genuinely held in the wallet. VND = fiat, for DISPLAY/INPUT convenience only -
// what actually moves on-chain is still USDC (see SendAmount/SendConfirm). CNY stays locked because
// its rate is not wired up (to enable: add 'CNY' here + one CURRENCY_CFG line + a rate in chain.js fetchPrices).
// ⛔ VND TURNED OFF 2026-08-12 (user decision) - removing it from this list means any device that ALREADY stored
// ez_currency='VND' falls back to USDC by itself, with nothing for the user to clear by hand.
const SUPPORTED_CURRENCIES = ['USDC', 'EURC']
export function getDisplayCurrency() {
  const c = localStorage.getItem('ez_currency')
  return SUPPORTED_CURRENCIES.includes(c) ? c : 'USDC'
}

// The number alone (no symbol) in the display currency - for a big-number layout with the symbol rendered separately.
// usd = the USD value (from token.usd / getDisplayRates, the same source). rates = { USDC:1, EURC:~1.08, cirBTC } (USD per unit).
// Converting = usd / rate[cur]: cur=USDC → the usd itself ($); cur=EURC → usd/1.08 (€). Stablecoins come out EXACTLY 1:1.
export function displayNum(usd, cur, rates) {
  const rate = (rates && rates[cur]) || 1
  const c = cfgOf(cur)
  return ((usd || 0) / rate).toLocaleString(c.locale, { minimumFractionDigits: c.dec, maximumFractionDigits: c.dec })
}
