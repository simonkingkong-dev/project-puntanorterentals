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
import {
  getLocalizedCancellationPolicy,
  getLocalizedPropertyAmenities,
} from "@/lib/property-localization";
import { getIncludedGuests } from "@/lib/pricing-guests";
import type { ListingSearchSelection } from "@/lib/listing-search-params";

const GoogleMap = dynamic(() => import("@/components/ui/google-map"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[300px] rounded-lg bg-gray-100" />,
});

import PropertyCuratedReviews from "@/components/ui/property-curated-reviews";
import PropertyBedsList from "@/components/ui/property-beds-list";
import { PropertyHighlightBulletList } from "@/components/ui/property-stay-highlights";
import { getPropertyStayHighlights } from "@/lib/property-stay-highlights";
import type { PropertyReview, PropertyReviewPlatformStat, Testimonial } from "@/lib/types";
import { normalizeBeds } from "@/lib/property-beds";
import { formatPropertyTypeDisplay } from "@/lib/property-type-options";

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
  curatedReviews: PropertyReview[];
  platformStats?: PropertyReviewPlatformStat[];
  globalReviewAggregate?: { averageRating: number; reviewCount: number } | null;
  propertyTestimonials?: Testimonial[];
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
  const {
    property,
    curatedReviews,
    platformStats = [],
    globalReviewAggregate = null,
    propertyTestimonials = [],
    initialSearch,
    currency,
    onCurrencyChange,
    pricePerNightDisplay,
  } = props;
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
  const [activeTab, setActiveTab] = useState("overview");
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
  const hasReviews =
    curatedReviews.length > 0 ||
    propertyTestimonials.length > 0 ||
    platformStats.length > 0;

  const pickLocalized = (base: string | undefined, es: string | undefined, en: string | undefined) => {
    const localized = locale === "en" ? en : es;
    if (typeof localized === "string" && localized.trim()) {
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

  const descriptionText = pickLocalized(property.description, property.descriptionEs, property.descriptionEn);
  const spaceText = pickLocalized(property.space, property.spaceEs, property.spaceEn);
  const notesText = pickLocalized(property.notes, property.notesEs, property.notesEn);
  const cancellationPolicyText = getLocalizedCancellationPolicy(
    property.cancellationPolicy,
    locale,
    t
  );
  const houseRulesText = property.houseRules?.trim() || "";
  const localizedAmenities = getLocalizedPropertyAmenities(property, locale);
  const configuredBeds = normalizeBeds(property.beds) ?? [];
  const propertyTypeLabel = formatPropertyTypeDisplay(
    property.propertyType,
    property.roomType,
    locale === "en" ? "en" : "es"
  );
  const stayHighlights = getPropertyStayHighlights(
    property,
    locale === "en" ? "en" : "es"
  );

  const propertyTabs = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto flex-wrap gap-1">
        <TabsTrigger value="overview">{t("property_tabs_overview", "Overview")}</TabsTrigger>
        <TabsTrigger value="amenities">{t("property_tabs_amenities", "Amenities")}</TabsTrigger>
        <TabsTrigger value="map">{t("property_tabs_map", "Map")}</TabsTrigger>
        <TabsTrigger value="reviews">{t("property_tabs_reviews", "Reviews")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-4">
        {descriptionText && (
          <Section title={t("section_description", "Description")}>
            {renderParagraphs(descriptionText)}
          </Section>
        )}
        {propertyTypeLabel && (
          <Section title={t("section_property_type", "Property type")}>
            <p>{propertyTypeLabel}</p>
          </Section>
        )}
        {spaceText && (
          <Section title={t("property_unique_details", "About this place")}>
            {renderParagraphs(spaceText)}
          </Section>
        )}
        {notesText && (
          <Section title={t("property_special_notes", "Important notes")}>
            {renderParagraphs(notesText)}
          </Section>
        )}
        <Section title={t("property_location_title", "Location")}>
          <PropertyHighlightBulletList items={stayHighlights.location} />
        </Section>
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
        {configuredBeds.length > 0 && (
          <Section title={t("section_beds", "Sleeping arrangements")}>
            <PropertyBedsList beds={configuredBeds} />
          </Section>
        )}
        {houseRulesText && (
          <Section title={t("section_house_rules", "House rules")}>
            <p>{houseRulesText}</p>
          </Section>
        )}
        <Section title={t("property_included_title", "Included in your stay")}>
          <PropertyHighlightBulletList items={stayHighlights.included} />
        </Section>
        <Section title={t("property_stay_info_title", "Good to know")}>
          <PropertyHighlightBulletList items={stayHighlights.stayInfo} />
        </Section>
        {cancellationPolicyText && (
          <Section title={t("section_cancellation", "Cancellation policy")}>
            <p>{cancellationPolicyText}</p>
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
          <p className="text-gray-500">{t("amenities_empty", "No amenities listed.")}</p>
        )}
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        {hasMap ? (
          activeTab === "map" ? (
            <div className="rounded-lg overflow-hidden border bg-gray-100 aspect-video">
              <GoogleMap
                eager
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
          ) : null
        ) : (
          <p className="text-gray-500">{t("map_unavailable", "Map not available for this property.")}</p>
        )}
      </TabsContent>

      <TabsContent value="reviews" className="mt-4 space-y-6">
        <PropertyCuratedReviews
          reviews={curatedReviews}
          platformStats={platformStats}
          globalAggregate={globalReviewAggregate}
          testimonials={propertyTestimonials}
        />
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
          <div
            id="booking-section"
            className="lg:hidden mt-6 space-y-4 pb-[max(7rem,env(safe-area-inset-bottom))] scroll-mt-20"
          >
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">
                {t("property_book_steps_title", "Book in 2 steps")}
              </p>
              <p>
                {t(
                  "property_book_steps_body",
                  "Choose dates on the calendar and enter your details to pay securely (Stripe)."
                )}
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
          {propertyTabs}
        </div>

        <div className="hidden lg:block lg:col-span-1 lg:mt-12 lg:self-start lg:sticky lg:top-24 lg:z-20">
          <div className="max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto [scrollbar-gutter:stable] pr-1">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-2">
                {t("property_book_direct_title", "Direct booking")}
              </p>
              <p>
                {t(
                  "property_book_direct_body",
                  "Select dates on the calendar and enter your details to continue to secure payment (Stripe)."
                )}
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("property_book_heading", "Book")}
          </h2>
          {showCalendarWidget && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {t("property_calendar_widget_heading", "Calendar")}
              </h3>
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

