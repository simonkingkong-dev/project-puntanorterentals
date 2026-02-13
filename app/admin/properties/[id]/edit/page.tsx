import { notFound } from "next/navigation";
import { getPropertyByIdAdmin } from "@/lib/firebase-admin-queries"; 
import PropertyEditForm from "./edit-form"; 
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditPropertyPageProps {
  params: Promise<{
    id: string; 
  }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const { id } = await params;
  
  // 1. Obtenemos los datos de la propiedad específica
  const property = await getPropertyByIdAdmin(id);

  // 2. Si no existe, mostramos un 404
  if (!property) {
    notFound();
  }

  return (
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
  );
}