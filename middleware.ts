// middleware.ts

import { NextResponse, type NextRequest } from 'next/server';

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