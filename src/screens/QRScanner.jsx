import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useNav } from '../nav'
import { isOwnAddress } from '../data'
// parseQR lives in src/qr.js - SHARED with the QR drawing code, so the format has one source of truth.
// It returns { wrongChain } for an EZwallet QR from ANOTHER chain → that must be caught separately, it
// must NOT fall into the "valid" branch (it has no .address, so going on lands on the amount screen with undefined).
import { parseQR } from '../qr'

export default function QRScanner() {
  const { navigate } = useNav()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('Point the camera at a QR code')

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
        setError('Cannot access camera – pick a QR image or paste an address.')
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
          if (parsed?.wrongChain) {
            setHint('QR from another network – this wallet currently only works on Arc')
          } else if (parsed && isOwnAddress(parsed.address)) {
            // Scanned your OWN receive QR (very easy to do: your QR is open on the Receive screen
            // or sitting in the QR library). Do NOT go on - say so and keep scanning, never enter the amount screen.
            setHint("That's your own QR – scan the recipient's QR")
          } else if (parsed) {
            active = false
            navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount, currency: parsed.currency })
            return
          } else {
            setHint('Invalid QR, try again')
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
        if (parsed?.wrongChain) setHint('QR from another network – this wallet currently only works on Arc')
        else if (parsed && isOwnAddress(parsed.address)) setHint("That's your own QR – scan the recipient's QR")
        else if (parsed) navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount, currency: parsed.currency })
        else setHint('No valid QR found in the image')
      }
      img.onerror = () => setHint('Could not read the image')
      img.src = url
    } catch {
      setHint('Could not read the QR image')
    }
  }

  return (
    <div className="screen">
      {/* Row 1 = the screen TITLE, consistent with every other sub-screen (user decision 07-29 - this screen
          had no title before, the scan box took row 1 as well). */}
      <div className="row-1 center screen-title" style={{ fontSize: 'var(--fs-title)', fontWeight: 'var(--fw-medium)' }}>
        Scan QR
      </div>

      {/* The BLOCK (scan square + 2 caption lines) is centred on ROWS 2-7 (user decision 07-29 - moved down to
          give row 1 to the title; it used to be 1-6). */}
      <div style={{ gridRow: '2 / 8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minWidth: 0 }}>
        {error ? (
          <span style={{ fontSize: 'var(--fs-label)', color: 'var(--color-error)', textAlign: 'center', padding: '0 20px' }}>{error}</span>
        ) : (
          <>
            <div style={{ position: 'relative', width: '82%', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} autoPlay playsInline muted
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {/* Main line "medium-large" 21 + secondary line "medium" 19 (user decision 07-17f, with the network limit spelled out) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 10px', textAlign: 'center' }}>
              <span style={{ fontSize: 'var(--fs-md-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)' }}>{hint}</span>
              <span style={{ fontSize: 'var(--fs-body)', color: 'var(--color-muted)' }}>
                {'Real-life QR codes are not supported yet'}<br />{'Scan crypto wallet QRs only'}
              </span>
            </div>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} />

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>QR image</button>
        {/* "Done" and NOT "Back" (user decision 07-29): a BLUE button = the primary/finishing action,
            putting Back on a blue button reads as the wrong role (Back is always the secondary white button). */}
        <button className="btn btn-primary" onClick={() => navigate('HomeSend')}>Done</button>
      </div>
    </div>
  )
}
