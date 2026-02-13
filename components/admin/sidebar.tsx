"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; 
import { 
  Home, 
  Building, 
  Calendar, 
  Settings, 
  LogOut, 
  FileText,
  Compass,
  MessageSquare,
  Star,
  Globe,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Contenidos', href: '/admin/content', icon: FileText },
  { name: 'Propiedades', href: '/admin/properties', icon: Building },
  { name: 'Reservas', href: '/admin/reservations', icon: Calendar },
  { name: 'Solicitudes / Reembolsos', href: '/admin/modification-requests', icon: FileText },
  { name: 'Servicios', href: '/admin/services', icon: Compass },
  { name: 'Testimonios', href: '/admin/testimonials', icon: MessageSquare },
  { name: 'Amenidades', href: '/admin/amenities', icon: Star },
  { name: 'Contacto', href: '/admin/contact', icon: Globe },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ isOpen, toggleSidebar }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
       const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (response.ok) {
        toast.success('Sesión cerrada exitosamente');
        await router.push('/admin/login');
        router.refresh();
      } else {
        toast.error('Error al cerrar sesión desde la API'); 
      }
    } catch (error) {
      console.error('Error en fetch logout:', error); 
      toast.error('Error de red al cerrar sesión');
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-20" 
      )}>
        <div className="flex flex-col h-full">
          
          <div className={cn(
            "flex flex-col items-center justify-center p-4 h-16 min-h-16 max-h-16 flex-shrink-0 border-b border-gray-200",
            isOpen ? "items-start" : "items-center" // Alinear al inicio cuando está abierto
          )}>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
              <Menu className="w-5 h-5" />
            </Button>
            {isOpen && (
              <span className="text-xs text-muted-foreground mt-1">Menu</span>
            )}
          </div>

          {/* Navigation */}
           <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                // Añadimos un tooltip para cuando el sidebar está cerrado
                title={!isOpen ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  !isOpen && "justify-center", // Centrar ícono cuando está cerrado
                  pathname === item.href
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {/* CORREGIDO: Ocultar texto cuando está cerrado */}
                {isOpen && <span className="truncate">{item.name}</span>}
              </Link>
             ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t mt-auto">
            <Button
              variant="ghost"
              onClick={handleLogout}
              // Añadimos un tooltip para cuando el sidebar está cerrado
              title={!isOpen ? "Cerrar Sesión" : undefined}
              className={cn(
                "w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50",
                !isOpen && "justify-center" // Centrar ícono
              )}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {/* CORREGIDO: Ocultar texto cuando está cerrado */}
              {isOpen && <span className="ml-3 truncate">Cerrar Sesión</span>}
            </Button>
           </div>
        </div>
      </div>
    </>
  );
}