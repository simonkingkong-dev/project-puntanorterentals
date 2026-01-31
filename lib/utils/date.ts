import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

/** Noches entre check-out actual y nuevo (inclusive actual, exclusive nuevo). Ej: 15 → 18 devuelve [15, 16, 17]. */
export const getNightsBetween = (currentCheckOut: Date | string, newCheckOut: Date | string): string[] => {
  const start = typeof currentCheckOut === 'string' ? parseISO(currentCheckOut) : new Date(currentCheckOut);
  const end = typeof newCheckOut === 'string' ? parseISO(newCheckOut) : new Date(newCheckOut);
  return generateDateRange(start, addDays(end, -1));
};

export const formatDate = (date: Date | string, formatString = 'dd/MM/yyyy') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString, { locale: es });
};

export const calculateNights = (checkIn: Date | string, checkOut: Date | string) => {
  const checkInDate = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
  const checkOutDate = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
  return differenceInDays(checkOutDate, checkInDate);
};

export const generateDateRange = (startDate: Date, endDate: Date): string[] => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Formateamos la fecha actual y la añadimos al array.
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);

    // Incrementamos la fecha actual en un día para la siguiente iteración.
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const isDateAvailable = (
  date: string,
  availability: { [date: string]: boolean }
): boolean => {
  return availability[date] !== false;
};

/** Verifica que todas las noches del rango estén disponibles. Devuelve la primera bloqueada si hay. */
export const getFirstBlockedNight = (
  dateStrings: string[],
  availability: { [date: string]: boolean }
): string | null => {
  for (const d of dateStrings) {
    if (availability[d] === false) return d;
  }
  return null;
};