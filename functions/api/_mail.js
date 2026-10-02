// Outgoing email. Provider: Resend (https://resend.com), from no-reply@ezwallet.cash (owner decision 2026-09-27).
// Needs env.RESEND_API_KEY (+ the ezwallet.cash domain verified in Resend).
// Without a key: with env.DEV_LOG_OTP = '1' (set only by local dev, never on a Pages project) the message is printed
// to the server log instead; anywhere else sending fails loudly - a login code must never be silently dropped.
const FROM = 'ezwallet <no-reply@ezwallet.cash>'

export async function sendMail(env, { to, subject, text, html }) {
  if (!env.RESEND_API_KEY) {
    if (env.DEV_LOG_OTP === '1') {
      console.log(`[mail:DEV] to=${to} subject=${JSON.stringify(subject)}\n${text}`)
      return { ok: true, dev: true }
    }
    throw new Error('Email is not configured (RESEND_API_KEY missing)')
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, text, html }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Email provider error ${res.status}: ${body.slice(0, 200)}`)
  }
  return { ok: true }
}

export function codeEmail(code) {
  const text = `Your ezwallet sign-in code is ${code}\n\nIt expires in 10 minutes. If you did not try to sign in, you can ignore this email - nobody can get in without this code and your PIN.`
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;color:#000">
<p>Your ezwallet sign-in code is</p>
<p style="font-size:32px;font-weight:600;letter-spacing:6px;margin:8px 0 16px">${code}</p>
<p style="color:#667085">It expires in 10 minutes. If you did not try to sign in, you can ignore this email - nobody can get in without this code and your PIN.</p>
</div>`
  return { subject: `${code} is your ezwallet sign-in code`, text, html }
}
