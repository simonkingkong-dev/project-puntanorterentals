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
  Globe
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
        router.push('/admin/login');
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
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full" 
      )}>
        <div className="flex flex-col h-full">
          
          {/* Header del Logo */}
          <div className="flex items-center justify-start p-4 h-16 border-b">
            <Link href="/admin" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                 <span className="text-xl font-bold text-gray-900 my-0">
                  Punta Norte
                </span>
                <span className="text-xs font-medium text-gray-600 my-0">
                   Rentals
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
           <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={isOpen ? toggleSidebar : undefined} 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
             ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t mt-auto">
            <Button
              variant="ghost"
              onClick={handleLogout}
               className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Cerrar Sesión
            </Button>
           </div>
        </div>
      </div>
    </>
  );
}