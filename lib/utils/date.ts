import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

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
    dates.push(format(currentDate, 'yyyy-MM-dd'));
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