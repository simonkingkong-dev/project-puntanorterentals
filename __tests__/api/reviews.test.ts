/**
 * Tests para POST /api/reviews
 * Se mockea firebase-admin para no requerir credenciales reales.
 */

// Mock firebase-admin antes de importar el handler
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    add: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  },
}));

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/reviews/route';
import { adminDb } from '@/lib/firebase-admin';

const mockCollection = adminDb.collection as jest.Mock;

function makeRequest(body: object, method = 'POST') {
  return new NextRequest('http://localhost/api/reviews', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/reviews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('devuelve 400 si faltan campos requeridos', async () => {
    const req = makeRequest({ propertyId: 'p1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Faltan campos/i);
  });

  it('devuelve 400 si el rating está fuera de rango', async () => {
    const req = makeRequest({
      propertyId: 'p1',
      author: 'Test',
      rating: 6,
      text: 'Excelente propiedad en la costa',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/rating/i);
  });

  it('devuelve 400 si el texto es muy corto', async () => {
    const req = makeRequest({
      propertyId: 'p1',
      author: 'Test',
      rating: 5,
      text: 'Bien',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/10 caracteres/i);
  });

  it('devuelve 404 si la propiedad no existe', async () => {
    mockCollection.mockImplementation(() => ({
      doc: () => ({ get: async () => ({ exists: false }) }),
      add: jest.fn(),
    }));

    const req = makeRequest({
      propertyId: 'nonexistent',
      author: 'Visitor',
      rating: 4,
      text: 'Buena ubicación y muy limpia',
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('crea la reseña y devuelve 201 cuando todo es válido', async () => {
    mockCollection.mockImplementation(() => ({
      doc: () => ({ get: async () => ({ exists: true }) }),
      add: async () => ({ id: 'review-123' }),
    }));

    const req = makeRequest({
      propertyId: 'p1',
      author: 'María García',
      rating: 5,
      text: 'Increíble propiedad, volveré sin duda.',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('review-123');
    expect(body.message).toBeDefined();
  });
});

describe('GET /api/reviews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('devuelve 400 si no se proporciona propertyId', async () => {
    const req = new NextRequest('http://localhost/api/reviews');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('devuelve las reseñas aprobadas de una propiedad', async () => {
    mockCollection.mockImplementation(() => ({
      where: () => ({
        where: () => ({
          orderBy: () => ({
            get: async () => ({
              docs: [
                {
                  id: 'r1',
                  data: () => ({
                    author: 'Ana López',
                    rating: 5,
                    text: 'Fantástico',
                    createdAt: { toDate: () => new Date('2025-01-01') },
                  }),
                },
              ],
            }),
          }),
        }),
      }),
    }));

    const req = new NextRequest('http://localhost/api/reviews?propertyId=p1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].author).toBe('Ana López');
  });
});
