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

const adminApp = createFirebaseAdminApp({
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: process.env.FIREBASE_PRIVATE_KEY!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
});

export const adminDb = adminApp.firestore();
export const adminAuth = adminApp.auth();
export const adminStorage = adminApp.storage();