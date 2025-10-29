'use client'; // ¡IMPORTANTE! Convierte este archivo a un Client Component

import { ReactNode, useState } from 'react';
import AdminSidebar from '@/components/admin/sidebar';
import AdminHeader from '@/components/admin/header';

interface AdminLayoutProps {
  children: ReactNode; 
}

/**
 * Layout principal del panel de administración.
 * Proporciona la barra lateral y la estructura de contenido, gestionando
 * el estado de apertura/cierre para dispositivos móviles.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  // 1. Estado para controlar la visibilidad de la barra lateral en móviles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Función para alternar el estado de la barra lateral
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 1. Sidebar - Se le pasa el estado y la función para cambiarlo */}
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* 2. Contenido principal y cabecera */}
      <div className={`flex flex-col flex-1 overflow-y-auto ${isSidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        
        {/* Header - Se le pasa la función para que el botón de menú la use */}
        <AdminHeader toggleSidebar={toggleSidebar} />

        {/* Contenido de la página (children) */}
        <main className="p-4 sm:p-6 flex-1">
          {children} 
        </main>
        
        {/* Pie de página (opcional) */}
        {/* <footer className="p-4 text-center text-sm text-gray-500 border-t">
          © {new Date().getFullYear()} Casa Alkímia. Todos los derechos reservados.
        </footer> */}
      </div>
    </div>
  );
}
