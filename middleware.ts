// middleware.ts

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Redirects admin users to the appropriate page based on their session status.
 * @example
 * middleware(request)
 * // Redirects to /admin/login if no session and not on the login page. Redirects to /admin if session exists and on the login page.
 * @param {NextRequest} request - The incoming request object containing cookies and URL details.
 * @returns {NextResponse} A response object that either proceeds to the next middleware or redirects to a different URL.
 */
export function middleware(request: NextRequest) {
  const adminSession = request.cookies.get('admin-session');
  const path = request.nextUrl.pathname;

  // Si no hay sesión Y NO estás en la página de login
  if (!adminSession && path !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Si hay sesión Y SÍ estás en la página de login
  if (adminSession && path === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};