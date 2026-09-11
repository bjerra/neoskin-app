import { NextResponse } from 'next/server';
import { CreateServerClient } from './utils/supabase-server';

export async function middleware(request) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add custom header to track middleware execution
  response.headers.set('X-Middleware-Executed', 'true');

  const pathname = request.nextUrl.pathname;

  // Router prefetches fire for every <Link> in the viewport, so they multiply
  // the auth check (and therefore Supabase token refreshes) several times per
  // page view. The RSC payload of a prefetch only carries component shells --
  // all real data goes through the server actions in app/actions.js, which do
  // their own auth check -- so skipping the session lookup here leaks nothing.
  if (request.headers.get('next-router-prefetch') === '1') {
    return response;
  }

  const supabase = await CreateServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect unauthenticated users away from protected routes
  if (!session && pathname !== '/login') {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Optional: Redirect authenticated users away from login page
  if (session && pathname === '/login') {
    const redirectUrl = new URL('/', request.url); // your protected home
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
     * - api/*              (route handlers do their own auth)
     * - metadata files     (favicon, robots.txt, sitemap.xml, manifest)
     * - any static asset by extension
     *
     * Every path matched here costs a Supabase session lookup, so keep this
     * list tight.
     */
    '/((?!_next/|api/|favicon\\.ico|favicon\\.svg|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)',
  ],
};
