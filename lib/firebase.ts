import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

/**
 * Configuración según documentación Firebase App Hosting:
 * - Con FIREBASE_WEBAPP_CONFIG (inyectado en build/runtime): initializeApp() sin argumentos.
 * - Con NEXT_PUBLIC_FIREBASE_* (local): initializeApp(config).
 * - Sin config: no inicializar en carga para no fallar el build; fallará en primer uso.
 */
function getFirebaseConfig() {
  const fromEnv = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (fromEnv.apiKey) return fromEnv;
  try {
    const webapp = process.env.FIREBASE_WEBAPP_CONFIG;
    if (webapp && typeof webapp === 'string') {
      const parsed = JSON.parse(webapp) as Record<string, string | undefined>;
      return {
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain,
        projectId: parsed.projectId,
        storageBucket: parsed.storageBucket,
        messagingSenderId: parsed.messagingSenderId,
        appId: parsed.appId,
      };
    }
  } catch {
    // ignore
  }
  return fromEnv;
}

let _app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (_app) return _app;
  // Firebase App Hosting: initializeApp() sin argumentos usa FIREBASE_WEBAPP_CONFIG
  if (process.env.FIREBASE_WEBAPP_CONFIG) {
    _app = getApps().length === 0 ? initializeApp() : (getApps()[0] as FirebaseApp);
    return _app;
  }
  const config = getFirebaseConfig();
  if (config.apiKey) {
    _app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
    return _app;
  }
  throw new Error(
    'Firebase client config missing. Set NEXT_PUBLIC_FIREBASE_* in .env.local or ensure FIREBASE_WEBAPP_CONFIG is available (e.g. Firebase App Hosting).'
  );
}

// Inicializar en carga solo si hay config (evita auth/invalid-api-key durante build)
const _configAtLoad = getFirebaseConfig();
const _hasWebappConfig = typeof process.env.FIREBASE_WEBAPP_CONFIG === 'string' && process.env.FIREBASE_WEBAPP_CONFIG.length > 0;
if (_hasWebappConfig || _configAtLoad.apiKey) {
  _app = _hasWebappConfig
    ? (getApps().length === 0 ? initializeApp() : (getApps()[0] as FirebaseApp))
    : (getApps().length === 0 ? initializeApp(_configAtLoad) : getApps()[0]);
}

function createLazyService<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_, prop: string | symbol): unknown {
      const real = getter();
      const val = (real as Record<string, unknown>)[prop as string];
      if (typeof val === 'function') return (val as (...args: unknown[]) => unknown).bind(real);
      return val;
    },
  }) as T;
}

// Exportar servicios: si ya hay app usarlos; si no, lazy para no fallar en build
export const db = _app
  ? getFirestore(_app)
  : createLazyService(() => getFirestore(getApp()));
export const auth = _app
  ? getAuth(_app)
  : createLazyService(() => getAuth(getApp()));
export const storage = _app
  ? getStorage(_app)
  : createLazyService(() => getStorage(getApp()));

export default _app ?? createLazyService(getApp);
