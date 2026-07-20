import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import PctSlider from '../components/PctSlider'
import Numpad from '../components/Numpad'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession, ensureWalletAddress } from '../circle'
import { getTokenBalances, getDisplayRates, cachedRates, estimateFeeUsd } from '../chain'
import { spendableOf, floorTo, getDisplayCurrency, displaySymbol, amountFontSize } from '../data'
import { roundHints, fmtHint } from '../roundHint'
import { addNotif } from '../notif'
import { t } from '../i18n'

// ✅ SWAP execute qua ADAPTER.execute(intent có chữ ký) — đúng cách, adapter settlement ghi
// có USDC về ví (xem HANDOFF mục SWAP + functions/api/_swapCore.js). VERIFY bằng eth_simulateV1
// (verify-swap.mjs, 2026-07-04): 2 EURC→USDC, số dư USDC ví TĂNG +3.12254 = khớp Kit estimate.
// Tắt lại nếu cần: đổi SWAP_ENABLED = false.
const SWAP_ENABLED = true

// ══ MÀN SWAP — slider % + chip gợi ý + NUMPAD BOTTOM-SHEET ══
// Đối tượng EZwallet = người mới + người lớn tuổi → mặc định KHÔNG bắt gõ từng chữ số: THANH TRƯỢT
// chọn % SỐ DƯ ("kéo bao nhiêu % tài sản") + hàng 7 GỢI Ý SỐ CHẴN BẤM ĐƯỢC.
// BỔ SUNG 07-20 (user yêu cầu, thay chốt "đừng nhét lại Numpad" cũ 07-17): bấm vào SỐ TIỀN ở card
// "You pay" → numpad TRƯỢT TỪ DƯỚI LÊN (như màn nhập PIN) để gõ số chính xác; gõ tới đâu số + ước
// tính nhận + slider cập nhật tới đó; bấm "Done"/nền tối để đóng. Slider và chip vẫn giữ nguyên.
// ⚠️ Mọi thứ tính theo ĐƠN VỊ TOKEN ĐANG PAY, KHÔNG theo USD (user chốt 07-17c). Dòng "~ $xx" dưới
// số chỉ là quy đổi cho dễ hình dung — ĐỪNG lấy nó làm gốc tính toán.
// Bản đồ hàng (user giao): 1 tiêu đề · 2-6 You pay/You receive + Rate/Fee · 7 hint · 8 slider ·
// 9 nút Swap · 10 NavBar.
const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const decimalsFor = sym => (sym === 'cirBTC' ? 6 : 2)

function TokenRow({ sym, onClick }) {
  // Chip to lên cho người già (user chốt 07-20 "cho các yếu tố to lên"): logo 32, chữ 19 (--fs-body)
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--color-gray)', borderRadius: 999, background: 'var(--color-white)', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 12px 5px 6px' }}>
      <img src={`/tokens/${sym.toLowerCase()}.png`} alt={sym} style={{ width: 32, height: 32, borderRadius: '50%' }} />
      <span className="num" style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{sym}</span>
      <Icon name="down2" size="var(--is-body)" color="var(--color-muted)" />
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
  const [snapAmt, setSnapAmt] = useState(null)   // số tiền CHẴN user bấm chọn ở hàng 7 (đơn vị token) — ghi đè pct
  const [estAmt, setEstAmt] = useState(null)
  const [balances, setBalances] = useState({})
  const [rates, setRates] = useState(() => cachedRates())
  const [feeUsd, setFeeUsd] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState(false)   // true = vừa swap xong → nút xanh lá báo thành công
  const [picker, setPicker] = useState(null)
  const [pad, setPad] = useState(false)      // numpad bottom-sheet đang mở
  const [typed, setTyped] = useState('')     // chuỗi đang gõ trên numpad (hiện live ở card You pay)
  const padPrev = useRef(null)               // số trước khi mở numpad — nút Back trong sheet khôi phục lại
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
  const fmtDisp = v => (v === null ? null : `${curSym}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  const amountDisplay = toDisplay(amountNum, fromSym)

  // ── HÀNG 7: gợi ý số chẵn — theo ĐƠN VỊ TOKEN ĐANG PAY (user chốt 07-17c), KHÔNG theo USD ──
  // Chip BẤM ĐƯỢC (không phải "Release to use" — user không ưng kiểu đó). Spec 07-17e "hint nhiệt
  // tình": BỘ BA sàn·sàn+0.5·trần — 7.35 EURC → [7] [7.5] [8]. pct===100 = "đổi hết" → không gợi ý.
  const hints = (hasBal && pct < 100 && amountNum > 0 && !loading)
    ? roundHints(amountNum, available, decimalsFor(fromSym)) : []

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

  function resetAmount() { setPct(0); setSnapAmt(null); setEstAmt(null); setError(''); setTyped('') }

  // ── NUMPAD bottom-sheet: bấm số tiền You pay → mở; gõ tới đâu áp tới đó (snapAmt + kéo pct theo) ──
  function openPad() {
    if (!hasBal || loading) return
    if (success) { setSuccess(false); setStatus('') }
    padPrev.current = { snapAmt, pct }   // để nút Back hủy được số vừa gõ
    // Seed chuỗi gõ = số đang chọn (nếu có) để bấm lùi sửa được, không bắt gõ lại từ đầu
    setTyped(amountNum > 0 ? String(amountNum) : '')
    setPad(true)
  }
  function cancelPad() {   // Back: khôi phục số như trước khi mở numpad
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
    // Chặn số dài vô lý: phần nguyên ≤ 9 chữ số, phần thập phân theo token (2 hoặc 6)
    const [int = '', dec] = typed.split('.')
    if (dec !== undefined) { if (dec.length >= decimalsFor(fromSym)) return }
    else if (int.length >= 9) return
    applyTyped(typed === '0' ? k : typed + k)
  }

  // Kéo slider → bỏ snap cũ + bỏ trạng thái thành công cũ
  function onPct(p) {
    if (success) { setSuccess(false); setStatus('') }
    setSnapAmt(null)
    setPct(p)
  }

  // Bấm chip số chẵn → chốt đúng số đó. Số đã là đơn vị token sẵn (roundHints tính theo token)
  // nên KHÔNG quy đổi gì thêm — chỉ kẹp trần cho chắc, rồi kéo pct về đúng vị trí để thumb khớp.
  function pickHint(tokenAmt) {
    const final = Math.min(tokenAmt, floorTo(available, decimalsFor(fromSym)))
    if (!(final > 0)) return
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
      // 1 THÔNG BÁO DUY NHẤT cho swap (user chốt 07-20: gộp "Swapped..." + "Swap complete·received"
      // làm một) → "Swapped X EURC to ~Y USDC (complete)". NotifArea KHÔNG thêm thông báo nhận riêng
      // cho leg vào của swap nữa (đã tắt branch outHashes bên đó).
      const outTxt = res.amountOut ? ` to ~${parseFloat(res.amountOut).toFixed(decimalsFor(toSym))} ${toSym}` : ` to ${toSym}`
      addNotif(`Swapped ${amountNum} ${fromSym}${outTxt} (complete)`, 'sent', null, `swap-${Date.now()}`)   // NotifArea (Home)
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
      // Swap thất bại → thông báo cùng dạng gộp, đuôi "(failed)" (user chốt 07-20)
      addNotif(`Swapped ${amountNum} ${fromSym} to ${toSym} (failed)`, 'error', null, `swap-fail-${Date.now()}`)
      const msg = e?.message || e?.error?.message || (typeof e === 'string' ? e : 'Swap failed')
      setError(msg); setStatus('')
    }
  }

  // Card = NỀN XÁM NHẠT, KHÔNG VIỀN, bo góc to (user chốt 07-17c, đúng mockup user gửi).
  // Trước là viền xám + nền trắng → chìm vào nền trắng của .screen, không tách khối.
  // Chip token bên trong giữ NỀN TRẮNG → nổi bật trên card xám (không cần thêm viền đậm).
  const CARD = { border: 'none', borderRadius: 20, background: 'var(--color-surface)', padding: '14px 16px' }

  // 1 card TỐI GIẢN 3 hàng (user chốt 07-20 "tinh giản để chữ to hơn cho người già"):
  //   nhãn You pay/receive
  //   [chip token ▼]  ————————  SỐ TO (bỏ tên token sau số — chip nói rồi)
  //   Available: xx TOKEN  ————  ~ $quy đổi
  // Chữ phụ lên --fs-item 17 (trước --fs-label 15). Số to = 44px co giãn theo độ dài
  // (amountFontSize — Barlow light, 8 ký tự vừa khít; dài hơn tự co, không tràn card).
  // onAmount (chỉ card You pay): bấm vào VÙNG SỐ (cả khoảng trống bên phải chip) → mở numpad.
  // typing: chuỗi đang gõ trên numpad (null = numpad đóng).
  function SideCard({ label, sym, onPick, amount, disp, onAmount, typing }) {
    const known = amount !== null
    const balKnown = balances[sym] !== undefined
    const isTyping = typing !== null && typing !== undefined
    const amtStr = isTyping ? (typing || '0') : known ? amount.toFixed(decimalsFor(sym)) : '…'
    const amtColor = overBalance ? 'var(--color-error)'
      : isTyping ? (typing ? 'var(--color-content)' : 'var(--color-faint)')
      : known && amount > 0 ? 'var(--color-content)' : 'var(--color-faint)'
    return (
      <div style={{ ...CARD, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
        {/* Phân cấp đậm nhạt (user chốt 07-17e "quan trọng nhớ bold"): label vai trò card = medium.
            Card cao 2 HÀNG nên chữ phụ lên --fs-body 19, số to base 52 (user chốt 07-20 to cho người già) */}
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <TokenRow sym={sym} onClick={onPick} />
          <div onClick={onAmount} style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', cursor: onAmount ? 'pointer' : 'default' }}>
            <span className="num" style={{ fontSize: amountFontSize(amtStr, 52, 8), fontWeight: 'var(--fw-light)', lineHeight: 1.05, color: amtColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {/* Đang gõ mà CHƯA có số → CHỈ caret "_" xám nhấp nháy, KHÔNG vẽ số 0 mờ (user chốt 07-20) */}
              {isTyping ? <>{typing}<span className="caret">_</span></> : amtStr}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* Số dư chưa đọc được → "…", KHÔNG vẽ 0 (bug 07-17) */}
            Available: <span className="num" style={{ color: 'var(--color-brand)', fontWeight: 'var(--fw-medium)' }}>
              {balKnown ? `${spendableOf(sym, balances[sym]).toFixed(decimalsFor(sym))} ${sym}` : '…'}
            </span>
          </span>
          <span className="num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{disp !== null ? `~ ${fmtDisp(disp)}` : ''}</span>
        </div>
      </div>
    )
  }

  // Phí gas Arc THẬT thường < 1 cent → .toFixed(2) ra "$0.00" = nhìn như hỏng/không mất phí.
  // Phí > 0 mà làm tròn về 0 thì nói thẳng "< $0.01" (trung thực + không doạ người dùng).
  const feeTxt = (() => {
    if (feeUsd === null) return '…'
    const v = feeUsd / (rateOf(cur) || 1)
    if (v <= 0) return `~${curSym}0.00`
    return v < 0.005 ? `<${curSym}0.01` : `~${curSym}${v.toFixed(2)}`
  })()

  const estNum = estAmt !== null ? parseFloat(estAmt) : null
  const rateTxt = (() => {
    // Tỷ giá THẬT từ báo giá Kit khi đã có (gồm cả phí provider); chưa có thì lấy tỷ giá thị trường
    if (estNum && amountNum > 0) return `1 ${fromSym} ~ ${(estNum / amountNum).toFixed(4)} ${toSym}`
    const rf = rateOf(fromSym), rt = rateOf(toSym)
    return rf && rt ? `1 ${fromSym} ~ ${(rf / rt).toFixed(4)} ${toSym}` : '…'
  })()

  return (
    <div className="screen">
      {picker && <TokenPicker current={picker === 'from' ? fromSym : toSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      {/* Numpad bottom-sheet (user quy hoạch 07-20): trượt từ dưới lên CHIẾM nửa hàng 6 + hàng
          7-10, nền XÁM + phím TRẮNG, KHÔNG khoảng trắng thừa trên đầu, KHÔNG làm mờ màn chính.
          Trong sheet: Numpad 30dvh + hàng nút Back/Done 10dvh (khớp vị trí .row10-dual) + đệm 5dvh.
          Back = hủy số vừa gõ; Done/bấm ra ngoài = giữ số. */}
      {pad && (
        <div className="sheet-overlay" onClick={() => setPad(false)}>
          <div className="sheet numpad-gray" onClick={e => e.stopPropagation()}>
            {/* Đệm xám trên 24px + phím THẤP lại (07-20c: numpad 5.5 phần thay vì 6 — phím cũ quá to),
                khe 0.5 trước hàng nút; Back/Done GIỮ NGUYÊN biên hàng 9-10 (flex 2 = 85-95dvh). */}
            <div style={{ flex: 5.5, minHeight: 0, paddingTop: 24 }}>
              <Numpad onKey={onPadKey} showComma />
            </div>
            <div style={{ flex: 0.5 }} />
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-secondary" style={{ width: '44%' }} onClick={cancelPad}>{t('Quay lại')}</button>
              <button className="btn btn-primary" style={{ width: '44%' }} onClick={() => setPad(false)}>{t('Xong')}</button>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      )}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đổi tiền')}
      </div>

      {/* Hàng 2 → nửa hàng 6 (user quy hoạch 07-20): bắt đầu từ ĐẦU hàng 2, You pay = 2 HÀNG,
          You receive = 2 HÀNG, Fee/Rate = nửa hàng 6 (dòng nhỏ). Nửa sau hàng 6 để trống —
          chính là chỗ sheet numpad (55dvh) trồi lên tới. KHÔNG canh giữa dồn cụm như cũ. */}
      <div style={{ gridRow: '2 / 7', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 2, minHeight: 0, display: 'flex' }}>
          <SideCard label="You pay" sym={fromSym} onPick={() => setPicker('from')} amount={hasBal ? amountNum : null} disp={amountDisplay}
            onAmount={openPad} typing={pad ? typed : null} />
        </div>

        {/* Nút đảo chiều — ĐÈ lên ranh giới 2 card (viền trắng như "đục lỗ"), xoay 180° mỗi lần bấm.
            margin -18/-18 trên nút 44px → chiếm đúng 8px trong flow = khe giữa 2 card. */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-18px 0', position: 'relative', zIndex: 3 }}>
          <button onClick={swapDir} aria-label="Reverse direction"
            style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--color-white)', background: 'var(--color-info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transform: `rotate(${flip}deg)`, transition: 'transform .3s ease' }}>
            <Icon name="trade" size="var(--is-num)" color="var(--color-brand)" />
          </button>
        </div>

        <div style={{ flex: 2, minHeight: 0, display: 'flex' }}>
          <SideCard label="You receive" sym={toSym} onPick={() => setPicker('to')} amount={estNum} disp={estNum !== null ? toDisplay(estNum, toSym) : null} />
        </div>

        {/* Fee + Rate — NỬA HÀNG 6, 1 dòng NHỎ (fs-item 17 = font nút "Hold to show tokens").
            User chốt 07-20b: Rate căn TRÁI – Fee căn PHẢI (tách 2 đầu cho dễ đọc), nhãn xám
            nhưng SỐ LIỆU ĐEN cho bật (bản gộp 1 cụm giữa nhìn "mờ nhạt"). */}
        <div style={{ flex: 0.5, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, padding: '0 16px' }}>
          <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Rate: <span className="num" style={{ color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>{rateTxt}</span>
          </span>
          <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
            Fee: <span className="num" style={{ color: 'var(--color-content)', fontWeight: 'var(--fw-medium)' }}>{feeTxt}</span>
          </span>
        </div>

        {/* Nửa sau hàng 6 để trống — vùng sheet numpad trồi lên (55dvh) */}
        <div style={{ flex: 0.5 }} />
      </div>

      {/* Hàng 7: GỢI Ý SỐ CHẴN — chip BẤM ĐƯỢC, theo đơn vị token đang Pay (user chốt 07-17c).
          Chừa chỗ cố định + mờ dần khi đổi: KHÔNG để layout nhảy lúc gợi ý hiện/tắt. */}
      <div className="row-7" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hints.length ? 1 : 0, transition: 'opacity .18s ease', pointerEvents: hints.length ? 'auto' : 'none', minWidth: 0 }}>
          {hints.map(v => (
            <button key={v} onClick={() => pickHint(v)}
              style={{ border: '1.5px solid var(--color-brand)', background: 'var(--color-white)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', minWidth: 0 }}>
              <span className="num" style={{ fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)' }}>{fmtHint(v, decimalsFor(fromSym))}</span>
              <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-brand)' }}> {fromSym}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hàng 8: thanh trượt % số dư */}
      <div className="row-8" style={{ minWidth: 0 }}>
        <PctSlider pct={Math.round(pct)} onChange={onPct} disabled={!hasBal || loading} />
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
