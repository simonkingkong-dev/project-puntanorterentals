import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import {
  getReservationByIdForConfirmationAdmin,
  getPropertyByIdAdmin,
} from "@/lib/firebase-admin-queries";
import { computeReservationPriceBreakdown } from "@/lib/reservation-price-breakdown";
import { stripe } from "@/lib/stripe";
import { paymentDisplayFromIntent } from "@/lib/stripe-payment-display";
import ReservationRowActions from "../reservation-row-actions";

export const dynamic = "force-dynamic";

interface ReservationDetailPageProps {
  params: Promise<{ id: string }>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmada</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>;
    case "incomplete":
      return <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Incompleta</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(d: Date): string {
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

export default async function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const { id } = await params;
  const reservation = await getReservationByIdForConfirmationAdmin(id);
  if (!reservation) notFound();

  const property = reservation.propertyId
    ? await getPropertyByIdAdmin(reservation.propertyId)
    : null;

  const breakdown = computeReservationPriceBreakdown(reservation, property);

  // paidCurrency/paidAmount no se guardan en el documento de Firestore; se consultan en vivo
  // a Stripe (mismo patrón que la página de confirmación del huésped).
  let paidCurrency = reservation.paidCurrency;
  let paidAmount = reservation.paidAmount;
  if ((!paidCurrency || paidAmount == null) && reservation.stripePaymentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(reservation.stripePaymentId);
      const display = paymentDisplayFromIntent(pi);
      paidCurrency = display.paidCurrency;
      paidAmount = display.paidAmount;
    } catch {
      // Sin acceso a Stripe (id inválido, clave no configurada, etc.): se muestra el estimado.
    }
  }
  paidCurrency = paidCurrency ?? "USD";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/reservations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Reservas
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {reservation.propertyTitle ?? "Reserva"}
            </h1>
            <div className="text-gray-600 text-sm flex items-center gap-1.5">
              <span>...{id.slice(-6)} ·</span>
              {getStatusBadge(reservation.status)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReservationRowActions reservationId={reservation.id} status={reservation.status} hideView />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos del huésped */}
        <Card>
          <CardHeader>
            <CardTitle>Huésped</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre</span>
              <span className="font-medium text-right">{reservation.guestName || "—"}</span>
            </div>
            {(reservation.guestFirstName || reservation.guestLastName) && (
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre / Apellido</span>
                <span className="font-medium text-right">
                  {reservation.guestFirstName ?? "—"} / {reservation.guestLastName ?? "—"}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-right break-all">{reservation.guestEmail || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono</span>
              <span className="font-medium text-right">{reservation.guestPhone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Idioma</span>
              <span className="font-medium text-right">
                {reservation.locale === "en" ? "Inglés" : reservation.locale === "es" ? "Español" : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Datos de la estadía */}
        <Card>
          <CardHeader>
            <CardTitle>Estadía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Propiedad</span>
              <span className="font-medium text-right">{reservation.propertyTitle ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Check-in</span>
              <span className="font-medium text-right">
                {format(reservation.checkIn, "dd/MM/yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Check-out</span>
              <span className="font-medium text-right">
                {format(reservation.checkOut, "dd/MM/yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Noches</span>
              <span className="font-medium text-right">{breakdown.nights}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Huéspedes</span>
              <span className="font-medium text-right">{reservation.guests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reservada el</span>
              <span className="font-medium text-right">{formatDateTime(reservation.createdAt)}</span>
            </div>
            {reservation.confirmedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmada el</span>
                <span className="font-medium text-right">{formatDateTime(reservation.confirmedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desglose de la venta */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Desglose de la venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                Tarifa por noche (alojamiento, {breakdown.nights} noche
                {breakdown.nights === 1 ? "" : "s"})
              </span>
              <span className="font-medium text-right">
                {formatUsd(breakdown.nightlySubtotalUsd)}{" "}
                <span className="text-gray-500">
                  (≈ {formatUsd(breakdown.avgNightlyRateUsd)}/noche)
                </span>
              </span>
            </div>
            {breakdown.extraGuestFeesUsd > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fees de huéspedes extra</span>
                <span className="font-medium text-right">{formatUsd(breakdown.extraGuestFeesUsd)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">IVA (16%)</span>
              <span className="font-medium text-right">{formatUsd(breakdown.ivaUsd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ISH / Impuesto municipal (6%)</span>
              <span className="font-medium text-right">{formatUsd(breakdown.ishUsd)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Precio mostrado al huésped (total)</span>
              <span>{formatUsd(breakdown.totalUsd)}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-gray-600">Moneda cobrada</span>
              <span className="font-medium text-right">{paidCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto cobrado (Stripe)</span>
              <span className="font-medium text-right">
                {paidAmount != null
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: paidCurrency,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(paidAmount)
                  : `${formatUsd(reservation.totalAmount)} (estimado, sin dato de Stripe)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Tarifa actual en Hostfully para estas fechas (referencia)
              </span>
              <span className="font-medium text-right">
                {breakdown.currentHostfullyNightlyTotalUsd != null
                  ? formatUsd(breakdown.currentHostfullyNightlyTotalUsd)
                  : "No disponible"}
              </span>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              El desglose de alojamiento / huéspedes extra se reconstruye a partir del total
              cobrado y la configuración vigente de la propiedad; si las tarifas cambiaron desde
              la reserva, el reparto es aproximado (el total siempre es el realmente cobrado).
            </p>
          </CardContent>
        </Card>

        {/* Pago y sincronización */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Pago y sincronización con Hostfully</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ID de pago Stripe</span>
              <span className="font-medium text-right break-all">
                {reservation.stripePaymentId ?? "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lead en Hostfully</span>
              <span className="font-medium text-right break-all">
                {reservation.hostfullyLeadUid ?? "No sincronizado"}
              </span>
            </div>
            {reservation.hostfullySyncedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Sincronizado el</span>
                <span className="font-medium text-right">
                  {formatDateTime(reservation.hostfullySyncedAt)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
