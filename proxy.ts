import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthenticated = await isAdminAuthenticated();

  if (path === '/admin/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (path.startsWith('/admin') && path !== '/admin/login' && !isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
