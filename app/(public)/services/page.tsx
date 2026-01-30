import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Experiencias',
  description: 'Servicios y experiencias de Punta Norte Rentals.',
};

/**
 * Página de servicios/experiencias.
 * Actualmente fuera del menú público; esqueleto listo para futuras modificaciones
 * (listado de servicios, reservas de experiencias, etc.).
 */
export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Compass className="w-16 h-16 mx-auto text-orange-500 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Experiencias</h1>
        <p className="text-gray-600 mb-8">
          Esta sección está en preparación. Pronto podrás ver y reservar experiencias y servicios.
        </p>
        <Link href="/properties">
          <Button>Ver propiedades</Button>
        </Link>
      </div>
    </div>
  );
}
