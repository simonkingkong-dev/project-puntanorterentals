import { notFound } from "next/navigation";
import { getGlobalAmenityById } from "@/lib/firebase/content"; 
import AdminLayout from "@/app/admin/layout";
import AmenityEditForm from "./edit-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditAmenityPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditAmenityPage({ params }: EditAmenityPageProps) {
  // Esperamos los parametros
  const { id } = await params;
  
  const amenity = await getGlobalAmenityById(id);

  if (!amenity) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/amenities">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Amenidades
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Amenidad</h1>
            <p className="text-gray-600">Modificando: {amenity.title}</p>
          </div>
        </div>

        <AmenityEditForm initialData={amenity} />
      </div>
    </AdminLayout>
  );
}