"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Reservation } from "@/lib/types";
import { updateReservationAdmin } from "../../actions";

type ReservationWithTitle = Reservation & { propertyTitle?: string };

type EditFormState = {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;  // YYYY-MM-DD for input[type=date]
  checkOut?: string;
  guests?: number;
  totalAmount?: number;
};

interface ReservationEditFormProps {
  initialData: ReservationWithTitle;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReservationEditForm({ initialData }: ReservationEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<EditFormState>({
    guestName: initialData.guestName,
    guestEmail: initialData.guestEmail,
    guestPhone: initialData.guestPhone,
    checkIn: toInputDate(initialData.checkIn),
    checkOut: toInputDate(initialData.checkOut),
    guests: initialData.guests,
    totalAmount: initialData.totalAmount,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateReservationAdmin(initialData.id, {
          ...formData,
          checkIn: formData.checkIn ? new Date(formData.checkIn) : undefined,
          checkOut: formData.checkOut ? new Date(formData.checkOut) : undefined,
        });
        toast.success("Reserva actualizada.");
      } catch {
        toast.error("Error al actualizar la reserva.");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guestName">Nombre huésped</Label>
              <Input
                id="guestName"
                value={formData.guestName ?? ""}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                type="email"
                value={formData.guestEmail ?? ""}
                onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guestPhone">Teléfono</Label>
              <Input
                id="guestPhone"
                value={formData.guestPhone ?? ""}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guests">Huéspedes</Label>
              <Input
                id="guests"
                type="number"
                min={1}
                value={formData.guests ?? 1}
                onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="checkIn">Check-in</Label>
              <Input
                id="checkIn"
                type="date"
                value={formData.checkIn ?? ""}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="checkOut">Check-out</Label>
              <Input
                id="checkOut"
                type="date"
                value={formData.checkOut ?? ""}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total ($)</Label>
              <Input
                id="totalAmount"
                type="number"
                min={0}
                step={0.01}
                value={formData.totalAmount ?? 0}
                onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
