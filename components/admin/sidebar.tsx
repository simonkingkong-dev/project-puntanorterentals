"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Building, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Compass,
  FileText,
  MessageSquare,
  Star,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

/**
 * Represents the admin navigation sidebar with a mobile-friendly menu toggle.
 * * This component provides a sidebar for admin users, allowing seamless navigation 
 * across different sections and a logout functionality. It adapts to mobile views 
 * with a toggleable menu.
 * * @example
 * <AdminSidebar />
 * * @returns {JSX.Element} The JSX element for the admin sidebar, including toggleable 
 * mobile menu, navigation links, and a logout button.
 */
export default function AdminSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  /**
  * Logs out the current admin user by sending a POST request to the logout API.
  * @example
  * logoutAdmin();
  * // Displays a success message and redirects to the admin login page if successful, else shows an error message.
  * @async
  * @function
  * @returns {void} Does not return a value.
  **/
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (response.ok) {
        toast.success('Sesión cerrada exitosamente');
        router.push('/admin/login');
        router.refresh();
      }
    } catch (error) {
      toast.error('Error cerrando sesión');
    }
  };

  return (
    <>
      {/* Mobile menu button - Necesitarás esto si el layout principal del admin no lo maneja */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          
          {/* CAMBIO CLAVE: Header del Logo "Punta Norte Rentals" alineado a la izquierda */}
          <div className="flex items-center justify-start p-4 h-16 border-b">
            <Link href="/admin" className="flex items-center space-x-2">
              {/* Ícono con colores de marca (Naranja/Rojo) */}
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" /> {/* Usando Home como en el header principal */}
              </div>

              {/* Texto del Logo (Compacto y Alineado a la Izquierda) */}
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
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-orange-50 text-orange-700 border border-orange-200" // Colores de marca
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
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

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
