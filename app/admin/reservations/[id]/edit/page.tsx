import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getReservationByIdForConfirmationAdmin } from "@/lib/firebase-admin-queries";
import ReservationEditForm from "./edit-form";

export const dynamic = "force-dynamic";

interface EditReservationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReservationPage({ params }: EditReservationPageProps) {
  const { id } = await params;
  const reservation = await getReservationByIdForConfirmationAdmin(id);
  if (!reservation) notFound();

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
          <h1 className="text-3xl font-bold text-gray-900">Modificar reserva</h1>
          <p className="text-gray-600">
            {reservation.propertyTitle ?? "Reserva"} · ...{id.slice(-6)}
          </p>
        </div>
      </div>
      <ReservationEditForm initialData={reservation} />
    </div>
  );
}
