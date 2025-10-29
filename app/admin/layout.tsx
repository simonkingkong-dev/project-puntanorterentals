import { ReactNode } from 'react';
// CORREGIDO: Importamos el nuevo Client Component que manejará el estado
import AdminLayoutClient from './layout-client';

interface AdminLayoutProps {
  children: ReactNode; 
}

/**
 * Layout principal del panel de administración (Server Component).
 * Este layout envuelve todas las rutas /admin/*
 * Delega el manejo del estado (sidebar) al AdminLayoutClient.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  // Este Server Component envuelve a los children con el Client Component
  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  );
}