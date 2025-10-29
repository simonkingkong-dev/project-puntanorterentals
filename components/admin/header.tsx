"use client";

import { usePathname } from 'next/navigation';
import { Bell, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminHeaderProps {
  toggleSidebar: () => void; // Función para abrir/cerrar el sidebar
}

// Función para obtener un título legible a partir de la ruta
const getTitleFromPathname = (pathname: string) => {
  const parts = pathname.split('/').filter(p => p && p !== 'admin');
  
  if (parts.length === 0) {
    return 'Dashboard';
  }

  // Capitalizar la primera letra y reemplazar guiones
  return parts[parts.length - 1]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Encabezado de la página de administración. 
 * Muestra el título de la sección actual y el botón de menú móvil.
 */
export default function AdminHeader({ toggleSidebar }: AdminHeaderProps) {
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b shadow-sm flex items-center justify-between px-4 lg:px-6">
      
      {/* 1. Título de la Sección y Botón de Menú Móvil */}
      <div className="flex items-center">
        
        {/* CLAVE: Botón de Menú Móvil - Llama a la función del Layout */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden mr-4" // Se oculta en desktop (lg)
          onClick={toggleSidebar} // Usa la función recibida por props
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <h1 className="text-xl font-semibold text-gray-800">
          {title}
        </h1>
      </div>

      {/* 2. Acciones y Perfil del Usuario */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5 text-gray-600" />
        </Button>
        
        <Button variant="ghost" className="flex items-center space-x-2 text-sm">
          <User className="w-5 h-5 text-gray-600" />
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </div>
    </header>
  );
}
