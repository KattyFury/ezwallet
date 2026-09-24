import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useNav } from '../nav'
import { isOwnAddress } from '../data'
// parseQR lives in src/qr.js - SHARED with the QR drawing code, so the format has one source of truth.
// It returns { wrongChain } for an ezwallet QR from ANOTHER chain → that must be caught separately, it
// must NOT fall into the "valid" branch (it has no .address, so going on lands on the amount screen with undefined).
import { parseQR } from '../qr'
import ScreenSheet from '../components/ScreenSheet'
import ExitBar from '../components/ExitBar'
import { GRADIENT } from '../brandBg'

export default function QRScanner() {
  const { navigate } = useNav()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

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
            navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount, currency: parsed.currency, back: 'QRScanner' })
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
        else if (parsed) navigate('SendAmount', { address: parsed.address, name: null, amount: parsed.amount, currency: parsed.currency, back: 'QRScanner' })
        else setHint('No valid QR found in the image')
      }
      img.onerror = () => setHint('Could not read the image')
      img.src = url
    } catch {
      setHint('Could not read the QR image')
    }
  }

  return (
    <div className="screen" style={{ background: GRADIENT }}>
      <ScreenSheet />
      <div className="sheet-title">Scan QR to send</div>

      {/* Scan square - node 18:168: a literal fixed 258x258 (was a responsive 82%/aspectRatio), top
          11.81dvh, centred - the SAME position ShowQR/CreateQR's QR occupies (node 1:238/18:166 etc all
          draw this exact 258x258 box at the same spot, RE-VERIFIED 2026-09-10, not assumed). */}
      {error ? (
        <span style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '30dvh', fontSize: 'var(--fs-caption)', color: 'var(--color-error)', textAlign: 'center' }}>{error}</span>
      ) : (
        <div style={{ position: 'absolute', left: '50%', top: '11.81dvh', transform: 'translateX(-50%)', width: 258, height: 258, borderRadius: 16, overflow: 'hidden', background: '#000' }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Dynamic scan hint - real, working functionality (updates as the camera reads frames) that the
          static Figma mock has no equivalent for, kept as its own line above the caption node draws. */}
      {!error && (
        <span style={{ position: 'absolute', left: '6.41%', right: '6.41%', top: '48.7dvh', fontSize: 'var(--fs-content-1)', fontWeight: 'var(--fw-medium)', color: 'var(--color-content)', textAlign: 'center' }}>{hint}</span>
      )}

      {/* Caption - node 58:614: top-anchored 43.32dvh, ONE line only (RE-VERIFIED 2026-09-24 - Figma
          dropped the second "Real-life QR codes are not supported yet" line entirely, same single-line
          pattern ShowQR's own caption now uses). 14px semibold, --color-error. */}
      {!error && (
        <div style={{ position: 'absolute', left: '50%', top: '43.32dvh', transform: 'translateX(-50%)', width: 340, fontSize: 14, fontWeight: 'var(--fw-semibold)', textAlign: 'center', color: 'var(--color-error)' }}>
          Current Available Network: Arc Testnet
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} />

      <div className="row-10 row10-dual">
        <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>QR image</button>
        {/* "Done" and NOT "Back" (user decision 07-29): a BLUE button = the primary/finishing action,
            putting Back on a blue button reads as the wrong role (Back is always the secondary white button). */}
        <button className="btn btn-primary" onClick={() => navigate('HomeSend')}>Done</button>
      </div>

      <ExitBar onClick={() => navigate('HomeSend')} />
    </div>
  )
}
