import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import ErrorToast from '../components/ErrorToast'
import { getTokenInfo } from '../chain'
import { ensureWalletAddress } from '../circle'
import { t } from '../i18n'
import { findContactName } from '../store'
import { displaySymbol, spendableOf, amountFontSize } from '../data'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

// USD = nhãn thân thiện, gửi = USDC (1:1). 3 token còn lại gửi đúng token đó.
const CURRENCIES = ['USD', 'USDC', 'EURC', 'cirBTC']
const effectiveToken = c => (c === 'USD' ? 'USDC' : c)

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

  const amount = parseFloat(digits || '0')
  const overBalance = availableAmt !== null && amount > availableAmt
  // Nút sáng ngay khi có số tiền hợp lệ; CHỈ chặn khi biết CHẮC vượt số dư. Không khoá nút chỉ vì số
  // dư chưa tải xong (trước đây đòi availableAmt!==null làm nút "chết" khi số dư/địa chỉ chưa về kịp).
  const canContinue = amount > 0 && !overBalance
  const decimalsFor = c => (effectiveToken(c) === 'cirBTC' ? 8 : 2)
  const availableStr = `${availableAmt !== null ? availableAmt.toFixed(decimalsFor(cur)) : '…'} ${cur}`

  // Numpad: '.' = dấu thập phân (chỉ 1 lần); BACK xóa từng ký tự.
  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (key === '.') { setDigits(d => (d.includes('.') ? d : (d === '' ? '0.' : d + '.'))); return }
    if (digits.length >= 12) return
    if (digits === '0') { setDigits(key); return }
    setDigits(d => d + key)
  }

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
          <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="num" style={{ fontSize: amountFontSize((cur === 'USD' ? '$' : '') + digits, 52, 9), fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: overBalance ? 'var(--color-error)' : digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
              {cur === 'USD' ? displaySymbol('USDC') : ''}{digits}<span className="caret">_</span>
            </span>
            <button onClick={() => setShowCur(true)}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 10, padding: '6px 10px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {cur}<Icon name="down2" size="var(--is-md-lg)" color="var(--color-brand)" />
            </button>
          </div>
          {overBalance && (
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
            onFocus={onNoteFocus}
            onChange={e => { setMemo(e.target.value); setNoteTouched(true) }}
            maxLength={100}
            style={{ flex: 1, minWidth: 0, height: 52, fontSize: 'var(--fs-md-lg)' }}
          />
          <button onClick={openNotePopup} aria-label="Set default note"
            style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 10, border: 'none', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="option" size="var(--is-md-lg)" color="var(--color-muted)" />
          </button>
        </div>
      </div>

      {/* Numpad panel XÁM phím TRẮNG (user chốt 07-20 đồng bộ sheet Swap): nửa hàng 6 → đáy màn,
          full-bleed (margin âm bù lề .screen), bo góc trên. Numpad flex 6 + vùng nút/đệm flex 3
          (nút [Quay lại][Tiếp tục] là .row10-dual absolute, nổi trên nền xám đúng hàng 9-10). */}
      <div className="numpad-gray" style={{ gridRow: '6 / 11', margin: '5dvh -20px 0', padding: '24px 20px 0', background: 'var(--color-surface)', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column' }}>
        {/* Numpad 5.5 phần (07-20c: phím thấp lại một tẹo), nút .row10-dual vẫn neo biên hàng 9-10 */}
        <div style={{ flex: 5.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
        <div style={{ flex: 3.5 }} />
      </div>

      {/* Nút [Quay lại][Tiếp tục] = vị trí CHUẨN row10-dual (hàng 9-10, canh giữa quanh ranh giới 9/10) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>{t('Quay lại')}</button>
        <button className="btn btn-primary" disabled={!canContinue}
          onClick={() => navigate('SendConfirm', { address, name, amount, memo, currency: cur })}>
          {t('Tiếp tục')}
        </button>
      </div>

      {/* Popup SET DEFAULT NOTE — chuẩn .popup-card (tâm vùng hàng 1-6). Set 1 lần → mọi lần gửi
          memo tự điền note này (user chốt 07-20e). */}
      {showNote && (
        <div className="popup-overlay" onClick={() => setShowNote(false)}>
          <div className="popup-card" onClick={e => e.stopPropagation()}>
            <div className="popup-title">Set your default note</div>
            <input className="address-input" placeholder="Type here" value={draftNote}
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
              <button key={c} onClick={() => { setCur(c); setShowCur(false) }}
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
