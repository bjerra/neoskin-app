import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { credentialsMatch } from './credentials.js';
import { clientAddress, createLoginRateLimiter, FAILURE_DELAY_MS } from './login-rate-limit.js';
import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isHttps,
  readSessionToken,
  sessionCookieOptions,
} from './session.js';

const envKeys = ['AUTH_USERNAME', 'AUTH_PASSWORD', 'AUTH_SECRET', 'NODE_ENV'];
const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of envKeys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

describe('session token', () => {
  it('round-trips a signed session and rejects tampering', async () => {
    const secret = 'test-secret';
    const now = 1_700_000_000_000;
    const token = await createSessionToken('ada', secret, now);
    const session = await readSessionToken(token, secret, now + 1000);

    assert.equal(session.username, 'ada');
    assert.equal(session.exp, now + SESSION_MAX_AGE_SECONDS * 1000);
    assert.equal(token.includes('test-secret'), false);

    const [payload, signature] = token.split('.');
    const flipped = `${payload}.${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;
    assert.equal(await readSessionToken(flipped, secret, now), null);
    assert.equal(await readSessionToken(token, 'other-secret', now), null);
    assert.equal(await readSessionToken(token, secret, session.exp), null);
    assert.equal(await readSessionToken('not-a-token', secret, now), null);
    assert.equal(await readSessionToken(null, secret, now), null);
  });

  it('rejects a payload whose expiry was edited', async () => {
    const secret = 'test-secret';
    const now = 1_700_000_000_000;
    const token = await createSessionToken('ada', secret, now);
    const [payload] = token.split('.');
    const edited = Buffer.from(JSON.stringify({
      u: 'ada',
      exp: now + SESSION_MAX_AGE_SECONDS * 1000 * 10,
    })).toString('base64url');
    assert.equal(await readSessionToken(`${edited}.${token.split('.')[1]}`, secret, now), null);
    assert.equal(payload.length > 0, true);
  });
});

describe('cookie flags', () => {
  it('sets HttpOnly, Secure, and SameSite=Lax on HTTPS and in production', () => {
    process.env.NODE_ENV = 'development';
    const https = sessionCookieOptions({ url: 'https://shop.example/login', headers: { get: () => null } });
    assert.equal(https.httpOnly, true);
    assert.equal(https.secure, true);
    assert.equal(https.sameSite, 'lax');
    assert.equal(https.path, '/');

    process.env.NODE_ENV = 'production';
    const localProd = sessionCookieOptions({ url: 'http://internal/', headers: { get: () => null } });
    assert.equal(localProd.secure, true);

    process.env.NODE_ENV = 'development';
    assert.equal(isHttps({ url: 'http://localhost:3000/', headers: { get: () => null } }), false);
  });
});

describe('credentials', () => {
  it('matches only the configured username and password', () => {
    process.env.AUTH_USERNAME = 'ada';
    process.env.AUTH_PASSWORD = 'correct horse';
    process.env.AUTH_SECRET = 'signing-key';

    assert.deepEqual(credentialsMatch('ada', 'correct horse'), { ok: true, configured: true });
    assert.deepEqual(credentialsMatch('ada', 'wrong'), { ok: false, configured: true });
    assert.deepEqual(credentialsMatch('grace', 'correct horse'), { ok: false, configured: true });
    assert.deepEqual(credentialsMatch('ada', 'correct horse '), { ok: false, configured: true });
  });

  it('fails closed when configuration is missing', () => {
    delete process.env.AUTH_USERNAME;
    delete process.env.AUTH_PASSWORD;
    delete process.env.AUTH_SECRET;
    assert.deepEqual(credentialsMatch('ada', 'secret'), { ok: false, configured: false });
  });
});

describe('login rate limit', () => {
  it('locks out after the maximum failures and then resets', () => {
    const limiter = createLoginRateLimiter({ windowMs: 1000, maxFailures: 2 });
    const start = 10_000;

    assert.equal(limiter.isLimited('1.2.3.4', start), false);
    limiter.recordFailure('1.2.3.4', start);
    limiter.recordFailure('1.2.3.4', start + 10);
    assert.equal(limiter.isLimited('1.2.3.4', start + 20), true);
    assert.equal(limiter.retryAfterSeconds('1.2.3.4', start + 20) > 0, true);
    assert.equal(limiter.isLimited('1.2.3.4', start + 1000), false);

    limiter.recordFailure('1.2.3.4', start + 1000);
    limiter.clear('1.2.3.4');
    assert.equal(limiter.isLimited('1.2.3.4', start + 1000), false);
    assert.ok(FAILURE_DELAY_MS >= 500);
  });

  it('prefers the Netlify client IP', () => {
    const headers = new Headers({
      'x-forwarded-for': '8.8.8.8, 1.1.1.1',
      'x-nf-client-connection-ip': '203.0.113.5',
    });
    assert.equal(clientAddress({ headers }), '203.0.113.5');
    assert.equal(clientAddress({ headers: new Headers({ 'x-forwarded-for': '8.8.8.8, 1.1.1.1' }) }), '8.8.8.8');
    assert.equal(clientAddress({ headers: new Headers() }), 'unknown');
  });
});
