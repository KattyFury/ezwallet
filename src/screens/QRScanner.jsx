import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useNav } from '../nav'
import { t } from '../i18n'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

function parseQR(text) {
  const raw = text.trim()
  if (isValid(raw)) return { address: raw, amount: null, currency: 'VND' }
  const m = raw.match(/ezwallet:(0x[0-9a-fA-F]{40})(?:\?amount=(\d+))?(?:&cur=(\w+))?/)
  if (m) return { address: m[1], amount: m[2] ? parseInt(m[2]) : null, currency: m[3] || 'VND' }
  return null
}

export default function QRScanner() {
  const { navigate } = useNav()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState(t('Hướng camera vào mã QR'))

  useEffect(() => {
    let stream = null
    let active = true
    const canvas = document.createElement('canvas')
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
        scan()
      } catch {
        setError(t('Không truy cập được camera – chọn ảnh QR hoặc dán địa chỉ.'))
      }
    }

    function scan() {
      if (!active) return
      const v = videoRef.current
      if (v && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
        canvas.width = v.videoWidth
        canvas.height = v.videoHeight
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code) {
          const parsed = parseQR(code.data)
          if (parsed) {
            active = false
            navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount, currency: parsed.currency })
            return
          } else {
            setHint(t('QR không hợp lệ, thử lại'))
          }
        }
      }
      loopRef.current = setTimeout(scan, 200)
    }

    start()
    return () => {
      active = false
      clearTimeout(loopRef.current)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function handlePickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        const code = jsQR(data.data, data.width, data.height)
        const parsed = code ? parseQR(code.data) : null
        if (parsed) navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount, currency: parsed.currency })
        else setHint(t('Không tìm thấy mã QR hợp lệ trong ảnh'))
      }
      img.onerror = () => setHint(t('Không đọc được ảnh'))
      img.src = url
    } catch {
      setHint(t('Không đọc được ảnh QR'))
    }
  }

  return (
    <div className="screen">
      {/* CỤM (ô vuông quét + 2 dòng chú thích) căn tâm HÀNG 1-6 (user chốt 07-17f — trước 1-5). */}
      <div style={{ gridRow: '1 / 7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minWidth: 0 }}>
        {error ? (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center', padding: '0 20px' }}>{error}</span>
        ) : (
          <>
            <div style={{ position: 'relative', width: '82%', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* Dòng chính "vừa-to" 21 + dòng phụ "vừa" 19 (user chốt 07-17f, kèm câu nói rõ giới hạn) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 10px', textAlign: 'center' }}>
              <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)' }}>{hint}</span>
              <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
                Real-life QR codes are not supported yet<br />Scan crypto wallet QRs only
              </span>
            </div>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} />

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>{t('Ảnh QR')}</button>
        <button className="btn btn-primary" onClick={() => navigate('HomeSend')}>{t('Quay lại')}</button>
      </div>
    </div>
  )
}
