import { readToken, requireSecret } from './_auth.js';
import { JSON_HEADERS_BASE } from './_net.js';

const CIRCLE_API = 'https://api.circle.com/v1/w3s';

async function circlePost(path, body, apiKey) {
  const res = await fetch(`${CIRCLE_API}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function onRequestPost(ctx) {
  const apiKey = ctx.env.API_KEY || ctx.env.CIRCLE_API_KEY;
  const body = await ctx.request.json();

  // Social login: refresh the userToken with the refreshToken (a userToken lives 60') - for Google users,
  // because they have NO userId=email to mint a new token with, as the email flow does. Circle spec:
  // POST /v1/w3s/users/token/refresh · header X-User-Token · body {idempotencyKey, refreshToken, deviceId}.
  if (body.action === 'refreshSocial') {
    const { userToken, refreshToken, deviceId } = body;
    const res = await fetch(`${CIRCLE_API}/users/token/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-User-Token': userToken },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), refreshToken, deviceId }),
    });
    const data = await res.json();
    if (data.code || !data.data?.userToken) {
      console.error('[session] token refresh failed:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.message || 'refresh failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      userToken: data.data.userToken,
      encryptionKey: data.data.encryptionKey,
      refreshToken: data.data.refreshToken,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Social login: create a device token
  if (body.action === 'socialToken') {
    const { deviceId } = body;
    const res = await fetch(`${CIRCLE_API}/users/social/token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), deviceId }),
    });
    const data = await res.json();
    if (data.code) return new Response(JSON.stringify({ error: data.message }), { status: 400 });
    return new Response(JSON.stringify({
      deviceToken: data.data.deviceToken,
      deviceEncryptionKey: data.data.deviceEncryptionKey,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Email OTP: mail the code + return otpToken/deviceToken/deviceEncryptionKey for the SDK's verifyOtp.
  // Circle sends the email through the SMTP configured in the Console. Spec: POST /v1/w3s/users/email/token {deviceId,email}.
  if (body.action === 'emailToken') {
    const { deviceId } = body;
    const em = (body.email || '').toLowerCase().trim();
    const res = await fetch(`${CIRCLE_API}/users/email/token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), deviceId, email: em }),
    });
    const data = await res.json();
    if (data.code || !data.data?.otpToken) {
      console.error('[session] email token failed:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.message || 'email token failed' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      otpToken: data.data.otpToken,
      deviceToken: data.data.deviceToken,
      deviceEncryptionKey: data.data.deviceEncryptionKey,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // MAINNET-AUDIT C1: a Circle token is minted ONLY for the email inside a valid auth token (the user proved
  // they own it with the emailed code - /api/auth). A bare { email } is refused: it used to hand ANYONE a token
  // for ANY email. The email in the body, if any, is ignored.
  let secret;
  try { secret = requireSecret(ctx.env); } catch (e) {
    return new Response(JSON.stringify({ error: `Sign-in is not configured: ${e.message}` }), { status: 503, headers: JSON_HEADERS_BASE });
  }
  const email = await readToken(secret, body.authToken);
  if (!email) {
    return new Response(JSON.stringify({ error: 'Please sign in again', code: 'AUTH_REQUIRED' }), { status: 401, headers: JSON_HEADERS_BASE });
  }

  const userId = email;

  await circlePost('/users', { userId }, apiKey);

  const tokenData = await circlePost('/users/token', { userId }, apiKey);

  if (tokenData.code) {
    return new Response(JSON.stringify({ error: tokenData.message }), { status: 400 });
  }

  return new Response(JSON.stringify({
    userToken: tokenData.data.userToken,
    encryptionKey: tokenData.data.encryptionKey,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

