"use client";

import { usePathname } from 'next/navigation';
// CORREGIDO: 'Menu' ya no se importa aquí
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

// CORREGIDO: El header ya no maneja el estado del sidebar
interface AdminHeaderProps {}

// La función 'getTitleFromPathname' no cambia
const getTitleFromPathname = (pathname: string) => {
  const parts = pathname.split('/').filter(p => p && p !== 'admin');
  if (parts.length === 0) return 'Dashboard';
  return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function AdminHeader({}: AdminHeaderProps) { // Se quita 'toggleSidebar'
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname); // 'title' ahora es el subtítulo

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b shadow-sm flex items-center justify-between px-4 lg:px-6">
      
      {/* CORREGIDO: Eliminamos el botón de menú y lo reemplazamos */}
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-gray-800 leading-none">
          Punta Norte Rentals
        </h1>
        <p className="text-sm text-muted-foreground leading-none mt-1">
          {title} {/* El nombre de la pestaña va aquí */}
        </p>
      </div>

      {/* Acciones y Perfil del Usuario (no cambian) */}
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