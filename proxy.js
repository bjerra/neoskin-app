import { NextResponse } from 'next/server';
import { SESSION_COOKIE, readServerEnv, readSessionToken } from './utils/session.js';

export async function proxy(request) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add custom header to track middleware execution
  response.headers.set('X-Middleware-Executed', 'true');

  const pathname = request.nextUrl.pathname;

  // Router prefetches fire for every <Link> in the viewport. The RSC payload
  // of a prefetch only carries component shells — product data is loaded in
  // server components and server actions that verify the session themselves —
  // so skipping the lookup here does not expose inventory.
  if (request.headers.get('next-router-prefetch') === '1') {
    return response;
  }

  const session = await readSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    readServerEnv('AUTH_SECRET'),
  );

  // Redirect unauthenticated users away from protected routes
  if (!session && pathname !== '/login') {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Optional: Redirect authenticated users away from login page
  if (session && pathname === '/login') {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Example: Add custom header for API routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/quotes/')) {
    response.headers.set('X-API-Version', '1.0');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/*            (build output, image optimizer, RSC data)
     * - api/*              (login/logout are public; there are no other handlers)
     * - metadata files     (favicon, robots.txt, sitemap.xml, manifest)
     * - any static asset by extension
     *
     * Server Actions are POSTs to these page paths, so they pass through here.
     * They also call requireUser() because a matcher change must not silently
     * drop that check.
     */
    '/((?!_next/|api/|favicon\\.ico|favicon\\.svg|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)',
  ],
};
