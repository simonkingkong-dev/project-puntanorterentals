import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminProperties } from "@/lib/firebase-admin-queries";
import NewTestimonialForm from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewTestimonialPage() {
  const properties = await getAdminProperties();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost">
          <Link href="/admin/testimonials">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Testimonio</h1>
          <p className="text-gray-600">Agrega un nuevo testimonio de cliente</p>
        </div>
      </div>

      <NewTestimonialForm
        properties={properties.map((property) => ({
          id: property.id,
          title: property.title,
        }))}
      />
    </div>
  );
}
