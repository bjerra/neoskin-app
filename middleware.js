import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
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
  
  const supabase = await CreateServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth') ||
                      request.nextUrl.pathname === '/login'; // add your login path

  // Redirect unauthenticated users away from protected routes
  if (!session &&  request.nextUrl.pathname !== '/login') {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Optional: Redirect authenticated users away from login page
  if (session && isAuthRoute) {
  //  const redirectUrl = new URL('/', request.url); // your protected home
   // return NextResponse.redirect(redirectUrl);
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.svg|images|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};
