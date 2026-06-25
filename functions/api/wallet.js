const CIRCLE_API = 'https://api.circle.com/v1/w3s';

async function circleReq(method, path, body, apiKey, userToken) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (userToken) headers['X-User-Token'] = userToken;

  const res = await fetch(`${CIRCLE_API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function onRequestPost(ctx) {
  const apiKey = ctx.env.CIRCLE_API_KEY;
  const { action, userToken } = await ctx.request.json();

  if (!userToken) return new Response(JSON.stringify({ error: 'userToken required' }), { status: 400 });

  if (action === 'initialize') {
    const data = await circleReq('POST', '/user/initialize', {
      idempotencyKey: crypto.randomUUID(),
      accountType: 'EOA',
      blockchains: ['ARC-TESTNET'],
    }, apiKey, userToken);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (action === 'getAddress') {
    const wallets = await circleReq('GET', '/user/wallets', undefined, apiKey, userToken);
    const address = wallets?.data?.wallets?.[0]?.address || null;
    return new Response(JSON.stringify({ address }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (action === 'balance') {
    const wallets = await circleReq('GET', '/user/wallets', undefined, apiKey, userToken);
    const walletId = wallets?.data?.wallets?.[0]?.id;
    if (!walletId) return new Response(JSON.stringify({ balances: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
    const balData = await circleReq('GET', `/user/wallets/${walletId}/balances`, undefined, apiKey, userToken);
    return new Response(JSON.stringify({ balances: balData?.data?.tokenBalances || [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400 });
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
