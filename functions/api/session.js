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

  // Social login: làm mới userToken bằng refreshToken (userToken sống 60') — cho user Google,
  // vì họ KHÔNG có userId=email để tạo token mới như luồng email. Spec Circle:
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
      return new Response(JSON.stringify({ error: data.message || 'refresh failed', detail: data }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    return new Response(JSON.stringify({
      userToken: data.data.userToken,
      encryptionKey: data.data.encryptionKey,
      refreshToken: data.data.refreshToken,
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  // Social login: tạo device token
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
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  const { email } = body;

  if (!email) {
    return new Response(JSON.stringify({ error: 'email required' }), { status: 400 });
  }

  const userId = email.toLowerCase().trim();

  await circlePost('/users', { userId }, apiKey);

  const tokenData = await circlePost('/users/token', { userId }, apiKey);

  if (tokenData.code) {
    return new Response(JSON.stringify({ error: tokenData.message }), { status: 400 });
  }

  return new Response(JSON.stringify({
    userToken: tokenData.data.userToken,
    encryptionKey: tokenData.data.encryptionKey,
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
