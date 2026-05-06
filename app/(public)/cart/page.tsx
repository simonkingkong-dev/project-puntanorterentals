"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, getCartItemKey, isDraft, type CartItem } from '@/lib/cart-context';
import { getPropertyBySlug } from '@/lib/firebase/properties';
import { Property } from '@/lib/types';
import { remoteImageShouldBypassOptimization } from '@/lib/remote-image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingCart, Calendar, Loader2, Trash2, Pencil, Clock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocale } from '@/components/providers/locale-provider';
import { getLocalizedPropertyTitle } from '@/lib/property-localization';

type ReservationStatus = {
  status: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  modifyToken: string | null;
};

function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function CartItemCard({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (key: string) => void;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const key = getCartItemKey(item);
  const [property, setProperty] = useState<Property | null>(null);
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const propertyTitle = property ? getLocalizedPropertyTitle(property, locale) : 'Cargando...';

  useEffect(() => {
    if (!item.slug) return;
    let cancelled = false;
    getPropertyBySlug(item.slug).then((p) => {
      if (!cancelled) setProperty(p);
    });
    return () => {
      cancelled = true;
    };
  }, [item.slug]);

  useEffect(() => {
    if (!item.reservationId) {
      setReservationStatus(null);
      setSecondsLeft(null);
      return;
    }
    const controller = new AbortController();
    setStatusLoading(true);
    fetch(`/api/reservations/${item.reservationId}/status`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.error) {
          setReservationStatus({ status: 'cancelled', expiresAt: null, confirmedAt: null, modifyToken: null });
          setSecondsLeft(null);
          onRemove(key);
          return;
        }
        const status: ReservationStatus = {
          status: data.status,
          expiresAt: data.expiresAt ?? null,
          confirmedAt: data.confirmedAt ?? null,
          modifyToken: data.modifyToken ?? null,
        };
        setReservationStatus(status);
        if (data.status === 'cancelled') {
          onRemove(key);
          return;
        }
        if (data.status === 'confirmed') {
          onRemove(key);
          return;
        }
        if (data.status === 'pending' && data.expiresAt) {
          const expiry = new Date(data.expiresAt).getTime();
          const now = Date.now();
          setSecondsLeft(Math.max(0, Math.floor((expiry - now) / 1000)));
        } else {
          setSecondsLeft(null);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setReservationStatus({ status: 'cancelled', expiresAt: null, confirmedAt: null, modifyToken: null });
        setSecondsLeft(null);
        onRemove(key);
      })
      .finally(() => {
        if (!controller.signal.aborted) setStatusLoading(false);
      });
    return () => controller.abort();
  }, [item.reservationId, key, onRemove]);

  const countdownActive = secondsLeft != null && secondsLeft > 0;
  useEffect(() => {
    if (!countdownActive) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s != null && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [countdownActive, reservationStatus?.expiresAt]);

  const isDraftItem = isDraft(item);
  const canContinueToPayment =
    reservationStatus?.status === 'pending' &&
    reservationStatus?.expiresAt &&
    new Date(reservationStatus.expiresAt).getTime() > Date.now();
  const isConfirmed = reservationStatus?.status === 'confirmed';

  const reservarHref = canContinueToPayment && item.reservationId
    ? `/payment?reservation=${item.reservationId}`
    : item.slug
      ? `/properties/${item.slug}${item.checkIn && item.checkOut ? `?checkIn=${item.checkIn}&checkOut=${item.checkOut}` : ''}`
      : '/properties';

  const modifyHref =
    isConfirmed && item.reservationId && reservationStatus?.modifyToken
      ? `/reservations/${item.reservationId}/modify?token=${encodeURIComponent(reservationStatus.modifyToken)}`
      : item.slug
        ? `/properties/${item.slug}${item.checkIn && item.checkOut ? `?checkIn=${item.checkIn}&checkOut=${item.checkOut}` : ''}`
        : '/properties';

  const handleDelete = async () => {
    if (item.reservationId) {
      try {
        await fetch(`/api/reservations/${item.reservationId}/release`, { method: 'POST' });
      } catch {
        // ignore
      }
    }
    onRemove(key);
  };

  const handleReservarClick = async () => {
    if (!canContinueToPayment || !item.reservationId) return;
    if (secondsLeft != null && secondsLeft <= 5 * 60) {
      try {
        const res = await fetch(`/api/reservations/${item.reservationId}/extend`, { method: 'POST' });
        const data = await res.json();
        if (data.expiresAt) {
          setReservationStatus((prev) => (prev ? { ...prev, expiresAt: data.expiresAt } : null));
        }
      } catch {
        // ignore
      }
    }
    router.push(reservarHref);
  };

  if (item.reservationId && reservationStatus?.status === 'cancelled') {
    return null;
  }

  const checkInDate = new Date(item.checkIn);
  const checkOutDate = new Date(item.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="relative">
      {!isConfirmed && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Eliminar del carrito"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta reserva del carrito?</AlertDialogTitle>
                <AlertDialogDescription>
                  {item.reservationId
                    ? 'Se cancelará la reserva pendiente y se liberarán las fechas.'
                    : 'Se quitará el resumen de tu reserva del carrito.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      <CardHeader>
        <CardTitle className="text-lg">Resumen de reserva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex gap-4 flex-1 min-w-0">
            <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
              {property?.images?.[0] ? (
                <Image
                  src={property.images[0]}
                  alt={propertyTitle}
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized={remoteImageShouldBypassOptimization(property.images[0])}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Calendar className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {propertyTitle}
              </h3>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p>
                  <span className="text-gray-500">Check-in:</span>{' '}
                  {format(checkInDate, 'dd MMM yyyy', { locale: es })}
                </p>
                <p>
                  <span className="text-gray-500">Check-out:</span>{' '}
                  {format(checkOutDate, 'dd MMM yyyy', { locale: es })}
                </p>
                <p>
                  <span className="text-gray-500">Noches:</span> {nights}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              href={modifyHref}
              className={cn(
                'flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'text-gray-700 hover:text-orange-600 hover:bg-gray-50'
              )}
            >
              <Pencil className="w-4 h-4" />
              <span>Modificar</span>
            </Link>
            {isConfirmed && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                Confirmada
              </div>
            )}
            {item.reservationId && reservationStatus?.status === 'pending' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                <Clock className="h-4 w-4" />
                {secondsLeft != null && secondsLeft > 0 ? (
                  <span className={cn('font-mono', secondsLeft <= 60 && 'text-red-600')}>
                    {formatTimeLeft(secondsLeft)}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">Expirada</span>
                )}
              </div>
            )}
            {item.reservationId && reservationStatus?.status === 'cancelled' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-800">
                Cancelada
              </div>
            )}
            {isDraftItem && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-amber-100 text-amber-800">
                Incompleta
              </div>
            )}
          </div>
        </div>
        {!isConfirmed && (
          isDraftItem ? (
            <Button asChild className="w-full mt-4 bg-orange-500 hover:bg-orange-600">
              <Link href="/payment">Completar pago</Link>
            </Button>
          ) : canContinueToPayment ? (
            <Button
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
              onClick={handleReservarClick}
            >
              Continuar al pago
            </Button>
          ) : (
            <Button asChild className="w-full mt-4 bg-orange-500 hover:bg-orange-600">
              <Link href={reservarHref}>Reservar</Link>
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, setCart } = useCart();
  const { t } = useLocale();
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const uniqueCart = useMemo(() => {
    const seen = new Set<string>();
    return cart.filter((item) => {
      const k = getCartItemKey(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [cart]);

  useEffect(() => {
    if (uniqueCart.length < cart.length && cart.length > 0) {
      setCart(uniqueCart);
    }
  }, [cart, uniqueCart, setCart]);

  if (cart.length === 0) {
    return (
      <div className="min-h-[50vh] max-w-md mx-auto flex flex-col items-center py-16 px-4">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('cart_empty_title', 'Your cart is empty')}</h2>
        <p className="text-gray-500 text-center mb-6">
          {t('cart_empty_subtitle', 'Pick dates on a property and come back here to review your summary. Confirmed bookings are in My reservations.')}
        </p>
        <div className="w-full space-y-4 mb-6">
          <Label htmlFor="recovery-email" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Mail className="w-4 h-4" />
            Recuperar reservas con tu email
          </Label>
          <p className="text-xs text-gray-500">
            Si limpiaste cookies, ingresa el email que usaste al reservar para recuperar tus reservas en hold o expiradas.
          </p>
          <div className="flex gap-2">
            <Input
              id="recovery-email"
              type="email"
              placeholder="tu@email.com"
              value={recoveryEmail}
              onChange={(e) => {
                setRecoveryEmail(e.target.value);
                setRecoveryError(null);
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={recoveryLoading || !recoveryEmail.trim()}
              onClick={async () => {
                const email = recoveryEmail.trim();
                if (!email) return;
                setRecoveryLoading(true);
                setRecoveryError(null);
                try {
                  const res = await fetch(`/api/reservations/by-email?email=${encodeURIComponent(email)}&for=cart`);
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? 'Error al buscar');
                  const reservations = data.reservations ?? [];
                  if (reservations.length === 0) {
                    setRecoveryError('No se encontraron reservas con ese email.');
                  } else {
                    const cartItems = (reservations as Array<{ id: string; propertyId: string; propertySlug?: string; checkIn: string; checkOut: string }>).map((r) => ({
                      propertyId: r.propertyId,
                      slug: r.propertySlug ?? '',
                      checkIn: r.checkIn,
                      checkOut: r.checkOut,
                      reservationId: r.id,
                    }));
                    setCart(cartItems);
                  }
                } catch (err) {
                  setRecoveryError(err instanceof Error ? err.message : 'Error al buscar reservas');
                } finally {
                  setRecoveryLoading(false);
                }
              }}
            >
              {recoveryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>
          {recoveryError && <p className="text-sm text-red-600">{recoveryError}</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link href="/properties">{t('cart_explore', 'Explore properties')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/my-reservations">{t('cart_my_reservations', 'My reservations')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('cart_title', 'Cart')}</h1>
      <div className="space-y-6">
        {uniqueCart.map((item) => (
          <CartItemCard
            key={getCartItemKey(item)}
            item={item}
            onRemove={removeFromCart}
          />
        ))}
      </div>
    </div>
  );
}
