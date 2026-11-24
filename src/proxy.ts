import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Quick check before rendering: no session cookie means straight to sign-in.
 * It only looks at the cookie. Pages and actions still verify the session
 * and the role themselves.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/tickets/:path*', '/dashboard/:path*', '/kb/:path*', '/admin/:path*'],
};
