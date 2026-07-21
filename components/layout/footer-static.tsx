'use client';

import Link from 'next/link';
import Image from 'next/image';

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
            <Image
              src="/isotipo-compass-01.png?v=2"
              alt="Punta Norte Rentals"
              width={32}
              height={32}
              className="h-8 w-8 object-contain bg-transparent"
              unoptimized
            />
            <span className="text-lg font-bold">Punta Norte Rentals</span>
          </div>
          <div className="flex gap-6">
            <Link href="/properties" className="text-gray-400 hover:text-white transition-colors text-sm">
              Propiedades
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
