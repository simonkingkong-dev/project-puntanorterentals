"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Home, Building, ShoppingCart, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';

const navigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Propiedades', href: '/properties', icon: Building },
  { name: 'Mis reservas', href: '/my-reservations', icon: Calendar },
];

function CartLink({ className }: { className?: string }) {
  const { cartCount } = useCart();
  return (
    <Link
      href="/cart"
      className={className}
      aria-label="Ver carrito"
    >
      <ShoppingCart className="w-5 h-5" />
      <span>Carrito</span>
      {cartCount > 0 && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white leading-none">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </Link>
  );
}

function CartLinkMobile({ onClose }: { onClose: () => void }) {
  const { cartCount } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onClose}
      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-colors w-full"
    >
      <ShoppingCart className="w-4 h-4" />
      <span>Carrito</span>
      {cartCount > 0 && (
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white leading-none">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
              <span className="text-lg font-bold text-gray-900 leading-none">
                Punta Norte
              </span>
              {/* Subtítulo (más pequeño) */}
              <span className="text-sm font-medium text-gray-500 leading-none">
                Rentals
              </span>
            </div>
          </Link>

          {/* Desktop Navigation: Inicio, Propiedades, Carrito */}
          <nav className="hidden md:flex items-center space-x-6">
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
            <CartLink
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === '/cart'
                  ? "text-orange-600 bg-orange-50"
                  : "text-gray-700 hover:text-orange-600 hover:bg-gray-50"
              )}
            />
          </nav>

          {/* Mobile menu: solo en cliente para evitar hydration mismatch (Radix genera IDs distintos en SSR vs cliente) */}
          {mounted ? (
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
                  <CartLinkMobile onClose={() => setIsOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="md:hidden h-9 w-9" aria-hidden />
          )}
        </div>
      </div>
    </header>
  );
}
