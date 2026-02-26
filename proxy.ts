import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';

/**
 * Patrones de probes/bots conocidos: devolver 404 sin llegar a la app
 * para reducir WARNING en logs (seguridad ya está bien, solo limpieza).
 */
function isProbePath(pathname: string): boolean {
  if (pathname.endsWith('.php') || pathname.includes('.php?')) return true;
  if (pathname === '/.env' || pathname.startsWith('/.env/')) return true;
  if (pathname.startsWith('/wp-')) return true;
  if (pathname.startsWith('/.well-known/acme-challenge/') && pathname.endsWith('.php')) return true;
  if (pathname === '/artisan' || pathname === '/sitemap_index.xml') return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isProbePath(path)) {
    return new NextResponse(null, { status: 404 });
  }

  if (path === '/calendar-feed/') {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = '/calendar-feed';
    return NextResponse.rewrite(nextUrl);
  }

  if (path.startsWith('/admin')) {
    const isAuthenticated = await isAdminAuthenticated();
    if (path === '/admin/login' && isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (path !== '/admin/login' && !isAuthenticated) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Probes + calendar-feed + admin; excluir estáticos y API.
  matcher: ['/((?!_next/|api/|favicon\\.ico|/icon).*)'],
};
