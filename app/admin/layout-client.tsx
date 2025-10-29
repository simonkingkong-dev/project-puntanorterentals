'use client'; 

import { ReactNode, useState } from 'react';
import AdminSidebar from '@/components/admin/sidebar';
import AdminHeader from '@/components/admin/header';
import { cn } from '@/lib/utils'; // Necesitamos 'cn' para las clases dinámicas

interface AdminLayoutClientProps {
  children: ReactNode; 
}

/**
 * Componente Cliente que maneja el estado del layout (sidebar)
 * y provee la estructura visual.
 */
export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  // 1. El estado y la lógica se quedan aquí, en el Client Component
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 2. El Sidebar y Header se renderizan aquí */}
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* CORREGIDO: He mejorado la lógica de clases de tu código original[cite: 585].
        Ahora el margen izquierdo (lg:ml-64) SÍ reacciona al estado 'isSidebarOpen', 
        permitiendo que el sidebar se oculte en desktop.
      */}
      <div className={cn(
        "flex flex-col flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
        isSidebarOpen ? "lg:ml-64" : "lg:ml-0" // Se aplica margen solo si el sidebar está abierto
      )}>
        
        <AdminHeader toggleSidebar={toggleSidebar} />

        {/* 3. Los children (tus páginas) se renderizan aquí */}
        <main className="p-4 sm:p-6 flex-1">
          {children} 
        </main>
      </div>

      {/* Overlay para móvil (¡Esto es importante!) */}
      {/* Cierra el sidebar si se hace clic fuera en móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}