/**
 * Tests para GET y PATCH /api/admin/site-settings
 */

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/admin/site-settings/route';
import { adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

const mockCookies = cookies as jest.Mock;
const mockCollection = adminDb.collection as jest.Mock;

function authenticatedCookies() {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === 'admin_session' ? { value: 'authenticated' } : undefined,
  });
}

function unauthenticatedCookies() {
  mockCookies.mockResolvedValue({ get: () => undefined });
}

describe('GET /api/admin/site-settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('devuelve 401 si no está autenticado', async () => {
    unauthenticatedCookies();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('devuelve los settings cuando está autenticado', async () => {
    authenticatedCookies();
    mockCollection.mockImplementation(() => ({
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({ siteName: 'Punta Norte', contactEmail: 'hola@test.com' }),
        }),
      }),
    }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings.siteName).toBe('Punta Norte');
  });
});

describe('PATCH /api/admin/site-settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('devuelve 401 si no está autenticado', async () => {
    unauthenticatedCookies();
    const req = new NextRequest('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      body: JSON.stringify({ siteName: 'Test' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('guarda los settings y devuelve success', async () => {
    authenticatedCookies();
    const mockSet = jest.fn().mockResolvedValue(undefined);
    mockCollection.mockImplementation(() => ({
      doc: () => ({ set: mockSet }),
    }));

    const req = new NextRequest('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteName: 'Mi Sitio', contactEmail: 'nuevo@test.com' }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ siteName: 'Mi Sitio', contactEmail: 'nuevo@test.com' }),
      { merge: true },
    );
  });

  it('ignora campos no permitidos', async () => {
    authenticatedCookies();
    const mockSet = jest.fn().mockResolvedValue(undefined);
    mockCollection.mockImplementation(() => ({
      doc: () => ({ set: mockSet }),
    }));

    const req = new NextRequest('http://localhost/api/admin/site-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteName: 'OK', maliciousField: 'DROP TABLE' }),
    });
    await PATCH(req);
    const callArg = mockSet.mock.calls[0][0];
    expect(callArg.maliciousField).toBeUndefined();
    expect(callArg.siteName).toBe('OK');
  });
});
