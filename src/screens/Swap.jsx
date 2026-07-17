import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import PctSlider from '../components/PctSlider'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession, ensureWalletAddress } from '../circle'
import { getTokenBalances, getDisplayRates, cachedRates, estimateFeeUsd } from '../chain'
import { spendableOf, floorTo, getDisplayCurrency, displaySymbol } from '../data'
import { roundHint } from '../roundHint'
import { addNotif } from '../notif'
import { t } from '../i18n'

// ✅ SWAP execute qua ADAPTER.execute(intent có chữ ký) — đúng cách, adapter settlement ghi
// có USDC về ví (xem HANDOFF mục SWAP + functions/api/_swapCore.js). VERIFY bằng eth_simulateV1
// (verify-swap.mjs, 2026-07-04): 2 EURC→USDC, số dư USDC ví TĂNG +3.12254 = khớp Kit estimate.
// Tắt lại nếu cần: đổi SWAP_ENABLED = false.
const SWAP_ENABLED = true

// ══ MÀN SWAP — KHÔNG BÀN PHÍM SỐ (user chốt 07-17, đập đi xây lại) ══
// Đối tượng EZwallet = người mới + người lớn tuổi → KHÔNG bắt gõ từng chữ số. Thay bằng THANH TRƯỢT
// chọn % SỐ DƯ ("kéo bao nhiêu % tài sản") + hàng GỢI Ý SỐ CHẴN để thả tay vào số đẹp.
// Bản đồ hàng (user giao): 1 tiêu đề · 2-6 You pay/You receive + Rate/Fee · 7 hint · 8 slider ·
// 9 nút Swap · 10 NavBar. ĐỪNG nhét lại Numpad vào đây.
const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const decimalsFor = sym => (sym === 'cirBTC' ? 6 : 2)

function TokenRow({ sym, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--color-gray)', borderRadius: 999, background: 'var(--color-white)', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 12px 5px 6px' }}>
      <img src={`/tokens/${sym.toLowerCase()}.png`} alt={sym} style={{ width: 28, height: 28, borderRadius: '50%' }} />
      <span className="num" style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{sym}</span>
      <Icon name="down2" size="var(--is-item)" color="var(--color-muted)" />
    </button>
  )
}

// Popup chọn token — cùng kiểu popup tiền tệ của SendAmount (neo nửa trên).
// Hiện ĐỦ 3 token (user chốt: đừng ẩn token đang ở phía kia — chọn trùng phía kia
// thì 2 phía tự đảo cho nhau, selectToken đã xử lý).
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
  const [fromSym, setFromSym] = useState('EURC') // mặc định: cứu cánh "hết USDC" → đổi token khác VỀ USDC
  const [toSym, setToSym] = useState('USDC')
  const [pct, setPct] = useState(0)              // % SỐ DƯ đang chọn (0-100) — nguồn sự thật duy nhất của số tiền
  const [dragging, setDragging] = useState(false)
  const [snapAmt, setSnapAmt] = useState(null)   // số tiền CHẴN đã chốt khi thả tay (đơn vị token) — ghi đè pct
  const [estAmt, setEstAmt] = useState(null)
  const [balances, setBalances] = useState({})
  const [rates, setRates] = useState(() => cachedRates())
  const [feeUsd, setFeeUsd] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState(false)   // true = vừa swap xong → nút xanh lá báo thành công
  const [picker, setPicker] = useState(null)
  const debounceRef = useRef(null)

  const cur = getDisplayCurrency()
  const curSym = displaySymbol(cur)

  // Địa chỉ ví AN TOÀN: seed nhanh từ localStorage, tự khôi phục từ Circle nếu thiếu (giống HomeSend).
  // Đọc thẳng localStorage như trước → trên PWA mobile ez_wallet_addr có thể vắng → balances rỗng →
  // overBalance luôn true → nút Swap không sáng.
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('ez_wallet_addr'))
  useEffect(() => { if (!walletAddress) ensureWalletAddress().then(a => a && setWalletAddress(a)).catch(() => {}) }, [])
  const walletId = localStorage.getItem('ez_wallet_id')

  // Khả dụng: USDC chừa lại 1 làm phí mạng (gas Arc = USDC) — không cho swap hết
  const hasBal = balances[fromSym] !== undefined
  const available = spendableOf(fromSym, balances[fromSym])

  // ── SỐ TIỀN = % × khả dụng, TRỪ KHI vừa thả tay vào số chẵn (snapAmt) ──
  // floorTo (không toFixed): toFixed làm tròn LÊN → 100% có thể ra số > số dư → Kit trả "vượt số dư".
  const amountNum = snapAmt !== null ? snapAmt : (hasBal ? floorTo(available * pct / 100, decimalsFor(fromSym)) : 0)

  // ── Quy đổi TIỀN HIỂN THỊ ($/€) ── rate = USD/1 token; tiền hiển thị = usd / rate[cur]
  const rateOf = sym => (rates && rates[sym]) || null
  const toDisplay = (tokenAmt, sym) => {
    const r = rateOf(sym), rc = rateOf(cur)
    return r && rc ? (tokenAmt * r) / rc : null
  }
  const fromDisplay = (dispAmt, sym) => {
    const r = rateOf(sym), rc = rateOf(cur)
    return r && rc ? (dispAmt * rc) / r : null
  }
  const fmtDisp = v => (v === null ? null : `${curSym}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  const availDisplay = hasBal ? toDisplay(available, fromSym) : null
  const amountDisplay = toDisplay(amountNum, fromSym)

  // ── HÀNG 7: gợi ý số chẵn ──
  // CHỈ khi ĐANG KÉO (chữ "Release to use" = thả tay là ăn) và CHƯA kéo hết.
  // pct===100 = "đổi hết" → gợi ý số nhỏ hơn là sai ý user (xem roundHint.js).
  const hintDisplay = (dragging && pct < 100 && amountDisplay !== null && availDisplay !== null)
    ? roundHint(amountDisplay, availDisplay) : null

  const overBalance = hasBal && amountNum > available + 1e-9
  const canSwap = SWAP_ENABLED && amountNum > 0 && !overBalance && !loading

  // ⚠️ Đọc hỏng → KHÔNG ghi gì vào balances (giữ "chưa biết" → hiện "…"), đừng để rơi về 0:
  // 0 giả = "Available: 0" dù ví đang có tiền (bug 07-17). Thử lại sau 3s để tự hồi khi RPC hết nghẽn.
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

  // Tỷ giá + phí (hiện ở khối Rate/Fee, spec yêu cầu LUÔN hiện)
  useEffect(() => { getDisplayRates().then(setRates).catch(() => {}) }, [])
  useEffect(() => { estimateFeeUsd().then(setFeeUsd).catch(() => {}) }, [])

  // Ước tính số nhận (debounce 600ms) — kéo slider bắn liên tục nên PHẢI debounce, kẻo dội API Kit
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!amountNum || amountNum <= 0) { setEstAmt(null); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await estimateSwap({ walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
        // amountOut = decimal token thật (server đã quy từ base units — estimatedAmount thô là base units, ĐỪNG hiện thẳng)
        if (res?.amountOut) { setEstAmt(res.amountOut); setError('') }
        else if (res?.error) { setEstAmt(null); setError(res.error) }
        else setEstAmt(null)
      } catch (e) { setEstAmt(null); setError(e.message) }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [amountNum, fromSym, toSym])

  function resetAmount() { setPct(0); setSnapAmt(null); setEstAmt(null); setError('') }

  // Kéo slider → bỏ snap cũ + bỏ trạng thái thành công cũ
  function onPct(p) {
    if (success) { setSuccess(false); setStatus('') }
    setSnapAmt(null)
    setPct(p)
  }

  // Thả tay: đang có gợi ý số chẵn → CHỐT vào số đó (đúng nghĩa "Release to use $X").
  // Lưu snapAmt (token) + kéo pct về đúng vị trí số đó để thumb không nhảy lung tung.
  function onDragEnd() {
    setDragging(false)
    if (hintDisplay === null) return
    const tokenAmt = fromDisplay(hintDisplay, fromSym)
    if (tokenAmt === null || !(tokenAmt > 0) || tokenAmt > available + 1e-9) return
    // Làm tròn GẦN NHẤT rồi mới kẹp trần, KHÔNG floorTo: floor luôn cắt xuống → hứa "Release to use
    // $50.00" mà ra $49.99 (46.2963 EURC → floor 46.29 → ×1.08 = $49.99). Kẹp trần = floorTo(available)
    // để không bao giờ vượt số dư (toFixed/round có thể đội lên trên khả dụng → Kit chửi "vượt số dư").
    const d = decimalsFor(fromSym)
    const rounded = Math.round(tokenAmt * 10 ** d) / 10 ** d
    const final = Math.min(rounded, floorTo(available, d))
    setSnapAmt(final)
    if (available > 0) setPct(Math.max(0, Math.min(100, (final / available) * 100)))
  }

  // Đảo chiều: 180° cho nút (spec) + reset số (số dư 2 token khác nhau → giữ % cũ là vô nghĩa)
  const [flip, setFlip] = useState(0)
  function swapDir() { setFromSym(toSym); setToSym(fromSym); resetAmount(); setFlip(f => f + 180) }

  function selectToken(side, sym) {
    if (side === 'from') { if (sym === toSym) setToSym(fromSym); setFromSym(sym) }
    else { if (sym === fromSym) setFromSym(toSym); setToSym(sym) }
    resetAmount()
  }

  async function handleSwap() {
    setLoading(true); setError(''); setSuccess(false); setStatus('Preparing…')
    const beforeOut = balances[toSym] || 0   // số dư token NHẬN trước swap → để xác nhận on-chain
    try {
      // Token 60' có thể đã hết hạn giữa phiên → làm mới TRƯỚC khi tạo challenge cần PIN
      const { userToken, encryptionKey } = await refreshSession()
      const res = await executeSwap({ userToken, walletId, walletAddress, tokenIn: fromSym, tokenOut: toSym, amountIn: String(amountNum) })
      if (res.error) throw new Error(res.error)
      setStatus('Enter PIN…')
      await executeChallenge(await getSDK(), userToken, encryptionKey, res.challengeId)

      // ✅ TRẠNG THÁI 1 — PIN đã ký, lệnh swap ĐÃ GỬI lên Arc ("đề nghị thành công")
      const outTxt = res.amountOut ? ` to ~${parseFloat(res.amountOut).toFixed(decimalsFor(toSym))} ${toSym}` : ` to ${toSym}`
      addNotif(`Swapped ${amountNum} ${fromSym}${outTxt}`, 'sent', null, `swap-${Date.now()}`)   // NotifArea (Home)
      resetAmount()
      setSuccess(true); setStatus('Swap submitted')
      setLoading(false)

      // ✅ TRẠNG THÁI 2 — xác nhận ON-CHAIN (Arc finality <1s, chừa độ trễ RPC): poll tới khi số dư
      // token NHẬN tăng thì đổi nút thành "Swap successful". Nếu chưa kịp thấy tăng → giữ "Swap submitted".
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
      setTimeout(() => { setSuccess(false); setStatus('') }, 3500)   // tự ẩn, về lại nút "Swap"
    } catch (e) {
      setLoading(false)
      if (e?.code === 155701) { setStatus(''); return }  // user tự hủy PIN → im lặng
      const msg = e?.message || e?.error?.message || (typeof e === 'string' ? e : 'Swap failed')
      setError(msg); setStatus('')
    }
  }

  const CARD = { border: '1.5px solid var(--color-gray)', borderRadius: 16, background: 'var(--color-white)', padding: '14px 16px' }
  const AMT = { fontSize: 38, fontWeight: 'var(--fw-light)', lineHeight: 1.05 }   // số hero → Light 300 (design system)

  // 1 card = nhãn + [token ▼ ... Available] + số to + quy đổi. Available hiện ở CẢ 2 card (design user).
  function SideCard({ label, sym, onPick, amount, disp }) {
    const known = amount !== null
    const balKnown = balances[sym] !== undefined
    return (
      <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <TokenRow sym={sym} onClick={onPick} />
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* Số dư chưa đọc được → "…", KHÔNG vẽ 0 (bug 07-17) */}
            Available: <span className="num" style={{ color: 'var(--color-brand)', fontWeight: 'var(--fw-medium)' }}>
              {balKnown ? `${spendableOf(sym, balances[sym]).toFixed(decimalsFor(sym))} ${sym}` : '…'}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span className="num" style={{ ...AMT, color: overBalance ? 'var(--color-error)' : known && amount > 0 ? 'var(--color-content)' : 'var(--color-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {known ? amount.toFixed(decimalsFor(sym)) : '…'}
          </span>
          <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{sym}</span>
        </div>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{disp !== null ? `≈ ${fmtDisp(disp)}` : ' '}</span>
      </div>
    )
  }

  // Phí gas Arc THẬT thường < 1 cent → .toFixed(2) ra "$0.00" = nhìn như hỏng/không mất phí.
  // Phí > 0 mà làm tròn về 0 thì nói thẳng "< $0.01" (trung thực + không doạ người dùng).
  const feeTxt = (() => {
    if (feeUsd === null) return '…'
    const v = feeUsd / (rateOf(cur) || 1)
    if (v <= 0) return `≈ ${curSym}0.00`
    return v < 0.005 ? `< ${curSym}0.01` : `≈ ${curSym}${v.toFixed(2)}`
  })()

  const estNum = estAmt !== null ? parseFloat(estAmt) : null
  const rateTxt = (() => {
    // Tỷ giá THẬT từ báo giá Kit khi đã có (gồm cả phí provider); chưa có thì lấy tỷ giá thị trường
    if (estNum && amountNum > 0) return `1 ${fromSym} ≈ ${(estNum / amountNum).toFixed(4)} ${toSym}`
    const rf = rateOf(fromSym), rt = rateOf(toSym)
    return rf && rt ? `1 ${fromSym} ≈ ${(rf / rt).toFixed(4)} ${toSym}` : '…'
  })()

  return (
    <div className="screen">
      {picker && <TokenPicker current={picker === 'from' ? fromSym : toSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đổi tiền')}
      </div>

      {/* Hàng 2-6: You pay ⇅ You receive + Rate/Fee (user giao) */}
      <div style={{ gridRow: '2 / 7', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ position: 'relative' }}>
          <SideCard label="You pay" sym={fromSym} onPick={() => setPicker('from')} amount={hasBal ? amountNum : null} disp={amountDisplay} />

          {/* Nút đảo chiều — ĐÈ lên ranh giới 2 card (viền trắng như "đục lỗ"), xoay 180° mỗi lần bấm */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-14px 0', position: 'relative', zIndex: 3 }}>
            <button onClick={swapDir} aria-label="Reverse direction"
              style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--color-white)', background: 'var(--color-info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transform: `rotate(${flip}deg)`, transition: 'transform .3s ease' }}>
              <Icon name="trade" size="var(--is-num)" color="var(--color-brand)" />
            </button>
          </div>

          <SideCard label="You receive" sym={toSym} onPick={() => setPicker('to')} amount={estNum} disp={estNum !== null ? toDisplay(estNum, toSym) : null} />
        </div>

        {/* Rate + Fee — spec: LUÔN hiện */}
        <div style={{ ...CARD, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['Rate', rateTxt], ['Fee', feeTxt]].map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0, borderTop: i ? '1px solid var(--color-gray)' : 'none', paddingTop: i ? 6 : 0 }}>
              <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{k}</span>
              <span className="num" style={{ fontSize: 'var(--fs-label)', color: 'var(--color-content)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hàng 7: GỢI Ý SỐ CHẴN — chừa chỗ cố định, mờ dần khi đổi (spec). Trống thì vẫn giữ ô,
          KHÔNG để layout nhảy khi hint hiện/tắt. */}
      <div className="row-7" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <div style={{
          opacity: hintDisplay !== null ? 1 : 0, transition: 'opacity .18s ease',
          background: 'var(--color-info-soft)', borderRadius: 12, padding: '8px 16px',
          fontSize: 'var(--fs-item)', color: 'var(--color-content)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
        }}>
          Release to use <span className="num" style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>{hintDisplay !== null ? fmtDisp(hintDisplay) : '–'}</span>
        </div>
      </div>

      {/* Hàng 8: thanh trượt % số dư */}
      <div className="row-8" style={{ minWidth: 0 }}>
        <PctSlider pct={Math.round(pct)} onChange={onPct} disabled={!hasBal || loading}
          onDragStart={() => setDragging(true)} onDragEnd={onDragEnd} />
      </div>

      {/* Hàng 9: nút Swap = NƠI DUY NHẤT hiện mọi trạng thái giao dịch (Preparing… / Enter PIN… /
          Submitted / lỗi) — KHÔNG có dòng lỗi riêng (user chốt). Ưu tiên: lỗi > trạng thái > 'Swap'. */}
      <div className="row-9" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button className={`btn ${error ? 'btn-secondary' : success ? 'btn-success' : 'btn-primary'}`}
          style={{
            width: '66.67%', overflow: 'hidden',
            ...(error ? { color: 'var(--color-error)', borderColor: 'var(--color-error)' } : null),
            // Thành công = nút XANH LÁ gradient (.btn-success) — ép opacity 1 để không bị mờ dù disabled
            ...(success ? { opacity: 1 } : null),
          }}
          disabled={!canSwap && !error} onClick={handleSwap}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {success && <Icon name="check" size="var(--is-md-lg)" color="var(--color-white)" />}
            {error || status || 'Swap'}
          </span>
        </button>
      </div>

      <NavBar active="Swap" />
    </div>
  )
}
