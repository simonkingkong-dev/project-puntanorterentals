import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Esta línea usa la función que importaste, eliminando la advertencia.
  const isAuthenticated = await isAdminAuthenticated();

  // Si ya está autenticado y trata de ir al login, redirigir al dashboard
  if (path === '/admin/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Si no está autenticado y trata de acceder a una ruta protegida, redirigir al login
  if (path !== '/admin/login' && !isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Permite que la solicitud continúe si las condiciones son válidas
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
