import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/auth/admin';

export async function POST() {
  try {
    clearAdminSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error cerrando sesión' },
      { status: 500 }
    );
  }
}