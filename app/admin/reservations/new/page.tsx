import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminProperties } from "@/lib/firebase-admin-queries";
import NewReservationForm from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const properties = await getAdminProperties();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost">
          <Link href="/admin/reservations">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Reservas
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva reserva</h1>
          <p className="text-gray-600">Crear una reserva manualmente</p>
        </div>
      </div>
      <NewReservationForm properties={properties} />
    </div>
  );
}
