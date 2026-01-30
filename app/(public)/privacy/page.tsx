import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad y datos personales de Punta Norte Rentals.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
        <p className="text-gray-500 text-sm">Última actualización: 2025</p>
        <div className="text-gray-600 space-y-4 mt-6">
          <p>En Punta Norte Rentals respetamos tu privacidad. Los datos que nos proporcionas (nombre, email, teléfono) se utilizan únicamente para procesar reservas y enviarte confirmaciones.</p>
          <p>No vendemos ni compartimos tu información con terceros con fines comerciales. Los pagos se procesan de forma segura a través de Stripe.</p>
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
