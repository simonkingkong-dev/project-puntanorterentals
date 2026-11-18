import { buildHostfullyHoldPayload } from '@/lib/hostfully/hold-payload';
import { deleteHostfullyLead } from '@/lib/hostfully/client';

describe('buildHostfullyHoldPayload', () => {
  const base = {
    propertyUid: 'prop-1',
    reservationId: 'res-123',
    checkIn: new Date(2026, 11, 20, 0, 0, 0),
    checkOut: new Date(2026, 11, 24, 0, 0, 0),
  };

  it('crea un BLOCK bloqueado con las fechas locales', () => {
    const p = buildHostfullyHoldPayload(base);
    expect(p.type).toBe('BLOCK');
    expect(p.status).toBe('BLOCKED');
    expect(p.propertyUid).toBe('prop-1');
    expect(p.checkInLocalDateTime).toBe('2026-12-20T00:00:00');
    expect(p.checkOutLocalDateTime).toBe('2026-12-24T00:00:00');
    expect(p.checkInDate).toBe('2026-12-20');
    expect(p.checkOutDate).toBe('2026-12-24');
  });

  it('la nota identifica la reserva y el vencimiento', () => {
    const expiresAt = new Date('2026-11-18T15:10:00.000Z');
    const p = buildHostfullyHoldPayload({ ...base, expiresAt });
    expect(String(p.notes)).toContain('res-123');
    expect(String(p.notes)).toContain('2026-11-18T15:10:00.000Z');
  });

  it('sin vencimiento no inventa una hora', () => {
    const p = buildHostfullyHoldPayload(base);
    expect(String(p.notes)).not.toMatch(/Vence/);
  });

  it('incluye el motivo cuando se restaura tras un fallo', () => {
    const p = buildHostfullyHoldPayload({ ...base, reason: 'PAGADA en Stripe' });
    expect(String(p.notes)).toContain('PAGADA en Stripe');
  });
});

describe('deleteHostfullyLead', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.HOSTFULLY_API_KEY = 'test-key';
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  const respond = (status: number, body = '') =>
    jest.fn().mockResolvedValue(
      new Response(status === 204 ? null : body, {
        status,
        headers: { 'content-type': 'text/plain' },
      })
    );

  it('borra con DELETE /leads/{uid}', async () => {
    const f = respond(204);
    global.fetch = f as unknown as typeof fetch;
    const r = await deleteHostfullyLead('abc');
    expect(r).toEqual({ deleted: true, alreadyGone: false });
    expect(f.mock.calls[0][0]).toContain('/leads/abc');
    expect(f.mock.calls[0][1].method).toBe('DELETE');
  });

  it('404 cuenta como ya borrado', async () => {
    global.fetch = respond(404, 'not found') as unknown as typeof fetch;
    expect(await deleteHostfullyLead('abc')).toEqual({ deleted: true, alreadyGone: true });
  });

  it('otros errores se propagan para que el cron reintente', async () => {
    global.fetch = respond(500, 'boom') as unknown as typeof fetch;
    await expect(deleteHostfullyLead('abc')).rejects.toThrow(/500/);
  });
});
