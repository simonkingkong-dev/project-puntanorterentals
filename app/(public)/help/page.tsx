import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Centro de Ayuda',
  description: 'Preguntas frecuentes y soporte de Punta Norte Rentals.',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Centro de Ayuda</h1>
        <p className="text-gray-600 mb-8">
          ¿Necesitas ayuda con tu reserva o tienes preguntas? Revisa la información siguiente o contáctanos.
        </p>
        <div className="space-y-4 text-gray-600">
          <p><strong>¿Cómo reservo?</strong> Entra a una propiedad, elige fechas en el calendario y completa el formulario de reserva. Serás redirigido al pago seguro.</p>
          <p><strong>¿Cómo cancelo?</strong> Revisa nuestra <Link href="/cancellation" className="text-orange-600 hover:underline">política de cancelación</Link>.</p>
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
