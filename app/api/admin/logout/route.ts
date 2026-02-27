import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/auth/admin/admin';

export async function POST() {
  try {
    const setCookieHeader = await clearAdminSession();
    return NextResponse.json(
      { success: true },
      { headers: { 'Set-Cookie': setCookieHeader } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error cerrando sesión' },
      { status: 500 }
    );
  }
}