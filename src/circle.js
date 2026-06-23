import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

let sdk = null;

export function getSDK() {
  if (!sdk) {
    sdk = new W3SSdk({
      appSettings: { appId: '518fec6a-4680-5175-9de6-0810fb3dfd04' },
    });
  }
  return sdk;
}

export async function createSession(email) {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function initializeWallet(userToken) {
  const res = await fetch('/api/wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'initialize', userToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export function executeChallenge(sdk, userToken, encryptionKey, challengeId) {
  return new Promise((resolve, reject) => {
    sdk.setAuthentication({ userToken, encryptionKey });
    sdk.execute(challengeId, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}
