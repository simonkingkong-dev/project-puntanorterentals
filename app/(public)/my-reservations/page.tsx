"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2, Mail, Pencil } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { getPropertyBySlug } from '@/lib/firebase/properties';
import { Property } from '@/lib/types';
import { useLocale } from '@/components/providers/locale-provider';
import type { Locale } from '@/lib/i18n/messages';

type ConfirmedReservation = {
  id: string;
  propertyId: string;
  propertySlug?: string;
  propertyTitle?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  status: string;
  modifyToken: string | null;
};

function formatDateSafe(value: string | undefined, locale: Locale): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  const df = locale === 'en' ? enUS : es;
  return isValid(d) ? format(d, 'dd MMM yyyy', { locale: df }) : '—';
}

export default function MyReservationsPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservations, setReservations] = useState<ConfirmedReservation[] | null>(null);

  const handleSearch = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setReservations(null);
    try {
      const res = await fetch(
        `/api/reservations/by-email?email=${encodeURIComponent(trimmed)}&for=reservations`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('my_reservations_error_fetch'));
      setReservations(data.reservations ?? []);
      if (!data.reservations?.length) {
        setError(t('my_reservations_error_none'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('my_reservations_error_search'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] max-w-2xl mx-auto py-12 sm:py-16 px-4">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t('my_reservations_title')}
        </h1>
        <p className="mt-2 text-muted-foreground leading-relaxed">{t('my_reservations_intro')}</p>
      </header>

      <div className="space-y-4 mb-8 rounded-2xl border bg-card/80 p-6 shadow-sm">
        <Label htmlFor="my-reservations-email" className="flex items-center gap-2 text-sm font-medium">
          <Mail className="w-4 h-4 text-muted-foreground" />
          {t('my_reservations_email_label')}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="my-reservations-email"
            type="email"
            placeholder={t('placeholder_email')}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={loading || !email.trim()}
            onClick={handleSearch}
            className="shrink-0 sm:min-w-[120px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('my_reservations_search')}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {reservations !== null && reservations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t('my_reservations_list_title')}</h2>
          {reservations.map((r) => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </div>
      )}

      {reservations !== null && reservations.length === 0 && !error && (
        <Card className="border-border/80">
          <CardContent className="py-10 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{t('my_reservations_empty_card')}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/properties">{t('cart_explore')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-10">
        <Button asChild variant="outline">
          <Link href="/cart">{t('my_reservations_go_cart')}</Link>
        </Button>
      </div>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: ConfirmedReservation }) {
  const { t, locale } = useLocale();
  const [property, setProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (!reservation.propertySlug) return;
    let cancelled = false;
    getPropertyBySlug(reservation.propertySlug).then((p) => {
      if (!cancelled) setProperty(p);
    });
    return () => {
      cancelled = true;
    };
  }, [reservation.propertySlug]);

  const modifyHref =
    reservation.modifyToken
      ? `/reservations/${reservation.id}/modify?token=${encodeURIComponent(reservation.modifyToken)}`
      : reservation.propertySlug
        ? `/properties/${reservation.propertySlug}`
        : '/properties';

  const titleFallback = t('my_reservations_property_fallback');

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-3">
          <CardTitle className="text-lg leading-snug">
            {reservation.propertyTitle ?? property?.title ?? titleFallback}
          </CardTitle>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shrink-0">
            {t('my_reservations_status_confirmed')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          {property?.images?.[0] && (
            <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
              <Image
                src={property.images[0]}
                alt={property.title ?? titleFallback}
                fill
                className="object-cover"
                unoptimized
                sizes="80px"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground/70">{t('check_in')}:</span>{' '}
              {formatDateSafe(reservation.checkIn, locale)}
            </p>
            <p>
              <span className="text-foreground/70">{t('check_out')}:</span>{' '}
              {formatDateSafe(reservation.checkOut, locale)}
            </p>
            <p>
              <span className="text-foreground/70">{t('my_reservations_total')}:</span>{' '}
              ${reservation.totalAmount}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="border-orange-300 text-orange-800 hover:bg-orange-50 dark:text-orange-200">
          <Link href={modifyHref} className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            {t('my_reservations_modify')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
