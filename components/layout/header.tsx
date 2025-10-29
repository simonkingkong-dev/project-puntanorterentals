"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Home, Building, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Propiedades', href: '/properties', icon: Building },
  { name: 'Experiencias', href: '/services', icon: Compass },
];

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo con Título y Subtítulo */}
          <Link href="/" className="flex items-center space-x-2">
            {/* Ícono */}
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>

            {/* Texto del Logo (Título y Subtítulo) */}
            {/* CLAVE: Usamos 'flex flex-col leading-none' y 'my-0' en los spans para eliminar márgenes */}
            <div className="flex flex-col leading-none">
              {/* Título Principal */}
              <span className="text-xl font-bold text-gray-900 leading-none">
                Punta Norte
              </span>
              {/* Subtítulo (más pequeño) */}
              <span className="text-xs font-medium text-gray-600 leading-none">
                Rentals
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-orange-600 bg-orange-50"
                    : "text-gray-700 hover:text-orange-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex items-center space-x-2 mb-8">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Home className="w-4 h-4 text-white" />
                </div>
                {/* Asegurando que el logo en el móvil también se actualice */}
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-bold text-gray-900 leading-none">Punta Norte</span>
                  <span className="text-xs font-medium text-gray-600 leading-none">Rentals</span>
                </div>
              </div>
              
              <nav className="space-y-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
                      pathname === item.href
                        ? "text-orange-600 bg-orange-50"
                        : "text-gray-700 hover:text-orange-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
