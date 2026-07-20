import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Icon from '../components/Icon'
import PctSlider from '../components/PctSlider'
import Numpad from '../components/Numpad'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession, ensureWalletAddress } from '../circle'
import { getTokenBalances, getDisplayRates, cachedRates, estimateFeeUsd } from '../chain'
import { spendableOf, floorTo, getDisplayCurrency, displaySymbol } from '../data'
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
    // Seed chuỗi gõ = số đang chọn (nếu có) để bấm lùi sửa được, không bắt gõ lại từ đầu
    setTyped(amountNum > 0 ? String(amountNum) : '')
    setPad(true)
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

  // Card = NỀN XÁM NHẠT, KHÔNG VIỀN, bo góc to (user chốt 07-17c, đúng mockup user gửi).
  // Trước là viền xám + nền trắng → chìm vào nền trắng của .screen, không tách khối.
  // Chip token bên trong giữ NỀN TRẮNG → nổi bật trên card xám (không cần thêm viền đậm).
  const CARD = { border: 'none', borderRadius: 20, background: 'var(--color-surface)', padding: '14px 16px' }
  // Số chính của mỗi card = "size siêu to" (--fs-huge 38) + Light 300 — bậc user thêm vào thang
  // riêng cho màn này (30 nhìn nhỏ & xấu, 52 thì TRÀN hàng 2-6: cần 426px / có 417px).
  // ⚠️ ĐỪNG đặt số cứng ở đây (cũ: 38/46/32 — ngoài thang, user chốt 07-17c phải đồng bộ thang).
  const AMT = { fontSize: 'var(--fs-huge)', fontWeight: 'var(--fw-light)', lineHeight: 1.05 }

  // 1 card = nhãn + [token ▼ ... Available] + số to + quy đổi. Available hiện ở CẢ 2 card (design user).
  // onAmount (chỉ card You pay): bấm vào số → mở numpad. typing: chuỗi đang gõ (null = numpad đóng).
  function SideCard({ label, sym, onPick, amount, disp, onAmount, typing }) {
    const known = amount !== null
    const balKnown = balances[sym] !== undefined
    const typingColor = typing ? 'var(--color-content)' : 'var(--color-faint)'
    return (
      <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Phân cấp đậm nhạt (user chốt 07-17e "quan trọng nhớ bold"): label vai trò card = medium */}
        <span style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-muted)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <TokenRow sym={sym} onClick={onPick} />
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {/* Số dư chưa đọc được → "…", KHÔNG vẽ 0 (bug 07-17) */}
            Available: <span className="num" style={{ color: 'var(--color-brand)', fontWeight: 'var(--fw-medium)' }}>
              {balKnown ? `${spendableOf(sym, balances[sym]).toFixed(decimalsFor(sym))} ${sym}` : '…'}
            </span>
          </span>
        </div>
        <div onClick={onAmount} style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, cursor: onAmount ? 'pointer' : 'default' }}>
          <span className="num" style={{ ...AMT, color: overBalance ? 'var(--color-error)' : typing !== null && typing !== undefined ? typingColor : known && amount > 0 ? 'var(--color-content)' : 'var(--color-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {typing !== null && typing !== undefined
              ? <>{typing || '0'}<span className="caret">_</span></>
              : known ? amount.toFixed(decimalsFor(sym)) : '…'}
          </span>
          <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{sym}</span>
        </div>
        <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)' }}>{disp !== null ? `~ ${fmtDisp(disp)}` : ' '}</span>
      </div>
    )
  }

  // Phí gas Arc THẬT thường < 1 cent → .toFixed(2) ra "$0.00" = nhìn như hỏng/không mất phí.
  // Phí > 0 mà làm tròn về 0 thì nói thẳng "< $0.01" (trung thực + không doạ người dùng).
  const feeTxt = (() => {
    if (feeUsd === null) return '…'
    const v = feeUsd / (rateOf(cur) || 1)
    if (v <= 0) return `~ ${curSym}0.00`
    return v < 0.005 ? `< ${curSym}0.01` : `~ ${curSym}${v.toFixed(2)}`
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

      {/* Numpad bottom-sheet — trượt từ dưới lên như màn nhập PIN (user chốt 07-20). Bấm nền tối
          hoặc "Done" để đóng; số đã gõ GIỮ NGUYÊN (snapAmt đã áp live theo từng phím). */}
      {pad && (
        <div className="sheet-overlay" onClick={() => setPad(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPad(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-brand)', padding: '8px 8px 4px' }}>
                {t('Xong')}
              </button>
            </div>
            <div style={{ height: 240 }}>
              <Numpad onKey={onPadKey} showComma />
            </div>
          </div>
        </div>
      )}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đổi tiền')}
      </div>

      {/* Hàng 2-6: You pay ⇅ You receive + Rate/Fee (user giao) */}
      <div style={{ gridRow: '2 / 7', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ position: 'relative' }}>
          <SideCard label="You pay" sym={fromSym} onPick={() => setPicker('from')} amount={hasBal ? amountNum : null} disp={amountDisplay}
            onAmount={openPad} typing={pad ? typed : null} />

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
              {/* Giá trị = phần quan trọng của hàng → medium (label xám thường, user chốt 07-17e) */}
              <span className="num" style={{ fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
            </div>
          ))}
        </div>
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
