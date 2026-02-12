import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getContactInfoAdmin } from '@/lib/firebase-admin-queries';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Contáctanos para reservas o consultas sobre Punta Norte Rentals.',
};

export default async function ContactPage() {
  const contact = await getContactInfoAdmin();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacto</h1>
        <p className="text-gray-600 mb-8">
          ¿Tienes dudas o quieres reservar? Escríbenos o llámanos.
        </p>

        <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border">
          {contact ? (
            <>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${contact.email}`} className="text-gray-900 font-medium hover:text-orange-600">
                    {contact.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <a href={`tel:${contact.phone}`} className="text-gray-900 font-medium hover:text-orange-600">
                    {contact.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Dirección</p>
                  <p className="text-gray-900 font-medium">{contact.address}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500">La información de contacto se está cargando desde el panel de administración.</p>
          )}
        </div>

        <div className="mt-8">
          <Link href="/properties">
            <Button variant="outline">Ver propiedades</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
