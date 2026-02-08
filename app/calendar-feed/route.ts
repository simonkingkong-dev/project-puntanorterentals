import { NextRequest, NextResponse } from 'next/server';
import { getPropertyByIdAdmin, getConfirmedReservationsByPropertyAdmin } from '@/lib/firebase-admin-queries';

/**
 * GET /calendar-feed?ical=PROPERTY_ID
 * Devuelve un feed iCal (.ics) con las reservas confirmadas de la propiedad.
 * Usado por Airbnb, VRBO, Google Calendar y otros para sincronizar disponibilidad.
 *
 * Si el ID no existe o no hay reservas, devuelve un iCal vacío (200) para evitar
 * reintentos constantes de los clientes externos.
 */
function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatICalDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function escapeICalText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export async function GET(request: NextRequest) {
  const icalParam = request.nextUrl.searchParams.get('ical')?.trim();

  if (!icalParam) {
    return new NextResponse('Missing ical parameter', { status: 400 });
  }

  try {
    const property = await getPropertyByIdAdmin(icalParam);
    const propertyTitle = property?.title ?? 'Propiedad';
    const reservations = property
      ? await getConfirmedReservationsByPropertyAdmin(icalParam)
      : [];

    const now = new Date();
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Punta Norte Rentals//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    for (const r of reservations) {
      const checkIn = r.checkIn instanceof Date ? r.checkIn : new Date(r.checkIn);
      const checkOut = r.checkOut instanceof Date ? r.checkOut : new Date(r.checkOut);
      lines.push(
        'BEGIN:VEVENT',
        `UID:${r.id}@puntanorterentals.com`,
        `DTSTAMP:${formatICalDate(now)}`,
        `DTSTART;VALUE=DATE:${formatICalDateOnly(checkIn)}`,
        `DTEND;VALUE=DATE:${formatICalDateOnly(checkOut)}`,
        `SUMMARY:${escapeICalText(`Reservado - ${propertyTitle}`)}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    }

    lines.push('END:VCALENDAR');
    const body = lines.join('\r\n');

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min cache
      },
    });
  } catch (error) {
    console.error('[calendar-feed] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
