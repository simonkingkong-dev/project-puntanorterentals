import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, setAdminSession } from '@/lib/auth/admin';

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
      setAdminSession();
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}