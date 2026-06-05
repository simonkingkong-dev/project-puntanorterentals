/**
 * Aplica textos optimizados a todas las propiedades en Firestore.
 * node scripts/apply-property-content-optimizations.mjs
 */
import dotenv from "dotenv";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
dotenv.config({ path: resolve(ROOT, ".env.local") });

function formatPrivateKey(key) {
  return key.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY ?? ""),
    }),
  });
}

const db = admin.firestore();
const payload = JSON.parse(
  readFileSync(resolve(__dirname, "property-content-optimized.json"), "utf8")
);

/** Campos que ya no se usan en el sitio (contenido común automático). */
const CLEAR_FIELDS = [
  "summary",
  "summaryEs",
  "summaryEn",
  "shortDescription",
  "shortDescriptionEs",
  "shortDescriptionEn",
  "longDescription",
  "longDescriptionEs",
  "longDescriptionEn",
  "neighborhood",
  "neighborhoodEs",
  "neighborhoodEn",
  "transit",
  "transitEs",
  "transitEn",
  "access",
  "accessEs",
  "accessEn",
  "interaction",
  "interactionEs",
  "interactionEn",
  "houseManual",
  "houseManualEs",
  "houseManualEn",
];

const cleared = Object.fromEntries(CLEAR_FIELDS.map((f) => [f, ""]));

const ids = Object.keys(payload);
let updated = 0;

for (const id of ids) {
  const data = { ...cleared, ...payload[id] };
  const ref = db.collection("properties").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn(`Skip ${id}: not found`);
    continue;
  }
  await ref.update({
    ...data,
    updatedAt: new Date(),
  });
  const title = snap.data()?.titleEs ?? snap.data()?.title ?? id;
  console.log(`Updated: ${title} (${id})`);
  updated++;
}

console.log(`\nDone. ${updated}/${ids.length} properties updated.`);

const secret = process.env.CRON_SECRET?.trim();
const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
if (!secret) {
  console.warn(
    "\n⚠ CRON_SECRET no definido: reinicia `npm run dev` o espera ~5 min para ver cambios en el sitio."
  );
} else {
  try {
    const res = await fetch(`${baseUrl}/api/admin/revalidate-properties`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✓ Caché del sitio invalidada (${body.revalidated ?? "?"} propiedades).`);
    } else {
      console.warn("⚠ No se pudo invalidar caché:", res.status, body);
      console.warn("  Asegúrate de que `npm run dev` esté corriendo y vuelve a ejecutar el script.");
    }
  } catch (e) {
    console.warn("⚠ Revalidación falló (¿servidor dev apagado?):", e.message);
    console.warn("  Reinicia `npm run dev` y ejecuta solo la revalidación:");
    console.warn(
      `  curl -X POST -H "Authorization: Bearer $CRON_SECRET" ${baseUrl}/api/admin/revalidate-properties`
    );
  }
}
