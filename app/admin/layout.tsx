import { ReactNode } from 'react';
import AdminLayoutClient from './layout-client';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Layout principal del panel de administración (Server Component).
 * - Si NO está autenticado: solo muestra el contenido (login/verificación), sin sidebar ni header.
 * - Si está autenticado: muestra sidebar, header y contenido.
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  );
}