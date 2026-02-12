import { notFound } from "next/navigation";
import { getServiceById } from "@/lib/firebase/services";
import ServiceEditForm from "./edit-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditServicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  // Esperamos los parametros
  const { id } = await params;
  
  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

        <ServiceEditForm initialData={service} />
      </div>
  );
}