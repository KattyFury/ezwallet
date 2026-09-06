// ══════════════════════════════════════════════════════════════════════════════
// EMAIL SENDING (2026-09-06, PIN-FLOW-SPEC.md §4) - the infrastructure the forgot-PIN flow needs
// and this project never had (bug.js sends to Telegram, not email).
//
// PROVIDER: Resend (resend.com). Chosen because its whole API is one POST with a bearer token - no
// SDK, no server-side session, matching how every other endpoint in this directory already just
// `fetch()`s Privy/Telegram directly. Free tier: 100 emails/day, 3000/month, no credit card.
//
// WITHOUT RESEND_API_KEY CONFIGURED → returns { ok: false, error: 'email-disabled' }, never throws.
// Same convention as every other optional integration here (KIT_KEY, TELEGRAM_BOT_TOKEN,
// PRIVY_AUTH_KEY): a missing key degrades the ONE feature that needs it, not the whole app.
//
// ⚠️ SENDER DOMAIN: `EZwallet <noreply@resend.dev>` works with ZERO setup (Resend's own shared
// testing domain), but Resend heavily rate-limits it and some inboxes flag it as untrusted. For
// production this should become `noreply@ezwallet.cash` (or a subdomain), which needs 3 DNS records
// (SPF/DKIM/a verification TXT) added once in Cloudflare DNS - the user has API access to that
// already (see the Cloudflare token in .env.txt), this file does not need changing either way, only
// the `FROM` constant below once a domain is verified.
// ══════════════════════════════════════════════════════════════════════════════

const FROM = 'EZwallet <onboarding@resend.dev>';

// Returns { ok: true } or { ok: false, error }. Never throws - a failed email must not crash the
// caller's own action (e.g. a PIN reset that was already recorded in KV should not roll back just
// because the notification about it failed to send).
export async function sendEmail(ctx, { to, subject, html, text }) {
  const apiKey = ctx.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'email-disabled' };
  if (!to || !subject || (!html && !text)) return { ok: false, error: 'bad-email-input' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, ...(html ? { html } : {}), ...(text ? { text } : {}) }),
    });
    if (!res.ok) return { ok: false, error: 'email-send-failed' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'email-send-failed' };
  }
}
