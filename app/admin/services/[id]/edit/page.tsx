// Archivo: app/admin/services/[id]/edit/page.tsx

import { notFound } from "next/navigation";
import { getServiceById } from "@/lib/firebase/services"; // Función que acabamos de crear
import AdminLayout from "@/app/admin/layout";
import ServiceEditForm from "./edit-form"; // El formulario que crearemos a continuación
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditServicePageProps {
  params: {
    id: string; // Next.js nos da el [id] de la URL aquí
  };
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = params;
  
  // 1. Obtenemos los datos del servicio específico
  const service = await getServiceById(id);

  // 2. Si no existe, mostramos un 404
  if (!service) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/services">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Servicios
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Servicio</h1>
            <p className="text-gray-600 truncate">Modificando: {service.title}</p>
          </div>
        </div>

        {/* 3. Pasamos los datos cargados al formulario (Client Component) */}
        <ServiceEditForm initialData={service} />
      </div>
    </AdminLayout>
  );
}