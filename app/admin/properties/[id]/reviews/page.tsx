import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPropertyByIdAdmin, getPropertyReviewsForAdmin } from "@/lib/firebase-admin-queries";
import ReviewsClient from "./reviews-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyReviewsAdminPage({ params }: PageProps) {
  const { id } = await params;
  const property = await getPropertyByIdAdmin(id);
  if (!property) notFound();

  const reviews = await getPropertyReviewsForAdmin(id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost">
          <Link href={`/admin/properties/${id}/edit`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a editar propiedad
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reseñas curadas</h1>
          <p className="text-gray-600 truncate">{property.title}</p>
        </div>
      </div>
      <ReviewsClient propertyId={id} propertyTitle={property.title} initialReviews={reviews} />
    </div>
  );
}
