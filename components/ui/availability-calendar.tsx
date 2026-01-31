"use client";

import { useState, useCallback, useMemo, useRef } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Property } from '@/lib/types';
import { Day } from 'react-day-picker';
import { format, isBefore, startOfDay, startOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateDateRange, getFirstBlockedNight } from '@/lib/utils/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AvailabilityCalendarProps {
  property: Property;
  onDateSelect: (dates: { checkIn: Date; checkOut?: Date }) => void;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
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
}: AvailabilityCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
  const [rangeFrom, setRangeFrom] = useState<Date | undefined>();
  /** Cuando ya hay rango confirmado, el próximo clic es "nuevo check-in" (reiniciar). Guardamos el día clicado. */
  const lastClickedDayRef = useRef<Date | null>(null);

  const today = useMemo(() => startOfMonth(new Date()), []);
  const fromMonth = today;
  const toMonth = addMonths(today, MONTHS_WINDOW - 1);
  const [currentMonth, setCurrentMonth] = useState(() => today);

  const canGoPrev = currentMonth > fromMonth;
  const canGoNext = currentMonth < subMonths(toMonth, MONTHS_VISIBLE - 1);

  const goPrevMonth = useCallback(() => {
    if (canGoPrev) setCurrentMonth((m) => subMonths(m, 1));
  }, [canGoPrev]);
  const goNextMonth = useCallback(() => {
    if (canGoNext) setCurrentMonth((m) => addMonths(m, 1));
  }, [canGoNext]);

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const dateString = format(date, 'yyyy-MM-dd');
      const isUnavailable = property.availability[dateString] === false;
      const isPast = isBefore(date, startOfDay(new Date()));
      return isPast || isUnavailable;
    },
    [property.availability]
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
        const dateStrings = generateDateRange(range.from, range.to);
        const firstBlocked = getFirstBlockedNight(dateStrings, property.availability ?? {});
        if (firstBlocked) {
          toast.error('Solo se pueden seleccionar fechas con todas las noches libres. Hay una noche no disponible en ese rango.');
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
    [onDateSelect, selectedDates?.checkIn, selectedDates?.checkOut]
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
    (props: { date: Date; displayMonth: Date }) => (
      <div
        className="contents"
        onMouseEnter={() => setHoveredDate(props.date)}
        onMouseLeave={() => setHoveredDate(undefined)}
      >
        <Day {...props} />
      </div>
    ),
    []
  );

  const isSelectingRange = Boolean(rangeFrom && !selectedRange?.to);

  const displayCheckIn = rangeFrom ?? selectedDates?.checkIn;
  const displayCheckOut = selectedDates?.checkOut ?? (rangeFrom && hoveredDate ? hoveredDate : undefined);
  const checkOutIsPreview = Boolean(rangeFrom && hoveredDate && !selectedDates?.checkOut);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Disponibilidad</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            {isSelectingRange
              ? 'Selecciona la fecha de salida (o haz clic en otra fecha para cambiar la entrada)'
              : 'Selecciona las fechas de tu estancia'}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 rounded-md border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            aria-label="Mes anterior"
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            disabled={!canGoNext}
            aria-label="Mes siguiente"
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          onDayClick={handleDayClick}
          disabled={isDateDisabled}
          locale={es}
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

        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <p>
            <span className="font-medium">Fecha del check in:</span>{' '}
            {displayCheckIn
              ? format(displayCheckIn, 'dd MMMM yyyy', { locale: es })
              : '—'}
          </p>
          <p>
            <span className="font-medium">Fecha del check out:</span>{' '}
            {displayCheckOut
              ? format(displayCheckOut, 'dd MMMM yyyy', { locale: es }) + (checkOutIsPreview ? ' (preview)' : '')
              : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
