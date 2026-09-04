// ══════════════════════════════════════════════════════════════════════════════
// THE IMPERATIVE BRIDGE TO THE PIN SHEET (2026-09-04, user decision - see PinGateHost.jsx for why
// this is a global host and not per-screen state, matching the app's own MFA-listener precedent in
// App.jsx rather than the local numpad-sheet precedent in Swap.jsx).
//
// `requestPin({ mode })` is called from anywhere (SendConfirm, Swap, later Security), and resolves
// with the 6-digit string once the user submits, or rejects if they cancel. There is at most ONE
// pending PIN request at a time - the app cannot show two PIN sheets - so a single module-level ref
// is enough, no queue.
// ══════════════════════════════════════════════════════════════════════════════
let pending = null   // { mode, resolve, reject } | null
let listener = null  // set by PinGateHost when it mounts

// `error` seeds the sheet with a message already showing on open - used by pinSigner.js to retry
// after a wrong-PIN response with "Wrong PIN. N attempts left." already visible (Figma Frame 5),
// instead of the caller having to reach back into PinGateHost's own state.
export function requestPin({ mode, error } = {}) {
  if (pending) return Promise.reject(new Error('a PIN request is already pending'))
  // ⚠️ NO LISTENER = FAIL NOW, DO NOT PARK THE PROMISE (2026-09-05).
  // `listener?.(pending)` used to swallow the "nobody is mounted" case: `pending` stayed set with
  // nothing on screen able to resolve it, so the caller (a Send waiting on its PIN) hung FOREVER -
  // and because `pending` was still truthy, every later requestPin() in that session rejected with
  // "already pending" too. One missing host poisoned PIN entry for the whole session. It is reachable
  // in practice: ErrorBoundary replacing the tree unmounts PinGateHost while a Send is in flight.
  if (!listener) return Promise.reject(Object.assign(new Error('pin-ui-unavailable'), { code: 'pin-ui-unavailable' }))
  return new Promise((resolve, reject) => {
    pending = { mode, error, resolve, reject }
    listener(pending)
  })
}

// Called by PinGateHost on submit ('verify' mode) / on final confirm ('set' mode).
export function resolvePin(pin) {
  if (!pending) return
  const { resolve } = pending
  pending = null
  resolve(pin)
}

// Called by PinGateHost on cancel, or by the caller after a wrong-PIN response it does not want to
// retry inline (PinGateHost itself handles the retry loop for wrong-PIN - see its file).
export function rejectPin(reason) {
  if (!pending) return
  const { reject } = pending
  pending = null
  reject(reason instanceof Error ? reason : new Error(reason || 'cancelled'))
}

// PinGateHost registers itself here once, at mount, so requestPin() can wake it up even though it
// lives in a different module (no React context needed for something this small - the same
// "imperative singleton" shape App.jsx's MFA listener already uses via a ref).
export function _registerPinGateListener(fn) {
  listener = fn
  // Unregistering (the host unmounting) with a request still in flight: reject it instead of leaving
  // the caller waiting on a sheet that no longer exists. Same reasoning as the guard in requestPin -
  // the pending slot must never outlive the UI that can clear it.
  if (!fn && pending) rejectPin(Object.assign(new Error('pin-ui-unavailable'), { code: 'pin-ui-unavailable' }))
}
