'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

/**
 * Versión estática del footer para usar en error boundary y otros componentes cliente.
 * No hace fetch de datos; usa contenido fijo.
 */
export default function FooterStatic() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">Punta Norte Rentals</span>
          </div>
          <div className="flex gap-6">
            <Link href="/properties" className="text-gray-400 hover:text-white transition-colors text-sm">
              Propiedades
            </Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">
              Contacto
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Punta Norte Rentals. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
