import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
// Update the import path if necessary, for example:
import { validateAdminCredentials, setAdminSession } from '@/lib/auth/admin/admin';
// Or create the file at 'c:\Users\Simon\Desktop\Proyectos\project\lib\auth\admin\admin.ts' if it does not exist.

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
      const cookieStore = await cookies();
      cookieStore.set('admin-session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // Una semana
      });
      return NextResponse.json({ success: true }, { status: 200 });
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
