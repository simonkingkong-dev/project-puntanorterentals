import { NextRequest, NextResponse } from 'next/server';
import { getPropertyByIdAdmin, getConfirmedReservationsByPropertyAdmin } from '@/lib/firebase-admin-queries';
import { getBlockedDates } from '@/lib/hostfully/client';

/**
 * GET /calendar-feed?ical=PROPERTY_ID
 * Devuelve un feed iCal (.ics) con las fechas bloqueadas/ocupadas.
 * Si la propiedad tiene hostfullyPropertyId, usa Hostfully (PMS). Si no, usa Firestore.
 * Usado por Airbnb, VRBO, Google Calendar y otros para sincronizar disponibilidad.
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

/** Convierte días bloqueados consecutivos en rangos para iCal */
function blockedDaysToRanges(
  blocked: Array<{ date: string; available: boolean }>,
  propertyTitle: string
): Array<{ start: string; end: string }> {
  const sorted = blocked.filter((d) => !d.available).sort((a, b) => a.date.localeCompare(b.date));
  const ranges: Array<{ start: string; end: string }> = [];
  let i = 0;
  while (i < sorted.length) {
    const start = sorted[i].date;
    let end = start;
    while (i + 1 < sorted.length) {
      const next = new Date(sorted[i].date);
      next.setDate(next.getDate() + 1);
      if (next.toISOString().slice(0, 10) === sorted[i + 1].date) {
        i++;
        end = sorted[i].date;
      } else break;
    }
    ranges.push({ start, end });
    i++;
  }
  return ranges;
}

export async function GET(request: NextRequest) {
  const icalParam = request.nextUrl.searchParams.get('ical')?.trim();

  if (!icalParam) {
    return new NextResponse('Missing ical parameter', { status: 400 });
  }

  try {
    const property = await getPropertyByIdAdmin(icalParam);
    const propertyTitle = property?.title ?? 'Propiedad';

    const now = new Date();
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Punta Norte Rentals//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    // Prioridad 1: Hostfully (PMS)
    if (property?.hostfullyPropertyId) {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2);
      const blocked = await getBlockedDates(
        property.hostfullyPropertyId,
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10)
      );
      const ranges = blockedDaysToRanges(blocked, propertyTitle);
      for (let j = 0; j < ranges.length; j++) {
        const endDay = new Date(ranges[j].end);
        endDay.setDate(endDay.getDate() + 1);
        const endStr = endDay.toISOString().slice(0, 10);
        lines.push(
          'BEGIN:VEVENT',
          `UID:hostfully-${property.hostfullyPropertyId}-${ranges[j].start}-${j}@puntanorterentals.com`,
          `DTSTAMP:${formatICalDate(now)}`,
          `DTSTART;VALUE=DATE:${ranges[j].start.replace(/-/g, '')}`,
          `DTEND;VALUE=DATE:${endStr.replace(/-/g, '')}`,
          `SUMMARY:${escapeICalText(`Reservado - ${propertyTitle}`)}`,
          'STATUS:CONFIRMED',
          'TRANSP:OPAQUE',
          'END:VEVENT'
        );
      }
    } else {
      // Prioridad 2: Firestore
      const reservations = property
        ? await getConfirmedReservationsByPropertyAdmin(icalParam)
        : [];
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
    }

    lines.push('END:VCALENDAR');
    const body = lines.join('\r\n');

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('[calendar-feed] Error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
