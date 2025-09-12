import { NextResponse, NextRequest } from 'next/server';

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

  // Si el usuario ya está en la página de login, no hay necesidad de redirigir
  // Esto previene un bucle de redireccionamiento.
  if (path === '/admin/login') {
    return NextResponse.next();
  }

  // Si no hay sesión o la sesión no es 'authenticated', redirigir al login
  if (!adminSession || adminSession.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Si el usuario está autenticado y la ruta es /admin, permite el acceso.
  // Cualquier otra ruta no será afectada por este middleware.
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
