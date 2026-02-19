import "server-only";
import admin from 'firebase-admin';

function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, "\n");
}

function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  // Validar solo cuando se inicializa (no durante build si faltan env vars)
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('❌ FALTA LA VARIABLE DE ENTORNO: FIREBASE_PRIVATE_KEY en .env.local o en Firebase App Hosting secrets');
  }
  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('❌ FALTA LA VARIABLE DE ENTORNO: FIREBASE_CLIENT_EMAIL en .env.local o en Firebase App Hosting secrets');
  }
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  });
}

let _adminApp: admin.app.App | null = null;

function getApp() {
  if (!_adminApp) _adminApp = getAdminApp();
  return _adminApp;
}

// Lazy: solo se inicializa al primer uso (evita fallar durante next build)
function createLazyProxy<T extends object>(getReal: () => T): T {
  return new Proxy({} as T, {
    get(_: unknown, prop: string | symbol): unknown {
      const real = getReal();
      const val = (real as Record<string, unknown>)[prop as string];
      if (typeof val === 'function') return (val as (...args: unknown[]) => unknown).bind(real);
      return val;
    },
  }) as T;
}
export const adminDb = createLazyProxy(() => getApp().firestore());
export const adminAuth = createLazyProxy(() => getApp().auth());
export const adminStorage = createLazyProxy(() => getApp().storage());