import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Términos de Uso',
  description: 'Términos y condiciones de uso de Punta Norte Rentals.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900">Términos de Uso</h1>
        <p className="text-gray-500 text-sm">Última actualización: 2025</p>
        <div className="text-gray-600 space-y-4 mt-6">
          <p>Al utilizar Punta Norte Rentals aceptas estos términos. El sitio está destinado a la búsqueda y reserva de alojamientos vacacionales.</p>
          <p>Las reservas están sujetas a disponibilidad y a la confirmación del pago. Te recomendamos leer nuestra política de cancelación antes de reservar.</p>
        </div>
        <div className="mt-8">
          <Link href="/">
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
