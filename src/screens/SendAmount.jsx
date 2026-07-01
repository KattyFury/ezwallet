import { useState, useEffect } from 'react'
import { useNav } from '../nav'
import Numpad from '../components/Numpad'
import Icon from '../components/Icon'
import ErrorToast from '../components/ErrorToast'
import AmountSuggest from '../components/AmountSuggest'
import { getTokenInfo, getVndRate } from '../chain'
import { t } from '../i18n'
import { findContactName } from '../store'

function shortenAddr(addr) {
  return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''
}

const CURRENCIES = ['VND', 'USDC', 'EURC', 'CNY']
// định dạng số theo tiền tệ: VND có dấu chấm ngăn nghìn; token để nguyên
function fmtNum(n, cur) {
  if (cur === 'VND') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return String(n)
}

export default function SendAmount() {
  const { navigate, params } = useNav()
  const { address } = params
  const name = params.name || findContactName(address)
  // Tiền tệ hiển thị = tiền tệ MẶC ĐỊNH của người dùng này (không ép theo tiền tệ ghi trong QR).
  // QR ghi VND mà người quét đang dùng USDC → hiện USDC tương đương cho đỡ rối (quy đổi ở effect).
  const qrCurrency = params.currency
  const userCurrency = localStorage.getItem('ez_currency') || 'VND'
  const [cur, setCur] = useState(userCurrency)
  // Cùng tiền tệ (hoặc không quét QR) → điền thẳng; khác tiền tệ → để trống, quy đổi sau khi có tỷ giá
  const [digits, setDigits] = useState(() =>
    params.amount && (!qrCurrency || qrCurrency === userCurrency) ? String(params.amount) : ''
  )
  const [memo, setMemo] = useState(params.memo || '')
  const [showCur, setShowCur] = useState(false)
  const [availableVND, setAvailableVND] = useState(null) // số dư USDC quy ra VND
  const [rates, setRates] = useState({ VND: 1, USDC: 25000, EURC: 27000, CNY: 3448 })

  useEffect(() => {
    const addr = localStorage.getItem('ez_wallet_addr')
    if (addr) getTokenInfo(addr, 'USDC').then(i => setAvailableVND(i.vnd)).catch(() => setAvailableVND(0))
    else setAvailableVND(0)
    Promise.all([getVndRate('USDC'), getVndRate('EURC')])
      .then(([u, e]) => {
        const r = { VND: 1, USDC: u, EURC: e, CNY: Math.round(u / 7.25) }
        setRates(r)
        // Quét QR bằng tiền tệ KHÁC tiền tệ mặc định của người quét → quy đổi về tiền tệ của họ:
        // giá trị QR quy ra VND (× tỷ giá tiền tệ QR) rồi chia tỷ giá tiền tệ của người quét.
        if (params.amount && qrCurrency && qrCurrency !== userCurrency && r[qrCurrency] && r[userCurrency]) {
          const vnd = params.amount * r[qrCurrency]
          setDigits(String(Math.round(vnd / r[userCurrency])))
        }
      })
      .catch(() => {})
  }, [])

  const amount = parseInt(digits || '0')
  const amountVND = Math.round(amount * (rates[cur] || 1))
  const overBalance = availableVND !== null && amountVND > availableVND
  const canContinue = amount > 0 && !overBalance && availableVND !== null

  // số dư khả dụng hiển thị theo đúng tiền tệ đang chọn
  const availableCur = cur === 'VND' ? (availableVND || 0) : (availableVND || 0) / (rates[cur] || 1)
  const availableStr = cur === 'VND'
    ? `${fmtNum(Math.round(availableCur), 'VND')} VND`
    : `${availableCur.toFixed(2)} ${cur}`

  function handleKey(key) {
    if (key === 'BACK') { setDigits(d => d.slice(0, -1)); return }
    if (key === ',') return
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
        {/* Số to như màn số dư; VND là NÚT đổi tiền tệ (nhỏ, xám, mũi tên xuống) */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* số căn giữa tuyệt đối; chip VND treo SÁT bên phải số (absolute left:100%) */}
          <span className="num" style={{ position: 'relative', fontSize: 'var(--fs-amount)', fontWeight: 'var(--fw-semibold)', lineHeight: 1, color: overBalance ? 'var(--color-error)' : digits ? 'var(--color-content)' : 'var(--color-faint)' }}>
            {fmtNum(amount, cur)}
            <button onClick={() => setShowCur(true)}
              style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1.5px solid var(--color-gray)', borderRadius: 10, padding: '6px 10px', background: 'var(--color-white)', cursor: 'pointer', fontFamily: 'var(--font-condensed)', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)', color: 'var(--color-content)', whiteSpace: 'nowrap' }}>
              {cur}<Icon name="down2" size={12} color="var(--color-muted)" />
            </button>
          </span>
        </div>
        {overBalance && (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center' }}>
            {t('Số dư không đủ (khả dụng:')} {availableStr})
          </span>
        )}
      </div>

      <AmountSuggest cur={cur} amount={amount} digits={digits} fmtNum={fmtNum} onPick={v => setDigits(String(v))} />

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

      {/* Numpad 2.5 hàng (7,8,nửa 9) + nút ở ranh giới 9/10 — gộp rows 7-10 thành flex 2.5 / 1.5 */}
      <div style={{ gridRow: '7 / 11', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 2.5, minHeight: 0 }}>
          <Numpad onKey={handleKey} showComma={false} />
        </div>
        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button className="btn btn-secondary" style={{ width: '44%' }} onClick={() => navigate('HomeSend')}>{t('Quay lại')}</button>
          <button className="btn btn-primary" style={{ width: '44%' }} disabled={!canContinue}
            onClick={() => navigate('SendConfirm', { address, name, amount, memo, currency: cur })}
          >
            {t('Tiếp tục')}
          </button>
        </div>
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
