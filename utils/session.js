/**
 * Signed session cookies.
 *
 * The token is payload.signature, HMAC-SHA256 with AUTH_SECRET. Verification
 * uses Web Crypto so it runs in both the Node.js server and middleware.
 * Nothing in this file is safe to import from client components: the secret
 * is read from the server environment only.
 */

const encoder = new TextEncoder();

export const SESSION_COOKIE = 'session';
/** 7 days. Long enough for a shared shop terminal, short enough to expire. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Read a server env var without a static `process.env.NAME` access.
 * Next inlines static member expressions into the middleware bundle at build
 * time, which would bake the secret into the deploy artifact and ignore
 * runtime changes. Computed access stays on the server process environment.
 */
export function readServerEnv(name) {
  return process.env[name];
}

export function isHttps(request) {
  // Netlify production (and deploy previews) always terminate TLS. Forcing
  // Secure there avoids depending on the internal request URL, which is
  // sometimes plain HTTP behind the proxy. Local `next dev` is not production,
  // so the cookie can be stored on http://localhost.
  if (process.env.NODE_ENV === 'production') return true;

  const forwarded = request?.headers?.get?.('x-forwarded-proto');
  if (forwarded && forwarded.split(',')[0].trim() === 'https') return true;

  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function sessionCookieOptions(request, { maxAge = SESSION_MAX_AGE_SECONDS } = {}) {
  return {
    httpOnly: true,
    secure: isHttps(request),
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEqualBytes(a, b) {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (i < a.length ? a[i] : 0) ^ (i < b.length ? b[i] : 0);
  }
  return diff === 0;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(payload, secret) {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return new Uint8Array(signature);
}

export async function createSessionToken(username, secret, now = Date.now()) {
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }

  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    u: username,
    exp: now + SESSION_MAX_AGE_SECONDS * 1000,
  })));
  const signature = await sign(payload, secret);
  return `${payload}.${bytesToBase64Url(signature)}`;
}

/**
 * @returns {Promise<{ username: string, exp: number } | null>}
 */
export async function readSessionToken(token, secret, now = Date.now()) {
  if (!secret || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  let provided;
  try {
    provided = base64UrlToBytes(signature);
  } catch {
    return null;
  }

  const expected = await sign(payload, secret);
  if (!constantTimeEqualBytes(expected, provided)) return null;

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
  } catch {
    return null;
  }

  if (!data || typeof data.u !== 'string' || typeof data.exp !== 'number') return null;
  if (!Number.isFinite(data.exp) || data.exp <= now) return null;

  return { username: data.u, exp: data.exp };
}
