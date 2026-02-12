"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calculateNights, getNightsBetween, getFirstBlockedNight } from "@/lib/utils/date";
import AvailabilityCalendar from "@/components/ui/availability-calendar";
import type { Property } from "@/lib/types";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

type ReservationData = {
  id: string;
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  status: string;
  confirmedAt: string | null;
};

type ModifyDetailsResponse = {
  reservation: ReservationData;
  property: Property;
};

export default function ModifyReservationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { setCart, removeFromCart } = useCart();
  const id = params?.id as string;
  const token = searchParams?.get("token") ?? "";

  const [data, setData] = useState<ModifyDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [selectedDates, setSelectedDates] = useState<{ checkIn?: Date; checkOut?: Date } | undefined>();
  const [guests, setGuests] = useState(1);

  useEffect(() => {
    if (!id || !token) {
      setError("Falta el token de modificación.");
      setLoading(false);
      return;
    }
    fetch(`/api/reservations/${id}/modify-details?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
        setSelectedDates({
          checkIn: new Date(json.reservation.checkIn),
          checkOut: new Date(json.reservation.checkOut),
        });
        setGuests(json.reservation.guests ?? 1);
      })
      .catch((err) => setError(err.message ?? "Error al cargar la reserva"))
      .finally(() => setLoading(false));
  }, [id, token]);

  const onDateSelect = useCallback((dates: { checkIn: Date; checkOut?: Date }) => {
    setSelectedDates((prev) => ({
      checkIn: dates.checkIn,
      checkOut: dates.checkOut ?? prev?.checkOut,
    }));
  }, []);

  const handleCancelReservation = async () => {
    if (!id || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel-confirmed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al cancelar");
      setCancelDialogOpen(false);
      removeFromCart(id);
      toast.success("Reserva cancelada. El reembolso se procesará en breve.");
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestModification = async () => {
    if (!id || !token) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { token };
      if (selectedDates?.checkIn) body.newCheckIn = selectedDates.checkIn.toISOString();
      if (selectedDates?.checkOut) body.newCheckOut = selectedDates.checkOut.toISOString();
      body.newGuests = guests;
      const res = await fetch(`/api/reservations/${id}/request-modification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");
      toast.success("Solicitud de modificación enviada. Nuestro equipo la revisará pronto.");
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateConfirmed = async () => {
    if (!id || !token || !data || !selectedDates?.checkIn || !selectedDates?.checkOut) return;
    const nightsHere = calculateNights(selectedDates.checkIn, selectedDates.checkOut);
    const total = Math.round((nightsHere * (data.property?.pricePerNight ?? 0)) * 1.1);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/update-confirmed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newCheckIn: selectedDates.checkIn.toISOString(),
          newCheckOut: selectedDates.checkOut.toISOString(),
          newGuests: guests,
          newTotal: total,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al actualizar");
      toast.success("Reserva actualizada correctamente.");
      const detailRes = await fetch(`/api/reservations/${id}/modify-details?token=${encodeURIComponent(token)}`);
      const detailJson = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailJson.error);
      setData(detailJson);
      setSelectedDates({ checkIn: new Date(detailJson.reservation.checkIn), checkOut: new Date(detailJson.reservation.checkOut) });
      setGuests(detailJson.reservation.guests ?? 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundDifference = async () => {
    if (!id || !token || !data || !selectedDates?.checkIn || !selectedDates?.checkOut) return;
    const nightsHere = calculateNights(selectedDates.checkIn, selectedDates.checkOut);
    const total = Math.round((nightsHere * (data.property?.pricePerNight ?? 0)) * 1.1);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/refund-difference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newCheckIn: selectedDates.checkIn.toISOString(),
          newCheckOut: selectedDates.checkOut.toISOString(),
          newGuests: guests,
          newTotal: total,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al procesar reembolso");
      toast.success("Modificación aplicada. El reembolso por la diferencia se procesará en breve.");
      const detailRes = await fetch(`/api/reservations/${id}/modify-details?token=${encodeURIComponent(token)}`);
      const detailJson = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailJson.error);
      setData(detailJson);
      setSelectedDates({ checkIn: new Date(detailJson.reservation.checkIn), checkOut: new Date(detailJson.reservation.checkOut) });
      setGuests(detailJson.reservation.guests ?? 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar reembolso");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayDifference = async () => {
    if (!id || !token || !selectedDates?.checkIn || !selectedDates?.checkOut || priceDiff <= 0) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}/prepare-modification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newCheckIn: selectedDates.checkIn.toISOString(),
          newCheckOut: selectedDates.checkOut.toISOString(),
          newGuests: guests,
          newTotal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al preparar modificación");
      const params = new URLSearchParams({
        reservation: id,
        amount: priceDiff.toString(),
        modification: "1",
        token,
      });
      router.push(`/payment?${params.toString()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al preparar pago");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-red-600 mb-4">{error || "No se encontró la reserva."}</p>
        <Button asChild variant="outline">
          <Link href="/cart">Volver al carrito</Link>
        </Button>
      </div>
    );
  }

  const { reservation, property } = data;
  const confirmedAtMs = reservation.confirmedAt ? new Date(reservation.confirmedAt).getTime() : 0;
  const withinTwoHours = confirmedAtMs > 0 && Date.now() - confirmedAtMs < TWO_HOURS_MS;

  const checkInDate = selectedDates?.checkIn ? new Date(selectedDates.checkIn) : new Date(reservation.checkIn);
  const checkOutDate = selectedDates?.checkOut ? new Date(selectedDates.checkOut) : new Date(reservation.checkOut);
  const nights = selectedDates?.checkIn && selectedDates?.checkOut
    ? calculateNights(selectedDates.checkIn, selectedDates.checkOut)
    : calculateNights(reservation.checkIn, reservation.checkOut);
  const subtotal = nights * property.pricePerNight;
  const fees = Math.round(subtotal * 0.1);
  const newTotal = subtotal + fees;
  const previousTotal = reservation.totalAmount;
  const priceDiff = newTotal - previousTotal;

  const resCheckIn = new Date(reservation.checkIn);
  const resCheckOut = new Date(reservation.checkOut);
  const isAdditive =
    checkInDate.getTime() >= resCheckIn.getTime() &&
    checkOutDate.getTime() >= resCheckOut.getTime() &&
    guests >= (reservation.guests ?? 1);
  const isExtendingCheckOut = checkOutDate.getTime() > resCheckOut.getTime();
  const extraNights = isExtendingCheckOut ? getNightsBetween(resCheckOut, checkOutDate) : [];
  const firstBlockedNight = isExtendingCheckOut && extraNights.length > 0
    ? getFirstBlockedNight(extraNights, property.availability ?? {})
    : null;
  const canApplyAdditive = isAdditive && !firstBlockedNight;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button asChild variant="ghost">
            <Link href="/cart">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al carrito
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Modificar reserva
          </h1>
          <p className="text-gray-600">{property.title}</p>
        </div>

        {property.images?.[0] && (
          <div className="relative h-48 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
        )}

        {!withinTwoHours && firstBlockedNight && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            <p className="font-medium">La noche del {firstBlockedNight} no está disponible.</p>
            <p className="mt-1">Solo se pueden añadir noches contiguas. Si quieres otras fechas, solicita una modificación.</p>
          </div>
        )}

        <div>
          <AvailabilityCalendar
            property={property}
            onDateSelect={onDateSelect}
            selectedDates={selectedDates}
          />

          <Card>
            <CardHeader>
              <CardTitle>Huéspedes</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="guests">Número de huéspedes</Label>
              <Select
                value={guests.toString()}
                onValueChange={(v) => setGuests(parseInt(v, 10))}
              >
                <SelectTrigger id="guests" className="mt-2 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {n} {n === 1 ? "huésped" : "huéspedes"}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de precios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total anterior:</span>
              <span>${previousTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Nuevo total:</span>
              <span>${newTotal}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span className="text-gray-700">Diferencia de precio:</span>
              <span className={priceDiff > 0 ? "text-orange-600" : priceDiff < 0 ? "text-green-600" : ""}>
                {priceDiff > 0 ? "+" : ""}${priceDiff}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Check-in: {format(checkInDate, "dd MMM yyyy", { locale: es })} · Check-out:{" "}
              {format(checkOutDate, "dd MMM yyyy", { locale: es })} · {nights} noches
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          {withinTwoHours ? (
            <>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => setCancelDialogOpen(true)}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar reservación"}
              </Button>
              {priceDiff > 0 ? (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handlePayDifference}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pagar diferencia ($${priceDiff})`}
                </Button>
              ) : priceDiff < 0 ? (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleRefundDifference}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reembolso por diferencia"}
                </Button>
              ) : (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleUpdateConfirmed}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Modificar"}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled
                className="opacity-50 cursor-not-allowed bg-red-50 text-red-700 border-red-200"
              >
                Cancelar reservación
              </Button>
              {canApplyAdditive ? (
                <>
                  {priceDiff > 0 ? (
                    <Button
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={handlePayDifference}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pagar diferencia ($${priceDiff})`}
                    </Button>
                  ) : (
                    <Button
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={handleUpdateConfirmed}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Modificar"}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={handleRequestModification}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Solicitar modificación"}
                </Button>
              )}
            </>
          )}
        </div>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
              <AlertDialogDescription>
                Se cancelará la reserva y se procesará el reembolso completo a través de Stripe.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleCancelReservation();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Sí, cancelar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
