"use client";

import { useState } from "react";
import { Property } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import { Wifi, Car, Utensils, Home, Waves, Shield, Star } from "lucide-react";
import HostfullyBookingEmbed from "@/components/ui/hostfully-booking-embed";
import HostfullyLeadWidgetEmbed from "@/components/ui/hostfully-lead-widget-embed";
import HostfullyCalendarWidgetEmbed from "@/components/ui/hostfully-calendar-widget-embed";
import AvailabilityCalendar from "@/components/ui/availability-calendar";
import ReservationForm from "@/components/ui/reservation-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoogleMap from "@/components/ui/google-map";
import { CurrencySelect, type Currency } from "@/components/ui/currency-select";
import { isHostfullyBookingEngine } from "@/lib/booking-engine";

const amenityIcons: Record<string, LucideIcon> = {
  "WiFi de alta velocidad": Wifi,
  "Aire acondicionado": Home,
  "Cocina equipada": Utensils,
  Estacionamiento: Car,
  "Piscina comunitaria": Waves,
  "Vista al mar": Waves,
  "Terraza privada": Home,
  "Servicio de limpieza": Home,
  "Seguridad 24/7": Shield,
  "Acceso a playa": Waves,
  default: Home,
};

interface PropertyBodyProps {
  property: Property;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  pricePerNightDisplay: number;
  usdMxnRate: number | null;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="text-gray-600 prose prose-gray max-w-none">{children}</div>
    </div>
  );
}

export default function PropertyBody(props: PropertyBodyProps) {
  const { property, currency, onCurrencyChange, pricePerNightDisplay } = props;
  const [selectedDates, setSelectedDates] = useState<
    { checkIn: Date; checkOut?: Date } | undefined
  >();
  const useHostfullyWidgets = isHostfullyBookingEngine();

  const hasMap = property.latitude != null && property.longitude != null;
  const hasReviews = property.reviews && property.reviews.length > 0;

  const summaryText =
    (property.summary && property.summary.trim()) ||
    (property.shortDescription && property.shortDescription.trim()) ||
    (property.longDescription && property.longDescription.trim()) ||
    "";
  const houseManualOrNotes =
    (property.houseManual && property.houseManual.trim()) ||
    (property.notes && property.notes.trim()) ||
    "";

  const propertyTabs = (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto flex-wrap gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="amenities">Amenidades</TabsTrigger>
        <TabsTrigger value="map">Mapa</TabsTrigger>
        <TabsTrigger value="reviews">Reseñas</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-4">
        <Section title="Ubicación">
          <p>{property.location || "—"}</p>
        </Section>
        {summaryText && (
          <Section title="Resumen">
            <p>{summaryText}</p>
          </Section>
        )}
        {(property.propertyType || property.roomType) && (
          <Section title="Tipo de propiedad">
            <p>
              {[property.propertyType, property.roomType].filter(Boolean).join(" · ")}
            </p>
          </Section>
        )}
        <Section title="Descripción">
          {property.description.split("\n").map((paragraph, index) => (
            <p key={index} className="leading-relaxed mb-4">
              {paragraph}
            </p>
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
        {property.access && (
          <Section title="Acceso">
            <p>{property.access}</p>
          </Section>
        )}
        {property.space && (
          <Section title="Espacio">
            <p>{property.space}</p>
          </Section>
        )}
        {property.transit && (
          <Section title="Transporte">
            <p>{property.transit}</p>
          </Section>
        )}
        {houseManualOrNotes && (
          <Section title="House Manual / Notas">
            <p>{houseManualOrNotes}</p>
          </Section>
        )}
        {(property.checkInTime || property.checkOutTime) && (
          <Section title="Horarios">
            <p>
              {property.checkInTime ? `Check-in: ${property.checkInTime}` : ""}
              {property.checkInTime && property.checkOutTime ? " · " : ""}
              {property.checkOutTime ? `Check-out: ${property.checkOutTime}` : ""}
            </p>
          </Section>
        )}
        {property.cancellationPolicy && (
          <Section title="Política de cancelación">
            <p>{property.cancellationPolicy}</p>
          </Section>
        )}
        {property.houseRules && (
          <Section title="Reglas de la casa">
            <p>{property.houseRules}</p>
          </Section>
        )}
      </TabsContent>

      <TabsContent value="amenities" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(property.amenities ?? []).map((amenity, index) => {
            const IconComponent = amenityIcons[amenity] || amenityIcons.default;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border"
              >
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
            <GoogleMap
              center={{
                lat: property.latitude as number,
                lng: property.longitude as number,
              }}
              markers={[
                {
                  id: property.id,
                  lat: property.latitude as number,
                  lng: property.longitude as number,
                  title: property.title,
                  url: `/properties/${property.slug}`,
                },
              ]}
              selectedId={property.id}
              className="w-full h-full min-h-[300px]"
              zoom={15}
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
                  {review.author && (
                    <span className="font-medium text-gray-900">{review.author}</span>
                  )}
                  {review.date && (
                    <span className="text-sm text-gray-500">{review.date}</span>
                  )}
                </div>
                {review.text && <p className="text-gray-600 text-sm">{review.text}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Las reseñas están disponibles en los canales de reserva (p. ej. Airbnb).
          </p>
        )}
      </TabsContent>
    </Tabs>
  );

  if (!useHostfullyWidgets) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Disponibilidad</h2>
            </div>
            <AvailabilityCalendar
              property={property}
              onDateSelect={setSelectedDates}
              selectedDates={selectedDates}
              currency={currency}
              usdMxnRate={props.usdMxnRate}
            />
          </div>
          {propertyTabs}
        </div>

        <div className="lg:col-span-1 lg:mt-12">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">Reserva directa</p>
              <p>
                Selecciona fechas en el calendario y completa tus datos para continuar al pago
                seguro (Stripe).
              </p>
              <div className="mt-4">
                <CurrencySelect value={currency} onValueChange={onCurrencyChange} />
              </div>
            </div>
            <ReservationForm
              property={property}
              selectedDates={selectedDates}
              currency={currency}
              pricePerNightDisplay={pricePerNightDisplay}
              usdMxnRate={props.usdMxnRate}
            />
          </div>
        </div>
      </div>
    );
  }

  const envLeadUuid = process.env.NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_UUID?.trim() ?? "";
  const leadUuid = (property.hostfullyLeadWidgetUuid?.trim() || envLeadUuid).trim();
  const showLeadWidget = Boolean(leadUuid);
  const showCalendarWidget =
    property.hostfullyCalendarWidgetId != null &&
    Number(property.hostfullyCalendarWidgetId) > 0;

  if (!showLeadWidget && !property.hostfullyPropertyId) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Falta configuración Hostfully para reservar</p>
          <p className="mt-1">
            En el admin, añade el UUID del widget Lead y el JSON de opciones, o define{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_UUID</code>{" "}
            y{" "}
            <code className="rounded bg-amber-100 px-1">
              NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_OPTIONS_JSON
            </code>
            .
          </p>
        </div>
        {showCalendarWidget && (
          <HostfullyCalendarWidgetEmbed
            propertyFirestoreId={property.id}
            widgetId={Number(property.hostfullyCalendarWidgetId)}
            name={property.hostfullyCalendarWidgetName?.trim() || property.title}
            showTentative={property.hostfullyCalendarShowTentative ?? 0}
            monthsToDisplay={property.hostfullyCalendarMonthsToDisplay ?? 2}
          />
        )}
        {propertyTabs}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Reservar</h2>
          {showCalendarWidget && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Calendario</h3>
              <HostfullyCalendarWidgetEmbed
                propertyFirestoreId={property.id}
                widgetId={Number(property.hostfullyCalendarWidgetId)}
                name={property.hostfullyCalendarWidgetName?.trim() || property.title}
                showTentative={property.hostfullyCalendarShowTentative ?? 0}
                monthsToDisplay={property.hostfullyCalendarMonthsToDisplay ?? 2}
              />
            </div>
          )}
          {showLeadWidget ? (
            <HostfullyLeadWidgetEmbed
              propertyFirestoreId={property.id}
              widgetUuid={leadUuid}
              optionsJson={property.hostfullyLeadWidgetOptionsJson}
            />
          ) : property.hostfullyPropertyId ? (
            <HostfullyBookingEmbed hostfullyPropertyUid={property.hostfullyPropertyId} />
          ) : null}
        </div>
        {propertyTabs}
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-24 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-2">Reserva en Hostfully (fallback)</p>
          <p>
            Este modo usa widgets como respaldo. Para flujo propio, define{" "}
            <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_BOOKING_ENGINE=custom</code>.
          </p>
          <div className="mt-4">
            <CurrencySelect value={currency} onValueChange={onCurrencyChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

