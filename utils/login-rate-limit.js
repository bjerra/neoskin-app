/** Per-instance lockout plus a fixed delay (applied by the login route). */
export const FAILURE_DELAY_MS = 1000;
export const MAX_FAILURES = 20;
export const WINDOW_MS = 10 * 60 * 1000;

export function createLoginRateLimiter({
  windowMs = WINDOW_MS,
  maxFailures = MAX_FAILURES,
} = {}) {
  const attempts = new Map();

  function getEntry(key, now) {
    const entry = attempts.get(key);
    if (!entry) return null;
    if (now - entry.start >= windowMs) {
      attempts.delete(key);
      return null;
    }
    return entry;
  }

  return {
    isLimited(key, now = Date.now()) {
      const entry = getEntry(key, now);
      return Boolean(entry && entry.count >= maxFailures);
    },
    retryAfterSeconds(key, now = Date.now()) {
      const entry = getEntry(key, now);
      if (!entry) return 0;
      return Math.max(1, Math.ceil((entry.start + windowMs - now) / 1000));
    },
    recordFailure(key, now = Date.now()) {
      const entry = getEntry(key, now);
      if (!entry) {
        attempts.set(key, { count: 1, start: now });
      } else {
        entry.count += 1;
      }

      if (attempts.size > 500) {
        for (const [storedKey, stored] of attempts) {
          if (now - stored.start >= windowMs) attempts.delete(storedKey);
        }
      }
    },
    clear(key) {
      attempts.delete(key);
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter();

export function clientAddress(request) {
  const netlifyIp = request.headers.get('x-nf-client-connection-ip');
  if (netlifyIp && netlifyIp.trim()) return netlifyIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  return 'unknown';
}
