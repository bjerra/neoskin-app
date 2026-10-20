import { cookies } from 'next/headers';
import { SESSION_COOKIE, readServerEnv, readSessionToken } from './session.js';

/**
 * Verified session for Server Components. Returns null when the cookie is
 * missing, expired, or signed with a different AUTH_SECRET.
 */
export async function getCurrentUser() {
  // Touch cookies() first so routes stay dynamic even when auth is unset
  // during a build.
  const cookieStore = await cookies();
  const secret = readServerEnv('AUTH_SECRET');
  if (!secret) return null;

  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return readSessionToken(token, secret);
}

/**
 * Verified auth check for Server Actions and server-rendered data.
 *
 * Server Actions are POST endpoints whose IDs ship in the client bundle, so
 * they must not rely on middleware alone. The cookie is HMAC-verified here
 * with AUTH_SECRET; the signature is not trusted from the client.
 *
 * @returns {Promise<{ username: string, exp: number }>}
 * @throws {Error} if there is no valid session
 */
export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}
