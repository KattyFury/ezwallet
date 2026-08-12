import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import ErrorToast from '../components/ErrorToast'
import { getTokenInfo, getDisplayRates, cachedRates } from '../chain'
import { ensureWalletAddress } from '../circle'
import { t } from '../i18n'
import { findContactName } from '../store'
import { displaySymbol, spendableOf, floorTo } from '../data'
import { useFitFontSize } from '../useFitFontSize'
import { amountHints, fmtAmountHint } from '../amountHint'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

// USD = nhãn thân thiện, gửi = USDC (1:1). USDC/EURC/cirBTC gửi đúng token đó.
// ⛔ VND TẮT 2026-08-12 (user chốt): app đang chạy English/USD mà quét QR lại ra VND → bỏ 'VND'
// khỏi danh sách này để nó KHÔNG chọn được và KHÔNG nhận được từ QR (params.currency='VND' sẽ
// rơi về USD ở dòng dưới). Phần tính toán VND bên dưới (isVnd/vndRate/gợi ý số) GIỮ NGUYÊN, chưa
// xoá — bật lại chỉ cần thêm 'VND' vào mảng này + bỏ locked ở Language.jsx + data.js.
// Lý do cũ (user chốt 08-04): "gõ thẳng VND, app tự quy ra USDC" cho người Việt.
const CURRENCIES = ['USD', 'USDC', 'EURC', 'cirBTC']
const effectiveToken = c => (c === 'USD' || c === 'VND' ? 'USDC' : c)

export default function SendAmount() {
  const { navigate, params } = useNav()
  const { address } = params
  const name = params.name || findContactName(address)
  // QUÉT GÌ HIỆN ĐÓ: nếu QR có tiền tệ hợp lệ → mở đúng tiền tệ đó (2 USDC hiện "2 USDC",
  // KHÔNG quy về USD). QR cũ/không rõ (vd 'VND') → mặc định USD.
  const qrCurrency = CURRENCIES.includes(params.currency) ? params.currency : null
  const [cur, setCur] = useState(qrCurrency || 'USD')
  const [digits, setDigits] = useState(params.amount ? String(params.amount) : '')
  // NOTE MẶC ĐỊNH (user chốt 07-20e): user set 1 lần trong popup → mọi lần gửi memo tự điền sẵn note đó
  // (hiện như VALUE thật chứ không phải placeholder mờ). Click vào ô để gõ → note default BIẾN MẤT,
  // gõ tự do (noteTouched chặn không xoá lại ở các lần focus sau).
  const [defaultNote, setDefaultNote] = useState(() => localStorage.getItem('ez_default_note') || '')
  const [memo, setMemo] = useState(params.memo || localStorage.getItem('ez_default_note') || '')
  const [noteTouched, setNoteTouched] = useState(false)
  const [showNote, setShowNote] = useState(false)      // popup set default note
  const [draftNote, setDraftNote] = useState('')       // giá trị đang gõ trong popup
  const [showCur, setShowCur] = useState(false)
  // LUẬT BÀN PHÍM (user chốt 07-23 hướng A): TIỀN = numpad app, CHỮ = bàn phím iPhone, KHÔNG BAO
  // GIỜ 2 cái cùng hiện. Đang gõ ô note (bàn phím iPhone trồi lên) → ẨN numpad; blur → hiện lại.
  const [typingText, setTypingText] = useState(false)

  function openNotePopup() { setDraftNote(defaultNote); setShowNote(true) }
  function saveDefaultNote() {
    const v = draftNote.trim()
    localStorage.setItem('ez_default_note', v)
    // Nếu ô memo đang trống hoặc còn là default cũ (chưa gõ tay) → cập nhật hiển thị ngay theo note mới
    if (!noteTouched || memo === '' || memo === defaultNote) { setMemo(v); setNoteTouched(false) }
    setDefaultNote(v); setShowNote(false)
  }
  // Click vào ô note lần đầu mà đang là note default → xoá để gõ mới (user chốt 07-20e)
  function onNoteFocus() {
    if (!noteTouched && defaultNote && memo === defaultNote) { setMemo(''); setNoteTouched(true) }
  }
  const [availableAmt, setAvailableAmt] = useState(null) // số dư của TOKEN đang chọn (đơn vị token thật)
  const [walletAddr, setWalletAddr] = useState(null)
  // Tỷ giá (cần cho VND). Seed từ cache tầng module → không phải chờ mạng mới gõ được số.
  const [rates, setRates] = useState(cachedRates)
  useEffect(() => { getDisplayRates().then(setRates).catch(() => {}) }, [])

  // Địa chỉ ví AN TOÀN: ensureWalletAddress tự khôi phục từ Circle nếu localStorage thiếu — giống
  // HomeSend. TRƯỚC đây đọc thẳng localStorage: trên PWA mobile (lưu màn hình chính) ez_wallet_addr
  // có thể vắng → availableAmt=0 → nút "Tiếp tục" KHÔNG BAO GIỜ SÁNG dù có tiền. (PC có key nên OK.)
  useEffect(() => { ensureWalletAddress().then(a => setWalletAddr(a || null)).catch(() => setWalletAddr(null)) }, [])

  // Số dư khả dụng: theo ĐÚNG token đang chọn (USD/USDC → USDC; EURC → EURC; cirBTC → cirBTC)
  useEffect(() => {
    if (!walletAddr) { setAvailableAmt(null); return }   // chưa có địa chỉ → coi như đang tải (null), ĐỪNG ép 0
    const tok = effectiveToken(cur)
    setAvailableAmt(null)
    // spendableOf: USDC chừa lại 1 làm phí mạng (gas Arc trả bằng USDC) — khách không gửi hết được
    // ⚠️ Đọc hỏng → GIỮ null (hiện "…"), TUYỆT ĐỐI KHÔNG setAvailableAmt(0): 0 giả làm nút chết +
    // báo "Số dư không đủ (khả dụng: 0.00)" DÙ VÍ ĐANG CÓ TIỀN — bug 07-17, ví 1000 USDC không gửi
    // được. Thử lại sau 3s để tự hồi khi RPC hết nghẽn.
    let alive = true, retry
    const load = () => getTokenInfo(walletAddr, tok)
      .then(i => { if (alive) setAvailableAmt(spendableOf(tok, i.balance)) })
      .catch(() => { if (alive) retry = setTimeout(load, 3000) })
    load()
    return () => { alive = false; clearTimeout(retry) }
  }, [cur, walletAddr])

  // ── VND: gõ bằng tiền Việt, gửi bằng USDC ──────────────────────────────────────────────
  // rates[cur] = USD cho 1 đơn vị. rates.VND ≈ 0.000038 (1 đồng ≈ 0,000038 đô).
  const isVnd = cur === 'VND'
  const vndRate = rates?.VND || null                       // null = chưa có tỷ giá → chưa gửi được
  const amount = isVnd ? parseInt(digits || '0', 10) : parseFloat(digits || '0')
  // Số USDC THẬT SỰ rời ví. floorTo (không toFixed): toFixed làm tròn LÊN → có thể vượt số dư
  // đúng 1 xu rồi bị Circle từ chối, đúng cái bẫy đã dính ở nút Max màn Swap.
  const tokenAmount = isVnd && vndRate ? floorTo(amount * vndRate, 2) : amount
  // Số dư quy về ĐƠN VỊ ĐANG GÕ để so sánh: đang gõ VND thì phải so với số dư tính bằng VND,
  // không thì "50.000" luôn luôn > "19.5 USDC" và nút Tiếp tục không bao giờ sáng.
  const availableInCur = availableAmt === null ? null
    : isVnd ? (vndRate ? availableAmt / vndRate : null) : availableAmt
  const overBalance = availableInCur !== null && amount > availableInCur
  // CHỐT CHẶN CUỐI cho việc gửi cho chính mình (user chốt 07-31). PasteAddress/QRScanner đã chặn
  // ở cửa vào, nhưng còn đường qua Danh bạ (user tự lưu ví mình thành 1 contact) nên phải chặn
  // ở đây nữa. Dùng `walletAddr` (lấy từ Circle qua ensureWalletAddress) chứ KHÔNG dùng
  // localStorage: trên PWA mobile localStorage có thể vắng → chặn hụt.
  const selfSend = !!walletAddr && address?.trim().toLowerCase() === walletAddr.toLowerCase()
  // Nút sáng ngay khi có số tiền hợp lệ; CHỈ chặn khi biết CHẮC vượt số dư. Không khoá nút chỉ vì số
  // dư chưa tải xong (trước đây đòi availableAmt!==null làm nút "chết" khi số dư/địa chỉ chưa về kịp).
  // VND chưa có tỷ giá → chưa cho đi tiếp (không thể tính số USDC phải gửi).
  const canContinue = amount > 0 && !overBalance && !selfSend && (!isVnd || !!vndRate)
  const decimalsFor = c => (effectiveToken(c) === 'cirBTC' ? 8 : 2)
  const availableStr = isVnd
    ? `${availableInCur !== null ? Math.floor(availableInCur).toLocaleString('vi-VN') : '…'} ₫`
    : `${availableAmt !== null ? availableAmt.toFixed(decimalsFor(cur)) : '…'} ${cur}`

  // GỢI Ý SỐ TIỀN (user chốt 08-04) — CHỈ cho VND: gõ "50" → [5.000] [50.000] [500.000].
  // Không áp cho USD/EUR: gõ "50" đã là đúng 50 đô, gợi ý ×100 thành 5.000 đô là bẫy chết người.
  const hints = isVnd && !showCur ? amountHints(digits, availableInCur) : []

  // Numpad: '.' = dấu thập phân (chỉ 1 lần); BACK xóa từng ký tự.
  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    // VND KHÔNG có số lẻ — chặn hẳn dấu chấm (nhập "50.5 đồng" là vô nghĩa).
    if (key === '.') { if (isVnd) return; setDigits(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (digits.length >= 12) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

  // Số đang gõ, hiển thị cho DỄ ĐỌC: VND chèn dấu chấm ngăn nghìn ngay khi gõ (500000 → 500.000)
  // — người lớn tuổi gõ 6 số liền không tự đếm nổi mình đang ở 50 nghìn hay 500 nghìn.
  const shownDigits = isVnd && digits ? parseInt(digits, 10).toLocaleString('vi-VN') : digits
  const amountStr = (cur === 'USD' ? displaySymbol('USDC') : '') + shownDigits + (isVnd && digits ? ' ₫' : '')
  // Cỡ chữ co theo BỀ RỘNG THẬT (số VND dài gấp đôi USD nên đếm ký tự là tràn) — kèm cả caret "_"
  // vào phép đo, nếu không sẽ hụt đúng bề ngang dấu nháy rồi tràn ở số dài nhất.
  const [fitRef, fitSize] = useFitFontSize(amountStr + '_', { max: 52, min: 18, weight: 600 })

  return (
    <div className="screen">
      <ErrorToast message={params.sendError} />

      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        {t('Gửi tiền')}
      </div>

      {/* Cụm Send-to / số tiền / note — 1 flex column căn giữa vùng hàng 2-5. gap 4dvh (user chốt
          07-22c: 2dvh quá sát/ngộp, tách ra 1 đoạn nhỏ cho thoáng — vẫn là cụm, chưa rải rạc). */}
      <div style={{ gridRow: '2 / 6', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4dvh', minWidth: 0 }}>
        <div className="center" style={{ gap: 6 }}>
          <span style={{ fontSize: 'var(--fs-md-lg)', color: 'var(--color-muted)' }}>{t('Gửi cho:')}</span>
          <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)' }}>
            {name || shortenAddr(address)}
          </span>
        </div>

        <div className="center col" style={{ gap: 6 }}>
          {/* Số to, LUÔN căn giữa; chip tiền tệ neo BÌA PHẢI (không bám theo bề rộng số nữa) */}
          <div ref={fitRef} style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="num" style={{ fontSize: fitSize, fontWeight: 'var(--fw-semibold)', lineHeight: 1, whiteSpace: 'nowrap', color: overBalance ? 'var(--color-error)' : digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {amountStr}<span className="caret">_</span>
            </span>
            <button onClick={() => setShowCur(true)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 10, padding: '6px 10px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {cur}<Icon name="down2" size="var(--is-md-lg)" color="var(--color-brand)" />
            </button>
          </div>
          {/* VND: nói THẲNG số USDC sẽ rời ví. Người dùng gõ tiền Việt nhưng thứ chạy trên chain
              là USDC — giấu đi là đánh lừa, mà hiện mờ nhạt thì họ không nhận ra mình đang tiêu
              stablecoin. Chưa có tỷ giá → báo rõ thay vì để nút Tiếp tục chết câm không lý do. */}
          {isVnd && digits && (
            <span className="num" style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)', textAlign: 'center' }}>
              {vndRate ? `≈ ${tokenAmount.toFixed(2)} USDC` : t('Đang lấy tỷ giá...')}
            </span>
          )}
          {selfSend ? (
            /* Vào được màn này với ví của chính mình chỉ còn đường Danh bạ — báo NGAY, đừng
               để user gõ xong số tiền mới biết không gửi được. */
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>
              {t('Đây là ví của bạn – không gửi cho chính mình được')}
            </span>
          ) : overBalance && (
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>
              {t('Số dư không đủ (khả dụng:')} {availableStr})
            </span>
          )}
        </div>

        {/* Ô note + icon option (mở popup set note mặc định) BÊN PHẢI (user chốt 07-20e) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <input
            className="address-input"
            placeholder={t('Nội dung chuyển khoản (không bắt buộc)')}
            value={memo}
            onFocus={() => { onNoteFocus(); setTypingText(true) }}
            onBlur={() => setTypingText(false)}
            onChange={e => { setMemo(e.target.value); setNoteTouched(true) }}
            maxLength={100}
            style={{ flex: 1, minWidth: 0, height: 52, fontSize: 'var(--fs-md-lg)' }}
          />
          <button onClick={openNotePopup} aria-label={t('Đặt lời nhắn mặc định')}
            style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 10, border: 'none', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="option" size="var(--is-md-lg)" color="var(--color-muted)" />
          </button>
        </div>
      </div>

      {/* Numpad panel XÁM phím TRẮNG (user chốt 07-20 đồng bộ sheet Swap): nửa hàng 6 → đáy màn,
          full-bleed (margin âm bù lề .screen), bo góc trên. Numpad flex 6 + vùng nút/đệm flex 3
          (nút [Quay lại][Tiếp tục] là .row10-dual absolute, nổi trên nền xám đúng hàng 9-10).
          ẨN khi đang gõ CHỮ (ô note focus / popup note mở) — bàn phím iPhone trồi lên chồng lấn
          numpad rất kì (user báo 07-23); blur/đóng popup → numpad hiện lại. */}
      {!typingText && !showNote && (
      <div className="numpad-gray" style={{ gridRow: '6 / 11', margin: '5dvh -20px 0', padding: '24px 20px 0', background: 'var(--color-surface-2)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        {/* GỢI Ý SỐ TIỀN (chỉ VND) — nằm NGAY TRÊN numpad để ngón tay đang gõ với tới liền, bấm 1
            phát là xong thay vì đếm số 0. Chiều cao cố định (không có gợi ý vẫn chừa chỗ) để
            numpad KHÔNG nhảy lên nhảy xuống mỗi lần gõ thêm số — layout giật là ác mộng với người
            lớn tuổi đang nhắm ngón vào phím. */}
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
          {hints.map(v => (
            <button key={v} onClick={() => setDigits(String(v))}
              style={{ border: '1.5px solid var(--color-gray)', background: 'var(--color-white)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-item)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {fmtAmountHint(v)}
            </button>
          ))}
        </div>
        {/* Numpad 5.5 phần (07-20c: phím thấp lại một tẹo), nút .row10-dual vẫn neo biên hàng 9-10 */}
        <div style={{ flex: 5.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma={!isVnd} />
        </div>
        <div style={{ flex: 3.5 }} />
      </div>
      )}

      {/* Nút [Quay lại][Tiếp tục] = vị trí CHUẨN row10-dual (hàng 9-10, canh giữa quanh ranh giới 9/10) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>{t('Quay lại')}</button>
        <button className="btn btn-primary" disabled={!canContinue}
          onClick={() => navigate('SendConfirm', { address, name, amount, memo, currency: cur, tokenAmount })}>
          {t('Tiếp tục')}
        </button>
      </div>

      {/* Popup SET DEFAULT NOTE — chuẩn .popup-card (tâm vùng hàng 1-6). Set 1 lần → mọi lần gửi
          memo tự điền note này (user chốt 07-20e). */}
      {showNote && (
        <div className="popup-overlay" onClick={() => setShowNote(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">{t('Đặt lời nhắn mặc định')}</div>
            <input className="address-input" placeholder={t('Nhập tại đây')} value={draftNote}
              onChange={e => setDraftNote(e.target.value)} maxLength={100} autoFocus
              style={{ width: '100%', height: 52, fontSize: 'var(--fs-md-lg)' }} />
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={() => setShowNote(false)}>{t('Quay lại')}</button>
              <button className="btn btn-primary" onClick={saveDefaultNote}>{t('Lưu')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup chọn tiền tệ — chuẩn .popup-card (tâm vùng hàng 2-5, chừa bàn phím nửa dưới) */}
      {showCur && (
        <div className="popup-overlay" onClick={() => setShowCur(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">{t('Chọn tiền tệ')}</div>
            {CURRENCIES.map(c => (
              // Đổi tiền tệ → XOÁ số đang gõ. "50" nghĩa là 50 đô hay 50 đồng là hai chuyện khác
              // hẳn nhau; giữ nguyên số cũ là mời user gửi nhầm gấp hai vạn lần.
              <button key={c} onClick={() => { if (c !== cur) setDigits(''); setCur(c); setShowCur(false) }}
                className={`btn ${c === cur ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
