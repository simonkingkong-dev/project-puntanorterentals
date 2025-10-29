"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/sidebar'; // Tu sidebar existente (ya actualizado)
import AdminHeader from '@/components/admin/header'; // El nuevo Header de Admin
import { cn } from '@/lib/utils';

// Este layout se aplicará a todas las rutas dentro de /admin
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  
  // *** CLAVE: ELEVACIÓN DEL ESTADO para el control centralizado ***
  // Controla si el sidebar está abierto (principalmente usado para la vista móvil)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Función para alternar el estado del sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    // Estructura general: Flex container que ocupa toda la altura de la pantalla
    <div className="flex min-h-screen bg-gray-50">
      
      {/* 1. Sidebar (Le pasamos el estado y el toggle) */}
      {/* El sidebar usa 'isOpen' para moverse y 'toggleSidebar' para cerrarse al navegar */}
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Overlay para móvil cuando el sidebar está abierto */}
      {/* Es importante que este overlay se oculte en lg: (desktop) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={toggleSidebar} // Cierra al hacer clic fuera del sidebar
        />
      )}

      {/* 2. Contenido Principal (Header + Main Content) */}
      {/* El margen 'lg:ml-64' empuja el contenido para dejar espacio al sidebar fijo en desktop */}
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300",
        "lg:ml-64" // Margen fijo para desktop (la misma anchura del sidebar)
      )}>
        
        {/* Header de Admin (Barra Superior) */}
        {/* Le pasamos la función de toggle para que el botón de menú en el Header funcione */}
        <AdminHeader toggleSidebar={toggleSidebar} />

        {/* Contenido de la Página */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
