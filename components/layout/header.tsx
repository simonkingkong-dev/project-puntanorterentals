"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, Home, Building, ShoppingCart, Calendar, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/cart-context';
import { useLocale } from '@/components/providers/locale-provider';

function CartLink({ className }: { className?: string }) {
  const { cartCount } = useCart();
  const { t } = useLocale();
  return (
    <Link
      href="/cart"
      className={className}
      aria-label={t('nav_view_cart', 'View cart')}
    >
      <ShoppingCart className="w-5 h-5" />
      <span>{t('nav_cart', 'Cart')}</span>
      {cartCount > 0 && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white leading-none">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      )}
    </Link>
  );
}

function LanguageSelect({
  className,
  compact = false,
}: {
  className?: string;
  /** En móvil: etiquetas cortas ES / EN para caber en el header. */
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as "es" | "en")}
      className={cn(
        "h-9 shrink-0 rounded-md border border-gray-200 bg-white text-sm text-gray-700",
        compact ? "min-w-[4.25rem] px-2" : "px-2",
        className
      )}
      aria-label={t("nav_select_language", "Select language")}
    >
      <option value="es">{compact ? "ES" : "Español"}</option>
      <option value="en">{compact ? "EN" : "English"}</option>
    </select>
  );
}

function CartLinkMobile({ onClose }: { onClose: () => void }) {
  const { cartCount } = useCart();
  const { t } = useLocale();
  return (
    <Link
      href="/cart"
      onClick={onClose}
      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-colors w-full"
    >
      <ShoppingCart className="w-4 h-4" />
      <span>{t('nav_cart', 'Cart')}</span>
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
  const { t } = useLocale();
  const navigation = [
    { name: t('nav_home', 'Home'), href: '/', icon: Home },
    { name: t('nav_properties', 'Properties'), href: '/properties', icon: Building },
    { name: t('nav_services', 'Services'), href: '/services', icon: Compass },
    { name: t('nav_my_reservations', 'My reservations'), href: '/my-reservations', icon: Calendar },
  ];
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-[100] isolate flex min-h-16 w-full shrink-0 flex-col border-b border-gray-200 bg-white shadow-sm supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-7xl mx-auto pl-2 pr-4 sm:pl-4 sm:pr-6 lg:pl-6 lg:pr-8">
        <div className="grid grid-cols-[1fr_auto] items-center h-16 gap-4">
          <Link
            href="/"
            className="flex items-center space-x-2 justify-self-start min-w-0"
            aria-label={`Punta Norte Rentals - ${t('nav_home', 'Home')}`}
          >
            <Image src="/logo.png?v=2" alt="Punta Norte Rentals" width={48} height={48} priority />
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-gray-900 leading-none">Punta Norte</span>
              <span className="text-sm font-medium text-gray-500 leading-none">Rentals</span>
            </div>
          </Link>

          {/* Desktop Navigation: Inicio, Propiedades, Carrito */}
          <nav className="hidden md:flex items-center space-x-6 justify-self-end">
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
            <LanguageSelect />
          </nav>

          {/* Móvil: idioma visible en el header (fuera del menú lateral) */}
          <div className="flex items-center gap-1 justify-self-end col-start-2 md:hidden">
            <LanguageSelect compact />
            {mounted ? (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t("nav_open_menu", "Open menu")}>
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <SheetTitle className="sr-only">{t('nav_mobile_menu_title', 'Navigation menu')}</SheetTitle>
                  <div className="flex items-center space-x-2 mb-8">
                    <Image src="/logo.png?v=2" alt="Punta Norte Rentals" width={48} height={48} />
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
              <div className="h-9 w-9" aria-hidden />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
