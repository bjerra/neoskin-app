import { NextResponse } from 'next/server';
import { credentialsMatch } from '../../../../utils/credentials.js';
import {
  FAILURE_DELAY_MS,
  clientAddress,
  loginRateLimiter,
} from '../../../../utils/login-rate-limit.js';
import {
  SESSION_COOKIE,
  createSessionToken,
  readServerEnv,
  sessionCookieOptions,
} from '../../../../utils/session.js';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4096;
const MAX_CREDENTIAL_LENGTH = 1024;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function boundedCredential(value) {
  if (typeof value !== 'string') return '';
  if (value.length === 0 || value.length > MAX_CREDENTIAL_LENGTH) return '';
  return value;
}

function json(body, status, headers) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

export async function POST(request) {
  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'Invalid request' }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const expectedUser = readServerEnv('AUTH_USERNAME');
  const expectedPass = readServerEnv('AUTH_PASSWORD');
  const secret = readServerEnv('AUTH_SECRET');
  if (!expectedUser || !expectedPass || !secret) {
    return json({ error: 'Authentication is not configured' }, 500);
  }

  const key = clientAddress(request);
  if (loginRateLimiter.isLimited(key)) {
    await wait(FAILURE_DELAY_MS);
    return json(
      { error: 'Too many attempts. Try again later.' },
      429,
      { 'Retry-After': String(loginRateLimiter.retryAfterSeconds(key)) },
    );
  }

  const username = boundedCredential(body?.username);
  const password = boundedCredential(body?.password);
  const result = credentialsMatch(username, password);

  if (!result.ok) {
    loginRateLimiter.recordFailure(key);
    await wait(FAILURE_DELAY_MS);
    return json({ error: 'Invalid username or password' }, 401);
  }

  loginRateLimiter.clear(key);

  const token = await createSessionToken(username, secret);
  const response = json({ ok: true }, 200);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
  return response;
}
