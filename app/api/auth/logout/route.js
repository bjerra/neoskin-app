import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '../../../../utils/session.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(request, { maxAge: 0 }));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
