"use client";

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Property } from '@/lib/types';
import { addDays, format, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

interface AvailabilityCalendarProps {
  property: Property;
  onDateSelect: (dates: { checkIn: Date; checkOut: Date }) => void;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
}

/**
 * Renders an availability calendar for selecting property stay dates.
 * @example
 * AvailabilityCalendar({ property: someProperty, onDateSelect: handleDateSelect, selectedDates: someSelectedDates })
 * // Returns a JSX element representing the availability calendar
 * @param {Object} {property} - The property object containing availability information.
 * @param {Function} {onDateSelect} - Callback function invoked when a date range is selected.
 * @param {Object} {selectedDates} - An object with `checkIn` and `checkOut` dates representing the currently selected date range.
 * @returns {JSX.Element} JSX component rendering the availability calendar.
 */
export default function AvailabilityCalendar({ 
  property, 
  onDateSelect,
  selectedDates 
}: AvailabilityCalendarProps) {
  const [selectingRange, setSelectingRange] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState<Date | undefined>();

  const isDateDisabled = (date: Date): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    const isUnavailable = property.availability[dateString] === false;
    const isPast = isBefore(date, new Date());
    
    return isPast || isUnavailable;
  };

  /**
   * Handles the selection of a date range for check-in and check-out.
   * @example
   * handleDateSelection(new Date('2023-01-01'))
   * // Starts selecting range or completes it with the given date.
   * @param {Date | undefined} date - The date selected by the user, used to determine check-in or check-out.
   * @returns {void} Modifies the state by updating temporary check-in, range selection status, and potentially calls the onDateSelect function.
   */
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (!selectingRange) {
      // Start selecting range
      setTempCheckIn(date);
      setSelectingRange(true);
    } else {
      // Complete range selection
      if (tempCheckIn && isAfter(date, tempCheckIn)) {
        onDateSelect({
          checkIn: tempCheckIn,
          checkOut: date
        });
      } else if (tempCheckIn && isBefore(date, tempCheckIn)) {
        onDateSelect({
          checkIn: date,
          checkOut: tempCheckIn
        });
      }
      setSelectingRange(false);
      setTempCheckIn(undefined);
    }
  };

  /**
   * Determines the CSS class for a given date based on availability and selection range.
   * @example
   * getDateClass(new Date('2023-10-22'));
   * // Returns a class string like 'bg-red-100 text-red-800 line-through', 'bg-orange-500 text-white', etc.
   * @param {Date} date - The date for which to determine the class.
   * @returns {string} CSS class string representing the availability or selection state for the given date.
   */
  const getDateStyle = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    if (property.availability[dateString] === false) {
      return 'bg-red-100 text-red-800 line-through';
    }
    
    if (selectedDates?.checkIn && selectedDates?.checkOut) {
      const isInRange = isAfter(date, selectedDates.checkIn) && isBefore(date, selectedDates.checkOut);
      const isSelected = date.getTime() === selectedDates.checkIn.getTime() || 
                        date.getTime() === selectedDates.checkOut.getTime();
      
      if (isSelected) return 'bg-orange-500 text-white';
      if (isInRange) return 'bg-orange-100 text-orange-800';
    }
    
    if (tempCheckIn && date.getTime() === tempCheckIn.getTime()) {
      return 'bg-orange-500 text-white';
    }
    
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disponibilidad</CardTitle>
        <p className="text-sm text-gray-600">
          {selectingRange 
            ? 'Selecciona la fecha de salida' 
            : 'Selecciona las fechas de tu estancia'}
        </p>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDates?.checkIn}
          onSelect={handleDateSelect}
          disabled={isDateDisabled}
          locale={es}
          className="w-full"
          classNames={{
            day_selected: "bg-orange-500 text-white hover:bg-orange-600",
            day_today: "bg-orange-100 text-orange-900",
            day_disabled: "text-gray-400 opacity-50",
          }}
        />
        
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Fechas seleccionadas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>No disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Disponible</span>
          </div>
        </div>
        
        {selectedDates?.checkIn && selectedDates?.checkOut && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg">
            <h4 className="font-semibold text-orange-900">Fechas seleccionadas:</h4>
            <p className="text-sm text-orange-800">
              <strong>Entrada:</strong> {format(selectedDates.checkIn, 'dd MMMM yyyy', { locale: es })}
            </p>
            <p className="text-sm text-orange-800">
              <strong>Salida:</strong> {format(selectedDates.checkOut, 'dd MMMM yyyy', { locale: es })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}