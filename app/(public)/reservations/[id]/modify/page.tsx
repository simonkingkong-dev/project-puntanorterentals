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
import { format, parseISO } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { calculateNights, getNightsBetween, getFirstBlockedNight } from "@/lib/utils/date";
import AvailabilityCalendar from "@/components/ui/availability-calendar";
import type { Property } from "@/lib/types";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { useLocale } from "@/components/providers/locale-provider";
import { remoteImageShouldBypassOptimization } from "@/lib/remote-image";
import { computeExtraGuestFeesUsd } from "@/lib/pricing-guests";
import { computeLodgingTaxesUsd, computeTotalWithLodgingTaxesUsd } from "@/lib/lodging-taxes";
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

function payDiffLabel(t: (key: string) => string, amount: number) {
  return t("modify_pay_difference").replace("${amount}", String(amount));
}

export default function ModifyReservationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { removeFromCart } = useCart();
  const { t, locale } = useLocale();
  const dateLocale = locale === "en" ? enUS : es;

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
      setError(t("modify_err_token"));
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
      .catch((err) => setError(err.message ?? t("modify_err_load")))
      .finally(() => setLoading(false));
  }, [id, token, t]);

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
      if (!res.ok) throw new Error(json.error ?? t("modify_err_cancel"));
      setCancelDialogOpen(false);
      removeFromCart(id);
      toast.success(t("modify_toast_cancelled"));
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modify_err_cancel"));
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
      if (!res.ok) throw new Error(json.error ?? t("modify_err_send"));
      toast.success(t("modify_toast_mod_sent"));
      router.push("/cart");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modify_err_send"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateConfirmed = async () => {
    if (!id || !token || !data || !selectedDates?.checkIn || !selectedDates?.checkOut) return;
    const nightsHere = calculateNights(selectedDates.checkIn, selectedDates.checkOut);
    const p = data.property;
    const nightly = nightsHere * (p?.pricePerNight ?? 0);
    const extraGuest = p ? computeExtraGuestFeesUsd(guests, nightsHere, p) : 0;
    const total = Math.round(computeTotalWithLodgingTaxesUsd(nightly + extraGuest));
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
      if (!res.ok) throw new Error(json.error ?? t("modify_err_update"));
      toast.success(t("modify_toast_updated"));
      const detailRes = await fetch(`/api/reservations/${id}/modify-details?token=${encodeURIComponent(token)}`);
      const detailJson = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailJson.error);
      setData(detailJson);
      setSelectedDates({
        checkIn: new Date(detailJson.reservation.checkIn),
        checkOut: new Date(detailJson.reservation.checkOut),
      });
      setGuests(detailJson.reservation.guests ?? 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modify_err_update"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundDifference = async () => {
    if (!id || !token || !data || !selectedDates?.checkIn || !selectedDates?.checkOut) return;
    const nightsHere = calculateNights(selectedDates.checkIn, selectedDates.checkOut);
    const p = data.property;
    const nightly = nightsHere * (p?.pricePerNight ?? 0);
    const extraGuest = p ? computeExtraGuestFeesUsd(guests, nightsHere, p) : 0;
    const total = Math.round(computeTotalWithLodgingTaxesUsd(nightly + extraGuest));
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
      if (!res.ok) throw new Error(json.error ?? t("modify_err_refund"));
      toast.success(t("modify_toast_refund"));
      const detailRes = await fetch(`/api/reservations/${id}/modify-details?token=${encodeURIComponent(token)}`);
      const detailJson = await detailRes.json();
      if (!detailRes.ok) throw new Error(detailJson.error);
      setData(detailJson);
      setSelectedDates({
        checkIn: new Date(detailJson.reservation.checkIn),
        checkOut: new Date(detailJson.reservation.checkOut),
      });
      setGuests(detailJson.reservation.guests ?? 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modify_err_refund"));
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
      if (!res.ok) throw new Error(json.error ?? t("modify_err_prepare"));
      const params = new URLSearchParams({
        reservation: id,
        amount: priceDiff.toString(),
        modification: "1",
        token,
      });
      router.push(`/payment?${params.toString()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("modify_err_prepare"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <p className="text-destructive mb-4 text-center max-w-md">{error || t("modify_err_not_found")}</p>
        <Button asChild variant="outline">
          <Link href="/cart">{t("modify_back_cart")}</Link>
        </Button>
      </div>
    );
  }

  const { reservation, property } = data;
  const confirmedAtMs = reservation.confirmedAt ? new Date(reservation.confirmedAt).getTime() : 0;
  const withinTwoHours = confirmedAtMs > 0 && Date.now() - confirmedAtMs < TWO_HOURS_MS;

  const checkInDate = selectedDates?.checkIn ? new Date(selectedDates.checkIn) : new Date(reservation.checkIn);
  const checkOutDate = selectedDates?.checkOut ? new Date(selectedDates.checkOut) : new Date(reservation.checkOut);
  const nights =
    selectedDates?.checkIn && selectedDates?.checkOut
      ? calculateNights(selectedDates.checkIn, selectedDates.checkOut)
      : calculateNights(reservation.checkIn, reservation.checkOut);
  const nightlyOnlyUsd = nights * property.pricePerNight;
  const extraGuestUsd = computeExtraGuestFeesUsd(guests, nights, property);
  const subtotalBeforeService = nightlyOnlyUsd + extraGuestUsd;
  const { ivaUsd, ishUsd, taxesUsd } = computeLodgingTaxesUsd(subtotalBeforeService);
  const newTotal = subtotalBeforeService + taxesUsd;
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
  const firstBlockedNight =
    isExtendingCheckOut && extraNights.length > 0
      ? getFirstBlockedNight(extraNights, property.availability ?? {})
      : null;
  const canApplyAdditive = isAdditive && !firstBlockedNight;

  const blockedNightFormatted = firstBlockedNight
    ? format(parseISO(firstBlockedNight), "PPP", { locale: dateLocale })
    : "";

  const summaryLine = t("modify_summary_dates")
    .replace("{checkIn}", format(checkInDate, "dd MMM yyyy", { locale: dateLocale }))
    .replace("{checkOut}", format(checkOutDate, "dd MMM yyyy", { locale: dateLocale }))
    .replace("{nights}", String(nights));

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button asChild variant="ghost">
            <Link href="/cart">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("modify_back_cart")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t("modify_title")}</h1>
          <p className="text-muted-foreground">{property.title}</p>
        </div>

        {property.images?.[0] && (
          <div className="relative h-48 rounded-xl overflow-hidden bg-muted">
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 896px"
              unoptimized={remoteImageShouldBypassOptimization(property.images[0])}
            />
          </div>
        )}

        {!withinTwoHours && firstBlockedNight && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
            <p className="font-medium">
              {t("modify_night_unavailable").replace("{date}", blockedNightFormatted)}
            </p>
            <p className="mt-1 opacity-90">{t("modify_night_unavailable_hint")}</p>
          </div>
        )}

        <div>
          <AvailabilityCalendar property={property} onDateSelect={onDateSelect} selectedDates={selectedDates} />

          <Card className="mt-6 border-border/80">
            <CardHeader>
              <CardTitle>{t("modify_guests_card")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="guests">{t("guests_count_label")}</Label>
              <Select value={guests.toString()} onValueChange={(v) => setGuests(parseInt(v, 10))}>
                <SelectTrigger id="guests" className="mt-2 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {n} {n === 1 ? t("property_guest_singular") : t("property_guests")}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{t("modify_price_summary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("pricing_accommodation")}</span>
              <span>${nightlyOnlyUsd}</span>
            </div>
            {extraGuestUsd > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("pricing_extra_guests")}</span>
                <span>${extraGuestUsd}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("payment_tax_iva")}</span>
              <span>${ivaUsd}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("payment_tax_ish")}</span>
              <span>${ishUsd}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("modify_previous_total")}</span>
              <span>${previousTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("modify_new_total")}</span>
              <span>${newTotal}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span className="text-foreground">{t("modify_price_diff")}</span>
              <span className={priceDiff > 0 ? "text-orange-600" : priceDiff < 0 ? "text-green-600" : ""}>
                {priceDiff > 0 ? "+" : ""}${priceDiff}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{summaryLine}</p>
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
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("modify_cancel_booking")
                )}
              </Button>
              {priceDiff > 0 ? (
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handlePayDifference} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    payDiffLabel(t, priceDiff)
                  )}
                </Button>
              ) : priceDiff < 0 ? (
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleRefundDifference} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("modify_refund_difference")
                  )}
                </Button>
              ) : (
                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleUpdateConfirmed} disabled={actionLoading}>
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("modify_apply_changes")
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" disabled className="opacity-50 cursor-not-allowed bg-red-50 text-red-800 border-red-200">
                {t("modify_cancel_booking")}
              </Button>
              {canApplyAdditive ? (
                <>
                  {priceDiff > 0 ? (
                    <Button className="bg-orange-500 hover:bg-orange-600" onClick={handlePayDifference} disabled={actionLoading}>
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        payDiffLabel(t, priceDiff)
                      )}
                    </Button>
                  ) : (
                    <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleUpdateConfirmed} disabled={actionLoading}>
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t("modify_apply_changes")
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-800 hover:bg-orange-50"
                  onClick={handleRequestModification}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("modify_request_change")
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("modify_dialog_title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("modify_dialog_body")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("modify_dialog_no")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleCancelReservation();
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {t("modify_dialog_yes")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
