import {
  getBlockingPropertyIdsFromList,
  getCalendarBlockingIdsFromList,
  isBlockedInGroup,
} from '@/lib/property-hierarchy';

/**
 * Casa Naranja es la casa completa; Celeste, Verde y Fondo son sus unidades.
 * Reservar la casa bloquea las 3; reservar cualquier unidad bloquea la casa;
 * las unidades NO se bloquean entre sí.
 */
const CASA = 'casa-naranja';
const CELESTE = '01-celeste';
const VERDE = '02-verde';
const FONDO = '03-fondo';
const OTRA = 'otra-casa';

type Node = {
  id: string;
  parentPropertyId?: string | null;
  availability?: Record<string, boolean>;
};

const family = (availability: Record<string, Record<string, boolean>> = {}): Node[] => [
  { id: CASA, parentPropertyId: null, availability: availability[CASA] ?? {} },
  { id: CELESTE, parentPropertyId: CASA, availability: availability[CELESTE] ?? {} },
  { id: VERDE, parentPropertyId: CASA, availability: availability[VERDE] ?? {} },
  { id: FONDO, parentPropertyId: CASA, availability: availability[FONDO] ?? {} },
  { id: OTRA, parentPropertyId: null, availability: availability[OTRA] ?? {} },
];

describe('getBlockingPropertyIdsFromList', () => {
  it('devuelve las unidades cuando se consulta la casa completa', () => {
    const ids = getBlockingPropertyIdsFromList(CASA, family());
    expect(ids.sort()).toEqual([CELESTE, VERDE, FONDO].sort());
  });

  it('devuelve solo la casa cuando se consulta una unidad', () => {
    expect(getBlockingPropertyIdsFromList(CELESTE, family())).toEqual([CASA]);
  });

  it('nunca incluye a las unidades hermanas', () => {
    const ids = getBlockingPropertyIdsFromList(CELESTE, family());
    expect(ids).not.toContain(VERDE);
    expect(ids).not.toContain(FONDO);
  });

  it('nunca se incluye a sí misma', () => {
    expect(getBlockingPropertyIdsFromList(CASA, family())).not.toContain(CASA);
    expect(getBlockingPropertyIdsFromList(CELESTE, family())).not.toContain(CELESTE);
  });

  it('una propiedad independiente no bloquea a nadie', () => {
    expect(getBlockingPropertyIdsFromList(OTRA, family())).toEqual([]);
  });

  it('ignora un auto-parentesco en vez de bloquearse a sí misma', () => {
    const nodes: Node[] = [{ id: CASA, parentPropertyId: CASA }];
    expect(getBlockingPropertyIdsFromList(CASA, nodes)).toEqual([]);
  });

  it('no recorre más de un nivel (sin cascadas ni ciclos)', () => {
    // Ciclo A→B→A: cada una resuelve a su padre inmediato y se detiene.
    const nodes: Node[] = [
      { id: 'a', parentPropertyId: 'b' },
      { id: 'b', parentPropertyId: 'a' },
    ];
    expect(getBlockingPropertyIdsFromList('a', nodes)).toEqual(['b']);
    expect(getBlockingPropertyIdsFromList('b', nodes)).toEqual(['a']);
  });

  it('devuelve vacío si la propiedad no está en la lista', () => {
    expect(getBlockingPropertyIdsFromList('inexistente', family())).toEqual([]);
  });
});

describe('getCalendarBlockingIdsFromList (calendario, sólo hacia arriba)', () => {
  it('la casa sí agrega los calendarios de sus habitaciones', () => {
    const ids = getCalendarBlockingIdsFromList(CASA, family());
    expect(ids.sort()).toEqual([CELESTE, VERDE, FONDO].sort());
  });

  it('una habitación NO hereda el calendario del padre', () => {
    // Hostfully ya marca la casa ocupada cuando se reserva cualquier habitación,
    // así que heredarlo hacia abajo bloquearía a las hermanas libres.
    expect(getCalendarBlockingIdsFromList(CELESTE, family())).toEqual([]);
    expect(getCalendarBlockingIdsFromList(VERDE, family())).toEqual([]);
    expect(getCalendarBlockingIdsFromList(FONDO, family())).toEqual([]);
  });

  it('difiere de la semántica de reservas, que sí es bidireccional', () => {
    expect(getBlockingPropertyIdsFromList(CELESTE, family())).toEqual([CASA]);
    expect(getCalendarBlockingIdsFromList(CELESTE, family())).toEqual([]);
  });
});

describe('isBlockedInGroup', () => {
  const NIGHTS = ['2026-08-01', '2026-08-02'];

  it('una unidad reservada bloquea la casa completa', () => {
    const nodes = family({ [CELESTE]: { '2026-08-01': false } });
    expect(isBlockedInGroup(CASA, NIGHTS, nodes)).toBe(true);
  });

  it('una unidad reservada NO bloquea a sus hermanas', () => {
    const nodes = family({ [CELESTE]: { '2026-08-01': false } });
    expect(isBlockedInGroup(VERDE, NIGHTS, nodes)).toBe(false);
    expect(isBlockedInGroup(FONDO, NIGHTS, nodes)).toBe(false);
  });

  it('el calendario de la casa NO se hereda hacia las habitaciones', () => {
    // Caso real observado: Hostfully marca la casa ocupada porque Celeste está
    // reservada. Si Verde heredara ese mapa, se perdería una habitación vendible.
    const nodes = family({
      [CASA]: { '2026-08-01': false },
      [CELESTE]: { '2026-08-01': false },
    });
    expect(isBlockedInGroup(VERDE, NIGHTS, nodes)).toBe(false);
    expect(isBlockedInGroup(FONDO, NIGHTS, nodes)).toBe(false);
    expect(isBlockedInGroup(CELESTE, NIGHTS, nodes)).toBe(true);
    expect(isBlockedInGroup(CASA, NIGHTS, nodes)).toBe(true);
  });

  it('no bloquea cuando la noche ocupada cae fuera del rango consultado', () => {
    const nodes = family({ [CELESTE]: { '2026-09-15': false } });
    expect(isBlockedInGroup(CASA, NIGHTS, nodes)).toBe(false);
  });

  it('una propiedad ajena al grupo no afecta', () => {
    const nodes = family({ [OTRA]: { '2026-08-01': false } });
    expect(isBlockedInGroup(CASA, NIGHTS, nodes)).toBe(false);
  });

  it('detecta el bloqueo en la propia propiedad', () => {
    const nodes = family({ [VERDE]: { '2026-08-02': false } });
    expect(isBlockedInGroup(VERDE, NIGHTS, nodes)).toBe(true);
  });
});
