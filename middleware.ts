// middleware.ts

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Handles redirection based on admin session authentication state.
 * @example
 * middleware(request)
 * Redirects to '/admin/login' or '/admin' based on session status.
 * @param {NextRequest} request - The incoming request containing cookies and URL information.
 * @returns {NextResponse} A redirection response or the next response in the chain.
 */
export function middleware(request: NextRequest) {
  const adminSession = request.cookies.get('admin-session');
  const path = request.nextUrl.pathname;

  // Si no hay sesión O el valor de la sesión no es 'authenticated' Y NO estás en la página de login
  if (!adminSession || (adminSession.value !== 'authenticated' && path !== '/admin/login')) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Si hay sesión Y el valor de la sesión es 'authenticated' Y SÍ estás en la página de login
  if (adminSession && adminSession.value === 'authenticated' && path === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
