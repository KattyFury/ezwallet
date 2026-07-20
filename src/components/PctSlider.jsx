import { useRef, useState } from 'react'

// Thanh trượt CHỌN % SỐ DƯ (thay bàn phím số ở màn Swap — user chốt 07-17: người già/người mới
// không phải gõ từng chữ số, chỉ kéo "bao nhiêu % tài sản").
//
// Hành vi (spec user):
// - Kéo TỰ DO, độ chính xác 1%.
// - HÚT NAM CHÂM vào 5 mốc 0/25/50/75/100 khi thumb lọt trong ±SNAP_ZONE% (user chốt 07-17f —
//   trước là 6 mốc bước 20) → cảm giác "cạch" đúng mốc.
// - Chạm/bấm thẳng vào bất kỳ đâu trên thanh (kể cả mốc) → nhảy tới đó luôn, không cần kéo.
// - CHỈ % — KHÔNG hiện nhãn tiền ($0/$15/$29…) dưới mốc (user chốt: thừa, rối).
//
// ⚠️ Dùng POINTER EVENTS + setPointerCapture, KHÔNG dùng <input type=range>: range không tuỳ biến
// được mốc/bong bóng, và iOS bắt buộc kéo đúng thumb mới ăn (bấm vào track không nhảy).
const MARKERS = [0, 25, 50, 75, 100]
// 2 mức hút KHÁC NHAU theo hành vi (user chốt 07-20d): CLICK/TAP = hút MẠNH (±9%) cho dễ trúng mốc;
// ĐANG KÉO = hút NHẸ (±2%) để không lấn ý người kéo (nam châm mạnh lúc kéo làm lệch giá trị muốn chọn).
const SNAP_TAP = 9
const SNAP_DRAG = 2

// ⚠️ THỤT LỀ THANH TRƯỢT — ĐỪNG BỎ (user chốt 07-17c: "nó phải cách lề chuẩn số đo mình quy định").
// `.screen` chừa lề 20px mỗi bên. Nếu để track chạy hết bề ngang hàng thì mọi thứ NEO Ở MỐC 0%/100%
// (thumb, bong bóng %, nhãn "0%"/"100%") đều canh giữa quanh đầu mút → thò NỬA MÌNH ra ngoài, đè lên
// lề 20px và chạm mép màn (đúng lỗi user bắt). Thụt track vào EDGE px thì phần thò ra vẫn nằm gọn
// trong 20px: nhãn "100%" rộng ~40px → nửa = 20px = vừa khít lề, thumb 26px → nửa = 13px < 20px.
const EDGE = 22

export default function PctSlider({ pct, onChange, onDragStart, onDragEnd, disabled }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  // x màn hình → % (0-100, làm tròn 1%), có hút nam châm quanh mốc. snapZone = độ mạnh hút:
  // to (SNAP_TAP) lúc click, nhỏ (SNAP_DRAG) lúc kéo.
  function pctFromEvent(e, snapZone) {
    const r = trackRef.current.getBoundingClientRect()
    const raw = ((e.clientX - r.left) / r.width) * 100
    const clamped = Math.max(0, Math.min(100, raw))
    const snapped = MARKERS.find(m => Math.abs(clamped - m) <= snapZone)
    return snapped !== undefined ? snapped : Math.round(clamped)
  }

  function down(e) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true); onDragStart?.()
    onChange(pctFromEvent(e, SNAP_TAP))   // chạm đầu tiên = như click → hút mạnh
  }
  function move(e) { if (dragging && !disabled) onChange(pctFromEvent(e, SNAP_DRAG)) }   // kéo → hút nhẹ
  function up() { if (!dragging) return; setDragging(false); onDragEnd?.() }

  const dim = disabled ? 'var(--color-gray)' : 'var(--color-brand)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', userSelect: 'none', padding: `0 ${EDGE}px` }}>
      {/* Bong bóng % — bám theo thumb. translateX(-50%) để tâm bong bóng trùng tâm thumb ở MỌI vị trí. */}
      <div style={{ position: 'relative', height: 30, marginBottom: 2 }}>
        <div style={{
          position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
          background: disabled ? 'var(--color-gray)' : 'var(--grad-brand)', color: 'var(--color-white)',
          borderRadius: 8, padding: '2px 10px', fontSize: 'var(--fs-label)', fontWeight: 'var(--fw-semibold)',
          whiteSpace: 'nowrap', transition: dragging ? 'none' : 'left .15s ease',
        }}>
          {pct}%
        </div>
      </div>

      {/* Vùng CHẠM cao 44px (ngón tay) nhưng thanh vẽ mảnh — hitbox to, nhìn vẫn thanh mảnh */}
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center', cursor: disabled ? 'default' : 'pointer', touchAction: 'none' }}>
        <div ref={trackRef} style={{ position: 'relative', width: '100%', height: 4, borderRadius: 2, background: 'var(--color-gray)' }}>
          {/* Phần đã chọn */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: dim, borderRadius: 2, transition: dragging ? 'none' : 'width .15s ease' }} />
          {/* 5 mốc — to hơn (07-20: 8→14) cho người già dễ nhắm */}
          {MARKERS.map(m => (
            <div key={m} style={{
              position: 'absolute', left: `${m}%`, top: '50%', transform: 'translate(-50%,-50%)',
              width: 14, height: 14, borderRadius: '50%', background: pct >= m ? dim : 'var(--color-gray)',
            }} />
          ))}
          {/* Thumb */}
          <div style={{
            position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%,-50%)',
            width: 26, height: 26, borderRadius: '50%', background: 'var(--color-white)',
            border: `3px solid ${dim}`, boxShadow: '0 1px 4px rgba(0,0,0,.2)',
            transition: dragging ? 'none' : 'left .15s ease',
          }} />
        </div>
      </div>

      {/* Nhãn % — to hơn (07-20: fs-label 15 → fs-item 17) + BẤM ĐƯỢC (chạm nhãn = nhảy tới mốc,
          hitbox rộng padding 6px cho ngón tay người già). Không có nhãn tiền (user chốt). */}
      <div style={{ position: 'relative', height: 26, marginTop: 4 }}>
        {MARKERS.map(m => (
          <span key={m} onClick={() => !disabled && onChange(m)} style={{
            position: 'absolute', left: `${m}%`, transform: 'translateX(-50%)', padding: '4px 6px',
            fontSize: 'var(--fs-item)', color: pct === m ? 'var(--color-brand)' : 'var(--color-muted)',
            fontWeight: pct === m ? 'var(--fw-semibold)' : 'var(--fw-normal)', whiteSpace: 'nowrap',
            cursor: disabled ? 'default' : 'pointer', WebkitUserSelect: 'none', userSelect: 'none',
          }}>
            {m}%
          </span>
        ))}
      </div>
    </div>
  )
}
