// Archivo: app/layout.tsx (El nuevo raíz)

import './globals.css'; // <--- CORRECCIÓN: ESTA LÍNEA DEBE ESTAR AQUÍ
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Punta Norte Rentals - Propiedades Vacacionales de Lujo',
    template: '%s | Punta Norte Rentals',
  },
  description: 'Descubre propiedades vacacionales excepcionales en destinos únicos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      {/* Este body se aplica a todo, admin y público */}
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        {children} {/* Aquí se renderizará el layout público o el layout de admin */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}