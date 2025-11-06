// Archivo: app/(public)/layout.tsx (El layout para páginas públicas)

import React from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

// No necesitas Metadata ni Inter aquí, ya están en el raíz.

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Usamos un Fragmento o un <div>, pero NUNCA <html> o <body>
    <>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}