jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { POST, GET } from '@/app/api/reviews/route';

describe('/api/reviews', () => {
  it('POST returns 410 Gone', async () => {
    const res = await POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/ya no están disponibles/i);
  });

  it('GET returns 410 Gone', async () => {
    const res = await GET();
    expect(res.status).toBe(410);
  });
});
