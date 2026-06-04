/**
 * Map ID para Advanced Markers (obligatorio en producción).
 * En desarrollo, Google permite `DEMO_MAP_ID` si no hay variable de entorno.
 * @see https://developers.google.com/maps/documentation/javascript/advanced-markers/start
 */
export function getGoogleMapsMapId(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "DEMO_MAP_ID";
  return undefined;
}
