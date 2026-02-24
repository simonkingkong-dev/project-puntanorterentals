"use client";

import { useState, useEffect } from 'react';
import { Property } from '@/lib/types';
import type { LucideIcon } from 'lucide-react';
import { Wifi, Car, Utensils, Home, Waves, Shield, MapPin, Star } from 'lucide-react';
import AvailabilityCalendar from '@/components/ui/availability-calendar';
import ReservationForm from '@/components/ui/reservation-form';
import { CurrencySelect, type Currency } from '@/components/ui/currency-select';
import { useCart } from '@/lib/cart-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="text-gray-600 prose prose-gray max-w-none">{children}</div>
    </div>
  );
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

  useEffect(() => {
    if (!selectedDates?.checkIn || !selectedDates?.checkOut) return;
    addToCart({
      propertyId: property.id,
      slug: property.slug,
      checkIn: selectedDates.checkIn.toISOString(),
      checkOut: selectedDates.checkOut.toISOString(),
    });
  }, [selectedDates?.checkIn?.getTime(), selectedDates?.checkOut?.getTime(), property.id, property.slug, addToCart]);

  const hasMap = property.latitude != null && property.longitude != null;
  const hasReviews = property.reviews && property.reviews.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        {/* Calendario primero (fuera de pestañas) */}
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

        {/* Pestañas: Overview, Amenities, Map, Reviews */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto flex-wrap gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="amenities">Amenidades</TabsTrigger>
            <TabsTrigger value="map">Mapa</TabsTrigger>
            <TabsTrigger value="reviews">Reseñas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Section title="Ubicación">
              <p>{property.location || '—'}</p>
            </Section>
            {property.summary && (
              <Section title="Resumen">
                <p>{property.summary}</p>
              </Section>
            )}
            <Section title="Descripción">
              {property.description.split('\n').map((paragraph, index) => (
                <p key={index} className="leading-relaxed mb-4">{paragraph}</p>
              ))}
            </Section>
            {property.interaction && (
              <Section title="Interacción">
                <p>{property.interaction}</p>
              </Section>
            )}
            {property.neighborhood && (
              <Section title="Barrio">
                <p>{property.neighborhood}</p>
              </Section>
            )}
          </TabsContent>

          <TabsContent value="amenities" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(property.amenities ?? []).map((amenity, index) => {
                const IconComponent = amenityIcons[amenity] || amenityIcons.default;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <IconComponent className="w-5 h-5 text-orange-600 shrink-0" />
                    <span className="text-gray-900">{amenity}</span>
                  </div>
                );
              })}
            </div>
            {(!property.amenities || property.amenities.length === 0) && (
              <p className="text-gray-500">No hay amenidades listadas.</p>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            {hasMap ? (
              <div className="rounded-lg overflow-hidden border bg-gray-100 aspect-video">
                <iframe
                  title="Mapa de ubicación"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(property.longitude! - 0.02)}%2C${(property.latitude! - 0.02)}%2C${(property.longitude! + 0.02)}%2C${(property.latitude! + 0.02)}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                  className="w-full h-full min-h-[300px]"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="text-gray-500">Mapa no disponible para esta propiedad.</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            {hasReviews ? (
              <div className="space-y-4">
                {property.reviews!.map((review, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      {review.rating != null && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star className="w-4 h-4 fill-current" />
                          {review.rating}
                        </span>
                      )}
                      {review.author && <span className="font-medium text-gray-900">{review.author}</span>}
                      {review.date && <span className="text-sm text-gray-500">{review.date}</span>}
                    </div>
                    {review.text && <p className="text-gray-600 text-sm">{review.text}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Las reseñas están disponibles en los canales de reserva (p. ej. Airbnb).</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
