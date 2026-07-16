import { useState, useEffect, useRef } from 'react'
import NavBar from '../components/NavBar'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import { estimateSwap, executeSwap, getSDK, executeChallenge, refreshSession, ensureWalletAddress } from '../circle'
import { getTokenBalances } from '../chain'
import { spendableOf, amountFontSize, floorTo } from '../data'
import { addNotif } from '../notif'
import { t } from '../i18n'

// ✅ SWAP execute qua ADAPTER.execute(intent có chữ ký) — đúng cách, adapter settlement ghi
// có USDC về ví (xem HANDOFF mục SWAP + functions/api/_swapCore.js). VERIFY bằng eth_simulateV1
// (verify-swap.mjs, 2026-07-04): 2 EURC→USDC, số dư USDC ví TĂNG +3.12254 = khớp Kit estimate.
// Tắt lại nếu cần: đổi SWAP_ENABLED = false.
const SWAP_ENABLED = true

// App khóa English (session 5) — chuỗi mới trong màn này hardcode English,
// t() chỉ giữ cho các key cũ đã có trong từ điển (Đổi tiền, Quay lại...).
const SWAP_TOKENS = ['USDC', 'EURC', 'cirBTC']
const decimalsFor = sym => (sym === 'cirBTC' ? 6 : 2)

function TokenRow({ sym, onClick, big }) {
  const d = big ? 48 : 32
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: big ? 10 : 8, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
      <img src={`/tokens/${sym.toLowerCase()}.png`} alt={sym} style={{ width: d, height: d, borderRadius: '50%' }} />
      <span className="num" style={{ fontSize: big ? 28 : 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)' }}>{sym}</span>
      <Icon name="down2" size={big ? 'var(--is-num)' : 'var(--is-item)'} color="var(--color-muted)" />
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
  const [input, setInput] = useState('')
  const [estAmt, setEstAmt] = useState(null)
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [success, setSuccess] = useState(false)   // true = vừa swap xong → nút xanh lá báo thành công
  const [picker, setPicker] = useState(null)
  const debounceRef = useRef(null)

  // Địa chỉ ví AN TOÀN: seed nhanh từ localStorage, tự khôi phục từ Circle nếu thiếu (giống HomeSend).
  // Đọc thẳng localStorage như trước → trên PWA mobile ez_wallet_addr có thể vắng → balances rỗng →
  // overBalance luôn true → nút Swap không sáng.
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem('ez_wallet_addr'))
  useEffect(() => { if (!walletAddress) ensureWalletAddress().then(a => a && setWalletAddress(a)).catch(() => {}) }, [])
  const walletId = localStorage.getItem('ez_wallet_id')
  const amountNum = parseFloat(input || '0')
  // Khả dụng: USDC chừa lại 1 làm phí mạng (gas Arc = USDC) — không cho swap hết
  const hasBal = balances[fromSym] !== undefined
  const available = spendableOf(fromSym, balances[fromSym])
  // +1e-9: bỏ qua sai số dấu phẩy động khi nhập/floor đúng bằng số dư (kẻo "max" bị coi là vượt).
  // CHỈ chặn khi ĐÃ BIẾT số dư — chưa tải xong thì đừng khoá nút.
  const overBalance = hasBal && amountNum > available + 1e-9
  const canSwap = SWAP_ENABLED && amountNum > 0 && !overBalance && !loading

  function loadBalances() {
    if (!walletAddress) return
    getTokenBalances(walletAddress).then(ts => {
      const map = {}; ts.forEach(tk => { map[tk.symbol] = tk.amount }); setBalances(map)
    }).catch(() => {})
  }
  useEffect(loadBalances, [walletAddress])

  // Ước tính tự động khi gõ (debounce 600ms)
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
  }, [input, fromSym, toSym])

  function handleKey(key) {
    if (success) { setSuccess(false); setStatus('') }   // gõ số mới → bỏ trạng thái thành công cũ
    if (key === 'BACK') { setInput(d => d.slice(0, -1)); return }
    if (key === '.') { setInput(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (input.length >= 12) return
    if (input === '0') { setInput(key); return }
    setInput(d => d + key)
  }

  function swapDir() { setFromSym(toSym); setToSym(fromSym); setInput(''); setEstAmt(null); setError('') }

  function selectToken(side, sym) {
    if (side === 'from') { if (sym === toSym) setToSym(fromSym); setFromSym(sym) }
    else { if (sym === fromSym) setFromSym(toSym); setToSym(sym) }
    setInput(''); setEstAmt(null); setError('')
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
      await executeChallenge(getSDK(), userToken, encryptionKey, res.challengeId)

      // ✅ TRẠNG THÁI 1 — PIN đã ký, lệnh swap ĐÃ GỬI lên Arc ("đề nghị thành công")
      const outTxt = res.amountOut ? ` to ~${parseFloat(res.amountOut).toFixed(decimalsFor(toSym))} ${toSym}` : ` to ${toSym}`
      addNotif(`Swapped ${amountNum} ${fromSym}${outTxt}`, 'sent', null, `swap-${Date.now()}`)   // NotifArea (Home)
      setInput(''); setEstAmt(null)
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

  const CARD = { border: '1.5px solid var(--color-gray)', borderRadius: 16, background: 'var(--color-white)', padding: '20px 18px' }
  // Số trong card = cỡ cố định vừa phải (không dùng fs-amount 52px — to & thô). Đồng bộ 2 card.
  const AMT = { fontSize: 32, fontWeight: 'var(--fw-semibold)', lineHeight: 1 }
  // FROM to hơn (chiếm 2 hàng) để nổi bật "đang đổi TỪ cái gì"; TO giữ AMT thường.
  const AMT_BIG = { fontSize: 46, fontWeight: 'var(--fw-semibold)', lineHeight: 1 }

  return (
    <div className="screen">
      {picker && <TokenPicker current={picker === 'from' ? fromSym : toSym} onSelect={sym => selectToken(picker, sym)} onClose={() => setPicker(null)} />}

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Đổi tiền')}
      </div>

      {/* Cụm FROM↔TO — LIỀN LẠC (nút đổi chiều đè lên ranh giới 2 card), ĐẨY XUỐNG SÁT nút Swap
          (khung tới hàng 6, flex-end + đệm dưới 5dvh → đáy cụm ~vị trí 4.5, ngay trên nút Swap ở
          vị trí 5); khoảng trống phía trên = cách title. */}
      <div style={{ gridRow: '2 / 6', paddingBottom: '5dvh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          {/* FROM */}
          <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <TokenRow sym={fromSym} big onClick={() => setPicker('from')} />
              <span className="num" style={{ ...AMT_BIG, fontSize: amountFontSize(input, 46, 7), color: overBalance ? 'var(--color-error)' : input ? 'var(--color-content)' : 'var(--color-faint)' }}>
                {input}<span className="caret">_</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 'var(--fs-item)', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                Available: <span className="num">{(available).toFixed(decimalsFor(fromSym))}</span>
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['50%', 0.5], ['100%', 1]].map(([label, pct]) => (
                  <button key={label} onClick={() => setInput(String(floorTo(available * pct, decimalsFor(fromSym))))}
                    style={{ border: '1.5px solid var(--color-brand)', color: 'var(--color-brand)', background: 'var(--color-white)', borderRadius: 8, padding: '3px 12px', fontSize: 'var(--fs-label)', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nút đổi chiều — ĐÈ lên ranh giới 2 card (viền trắng như "đục lỗ") → cụm liền lạc */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '-16px 0', position: 'relative', zIndex: 3 }}>
            <button onClick={swapDir}
              style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--color-white)', background: 'var(--color-gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="trade" size={18} color="var(--color-content)" />
            </button>
          </div>

          {/* TO */}
          <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <TokenRow sym={toSym} onClick={() => setPicker('to')} />
            <span className="num" style={{ ...AMT, color: estAmt ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {estAmt ? `~${parseFloat(estAmt).toFixed(decimalsFor(toSym))}` : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Nút Swap = NƠI DUY NHẤT hiện mọi trạng thái giao dịch (Preparing… / Enter PIN… / Submitted /
          lỗi) — KHÔNG có dòng ghi chú/lỗi riêng bên dưới (user chốt: mọi chi tiết đổ vào nút cho tối
          giản). Ưu tiên: lỗi > trạng thái > 'Swap'. Lỗi hiện đỏ ngay trên nút (đổi màu chữ + viền).
          Neo đúng VỊ TRÍ 5 (tâm nút ở y=50dvh): top = 50dvh − nửa chiều cao nút (.btn 6dvh → 3dvh).
          position:absolute thay vì gridRow — tránh grid item đè hitbox lên numpad bên dưới. */}
      <div style={{ position: 'absolute', left: 20, right: 20, top: 'calc(50dvh - 3dvh)', zIndex: 2, display: 'flex', justifyContent: 'center' }}>
        <button className={`btn ${error ? 'btn-secondary' : 'btn-primary'}`}
          style={{
            width: '66.67%', overflow: 'hidden',
            ...(error ? { color: 'var(--color-error)', borderColor: 'var(--color-error)' } : null),
            // Thành công = nút XANH LÁ (màu ngữ nghĩa success của app), ép opacity 1 để không bị mờ dù disabled
            ...(success ? { background: 'var(--color-primary)', color: 'var(--color-white)', opacity: 1 } : null),
          }}
          disabled={!canSwap && !error} onClick={handleSwap}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {success && <Icon name="check" size="var(--is-md-lg)" color="var(--color-white)" />}
            {error || status || 'Swap'}
          </span>
        </button>
      </div>

      {/* Numpad ở hàng 6.75-8.25 (đồng bộ SendAmount/CreateQR): gridRow 6/10, spacer 0.75 + numpad 2.5 + đệm dưới 0.75 */}
      <div style={{ gridRow: '6 / 10', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 0.75 }} />
        <div style={{ flex: 2.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <div style={{ flex: 0.75 }} />
      </div>

      <NavBar active="Swap" />
    </div>
  )
}
