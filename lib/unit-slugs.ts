/**
 * Slugs públicos fijos para las 9 unidades: /properties/unidad-1 … unidad-9.
 *
 * Clave: `hostfullyPropertyId` (uid de Hostfully), porque es estable aunque se
 * renombre la propiedad. El sync de Hostfully usa este mapa en vez de generar
 * el slug desde el nombre.
 *
 * Si cambia un slug aquí, agregue también la redirección del slug viejo en
 * `next.config.js` (sección `redirects`).
 */
export const UNIT_SLUG_BY_HOSTFULLY_UID: Readonly<Record<string, string>> = {
  "bd250250-08a1-49d8-b2ee-d49588fbaf9d": "unidad-1", // 01 Casa Naranja
  "142f5d60-a64a-4f83-9402-f1793485f5b9": "unidad-2", // 01 Celeste
  "8dbf9762-f3b9-46a7-9fb7-1659e1102e7d": "unidad-3", // 02 Verde
  "e8c3a12e-90bd-485f-971a-7717ad1398e9": "unidad-4", // 03 Fondo
  "855cb6d6-3cc2-4658-8253-b4676e7f8d04": "unidad-5", // 04 Naranja
  "e048aff5-6a11-41e4-b6f2-a6f3772be98a": "unidad-6", // 05 Conchi Abajo
  "cf8f7a2a-76ca-4757-8400-d68c5e3259c2": "unidad-7", // 06 Conchi Arriba
  "005ecabe-5f23-4ca9-aa9e-78df72522a32": "unidad-8", // 07 Estudio
  "7eadb529-372b-48dc-9ec6-426770d20796": "unidad-9", // 08 Cheche
};

/** Slugs anteriores (generados desde el nombre) → slug nuevo. Para redirecciones 301. */
export const LEGACY_UNIT_SLUGS: Readonly<Record<string, string>> = {
  "01-casa-naranja": "unidad-1",
  "01-celeste": "unidad-2",
  "02-verde": "unidad-3",
  "03-fondo": "unidad-4",
  "04-naranja": "unidad-5",
  "05-conchi-abajo": "unidad-6",
  "06-conchi-arriba": "unidad-7",
  "07-estudio": "unidad-8",
  "11-cheche": "unidad-9",
};

export function unitSlugForHostfullyUid(uid: string | undefined): string | undefined {
  return uid ? UNIT_SLUG_BY_HOSTFULLY_UID[uid] : undefined;
}
