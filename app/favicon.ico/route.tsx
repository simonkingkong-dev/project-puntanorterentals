import { ImageResponse } from 'next/og';

/**
 * Sirve /favicon.ico para navegadores y bots que lo piden directamente.
 * Evita 404 en logs; mismo contenido que app/icon.tsx.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#0f172a',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        P
      </div>
    ),
    {
      width: 32,
      height: 32,
      headers: {
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    }
  );
}
