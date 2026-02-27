import { NextResponse, NextRequest } from 'next/server';
import { validateAdminCredentials, getAdminSessionCookieHeader } from '@/lib/auth/admin/admin';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Ensure the environment needed for session cookie creation is present before validating
    if (!process.env.ADMIN_PASSWORD?.trim()) {
      console.error('ADMIN_PASSWORD is not set; cannot create admin session.');
      return NextResponse.json(
        { error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }

    if (validateAdminCredentials(username, password)) {
      try {
        const setCookieHeader = await getAdminSessionCookieHeader();
        return NextResponse.json(
          { success: true },
          { status: 200, headers: { 'Set-Cookie': setCookieHeader } }
        );
      } catch (e) {
        // Defensive: getAdminSessionCookieHeader may still throw; handle gracefully
        console.error(e);
        return NextResponse.json(
          { error: 'Error de configuración del servidor' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}