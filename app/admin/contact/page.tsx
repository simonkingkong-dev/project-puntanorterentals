// NO LLEVA "use client"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';
import AdminLayout from '@/app/admin/layout';
import { getContactInfo } from '@/lib/firebase/content';
import { ContactInfo } from '@/lib/types';
import ContactForm from '@/app/admin/contact/contact-form'; // 1. Importamos el nuevo componente de formulario

/**
 * Renders the Admin Contact Page (Server Component).
 * It fetches the contact data server-side and passes it to the client form.
 * @example
 * AdminContactPage()
 * // Renders the admin contact management interface
 * @returns {JSX.Element} A JSX element that represents the admin contact page interface.
 */
export default async function AdminContactPage() {
  
  // 2. Cargamos los datos en el servidor
  let contactData: Omit<ContactInfo, 'id' | 'updatedAt'>;
  const info = await getContactInfo();

  if (info) {
    contactData = {
      email: info.email,
      phone: info.phone,
      address: info.address,
      companyName: info.companyName,
      copyright: info.copyright,
      socialMedia: info.socialMedia || {
        facebook: '',
        instagram: '',
        twitter: '',
      },
    };
  } else {
    // 3. Proveemos datos por defecto si no hay nada en Firebase
    contactData = {
      email: '',
      phone: '',
      address: '',
      companyName: 'Casa Alkimia',
      copyright: `© ${new Date().getFullYear()} Casa Alkimia. Todos los derechos reservados.`,
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
      },
    };
  }

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Información de Contacto</h1>
          <p className="text-gray-600">Gestiona la información de contacto y datos de la empresa</p>
        </div>

        {/* 4. Renderizamos el Client Component (Formulario)
             y le pasamos los datos cargados.
        */}
        <ContactForm initialData={contactData} />

        {/* Mantenemos la Card de 'Información de la Empresa' solo como ejemplo visual */}
        {/* En una app real, el ContactForm manejaría todo esto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Información de la Empresa (Visual)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              El formulario interactivo de arriba ahora maneja la carga y guardado de datos.
            </p>
          </CardContent>
        </Card>
      </div>
  );
}