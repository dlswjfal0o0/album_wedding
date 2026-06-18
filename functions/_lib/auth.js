// 인증 관련 유틸 함수 모음
// 외부 라이브러리 없이 Cloudflare Workers 런타임의 Web Crypto API만 사용합니다.

function textToBuf(text) {
  return new TextEncoder().encode(text);
}

function base64url(bufOrArr) {
  const bytes = bufOrArr instanceof ArrayBuffer ? new Uint8Array(bufOrArr) : bufOrArr;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    textToBuf(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const dataBuf = typeof data === 'string' ? textToBuf(data) : data;
  return crypto.subtle.sign('HMAC', key, dataBuf);
}

// ---- JWT ----

export async function signJWT(payload, secret, expiresInSeconds = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encHeader = base64url(textToBuf(JSON.stringify(header)));
  const encPayload = base64url(textToBuf(JSON.stringify(fullPayload)));
  const signingInput = `${encHeader}.${encPayload}`;
  const sig = await hmacSha256(secret, signingInput);
  const encSig = base64url(sig);

  return `${signingInput}.${encSig}`;
}

export async function verifyJWT(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encHeader, encPayload, encSig] = parts;
  const signingInput = `${encHeader}.${encPayload}`;
  const expectedSig = base64url(await hmacSha256(secret, signingInput));

  if (expectedSig !== encSig) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(encPayload)));
  } catch {
    return null;
  }

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

// 요청에서 사용자 정보를 추출합니다.
// 1) Authorization: Bearer <token> 헤더
// 2) ?token=<token> 쿼리 파라미터 (이미지/영상 태그처럼 헤더를 못 보낼 때 사용)
export async function getAuthUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get('token');
  }

  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

// ---- 비밀번호 해시 (PBKDF2-SHA256) ----

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function pbkdf2(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textToBuf(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `${bufToHex(salt)}:${bufToHex(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = (stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const salt = hexToBuf(saltHex);
  const hash = await pbkdf2(password, salt);
  return bufToHex(hash) === hashHex;
}
