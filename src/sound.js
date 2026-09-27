// ══ SUCCESS SOUND (user decision 2026-08-13) ══
//
// Plays ONLY at the 2 places that MOVE MONEY: send completed (SendReceipt) · swap completed (Swap).
// ⚠️ Do NOT sprinkle sounds on copy / save QR / screen changes: too many chimes and the sound LOSES ITS MEANING,
// so the moment money actually leaves the wallet no longer stands out (the user considered and rejected that).
// ⚠️ Do NOT add one for "money received" either: incoming money involves NO user gesture, iOS blocks playback →
// we would have to keep an AudioContext alive for the whole session, far more complexity. The user dropped it.
//
// The tone is GENERATED with Web Audio, no .mp3 file (the user's choice):
//   · 0 KB added to the app · works offline · no music licensing
//   · changing pitch/length = editing the numbers just below
//
// ⚠️ iOS RULE: an AudioContext is born 'suspended' and can ONLY be resumed INSIDE a user gesture. By the time a send
// finishes, many awaits have passed (PIN signing, waiting on-chain), so the gesture chain is BROKEN - calling resume()
// there is too late. Hence `unlockOnFirstTouch()` (App.jsx calls it once at startup) unlocks on the very FIRST touch
// anywhere in the app, after which playback works at any time.

const KEY = 'ez_sound'   // 'off' = muted. No key = ON (on by default, user decision)

export function isSoundOn() { return localStorage.getItem(KEY) !== 'off' }
export function setSoundOn(on) { localStorage.setItem(KEY, on ? 'on' : 'off') }

let ctx = null

function getCtx() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null              // browser too old → stay silent, do NOT blow up
  try { ctx = new AC() } catch { return null }
  return ctx
}

// Call once at startup (App.jsx). The first touch anywhere resumes the AudioContext and then removes its own
// listener. Both pointerdown and touchstart are used, to be safe on older iOS.
export function unlockOnFirstTouch() {
  const unlock = () => {
    const c = getCtx()
    if (c && c.state === 'suspended') c.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: true, passive: true })
  window.addEventListener('touchstart', unlock, { once: true, passive: true })
}

// One sine note plus an up/down volume envelope. The gain ramp is REQUIRED: letting gain jump straight from 0
// makes the speaker "click" at the start and end of the note.
function note(c, freq, startAt, dur, peak) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015)      // quick attack
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur)      // fade out
  osc.connect(gain); gain.connect(c.destination)
  osc.start(startAt); osc.stop(startAt + dur + 0.02)
}

// A two-note RISING "ting-ting" = the done/positive signal (falling notes read as an error).
// C6 1046.5 → E6 1318.5, ~0.3s total. Volume 0.18 = clearly audible without startling anyone.
export function playSuccess() {
  if (!isSoundOn()) return
  const c = getCtx()
  if (!c) return
  // Still try to resume in case the first unlock missed (iOS sometimes returns to suspended after the app has been
  // backgrounded and reopened). If it fails, stay silent - it must NEVER throw onto the receipt screen.
  if (c.state === 'suspended') c.resume().catch(() => {})
  try {
    const t0 = c.currentTime
    note(c, 1046.5, t0, 0.12, 0.18)
    note(c, 1318.5, t0 + 0.11, 0.20, 0.18)
  } catch { /* odd device → stay silent, do not break the money flow */ }
}
