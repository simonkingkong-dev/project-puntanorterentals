"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { roundForDisplay } from '@/lib/round-display-money';
import { getUsdDisplayMultiplier } from '@/lib/display-exchange-rate';
import { Property } from '@/lib/types';
import { Day, type DayProps } from 'react-day-picker';
import { format, isBefore, startOfDay, startOfMonth, addMonths, subMonths, addDays } from 'date-fns';
import { es as esLocale, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateDateRange, getFirstBlockedNight } from '@/lib/utils/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Currency } from '@/components/ui/currency-select';
import { useLocale } from '@/components/providers/locale-provider';

interface AvailabilityCalendarProps {
  property: Property;
  onDateSelect: (dates: { checkIn: Date; checkOut?: Date }) => void;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
  currency?: Currency;
  usdMxnRate?: number | null;
  usdEurRate?: number | null;
}

/** Mismo día (solo fecha) */
function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Dentro del rango [from, to] inclusive */
function isSameDayOrBetween(date: Date, from: Date, to: Date): boolean {
  const d = startOfDay(date);
  const a = startOfDay(from);
  const b = startOfDay(to);
  const [start, end] = a <= b ? [a, b] : [b, a];
  return d >= start && d <= end;
}

/** En el rango de preview pero no es el día de check-in (para sombreado 200 más claro) */
function isInPreviewRangeNotStart(date: Date, from: Date, to: Date): boolean {
  if (isSameDay(date, from)) return false;
  return isSameDayOrBetween(date, from, to);
}

const MONTHS_WINDOW = 12;
const MONTHS_VISIBLE = 3;

export default function AvailabilityCalendar({
  property,
  onDateSelect,
  selectedDates,
  currency = 'USD',
  usdMxnRate = null,
  usdEurRate = null,
}: AvailabilityCalendarProps) {
  const { locale, t } = useLocale();
  const dateFnsLocale = locale === 'en' ? enUS : esLocale;
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
  const [rangeFrom, setRangeFrom] = useState<Date | undefined>();
  /** Cuando ya hay rango confirmado, el próximo clic es "nuevo check-in" (reiniciar). Guardamos el día clicado. */
  const lastClickedDayRef = useRef<Date | null>(null);

  const today = useMemo(() => startOfMonth(new Date()), []);
  const fromMonth = today;
  const toMonth = addMonths(today, MONTHS_WINDOW - 1);
  const [currentMonth, setCurrentMonth] = useState(() => today);
  const [realtimeAvailability, setRealtimeAvailability] = useState<
    Record<string, boolean> | null
  >(null);
  const [realtimeDailyRates, setRealtimeDailyRates] = useState<Record<string, number> | null>(
    null
  );
  const [loadingRealtime, setLoadingRealtime] = useState(false);

  const canGoPrev = currentMonth > fromMonth;
  const canGoNext = currentMonth < subMonths(toMonth, MONTHS_VISIBLE - 1);

  const goPrevMonth = useCallback(() => {
    if (canGoPrev) setCurrentMonth((m) => subMonths(m, 1));
  }, [canGoPrev]);
  const goNextMonth = useCallback(() => {
    if (canGoNext) setCurrentMonth((m) => addMonths(m, 1));
  }, [canGoNext]);

  useEffect(() => {
    if (!property.hostfullyPropertyId) {
      setRealtimeAvailability(null);
      setRealtimeDailyRates(null);
      return;
    }

    const start = new Date();
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + MONTHS_WINDOW);
    end.setDate(0);
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

    let cancelled = false;
    setLoadingRealtime(true);
    fetch(
      `/api/properties/calendar?propertyId=${encodeURIComponent(property.id)}&startDate=${toDateStr(
        start
      )}&endDate=${toDateStr(end)}`
    )
      .then(async (r) => {
        const data = (await r.json()) as {
          availability?: Record<string, boolean>;
          dailyRates?: Record<string, number>;
          error?: string;
          warning?: string;
          source?: string;
        };
        if (!r.ok) {
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.warning) {
          toast.warning(
            t(
              'calendar_warning_fallback',
              'Showing saved on-site availability (Hostfully did not respond).'
            )
          );
        }
        if (data?.availability && typeof data.availability === "object") {
          setRealtimeAvailability(data.availability as Record<string, boolean>);
        } else {
          setRealtimeAvailability({});
        }
        if (data?.dailyRates && typeof data.dailyRates === "object") {
          setRealtimeDailyRates(data.dailyRates as Record<string, number>);
        } else {
          setRealtimeDailyRates({});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRealtimeAvailability({});
          setRealtimeDailyRates({});
          toast.error(
            t(
              'calendar_error_realtime',
              'Could not load live availability from Hostfully.'
            )
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRealtime(false);
      });

    return () => {
      cancelled = true;
    };
  }, [property.id, property.hostfullyPropertyId, t]);

  const availabilityMap = useMemo(
    () => (property.hostfullyPropertyId ? realtimeAvailability ?? {} : property.availability),
    [property.hostfullyPropertyId, property.availability, realtimeAvailability]
  );

  const isNightAvailable = useCallback(
    (date: Date): boolean => {
      const dateString = format(date, 'yyyy-MM-dd');
      if (property.hostfullyPropertyId) {
        const v = availabilityMap[dateString];
        return v === true;
      }
      return availabilityMap[dateString] !== false;
    },
    [property.hostfullyPropertyId, availabilityMap]
  );

  const canUseAsCheckout = useCallback(
    (checkoutDate: Date): boolean => {
      if (!rangeFrom) return false;
      const start = startOfDay(rangeFrom);
      const end = startOfDay(checkoutDate);
      if (end.getTime() <= start.getTime()) return false;

      // Todas las noches intermedias (check-in inclusive, check-out exclusive) deben estar libres.
      const cursor = new Date(start);
      while (cursor < end) {
        if (!isNightAvailable(cursor)) return false;
        cursor.setDate(cursor.getDate() + 1);
      }
      return true;
    },
    [rangeFrom, isNightAvailable]
  );

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const dateString = format(date, 'yyyy-MM-dd');
      const isPast = isBefore(date, startOfDay(new Date()));
      if (isPast) return true;
      const isCheckoutCandidate =
        rangeFrom != null && startOfDay(date).getTime() > startOfDay(rangeFrom).getTime();

      if (property.hostfullyPropertyId) {
        if (loadingRealtime && realtimeAvailability == null) return true;
        if (isCheckoutCandidate) return !canUseAsCheckout(date);
        // Conservador: si Hostfully no devuelve la fecha, la tratamos como no seleccionable.
        const v = availabilityMap[dateString];
        return v !== true;
      }

      if (isCheckoutCandidate) return !canUseAsCheckout(date);
      return availabilityMap[dateString] === false;
    },
    [
      property.hostfullyPropertyId,
      loadingRealtime,
      realtimeAvailability,
      availabilityMap,
      rangeFrom,
      canUseAsCheckout,
    ]
  );

  const handleDayClick = useCallback(
    (day: Date) => {
      if (selectedDates?.checkIn && selectedDates?.checkOut) {
        lastClickedDayRef.current = day;
      }
    },
    [selectedDates?.checkIn, selectedDates?.checkOut]
  );

  const handleSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (!range?.from) {
        setRangeFrom(undefined);
        setHoveredDate(undefined);
        lastClickedDayRef.current = null;
        return;
      }
      if (range.to) {
        const hadFullRange = Boolean(selectedDates?.checkIn && selectedDates?.checkOut);
        const clickedDay = lastClickedDayRef.current;
        lastClickedDayRef.current = null;

        if (hadFullRange && clickedDay) {
          onDateSelect({ checkIn: clickedDay });
          setRangeFrom(clickedDay);
          setHoveredDate(undefined);
          return;
        }

        const fromDay = startOfDay(range.from);
        const toDay = startOfDay(range.to);
        if (fromDay.getTime() === toDay.getTime()) {
          toast.info('La fecha de salida debe ser posterior a la de entrada.');
          return;
        }
        // Validamos solo noches: check-out es exclusivo y puede caer en fecha no disponible.
        const dateStrings = generateDateRange(range.from, addDays(range.to, -1));
        const firstBlocked = getFirstBlockedNight(dateStrings, availabilityMap ?? {});
        if (firstBlocked) {
          toast.error(
            t(
              'toast_range_has_blocked_night',
              'You can only select ranges where every night is available. This range includes an unavailable night.'
            )
          );
          setRangeFrom(undefined);
          setHoveredDate(undefined);
          return;
        }
        onDateSelect({
          checkIn: range.from,
          checkOut: range.to,
        });
        setRangeFrom(undefined);
        setHoveredDate(undefined);
      } else {
        setRangeFrom(range.from);
        onDateSelect({ checkIn: range.from });
      }
    },
    [onDateSelect, selectedDates?.checkIn, selectedDates?.checkOut, availabilityMap, t]
  );

  /** Rango mostrado: si hay rangeFrom (selección en curso), priorizar; si no, rango confirmado */
  const selectedRange = useMemo(() => {
    if (rangeFrom != null) {
      return { from: rangeFrom, to: undefined as Date | undefined };
    }
    if (selectedDates?.checkIn && selectedDates?.checkOut) {
      return { from: selectedDates.checkIn, to: selectedDates.checkOut };
    }
    return undefined;
  }, [rangeFrom, selectedDates?.checkIn, selectedDates?.checkOut]);

  /** Check-in solo seleccionado: ese día debe verse sólido (color intenso) */
  const onlyCheckIn = Boolean(rangeFrom && !selectedRange?.to);
  const onlyCheckInModifier = useCallback(
    (date: Date) => onlyCheckIn && rangeFrom != null && isSameDay(date, rangeFrom),
    [onlyCheckIn, rangeFrom]
  );

  /** Preview: desde el día después del check-in hasta el hover (200 más claro). No incluye el día de check-in. */
  const rangePreviewModifier = useCallback(
    (date: Date) =>
      Boolean(
        rangeFrom &&
          hoveredDate &&
          isInPreviewRangeNotStart(date, rangeFrom, hoveredDate)
      ),
    [rangeFrom, hoveredDate]
  );

  const DayWithHover = useCallback(
    (props: DayProps) => {
      return (
        <div
          className="contents"
          onMouseEnter={() => setHoveredDate(props.date)}
          onMouseLeave={() => setHoveredDate(undefined)}
        >
          <Day {...props} />
        </div>
      );
    },
    []
  );

  const isSelectingRange = Boolean(rangeFrom && !selectedRange?.to);

  const displayCheckIn = rangeFrom ?? selectedDates?.checkIn;
  const displayCheckOut = selectedDates?.checkOut ?? (rangeFrom && hoveredDate ? hoveredDate : undefined);
  const checkOutIsPreview = Boolean(rangeFrom && hoveredDate && !selectedDates?.checkOut);
  const nightsCount =
    displayCheckIn && displayCheckOut
      ? Math.max(
          0,
          Math.round(
            (startOfDay(displayCheckOut).getTime() -
              startOfDay(displayCheckIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const displayRate = currency === 'MXN' && usdMxnRate != null ? usdMxnRate : 1;
  const nightsSubtotal = useMemo(() => {
    if (!displayCheckIn || !displayCheckOut || nightsCount <= 0) return 0;
    const rates = property.hostfullyPropertyId ? realtimeDailyRates ?? {} : property.dailyRates ?? {};
    const cursor = new Date(
      displayCheckIn.getFullYear(),
      displayCheckIn.getMonth(),
      displayCheckIn.getDate()
    );
    const end = new Date(
      displayCheckOut.getFullYear(),
      displayCheckOut.getMonth(),
      displayCheckOut.getDate()
    );
    let total = 0;
    while (cursor < end) {
      const key = format(cursor, 'yyyy-MM-dd');
      const dynamic = rates[key];
      const usdAmount =
        typeof dynamic === 'number' && Number.isFinite(dynamic) && dynamic > 0
          ? dynamic
          : property.pricePerNight;
      total += usdAmount;
      cursor.setDate(cursor.getDate() + 1);
    }
    return roundForDisplay(total * displayRate, currency);
  }, [
    displayCheckIn,
    displayCheckOut,
    nightsCount,
    property.hostfullyPropertyId,
    realtimeDailyRates,
    property.dailyRates,
    property.pricePerNight,
    displayRate,
    currency,
    usdEurRate,
  ]);
  const formatPrice = (amount: number) => {
    if (currency === 'MXN') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    if (currency === 'EUR') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{t('availability_title', 'Availability')}</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {isSelectingRange
              ? t('calendar_hint_select_checkout', 'Pick check-out (or click another date to change check-in)')
              : t('calendar_hint_select_stay', 'Select your stay dates')}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 rounded-md border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            aria-label={t('calendar_prev_month', 'Previous month')}
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            disabled={!canGoNext}
            aria-label={t('calendar_next_month', 'Next month')}
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2 pr-2">
          <div className="min-w-max">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          onDayClick={handleDayClick}
          disabled={isDateDisabled}
          locale={dateFnsLocale}
          numberOfMonths={MONTHS_VISIBLE}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          fromMonth={fromMonth}
          toMonth={toMonth}
          disableNavigation
          showOutsideDays={false}
          className="w-full"
          classNames={{
            day_selected: 'bg-orange-500 text-white hover:bg-orange-600',
            day_range_start: 'bg-orange-500 text-white rounded-l-md',
            day_range_end: 'bg-orange-500 text-white rounded-r-md',
            day_range_middle: '!bg-orange-300 !text-orange-900 rounded-none',
            day_today: 'bg-orange-100 text-orange-900 font-semibold',
            day_disabled: 'text-gray-400 opacity-50',
            day_outside: 'text-muted-foreground opacity-50',
          }}
          modifiers={{
            only_checkin: onlyCheckInModifier,
            range_preview: rangePreviewModifier,
          }}
          modifiersClassNames={{
            only_checkin: '!bg-orange-500 !text-white rounded-md',
            range_preview: 'bg-orange-300 text-orange-900 rounded-none',
          }}
          components={{
            Day: DayWithHover,
          }}
        />
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 text-sm text-gray-700">
          <div className="space-y-1">
            <p>
              <span className="font-medium">{t('calendar_check_in_label', 'Check-in date:')}</span>{' '}
              {displayCheckIn
                ? format(displayCheckIn, 'dd MMMM yyyy', { locale: dateFnsLocale })
                : '—'}
            </p>
            <p>
              <span className="font-medium">{t('calendar_check_out_label', 'Check-out date:')}</span>{' '}
              {displayCheckOut
                ? format(displayCheckOut, 'dd MMMM yyyy', { locale: dateFnsLocale }) +
                    (checkOutIsPreview ? ` (${t('calendar_preview', 'preview')})` : '')
                : '—'}
            </p>
          </div>
          <div className="min-w-[260px] border-l border-gray-200 pl-4">
            <p className="font-semibold text-gray-900">{t('calendar_price_summary', 'Price summary')}</p>
            {nightsCount > 0 ? (
              <div className="mt-2 flex items-center justify-between gap-4 text-gray-900">
                <span>
                  {nightsCount}{' '}
                  {nightsCount === 1
                    ? t('night_singular', 'night')
                    : t('night_plural', 'nights')}
                </span>
                <span>{formatPrice(nightsSubtotal)}</span>
              </div>
            ) : <p className="mt-2 text-gray-500">—</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
