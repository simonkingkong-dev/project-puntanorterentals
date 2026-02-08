/**
 * Script para auditar Firestore: busca URLs inválidas (wp-content, LinensProvided)
 * y posibles inconsistencias en nombres de campos (created_at vs createdAt).
 *
 * Ejecutar: node scripts/audit-firestore.mjs
 * (Desde la raíz del proyecto, con .env.local cargado)
 */

import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Cargar .env.local
dotenv.config({ path: resolve(ROOT, '.env.local') });

const BAD_URL_PATTERNS = ['wp-content', 'linensprovided', 'wordpress'];
const FIELD_ALIASES = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

function hasBadUrl(value) {
  if (typeof value !== 'string') return false;
  const lower = value.toLowerCase();
  return BAD_URL_PATTERNS.some((p) => lower.includes(p));
}

function collectStrings(obj, path = '') {
  const results = [];
  if (obj === null || obj === undefined) return results;
  if (typeof obj === 'string') {
    results.push({ path, value: obj });
    return results;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...collectStrings(item, `${path}[${i}]`));
    });
    return results;
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      results.push(...collectStrings(val, path ? `${path}.${key}` : key));
    }
  }
  return results;
}

function checkFieldNames(data) {
  const issues = [];
  for (const [alias, canonical] of Object.entries(FIELD_ALIASES)) {
    if (alias in data && !(canonical in data)) {
      issues.push({ field: alias, expected: canonical });
    }
  }
  return issues;
}

async function auditCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const badUrls = [];
  const fieldIssues = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docPath = `${collectionName}/${doc.id}`;

    // Buscar URLs problemáticas
    const strings = collectStrings(data);
    for (const { path, value } of strings) {
      if (hasBadUrl(value)) {
        badUrls.push({ doc: docPath, field: path, value: value.substring(0, 80) + '...' });
      }
    }

    // Verificar nombres de campos
    const issues = checkFieldNames(data);
    if (issues.length > 0) {
      fieldIssues.push({ doc: docPath, issues });
    }
  }

  return { badUrls, fieldIssues };
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Faltan variables de entorno. Asegúrate de tener .env.local con:');
    console.error('   NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  const db = admin.firestore();
  const collections = ['properties', 'globalAmenities', 'services', 'testimonials', 'siteContent', 'contactInfo'];

  console.log('🔍 Auditoría de Firestore\n');
  console.log('Colecciones a revisar:', collections.join(', '));
  console.log('Patrones de URL sospechosos:', BAD_URL_PATTERNS.join(', '));
  console.log('Nombres de campos esperados: createdAt, updatedAt (no created_at, updated_at)\n');
  console.log('─'.repeat(60));

  let totalBadUrls = 0;
  let totalFieldIssues = 0;

  for (const col of collections) {
    try {
      const { badUrls, fieldIssues } = await auditCollection(db, col);
      if (badUrls.length === 0 && fieldIssues.length === 0) {
        console.log(`✅ ${col}: Sin problemas detectados`);
        continue;
      }
      if (badUrls.length > 0) {
        totalBadUrls += badUrls.length;
        console.log(`\n⚠️  ${col} - URLs sospechosas (${badUrls.length}):`);
        badUrls.forEach(({ doc, field, value }) => {
          console.log(`   · ${doc} → ${field}`);
          console.log(`     ${value}`);
        });
      }
      if (fieldIssues.length > 0) {
        totalFieldIssues += fieldIssues.length;
        console.log(`\n⚠️  ${col} - Posible inconsistencia en campos (${fieldIssues.length} docs):`);
        fieldIssues.forEach(({ doc, issues }) => {
          issues.forEach(({ field, expected }) => {
            console.log(`   · ${doc}: usa "${field}", se recomienda "${expected}"`);
          });
        });
      }
    } catch (err) {
      console.log(`⚠️  ${col}: No existe o error al leer: ${err.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Resumen:`);
  console.log(`   URLs sospechosas: ${totalBadUrls}`);
  console.log(`   Docs con campos inconsistentes: ${totalFieldIssues}`);

  if (totalBadUrls > 0) {
    console.log('\n💡 Para corregir URLs: revisa cada documento en Firebase Console');
    console.log('   y actualiza las URLs de imágenes a Firebase Storage o URLs válidas.');
  }
  if (totalFieldIssues > 0) {
    console.log('\n💡 Para corregir campos: renombra created_at → createdAt, updated_at → updatedAt');
    console.log('   en Firebase Console o con un script de migración.');
  }
  if (totalBadUrls === 0 && totalFieldIssues === 0) {
    console.log('\n✨ No se encontraron problemas en las colecciones revisadas.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
