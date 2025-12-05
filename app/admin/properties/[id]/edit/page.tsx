import { notFound } from "next/navigation";
import { getPropertyById } from "@/lib/firebase/properties"; 
import AdminLayout from "@/app/admin/layout";
import PropertyEditForm from "./edit-form"; 
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditPropertyPageProps {
  // CORREGIDO: params ahora es una Promesa en Next.js 15+
  params: Promise<{
    id: string; 
  }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  // CORREGIDO: Debemos esperar (await) los params antes de desestructurar
  const { id } = await params;
  
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