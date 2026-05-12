"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Property } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  Bath,
  BriefcaseBusiness,
  Car,
  CircleCheck,
  Cigarette,
  Coffee,
  CookingPot,
  DoorOpen,
  Dumbbell,
  Fan,
  FireExtinguisher,
  Flame,
  Flower2,
  KeyRound,
  Microwave,
  PartyPopper,
  PawPrint,
  Shield,
  ShowerHead,
  Sparkles,
  Star,
  Trees,
  Tv,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";
import AvailabilityCalendar from "@/components/ui/availability-calendar";
import ReservationForm from "@/components/ui/reservation-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencySelect, type Currency } from "@/components/ui/currency-select";
import { isHostfullyBookingEngine } from "@/lib/booking-engine";
import { useLocale } from "@/components/providers/locale-provider";
import { getLocalizedPropertyAmenities } from "@/lib/property-localization";
import { getIncludedGuests } from "@/lib/pricing-guests";
import type { ListingSearchSelection } from "@/lib/listing-search-params";

const GoogleMap = dynamic(() => import("@/components/ui/google-map"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[300px] rounded-lg bg-gray-100" />,
});

const ReviewForm = dynamic(() => import("@/components/ui/review-form"), {
  ssr: false,
  loading: () => <div className="h-40 rounded-lg border bg-gray-50" />,
});

const HostfullyBookingEmbed = dynamic(
  () => import("@/components/ui/hostfully-booking-embed"),
  { ssr: false, loading: () => <div className="h-96 rounded-lg border bg-gray-50" /> }
);

const HostfullyLeadWidgetEmbed = dynamic(
  () => import("@/components/ui/hostfully-lead-widget-embed"),
  { ssr: false, loading: () => <div className="h-96 rounded-lg border bg-gray-50" /> }
);

const HostfullyCalendarWidgetEmbed = dynamic(
  () => import("@/components/ui/hostfully-calendar-widget-embed"),
  { ssr: false, loading: () => <div className="h-72 rounded-lg border bg-gray-50" /> }
);

const amenityIconRules: Array<{ keywords: string[]; icon: LucideIcon }> = [
  { keywords: ["wifi", "internet"], icon: Wifi },
  { keywords: ["aire acondicionado", "air conditioning", "ac ", " a/c", "clima"], icon: AirVent },
  { keywords: ["calefaccion", "heating", "heater"], icon: Flame },
  { keywords: ["ventilador", "fan"], icon: Fan },
  { keywords: ["piscina", "pool", "alberca"], icon: Waves },
  { keywords: ["vista al mar", "ocean view", "sea view", "beach", "playa", "mar"], icon: Waves },
  { keywords: ["jacuzzi", "hot tub"], icon: Bath },
  { keywords: ["spa"], icon: Sparkles },
  { keywords: ["cocina", "kitchen", "kitchenette"], icon: Utensils },
  { keywords: ["cooking", "utensilios", "ollas", "pans", "pots"], icon: CookingPot },
  { keywords: ["cafetera", "coffee"], icon: Coffee },
  { keywords: ["microondas", "microwave"], icon: Microwave },
  { keywords: ["estacionamiento", "parking"], icon: Car },
  { keywords: ["seguridad", "security"], icon: Shield },
  { keywords: ["limpieza", "cleaning"], icon: Sparkles },
  { keywords: ["terraza", "balcon", "balcony", "patio"], icon: Trees },
  { keywords: ["jardin", "garden"], icon: Flower2 },
  { keywords: ["gym", "gimnasio"], icon: Dumbbell },
  { keywords: ["tv", "television", "cable"], icon: Tv },
  { keywords: ["toallas", "towels", "ducha", "shower"], icon: ShowerHead },
  { keywords: ["lavadora", "washer", "secadora", "dryer", "laundry"], icon: WashingMachine },
  { keywords: ["secador", "hair dryer"], icon: Wind },
  { keywords: ["entrada privada", "private entrance"], icon: DoorOpen },
  { keywords: ["cerradura", "lock"], icon: KeyRound },
  { keywords: ["detector", "smoke", "monoxido", "monoxide"], icon: Shield },
  { keywords: ["extintor", "fire extinguisher"], icon: FireExtinguisher },
  { keywords: ["botiquin", "first aid"], icon: CircleCheck },
  { keywords: ["mascotas", "pets"], icon: PawPrint },
  { keywords: ["fumar", "smoking"], icon: Cigarette },
  { keywords: ["eventos", "events"], icon: PartyPopper },
  { keywords: ["escritorio", "desk"], icon: BriefcaseBusiness },
];

function normalizeAmenity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getAmenityIcon(amenity: string): LucideIcon {
  const normalizedAmenity = normalizeAmenity(amenity);
  return (
    amenityIconRules.find(({ keywords }) =>
      keywords.some((keyword) => normalizedAmenity.includes(normalizeAmenity(keyword)))
    )?.icon ?? CircleCheck
  );
}

interface PropertyBodyProps {
  property: Property;
  initialSearch?: ListingSearchSelection;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  pricePerNightDisplay: number;
  usdMxnRate: number | null;
  usdEurRate: number | null;
}

function parseDateInput(value?: string): Date | undefined {
  if (!value) return undefined;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function getInitialSelectedDates(
  initialSearch: ListingSearchSelection | undefined
): { checkIn: Date; checkOut?: Date } | undefined {
  const checkIn = parseDateInput(initialSearch?.checkIn);
  if (!checkIn) return undefined;

  const checkOut = parseDateInput(initialSearch?.checkOut);
  if (!checkOut || checkOut.getTime() <= checkIn.getTime()) {
    return { checkIn };
  }

  return { checkIn, checkOut };
}

function getInitialBookingGuests(
  maxGuests: number,
  includedGuests: number | undefined,
  guests?: number
): number {
  const defaultGuests = Math.min(maxGuests, Math.max(1, getIncludedGuests({ includedGuests })));
  if (!guests || !Number.isFinite(guests)) return defaultGuests;
  return Math.min(maxGuests, Math.max(1, guests));
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
  const { property, initialSearch, currency, onCurrencyChange, pricePerNightDisplay } = props;
  const { locale, t } = useLocale();
  const initialCheckIn = initialSearch?.checkIn;
  const initialCheckOut = initialSearch?.checkOut;
  const initialGuests = initialSearch?.guests;
  const [selectedDates, setSelectedDates] = useState<
    { checkIn: Date; checkOut?: Date } | undefined
  >(() => getInitialSelectedDates(initialSearch));
  const [bookingGuests, setBookingGuests] = useState(() =>
    getInitialBookingGuests(property.maxGuests, property.includedGuests, initialGuests)
  );
  useEffect(() => {
    setSelectedDates(
      getInitialSelectedDates({
        checkIn: initialCheckIn,
        checkOut: initialCheckOut,
        guests: initialGuests,
      })
    );
    setBookingGuests(getInitialBookingGuests(property.maxGuests, property.includedGuests, initialGuests));
  }, [
    property.id,
    property.maxGuests,
    property.includedGuests,
    initialCheckIn,
    initialCheckOut,
    initialGuests,
  ]);
  const useHostfullyWidgets = isHostfullyBookingEngine();

  const hasMap = property.latitude != null && property.longitude != null;
  const hasReviews = property.reviews && property.reviews.length > 0;

  const pickLocalized = (base: string | undefined, es: string | undefined, en: string | undefined) => {
    const localized = locale === "en" ? en : es;
    if (typeof localized === "string") {
      return localized.trim();
    }
    return base?.trim() || "";
  };
  const renderParagraphs = (text: string) =>
    text
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph, index) => (
        <p key={index} className="leading-relaxed mb-4">
          {paragraph}
        </p>
      ));

  const summaryText =
    pickLocalized(property.summary, property.summaryEs, property.summaryEn) ||
    pickLocalized(property.shortDescription, property.shortDescriptionEs, property.shortDescriptionEn) ||
    pickLocalized(property.longDescription, property.longDescriptionEs, property.longDescriptionEn);
  const descriptionText = pickLocalized(property.description, property.descriptionEs, property.descriptionEn);
  const interactionText = pickLocalized(property.interaction, property.interactionEs, property.interactionEn);
  const neighborhoodText = pickLocalized(property.neighborhood, property.neighborhoodEs, property.neighborhoodEn);
  const accessText = pickLocalized(property.access, property.accessEs, property.accessEn);
  const spaceText = pickLocalized(property.space, property.spaceEs, property.spaceEn);
  const transitText = pickLocalized(property.transit, property.transitEs, property.transitEn);
  const houseManualOrNotes =
    pickLocalized(property.houseManual, property.houseManualEs, property.houseManualEn) ||
    pickLocalized(property.notes, property.notesEs, property.notesEn);
  const cancellationPolicyText = property.cancellationPolicy?.trim() || "";
  const houseRulesText = property.houseRules?.trim() || "";
  const localizedAmenities = getLocalizedPropertyAmenities(property, locale);

  const propertyTabs = (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto flex-wrap gap-1">
        <TabsTrigger value="overview">{t("property_tabs_overview", "Overview")}</TabsTrigger>
        <TabsTrigger value="amenities">{t("property_tabs_amenities", "Amenities")}</TabsTrigger>
        <TabsTrigger value="map">{t("property_tabs_map", "Map")}</TabsTrigger>
        <TabsTrigger value="reviews">{t("property_tabs_reviews", "Reviews")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-4">
        {summaryText && (
          <Section title={t("section_summary", "Summary")}>
            <p>{summaryText}</p>
          </Section>
        )}
        {(property.propertyType || property.roomType) && (
          <Section title={t("section_property_type", "Property type")}>
            <p>
              {[property.propertyType, property.roomType].filter(Boolean).join(" · ")}
            </p>
          </Section>
        )}
        {descriptionText && (
          <Section title={t("section_description", "Description")}>
            {renderParagraphs(descriptionText)}
          </Section>
        )}
        {interactionText && (
          <Section title={t("section_interaction", "Interaction")}>
            {renderParagraphs(interactionText)}
          </Section>
        )}
        {neighborhoodText && (
          <Section title={t("section_neighborhood", "Neighborhood")}>
            {renderParagraphs(neighborhoodText)}
          </Section>
        )}
        {accessText && (
          <Section title={t("section_access", "Access")}>
            {renderParagraphs(accessText)}
          </Section>
        )}
        {spaceText && (
          <Section title={t("section_space", "Space")}>
            {renderParagraphs(spaceText)}
          </Section>
        )}
        {transitText && (
          <Section title={t("section_transit", "Getting around")}>
            {renderParagraphs(transitText)}
          </Section>
        )}
        {houseManualOrNotes && (
          <Section title={t("section_house_manual", "House manual / notes")}>
            {renderParagraphs(houseManualOrNotes)}
          </Section>
        )}
        {(property.checkInTime || property.checkOutTime) && (
          <Section title={t("section_schedules", "Schedules")}>
            <p>
              {property.checkInTime
                ? `${t("check_in", "Check-in")}: ${property.checkInTime}`
                : ""}
              {property.checkInTime && property.checkOutTime ? " · " : ""}
              {property.checkOutTime
                ? `${t("check_out", "Check-out")}: ${property.checkOutTime}`
                : ""}
            </p>
          </Section>
        )}
        {cancellationPolicyText && (
          <Section title={t("section_cancellation", "Cancellation policy")}>
            <p>{cancellationPolicyText}</p>
          </Section>
        )}
        {houseRulesText && (
          <Section title={t("section_house_rules", "House rules")}>
            <p>{houseRulesText}</p>
          </Section>
        )}
      </TabsContent>

      <TabsContent value="amenities" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {localizedAmenities.map((amenity, index) => {
            const IconComponent = getAmenityIcon(amenity);
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

        {localizedAmenities.length === 0 && (
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
          <p className="text-gray-500">{t("map_unavailable", "Map not available for this property.")}</p>
        )}
      </TabsContent>

      <TabsContent value="reviews" className="mt-4 space-y-6">
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
          <p className="text-gray-500 text-sm">
            {t("reviews_empty", "Aún no hay reseñas aprobadas para esta propiedad.")}
          </p>
        )}
        <ReviewForm propertyId={property.id} />
      </TabsContent>
    </Tabs>
  );

  if (!useHostfullyWidgets) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("property_availability_heading", "Availability")}
              </h2>
            </div>
            <AvailabilityCalendar
              property={property}
              onDateSelect={setSelectedDates}
              selectedDates={selectedDates}
              guestCount={bookingGuests}
              currency={currency}
              usdMxnRate={props.usdMxnRate}
              usdEurRate={props.usdEurRate}
            />
          </div>
          {/* Mobile: formulario de reserva inmediatamente después del calendario */}
          <div id="booking-section" className="lg:hidden mt-6 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">Reserva en 2 pasos</p>
              <p>Elige fechas en el calendario y completa tus datos para pagar de forma segura (Stripe).</p>
              <div className="mt-4">
                <CurrencySelect value={currency} onValueChange={onCurrencyChange} />
              </div>
            </div>
            <ReservationForm
              property={property}
              selectedDates={selectedDates}
              bookingGuests={bookingGuests}
              onBookingGuestsChange={setBookingGuests}
              currency={currency}
              pricePerNightDisplay={pricePerNightDisplay}
              usdMxnRate={props.usdMxnRate}
              usdEurRate={props.usdEurRate}
            />
          </div>
          {propertyTabs}
        </div>

        <div className="hidden lg:block lg:col-span-1 lg:mt-12 lg:self-start lg:sticky lg:top-24 lg:z-20">
          <div className="max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto [scrollbar-gutter:stable] pr-1">
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
              bookingGuests={bookingGuests}
              onBookingGuestsChange={setBookingGuests}
              currency={currency}
              pricePerNightDisplay={pricePerNightDisplay}
              usdMxnRate={props.usdMxnRate}
              usdEurRate={props.usdEurRate}
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
          <p className="font-medium">{t("property_hostfully_missing_title", "Hostfully setup required")}</p>
          <p className="mt-1">
            {t("property_hostfully_missing_body", "Add the Lead widget UUID and options in admin, or set env vars.")}{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_UUID</code>
            {" · "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_OPTIONS_JSON</code>.
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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
          <p className="font-medium text-gray-900 mb-2">{t("widget_fallback_title", "Book on Hostfully (fallback)")}</p>
          <p>
            {t("widget_fallback_body", "Widgets are used as fallback. For custom flow set NEXT_PUBLIC_BOOKING_ENGINE=custom.")}{" "}
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

