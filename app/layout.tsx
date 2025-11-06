// Archivo: app/layout.tsx (El nuevo layout raíz)

import './globals.css'; // <--- IMPORTANTE: Carga los estilos globales
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Metadata global del sitio
export const metadata: Metadata = {
  title: {
    default: 'Punta Norte Rentals - Propiedades Vacacionales',
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
      <body className={`${inter.className} min-h-screen flex flex-col bg-gray-50`}>
        
        {/* Aquí se renderizará el layout público o el layout de admin */}
        {children} 
        
        {/* El Toaster se aplica a toda la app */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}