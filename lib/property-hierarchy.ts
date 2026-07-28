import "server-only";
import { adminDb } from "@/lib/firebase-admin";

/**
 * Relación padre/hijo entre propiedades: el padre es la casa completa y las hijas
 * son sus unidades. Reservar el padre bloquea a todas sus hijas y reservar cualquier
 * hija bloquea al padre, pero las hijas NO se bloquean entre sí.
 *
 * La jerarquía es de un solo nivel a propósito: resolver más profundidad invitaría
 * a ciclos y a bloqueos en cascada que el negocio no necesita.
 *
 * Hay DOS nociones de conflicto y no son intercambiables:
 *
 * 1. Reservas nuestras (holds y confirmadas en Firestore) — bidireccional. Cada
 *    documento nombra exactamente una propiedad, así que una reserva del padre
 *    significa inequívocamente "casa entera tomada" y sí debe bloquear a las hijas.
 *
 * 2. Calendario de disponibilidad (sincronizado desde Hostfully) — sólo hija → padre.
 *    Hostfully YA marca el calendario del padre como ocupado cuando se reserva
 *    cualquier hija, de modo que el mapa del padre es la suma de sus hijas. Propagarlo
 *    de vuelta hacia abajo haría que la reserva de una habitación bloquee a sus
 *    hermanas. El mapa propio de cada hija ya refleja las reservas de la casa entera,
 *    porque Hostfully también bloquea en esa dirección.
 */

const CACHE_TTL_MS = 60_000;

type CacheEntry = { ids: string[]; expiresAt: number };
const blockingIdsCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string[]>>();

/** Invalida la caché. Llamar tras editar `parentPropertyId` de una propiedad. */
export function clearPropertyHierarchyCache(): void {
  blockingIdsCache.clear();
}

async function resolveBlockingPropertyIds(propertyId: string): Promise<string[]> {
  const snap = await adminDb.collection("properties").doc(propertyId).get();
  if (!snap.exists) return [];

  const parentId = snap.data()?.parentPropertyId;
  if (typeof parentId === "string" && parentId.trim() && parentId.trim() !== propertyId) {
    return [parentId.trim()];
  }

  const children = await adminDb
    .collection("properties")
    .where("parentPropertyId", "==", propertyId)
    .get();

  return children.docs.map((d) => d.id).filter((id) => id !== propertyId);
}

/**
 * Ids de las propiedades cuyo inventario choca con esta.
 * Nunca incluye `propertyId`; los llamadores anteponen la propia si la necesitan.
 */
export async function getBlockingPropertyIds(propertyId: string): Promise<string[]> {
  const id = propertyId?.trim();
  if (!id) return [];

  const cached = blockingIdsCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;

  const pending = inFlight.get(id);
  if (pending) return pending;

  const promise = resolveBlockingPropertyIds(id)
    .then((ids) => {
      blockingIdsCache.set(id, { ids, expiresAt: Date.now() + CACHE_TTL_MS });
      return ids;
    })
    .catch((e) => {
      // Sin jerarquía conocida se sigue validando la propiedad en sí: nunca
      // se debe abrir la reserva por un fallo al resolver la relación.
      console.error("[property-hierarchy] No se pudo resolver la jerarquía:", id, e);
      return [];
    })
    .finally(() => {
      inFlight.delete(id);
    });

  inFlight.set(id, promise);
  return promise;
}

/** `[propertyId, ...bloqueadoras]`, sin duplicados. Para conflictos de RESERVAS. */
export async function getInventoryGroupIds(propertyId: string): Promise<string[]> {
  const blocking = await getBlockingPropertyIds(propertyId);
  return Array.from(new Set([propertyId, ...blocking]));
}

/**
 * Propiedades cuyo CALENDARIO puede bloquear a esta: sólo las hijas.
 *
 * Para una hija devuelve vacío a propósito. El calendario del padre ya agrega las
 * reservas de todas las hermanas, así que heredarlo bloquearía habitaciones libres.
 */
async function resolveCalendarBlockingIds(propertyId: string): Promise<string[]> {
  const snap = await adminDb.collection("properties").doc(propertyId).get();
  if (!snap.exists) return [];

  const parentId = snap.data()?.parentPropertyId;
  if (typeof parentId === "string" && parentId.trim() && parentId.trim() !== propertyId) {
    return [];
  }

  const children = await adminDb
    .collection("properties")
    .where("parentPropertyId", "==", propertyId)
    .get();
  return children.docs.map((d) => d.id).filter((id) => id !== propertyId);
}

export async function getCalendarGroupIds(propertyId: string): Promise<string[]> {
  const children = await resolveCalendarBlockingIds(propertyId);
  return Array.from(new Set([propertyId, ...children]));
}

/**
 * Id estable del grupo de inventario, para serializar reclamos concurrentes.
 * Padre e hijas comparten id; así dos reservas rivales compiten por el mismo documento.
 */
export async function getInventoryGroupId(propertyId: string): Promise<string> {
  const snap = await adminDb.collection("properties").doc(propertyId).get();
  const parentId = snap.data()?.parentPropertyId;
  if (typeof parentId === "string" && parentId.trim() && parentId.trim() !== propertyId) {
    return parentId.trim();
  }
  return propertyId;
}

type HierarchyNode = {
  id: string;
  parentPropertyId?: string | null;
  availability?: Record<string, boolean>;
};

/**
 * Ids bloqueadores calculados sobre una lista ya cargada, sin tocar Firestore.
 * Para recorridos masivos (búsqueda) donde ya se leyeron todas las propiedades.
 *
 * Semántica de RESERVAS (bidireccional). Para calendarios usa
 * `getCalendarBlockingIdsFromList`.
 */
export function getBlockingPropertyIdsFromList<T extends HierarchyNode>(
  propertyId: string,
  all: T[]
): string[] {
  const self = all.find((p) => p.id === propertyId);
  if (!self) return [];

  const parentId = self.parentPropertyId?.trim();
  if (parentId && parentId !== propertyId) return [parentId];

  return all
    .filter((p) => p.parentPropertyId?.trim() === propertyId && p.id !== propertyId)
    .map((p) => p.id);
}

/** Sólo hijas: el calendario del padre ya las agrega y no debe heredarse hacia abajo. */
export function getCalendarBlockingIdsFromList<T extends HierarchyNode>(
  propertyId: string,
  all: T[]
): string[] {
  const self = all.find((p) => p.id === propertyId);
  if (!self) return [];
  if (self.parentPropertyId?.trim() && self.parentPropertyId.trim() !== propertyId) {
    return [];
  }
  return all
    .filter((p) => p.parentPropertyId?.trim() === propertyId && p.id !== propertyId)
    .map((p) => p.id);
}

/** ¿Alguna noche del rango está bloqueada en la propiedad o en las que la agregan? */
export function isBlockedInGroup<T extends HierarchyNode>(
  propertyId: string,
  dateKeys: string[],
  all: T[]
): boolean {
  const ids = [propertyId, ...getCalendarBlockingIdsFromList(propertyId, all)];
  for (const id of ids) {
    const prop = all.find((p) => p.id === id);
    if (!prop) continue;
    if (dateKeys.some((d) => prop.availability?.[d] === false)) return true;
  }
  return false;
}

/**
 * Disponibilidad efectiva: la propia AND la de sus bloqueadoras.
 *
 * Se deriva en lectura y nunca se persiste: `hostfully-availability-sync` sobrescribe
 * el mapa `availability` completo cada ~20 min y borraría cualquier escritura local.
 */
export async function getEffectiveAvailability(
  propertyId: string
): Promise<Record<string, boolean>> {
  const ids = await getCalendarGroupIds(propertyId);
  const snaps = await Promise.all(
    ids.map((id) => adminDb.collection("properties").doc(id).get())
  );

  const effective: Record<string, boolean> = {};
  for (const snap of snaps) {
    const map = (snap.data()?.availability ?? {}) as Record<string, boolean>;
    for (const [date, available] of Object.entries(map)) {
      if (available === false) effective[date] = false;
      else if (effective[date] !== false) effective[date] = true;
    }
  }
  return effective;
}
