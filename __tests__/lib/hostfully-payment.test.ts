import {
  buildTransactionPayloads,
  extractLeadUid,
  getHostfullyOrderByLeadUid,
  registerHostfullyLeadPayment,
} from '@/lib/hostfully/client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('buildTransactionPayloads', () => {
  const base = { orderUid: 'o1', amountUsd: 36, externalPaymentId: 'pi_1', notes: 'n' };

  it('si el total del order coincide con lo cobrado, salda el balance completo primero', () => {
    const [first] = buildTransactionPayloads({ ...base, orderTotal: 36 });
    expect(first.fullPayment).toBe(true);
  });

  it('si no coincide, registra el importe real primero (el desfase queda visible)', () => {
    const [first] = buildTransactionPayloads({ ...base, orderTotal: 30 });
    expect(first.fullPayment).toBeUndefined();
    expect(first.amount).toBe(36);
  });

  it('sin total conocido usa fullPayment primero', () => {
    expect(buildTransactionPayloads(base)[0].fullPayment).toBe(true);
  });
});

describe('getHostfullyOrderByLeadUid / registerHostfullyLeadPayment', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.HOSTFULLY_API_KEY = 'test-key';
    process.env.HOSTFULLY_BASE_URL = 'https://sandbox.hostfully.com/api/v3.2';
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('busca el order por leadUid', async () => {
    const f = jest.fn().mockResolvedValue(json({ orders: [{ uid: 'order-9', totalAmount: 36 }] }));
    global.fetch = f as unknown as typeof fetch;
    const order = await getHostfullyOrderByLeadUid('lead-1');
    expect(order?.uid).toBe('order-9');
    expect(f.mock.calls[0][0]).toContain('/orders?leadUid=lead-1');
  });

  it('devuelve null si todavía no hay order', async () => {
    global.fetch = jest.fn().mockResolvedValue(json({ orders: [] })) as unknown as typeof fetch;
    expect(await getHostfullyOrderByLeadUid('lead-1')).toBeNull();
  });

  it('reintenta en v3.3 si v3.2 responde 404', async () => {
    const f = jest
      .fn()
      .mockResolvedValueOnce(new Response('nf', { status: 404 }))
      .mockResolvedValueOnce(json({ orders: [{ uid: 'order-9' }] }));
    global.fetch = f as unknown as typeof fetch;
    const order = await getHostfullyOrderByLeadUid('lead-1');
    expect(order?.uid).toBe('order-9');
    expect(f.mock.calls[1][0]).toContain('/api/v3.3/orders');
  });

  it('registra el pago encontrando el order por leadUid (antes nunca lo encontraba)', async () => {
    const f = jest.fn().mockImplementation(async (url: string) => {
      if (String(url).includes('/orders?')) return json({ orders: [{ uid: 'order-9', totalAmount: 36 }] });
      if (String(url).endsWith('/transactions')) return json({ transaction: { uid: 't1' } });
      return json({});
    });
    global.fetch = f as unknown as typeof fetch;
    const r = await registerHostfullyLeadPayment({
      leadUid: 'lead-1',
      amount: 36,
      externalPaymentId: 'pi_1',
    });
    expect(r.synced).toBe(true);
    expect(r.orderUid).toBe('order-9');
    const tx = f.mock.calls.find((c) => String(c[0]).endsWith('/transactions'))!;
    expect(JSON.parse(tx[1].body).orderUid).toBe('order-9');
  });
});

describe('extractLeadUid', () => {
  it('lee el UID envuelto en `lead` (respuesta real de POST /leads)', () => {
    expect(extractLeadUid({ lead: { uid: 'lead-123', status: 'BOOKED' } })).toBe('lead-123');
  });
  it('acepta formas planas por compatibilidad', () => {
    expect(extractLeadUid({ uid: 'a' })).toBe('a');
    expect(extractLeadUid({ leadUid: 'b' })).toBe('b');
  });
  it('devuelve undefined si no hay UID', () => {
    expect(extractLeadUid({ lead: {} })).toBeUndefined();
    expect(extractLeadUid(null)).toBeUndefined();
    expect(extractLeadUid('x')).toBeUndefined();
  });
});
