import Icon from './Icon'

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'BACK'],
]

// showComma (tên cũ) = hiện phím THẬP PHÂN. Dùng dấu CHẤM '.' (không phải phẩy) — khớp chuẩn
// en-US đã dùng xuyên suốt app (toLocaleString('en-US',...), $1.50 chứ không phải $1,50).
export default function Numpad({ onKey, showComma = false, disabled = false }) {
  return (
    <div className={`numpad${disabled ? ' disabled' : ''}`}>
      {ROWS.map((row, ri) => (
        <div key={ri} className="numpad-row">
          {row.map((key) => {
            const isEmpty = key === '.' && !showComma
            return (
              <button
                key={key}
                type="button"
                className={`numpad-key${isEmpty ? ' empty' : ''}`}
                onClick={() => !isEmpty && onKey(key)}
              >
                {key === 'BACK'
                  ? <Icon name="erase" size={24} />
                  : isEmpty ? '' : key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
