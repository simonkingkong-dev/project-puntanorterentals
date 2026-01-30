import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Política de Cancelación',
  description: 'Condiciones de cancelación de reservas en Punta Norte Rentals.',
};

export default function CancellationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900">Política de Cancelación</h1>
        <p className="text-gray-500 text-sm">Última actualización: 2025</p>
        <div className="text-gray-600 space-y-4 mt-6">
          <p>Cancelación gratuita hasta 24 horas antes del check-in. Después de ese plazo, el monto de la reserva no será reembolsable salvo acuerdo expreso.</p>
          <p>Para cancelar, contacta a nuestro equipo con tu número de reserva. Los reembolsos se procesan en un plazo de 5 a 10 días hábiles.</p>
        </div>
        <div className="mt-8">
          <Link href="/contact">
            <Button>Contactar</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
