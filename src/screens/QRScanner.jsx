import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useNav } from '../nav'

function isValid(addr) { return /^0x[0-9a-fA-F]{40}$/.test(addr.trim()) }

function parseQR(text) {
  const raw = text.trim()
  if (isValid(raw)) return { address: raw, amount: null }
  const m = raw.match(/ezwallet:(0x[0-9a-fA-F]{40})(?:\?amount=(\d+))?/)
  if (m) return { address: m[1], amount: m[2] ? parseInt(m[2]) : null }
  return null
}

export default function QRScanner() {
  const { navigate } = useNav()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('Hướng camera vào mã QR')

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
        setError('Không truy cập được camera — chọn ảnh QR hoặc dán địa chỉ.')
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
            navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount })
            return
          } else {
            setHint('QR không hợp lệ, thử lại')
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
        if (parsed) navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount })
        else setHint('Không tìm thấy mã QR hợp lệ trong ảnh')
      }
      img.onerror = () => setHint('Không đọc được ảnh')
      img.src = url
    } catch {
      setHint('Không đọc được ảnh QR')
    }
  }

  return (
    <div className="screen">
      <div className="row-1-5 center col" style={{ gap: 18 }}>
        {error ? (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center', padding: '0 20px' }}>{error}</span>
        ) : (
          <>
            {/* Ô vuông quét QR — trung tâm hàng 1-5 */}
            <div style={{ position: 'relative', width: '62%', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* khung góc */}
              {[
                { top: 8, left: 8, borderTop: '3px solid #fff', borderLeft: '3px solid #fff' },
                { top: 8, right: 8, borderTop: '3px solid #fff', borderRight: '3px solid #fff' },
                { bottom: 8, left: 8, borderBottom: '3px solid #fff', borderLeft: '3px solid #fff' },
                { bottom: 8, right: 8, borderBottom: '3px solid #fff', borderRight: '3px solid #fff' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 4, ...s }} />
              ))}
            </div>
            <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-muted)', textAlign: 'center' }}>{hint}</span>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} />

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>Ảnh QR</button>
        <button className="btn btn-primary" onClick={() => navigate('HomeSend')}>Quay lại</button>
      </div>
    </div>
  )
}
