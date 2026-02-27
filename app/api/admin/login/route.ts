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

    if (validateAdminCredentials(username, password)) {
      const setCookieHeader = await getAdminSessionCookieHeader();
      return NextResponse.json(
        { success: true },
        { status: 200, headers: { 'Set-Cookie': setCookieHeader } }
      );
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json(
     
        { error: 'Error interno del servidor' }, // [cite: 463]
      { status: 500 }
    );
  }
}