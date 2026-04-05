import React from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { CartProvider } from '@/lib/cart-context';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { getServerLocale } from '@/lib/i18n/server';

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
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <CartProvider>
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </CartProvider>
    </LocaleProvider>
  );
}