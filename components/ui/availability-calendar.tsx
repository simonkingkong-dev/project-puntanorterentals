"use client";

import { useState, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Property } from '@/lib/types';
import { Day } from 'react-day-picker';
import { format, isBefore, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface AvailabilityCalendarProps {
  property: Property;
  onDateSelect: (dates: { checkIn: Date; checkOut: Date }) => void;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
}

/** Compara fechas a nivel de día (ignora hora) */
function isSameDayOrBetween(date: Date, from: Date, to: Date): boolean {
  const d = startOfDay(date);
  const a = startOfDay(from);
  const b = startOfDay(to);
  const [start, end] = a <= b ? [a, b] : [b, a];
  return d >= start && d <= end;
}

export default function AvailabilityCalendar({
  property,
  onDateSelect,
  selectedDates,
}: AvailabilityCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();
  const [rangeFrom, setRangeFrom] = useState<Date | undefined>();

  const isDateDisabled = useCallback(
    (date: Date): boolean => {
      const dateString = format(date, 'yyyy-MM-dd');
      const isUnavailable = property.availability[dateString] === false;
      const isPast = isBefore(date, startOfDay(new Date()));
      return isPast || isUnavailable;
    },
    [property.availability]
  );

  const handleSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (!range?.from) {
        setRangeFrom(undefined);
        setHoveredDate(undefined);
        return;
      }
      if (range.to) {
        const fromDay = startOfDay(range.from);
        const toDay = startOfDay(range.to);
        if (fromDay.getTime() === toDay.getTime()) {
          toast.info('La fecha de salida debe ser posterior a la de entrada.');
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
      }
    },
    [onDateSelect]
  );

  const selectedRange = (() => {
    if (selectedDates?.checkIn && selectedDates?.checkOut) {
      return { from: selectedDates.checkIn, to: selectedDates.checkOut };
    }
    if (rangeFrom) {
      return { from: rangeFrom, to: undefined };
    }
    return undefined;
  })();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidad</CardTitle>
        <p className="text-sm text-gray-600">
          {isSelectingRange
            ? 'Selecciona la fecha de salida (o haz clic en otra fecha para cambiar la entrada)'
            : 'Selecciona las fechas de tu estancia'}
        </p>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          locale={es}
          numberOfMonths={3}
          className="w-full"
          classNames={{
            day_selected: 'bg-orange-500 text-white hover:bg-orange-600',
            day_range_start: 'bg-orange-500 text-white rounded-l-md',
            day_range_end: 'bg-orange-500 text-white rounded-r-md',
            day_range_middle: 'bg-orange-100 text-orange-800 rounded-none',
            day_today: 'bg-orange-100 text-orange-900 font-semibold',
            day_disabled: 'text-gray-400 opacity-50',
            day_outside: 'text-muted-foreground opacity-50',
          }}
          modifiers={{
            range_preview:
              rangeFrom && hoveredDate
                ? (date) => isSameDayOrBetween(date, rangeFrom, hoveredDate)
                : undefined,
          }}
          modifiersClassNames={{
            range_preview: 'bg-orange-100/80 text-orange-800',
          }}
          components={{
            Day: DayWithHover,
          }}
        />

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span>Fechas seleccionadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded" />
            <span>Vista previa al pasar el cursor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
            <span>No disponible</span>
          </div>
        </div>

        {selectedDates?.checkIn && selectedDates?.checkOut && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg">
            <h4 className="font-semibold text-orange-900">Fechas seleccionadas:</h4>
            <p className="text-sm text-orange-800">
              <strong>Entrada:</strong>{' '}
              {format(selectedDates.checkIn, 'dd MMMM yyyy', { locale: es })}
            </p>
            <p className="text-sm text-orange-800">
              <strong>Salida:</strong>{' '}
              {format(selectedDates.checkOut, 'dd MMMM yyyy', { locale: es })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
