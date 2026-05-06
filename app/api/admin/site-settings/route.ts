import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';

const SETTINGS_DOC = 'site-settings';
const SETTINGS_COLLECTION = 'siteConfig';

async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'authenticated';
}

/**
 * GET /api/admin/site-settings
 * Devuelve la configuración actual del sitio.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).get();
    const data = snap.exists ? snap.data() : {};
    return NextResponse.json({ settings: data ?? {} });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/site-settings
 * Actualiza (merge) la configuración del sitio.
 */
export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Sanitizar: solo campos permitidos
    const allowed = [
      'siteName',
      'siteUrl',
      'siteDescription',
      'contactEmail',
      'contactPhone',
      'emailNotifications',
      'autoConfirmations',
      'checkinReminders',
    ];

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    await adminDb
      .collection(SETTINGS_COLLECTION)
      .doc(SETTINGS_DOC)
      .set(updates, { merge: true });

    return NextResponse.json({ success: true, message: 'Configuración guardada' });
  } catch (error) {
    console.error('Error saving site settings:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
