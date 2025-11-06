// Archivo: app/admin/properties/[id]/edit/page.tsx

import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/firebase/properties"; // Función que ya creamos
import AdminLayout from "@/app/admin/layout";
import PropertyEditForm from "./edit-form"; // El formulario que crearemos a continuación
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditPropertyPageProps {
  params: {
    id: string; // Next.js nos da el [id] de la URL aquí
  };
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = params;
  
  // 1. Obtenemos los datos de la propiedad específica
  const property = await getPropertyById(id);

  // 2. Si no existe, mostramos un 404
  if (!property) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/properties">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Propiedades
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Propiedad</h1>
            <p className="text-gray-600 truncate">Modificando: {property.title}</p>
          </div>
        </div>

        {/* 3. Pasamos los datos cargados al formulario (Client Component) */}
        <PropertyEditForm initialData={property} />
      </div>
    </AdminLayout>
  );
}