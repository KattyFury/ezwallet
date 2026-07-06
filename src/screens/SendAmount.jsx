import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import ErrorToast from '../components/ErrorToast'
import { getTokenInfo } from '../chain'
import { t } from '../i18n'
import { findContactName } from '../store'
import { displaySymbol, spendableOf } from '../data'

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
  const [memo, setMemo] = useState(params.memo || '')
  const [showCur, setShowCur] = useState(false)
  const [availableAmt, setAvailableAmt] = useState(null) // số dư của TOKEN đang chọn (đơn vị token thật)

  // Số dư khả dụng: theo ĐÚNG token đang chọn (USD/USDC → USDC; EURC → EURC; cirBTC → cirBTC)
  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    const tok = effectiveToken(cur)
    if (!addr) { setAvailableAmt(0); return }
    setAvailableAmt(null)
    // spendableOf: USDC chừa lại 1 làm phí mạng (gas Arc trả bằng USDC) — khách không gửi hết được
    getTokenInfo(addr, tok).then(i => setAvailableAmt(spendableOf(tok, i.balance))).catch(() => setAvailableAmt(0))
  }, [cur])

  const amount = parseFloat(digits || '0')
  const overBalance = availableAmt !== null && amount > availableAmt
  const canContinue = amount > 0 && !overBalance && availableAmt !== null
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

      <div className="row-2 center" style={{ gap: 6 }}>
        <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>{t('Gửi cho:')}</span>
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)' }}>
          {name || shortenAddr(address)}
        </span>
      </div>

      <div className="row-3-4 center col" style={{ gap: 6 }}>
        {/* Số to như màn số dư, LUÔN căn giữa; chip tiền tệ neo BÌA PHẢI (không bám theo bề rộng số nữa) */}
        <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="num" style={{ fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: overBalance ? 'var(--color-error)' : digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
            {cur === 'USD' ? displaySymbol('USDC') : ''}{digits}<span className="caret">_</span>
          </span>
          <button onClick={() => setShowCur(true)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '6px 10px', background: 'var(--color-white)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
            {cur}<Icon name="down2" size={12} color="var(--color-muted)" />
          </button>
        </div>
        {overBalance && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>
            {t('Số dư không đủ (khả dụng:')} {availableStr})
          </span>
        )}
      </div>

      <div className="row-5 center">
        <input
          className="address-input"
          placeholder={t('Nội dung chuyển khoản (không bắt buộc)')}
          value={memo}
          onChange={e => setMemo(e.target.value)}
          maxLength={100}
          style={{ width: '100%', height: 52, fontSize: 'var(--fs-body)' }}
        />
      </div>

      {/* Numpad = hàng 6.5→8.5 chính xác: gridRow 6/9 (50-80%) với spacer 0.5 + numpad 2.5
          → numpad ở 55-80%. TÁCH khỏi nút để nút không bị kéo lệch. */}
      <div style={{ gridRow: '6 / 9', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 0.5 }} />
        <div style={{ flex: 2.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma />
        </div>
      </div>

      {/* Nút [Quay lại][Tiếp tục] = vị trí CHUẨN row10-dual (hàng 9-10, canh giữa quanh ranh giới 9/10) */}
      <div className="row10-dual">
        <button className="btn btn-secondary" onClick={() => navigate('HomeSend')}>{t('Quay lại')}</button>
        <button className="btn btn-primary" disabled={!canContinue}
          onClick={() => navigate('SendConfirm', { address, name, amount, memo, currency: cur })}>
          {t('Tiếp tục')}
        </button>
      </div>

      {/* Popup chọn tiền tệ — neo nửa trên (tránh bàn phím) */}
      {showCur && (
        <div onClick={() => setShowCur(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14dvh' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '70%', maxWidth: 300, background: 'var(--color-white)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)', textAlign: 'center', padding: '6px 0' }}>{t('Chọn tiền tệ')}</div>
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
