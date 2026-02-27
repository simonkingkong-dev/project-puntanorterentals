import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';

/**
 * Patrones de probes/bots conocidos: devolver 404 sin llegar a la app.
 * Normalizado a minúsculas para evitar bypass por cambio de mayúsculas.
 */
function isProbePath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.endsWith('.php') || p.includes('.php/')) return true;
  if (p === '/.env' || p.startsWith('/.env/')) return true;
  if (p.startsWith('/wp-')) return true;
  if (p.startsWith('/.well-known/acme-challenge/') && p.endsWith('.php')) return true;
  if (p === '/artisan' || p === '/sitemap_index.xml') return true;
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

  if (path === '/admin' || path.startsWith('/admin/')) {
    const isAuthenticated = await isAdminAuthenticated();
    const isLoginPath = path === '/admin/login' || path === '/admin/login/';
    if (isLoginPath && isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (!isLoginPath && !isAuthenticated) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}
export const config = {
  // Probes + calendar-feed + admin; excluir estáticos y API.
  matcher: ['/((?!_next/|api/|favicon\\.ico|/icon).*)'],
};
