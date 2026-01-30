import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sobre Nosotros',
  description: 'Conoce Punta Norte Rentals y nuestra misión.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900">Sobre Nosotros</h1>
        <p className="text-gray-600 lead">
          Punta Norte Rentals ofrece propiedades vacacionales excepcionales en destinos únicos.
          Nuestra misión es que cada estancia sea memorable.
        </p>
        <p className="text-gray-600">
          Cada propiedad es seleccionada con cuidado para garantizar calidad, comodidad y la mejor ubicación.
        </p>
        <div className="mt-8">
          <Link href="/properties">
            <Button>Ver propiedades</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
