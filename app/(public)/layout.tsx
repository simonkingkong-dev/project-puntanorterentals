import React from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import WhatsAppFab from '@/components/layout/whatsapp-fab';
import { CartProvider } from '@/lib/cart-context';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { getServerLocale } from '@/lib/i18n/server';
import { messages } from '@/lib/i18n/messages';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const localePromise = getServerLocale();
  return (
    <LocaleLayout localePromise={localePromise}>{children}</LocaleLayout>
  );
}

async function LocaleLayout({
  children,
  localePromise,
}: {
  children: React.ReactNode;
  localePromise: Promise<"es" | "en">;
}) {
  const initialLocale = await localePromise;
  const m = messages[initialLocale];
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <CartProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-orange-500"
        >
          {m.skip_to_main_content}
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <WhatsAppFab />
        <Footer />
      </CartProvider>
    </LocaleProvider>
  );
}