"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, XCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cancelReservationAdmin, confirmReservationAdmin } from "./actions";

type ReservationRowActionsProps = {
  reservationId: string;
  status: string;
};

export default function ReservationRowActions({
  reservationId,
  status,
}: ReservationRowActionsProps) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const result = await cancelReservationAdmin(reservationId);
      if (result.success) {
        toast.success("Reserva cancelada. Fechas liberadas si correspondía.");
        setCancelOpen(false);
      } else {
        toast.error(result.error ?? "Error al cancelar");
      }
    } catch {
      toast.error("Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await confirmReservationAdmin(reservationId);
      if (result.success) {
        toast.success("Reserva confirmada. Fechas bloqueadas.");
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Error al confirmar");
      }
    } catch {
      toast.error("Error al confirmar la reserva");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/reservations/${reservationId}/edit`}>
            <Edit className="w-4 h-4 mr-1" />
            Modificar
          </Link>
        </Button>
        {status === "pending" && (
          <Button
            variant="outline"
            size="sm"
            className="text-green-700 border-green-200 hover:bg-green-50"
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Confirmar
              </>
            )}
          </Button>
        )}
        {status !== "cancelled" && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-700 border-red-200 hover:bg-red-50"
            onClick={() => setCancelOpen(true)}
            disabled={loading}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
        )}
      </div>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como cancelada. Si tenía fechas bloqueadas (hold o confirmada), se liberarán para que otros puedan reservar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como confirmada y las fechas quedarán bloqueadas en la propiedad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Sí, confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
