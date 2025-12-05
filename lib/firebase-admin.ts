console.log("DEBUG ENV:", process.env.FIREBASE_PRIVATE_KEY ? "CARGADA" : "VACÍA");
console.log("DEBUG PATH:", process.cwd()); // Te dirá desde dónde se está ejecutando

import "server-only";
import admin from 'firebase-admin';

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

function formatPrivateKey(key: string) {
  return key.replace(/\\n/g, "\n");
}

export function createFirebaseAdminApp(config: FirebaseAdminConfig) {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: formatPrivateKey(config.privateKey),
    }),
    storageBucket: config.storageBucket,
  });
}

// --- VALIDACIÓN DE SEGURIDAD ---
// Si falta alguna variable, lanzamos un error claro en lugar de que explote el código después.
if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('❌ FALTA LA VARIABLE DE ENTORNO: FIREBASE_PRIVATE_KEY en .env.local');
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error('❌ FALTA LA VARIABLE DE ENTORNO: FIREBASE_CLIENT_EMAIL en .env.local');
}
// ------------------------------

const adminApp = createFirebaseAdminApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!, // Ahora estamos seguros de que existe
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
});

export const adminDb = adminApp.firestore();
export const adminAuth = adminApp.auth();
export const adminStorage = adminApp.storage();