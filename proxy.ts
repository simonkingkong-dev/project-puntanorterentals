import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';

/**
 * Patrones de probes/bots conocidos: devolver 404 sin llegar a la app.
 * Normalizado a minúsculas para evitar bypass por cambio de mayúsculas.
 */
const PROBE_DIR_PREFIXES = [
  '/wp-',
  '/wp-content',
  '/wp-includes',
  '/wp-admin',
  '/cgi-bin',
  '/.well-known/acme-challenge/',
  '/sleepster',
  '/vendor/phpunit',
  '/.git',
];

/** Respuesta mínima para bots; Cache-Control reduce reintentos en CDN. */
function probeNotFound(): NextResponse {
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

function isProbePath(pathname: string): boolean {
  const p = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  // Scripts PHP (wp-login.php, info.php, randkeyword.PhP7, etc.)
  if (p.includes('.php')) return true;

  if (p === '/.env' || p.startsWith('/.env/')) return true;

  for (const prefix of PROBE_DIR_PREFIXES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return true;
  }

  if (p === '/xmlrpc.php' || p === '/artisan' || p === '/sitemap_index.xml') return true;

  return false;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isProbePath(path)) {
    return probeNotFound();
  }

  // Barra final: rewrite interno (next.config rewrites también cubre /calendar-feed/)
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
