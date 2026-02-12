"use client";

import { useState, useEffect } from 'react';
import { Property } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { Wifi, Car, Utensils, Home, Waves, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import AvailabilityCalendar from '@/components/ui/availability-calendar';
import ReservationForm from '@/components/ui/reservation-form';
import { CurrencySelect, type Currency } from '@/components/ui/currency-select';
import { useCart } from '@/lib/cart-context';

const amenityIcons: Record<string, LucideIcon> = {
  'WiFi de alta velocidad': Wifi,
  'Aire acondicionado': Home,
  'Cocina equipada': Utensils,
  'Estacionamiento': Car,
  'Piscina comunitaria': Waves,
  'Vista al mar': Waves,
  'Terraza privada': Home,
  'Servicio de limpieza': Home,
  'Seguridad 24/7': Shield,
  'Acceso a playa': Waves,
  default: Home,
};

interface PropertyBodyProps {
  property: Property;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  pricePerNightDisplay: number;
  usdMxnRate: number | null;
}

export default function PropertyBody({
  property,
  currency,
  onCurrencyChange,
  pricePerNightDisplay,
  usdMxnRate,
}: PropertyBodyProps) {
  const [selectedDates, setSelectedDates] = useState<{ checkIn: Date; checkOut?: Date } | undefined>();
  const { addToCart } = useCart();

  // Añadir como "incompleta" al carrito cuando el usuario selecciona fechas (sin pasar aún a pago)
  useEffect(() => {
    if (!selectedDates?.checkIn || !selectedDates?.checkOut) return;
    addToCart({
      propertyId: property.id,
      slug: property.slug,
      checkIn: selectedDates.checkIn.toISOString(),
      checkOut: selectedDates.checkOut.toISOString(),
    });
  }, [selectedDates?.checkIn?.getTime(), selectedDates?.checkOut?.getTime(), property.id, property.slug, addToCart]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Columna Izquierda: Detalles */}
      <div className="lg:col-span-2 space-y-8">
        {/* Descripción */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Descripción</h2>
          <div className="prose prose-gray max-w-none">
            {property.description.split('\n').map((paragraph, index) => (
              <p key={index} className="text-gray-600 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <Separator />

        {/* Amenidades */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {property.amenities.map((amenity, index) => {
              const IconComponent = amenityIcons[amenity] || amenityIcons.default;
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                  <IconComponent className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-900">{amenity}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Calendario y selector de moneda */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Disponibilidad</h2>
            <CurrencySelect value={currency} onValueChange={onCurrencyChange} />
          </div>
          <AvailabilityCalendar
            property={property}
            onDateSelect={setSelectedDates}
            selectedDates={selectedDates}
          />
        </div>
      </div>

      {/* Columna Derecha: Formulario (Sticky) */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <ReservationForm
            property={property}
            selectedDates={selectedDates}
            currency={currency}
            pricePerNightDisplay={pricePerNightDisplay}
          />
        </div>
      </div>
    </div>
  );
}