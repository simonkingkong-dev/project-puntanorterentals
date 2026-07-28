/**
 * Elige un subconjunto de reseñas reales que "se vea realista": ni las mejores
 * (sesgo hacia 5 estrellas) ni las peores, sino una muestra cuyo promedio cae
 * dentro de un rango objetivo (por defecto 4.3-4.7), preservando en lo posible
 * la proporción real de calificaciones. Nunca inventa ni modifica contenido —
 * sólo selecciona cuáles de las reseñas existentes se muestran.
 *
 * Si no hay suficiente variedad de calificaciones para alcanzar el rango
 * (p. ej. una propiedad con reseñas perfectas), se queda con la mejor
 * aproximación posible en vez de forzarlo.
 */
export interface RealisticSampleOptions {
  targetCount?: number;
  minAvg?: number;
  maxAvg?: number;
}

export function pickRealisticReviews<T extends { rating: number }>(
  reviews: readonly T[],
  options: RealisticSampleOptions = {}
): T[] {
  const { targetCount = 30, minAvg = 4.3, maxAvg = 4.7 } = options;
  if (reviews.length <= targetCount) return reviews.slice();

  // 1) Agrupar por valor exacto de calificación. Se asume que cada bucket ya
  // viene ordenado por relevancia (el llamador ordena por fecha antes de esto).
  const buckets = new Map<number, T[]>();
  for (const r of reviews) {
    const arr = buckets.get(r.rating) ?? [];
    arr.push(r);
    buckets.set(r.rating, arr);
  }
  const ratingValues = Array.from(buckets.keys()).sort((a, b) => b - a);

  // 2) Asignación proporcional inicial: preserva la forma real de la distribución.
  const total = reviews.length;
  const quota = new Map<number, number>();
  let allocated = 0;
  for (const rv of ratingValues) {
    const available = buckets.get(rv)!.length;
    const take = Math.min(available, Math.round((available / total) * targetCount));
    quota.set(rv, take);
    allocated += take;
  }

  // Corrige el redondeo para llegar exactamente a targetCount.
  const adjustTotalBy = (delta: number) => {
    let remaining = delta;
    const order = remaining > 0 ? ratingValues : [...ratingValues].reverse();
    for (const rv of order) {
      if (remaining === 0) break;
      const have = quota.get(rv) ?? 0;
      const available = buckets.get(rv)!.length;
      if (remaining > 0) {
        const add = Math.min(available - have, remaining);
        quota.set(rv, have + add);
        remaining -= add;
      } else {
        const remove = Math.min(have, -remaining);
        quota.set(rv, have - remove);
        remaining += remove;
      }
    }
  };
  adjustTotalBy(targetCount - allocated);

  // 3) Ajuste iterativo: si el promedio queda fuera de rango, mueve una unidad
  // de cupo del extremo correspondiente hacia un bucket del lado opuesto con
  // espacio disponible, hasta caer en rango o agotar movimientos posibles.
  const currentSum = () => {
    let s = 0;
    for (const [rv, n] of Array.from(quota.entries())) s += rv * n;
    return s;
  };
  const currentCount = () => Array.from(quota.values()).reduce((a, b) => a + b, 0);

  function shiftOneUnit(loweringAvg: boolean): boolean {
    const giveOrder = loweringAvg ? ratingValues : [...ratingValues].reverse();
    for (const giveRv of giveOrder) {
      const have = quota.get(giveRv) ?? 0;
      if (have <= 0) continue;
      const receiveOrder = loweringAvg ? [...ratingValues].reverse() : ratingValues;
      for (const getRv of receiveOrder) {
        const wrongDirection = loweringAvg ? getRv >= giveRv : getRv <= giveRv;
        if (wrongDirection) continue;
        const already = quota.get(getRv) ?? 0;
        if (already < buckets.get(getRv)!.length) {
          quota.set(giveRv, have - 1);
          quota.set(getRv, already + 1);
          return true;
        }
      }
    }
    return false;
  }

  for (let guard = 0; guard < 200; guard++) {
    const n = currentCount();
    if (n === 0) break;
    const avg = currentSum() / n;
    if (avg > maxAvg) {
      if (!shiftOneUnit(true)) break;
    } else if (avg < minAvg) {
      if (!shiftOneUnit(false)) break;
    } else {
      break;
    }
  }

  // 4) Materializar: toma las primeras `n` de cada bucket (más recientes, si el
  // llamador pre-ordenó por fecha descendente).
  const selected: T[] = [];
  for (const rv of ratingValues) {
    const n = quota.get(rv) ?? 0;
    selected.push(...buckets.get(rv)!.slice(0, n));
  }
  return selected;
}

interface PlatformItem {
  id: string;
  platform: string;
  rating: number;
  reviewDate: Date;
}

/**
 * Garantiza que cada plataforma presente en `pool` aparezca al menos una vez en
 * `selected`, intercambiando una reseña de la plataforma más repetida (con la
 * calificación más parecida posible, para no mover el promedio) por la mejor
 * candidata disponible de la plataforma ausente. `pickRealisticReviews` elige
 * por calificación, no por plataforma, así que una plataforma minoritaria
 * (p. ej. Google, ~9% de las reseñas) puede quedar fuera por simple azar.
 */
export function ensurePlatformDiversity<T extends PlatformItem>(
  selected: readonly T[],
  pool: readonly T[]
): T[] {
  const result = [...selected];
  const selectedIds = new Set(result.map((r) => r.id));
  const allPlatforms = new Set(pool.map((r) => r.platform));
  const missing = Array.from(allPlatforms).filter(
    (p) => !result.some((r) => r.platform === p)
  );

  for (const platform of missing) {
    const candidates = pool
      .filter((r) => r.platform === platform && !selectedIds.has(r.id))
      .sort((a, b) => b.reviewDate.getTime() - a.reviewDate.getTime());
    const candidate = candidates.find((r) => r.rating >= 4) ?? candidates[0];
    if (!candidate) continue;

    const counts = new Map<string, number>();
    for (const r of result) counts.set(r.platform, (counts.get(r.platform) ?? 0) + 1);
    const dominant = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

    let removeIdx = result.findIndex((r) => r.platform === dominant && r.rating === candidate.rating);
    if (removeIdx === -1) removeIdx = result.findIndex((r) => r.platform === dominant);
    if (removeIdx === -1) continue;

    selectedIds.delete(result[removeIdx].id);
    result[removeIdx] = candidate;
    selectedIds.add(candidate.id);
  }

  return result;
}
