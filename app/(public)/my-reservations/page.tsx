"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2, Mail, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPropertyBySlug } from '@/lib/firebase/properties';
import { Property } from '@/lib/types';

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

export default function MyReservationsPage() {
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
      if (!res.ok) throw new Error(data.error ?? 'Error al buscar');
      setReservations(data.reservations ?? []);
      if (!data.reservations?.length) {
        setError('No se encontraron reservas confirmadas con ese email.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar reservas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis reservas</h1>
      <p className="text-gray-600 mb-6">
        Ingresa el email con el que reservaste para ver tus reservas confirmadas.
      </p>

      <div className="space-y-4 mb-8">
        <Label htmlFor="my-reservations-email" className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Mail className="w-4 h-4" />
          Email
        </Label>
        <div className="flex gap-2">
          <Input
            id="my-reservations-email"
            type="email"
            placeholder="tu@email.com"
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
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {reservations !== null && reservations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Tus reservas confirmadas</h2>
          {reservations.map((r) => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </div>
      )}

      {reservations !== null && reservations.length === 0 && !error && (
        <Card className="border-gray-200">
          <CardContent className="py-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No hay reservas confirmadas con ese email.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/properties">Ver propiedades</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/cart">Ir al carrito</Link>
        </Button>
      </div>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: ConfirmedReservation }) {
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

  const checkInDate = new Date(reservation.checkIn);
  const checkOutDate = new Date(reservation.checkOut);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {reservation.propertyTitle ?? property?.title ?? 'Propiedad'}
          </CardTitle>
          <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">
            Confirmada
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          {property?.images?.[0] && (
            <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={property.images[0]}
                alt={property.title ?? 'Propiedad'}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1 text-sm text-gray-600">
            <p>
              <span className="text-gray-500">Check-in:</span>{' '}
              {format(checkInDate, 'dd MMM yyyy', { locale: es })}
            </p>
            <p>
              <span className="text-gray-500">Check-out:</span>{' '}
              {format(checkOutDate, 'dd MMM yyyy', { locale: es })}
            </p>
            <p>
              <span className="text-gray-500">Total:</span> ${reservation.totalAmount}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50">
          <Link href={modifyHref} className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Modificar reserva
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
