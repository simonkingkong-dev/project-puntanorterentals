/**
 * Entidades geográficas y canales de distribución verificados para SEO/GEO.
 * Todas las propiedades están en Colonia Centro / Punta Norte, Isla Mujeres, a pocas
 * cuadras entre sí, por lo que estos puntos de interés aplican a todo el portafolio.
 * No agregar lugares o plataformas sin confirmar que son reales (evita contenido engañoso).
 */

export const ISLA_MUJERES_POIS_ES = [
  'Playa Norte',
  'Playa Centro',
  'Playa Media Luna',
  'el Malecón',
  'la peatonal Hidalgo',
  'el muelle del Ferry Ultramar',
  'Avenida Rueda Medina',
  'la Iglesia Principal de Isla Mujeres',
  'el Super Akí',
  'el Palacio Municipal',
] as const;

export const ISLA_MUJERES_POIS_EN = [
  'Playa Norte',
  'Playa Centro',
  'Playa Media Luna beach',
  'the Malecón (boardwalk)',
  'Hidalgo pedestrian street',
  'the Ferry Ultramar dock',
  'Avenida Rueda Medina',
  'the main church (Iglesia Principal) of Isla Mujeres',
  'the Super Akí supermarket',
  'the Palacio Municipal (town hall)',
] as const;

/** Plataformas de reserva confirmadas donde también se listan las propiedades (además de la reserva directa en el sitio). */
export const DISTRIBUTION_CHANNELS = [
  'Airbnb',
  'Booking.com',
  'Expedia',
  'Despegar',
  'Hostelworld',
  'Vrbo',
  'Hopper',
] as const;

/** JSON-LD `nearbyAttraction`: mismo punto de interés para todas las propiedades (todas céntricas, a pocas cuadras). */
export function nearbyAttractionsJsonLd(locale: 'es' | 'en') {
  const names = locale === 'en' ? ISLA_MUJERES_POIS_EN : ISLA_MUJERES_POIS_ES;
  return names.map((name) => ({ '@type': 'TouristAttraction', name }));
}
