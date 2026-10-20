/**
 * Server-only password check. Do not import this from a client component.
 * Both sides are HMAC'd before comparison so the check does not leak the
 * expected length or contents through `timingSafeEqual`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readServerEnv } from './session.js';

function digestEqual(left, right, secret) {
  const actual = createHmac('sha256', secret).update(left, 'utf8').digest();
  const expected = createHmac('sha256', secret).update(right, 'utf8').digest();
  return timingSafeEqual(actual, expected);
}

/**
 * @returns {{ ok: boolean, configured: boolean }}
 */
export function credentialsMatch(username, password) {
  const expectedUser = readServerEnv('AUTH_USERNAME') ?? '';
  const expectedPass = readServerEnv('AUTH_PASSWORD') ?? '';
  const secret = readServerEnv('AUTH_SECRET') ?? '';
  const configured = expectedUser.length > 0 && expectedPass.length > 0 && secret.length > 0;

  if (!configured) {
    return { ok: false, configured: false };
  }

  const userOk = digestEqual(String(username), expectedUser, secret);
  const passOk = digestEqual(String(password), expectedPass, secret);
  return { ok: userOk && passOk, configured: true };
}
