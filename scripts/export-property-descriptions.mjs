/**
 * Exporta textos de propiedades para revisión/optimización.
 * node scripts/export-property-descriptions.mjs
 */
import dotenv from "dotenv";
import admin from "firebase-admin";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

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

const TEXT_FIELDS = [
  "title",
  "titleEs",
  "titleEn",
  "slug",
  "propertyType",
  "roomType",
  "description",
  "descriptionEs",
  "descriptionEn",
  "summary",
  "summaryEs",
  "summaryEn",
  "shortDescription",
  "shortDescriptionEs",
  "shortDescriptionEn",
  "longDescription",
  "longDescriptionEs",
  "longDescriptionEn",
  "space",
  "spaceEs",
  "spaceEn",
  "neighborhood",
  "neighborhoodEs",
  "neighborhoodEn",
  "interaction",
  "interactionEs",
  "interactionEn",
  "access",
  "accessEs",
  "accessEn",
  "transit",
  "transitEs",
  "transitEn",
  "notes",
  "notesEs",
  "notesEn",
  "houseManual",
  "houseManualEs",
  "houseManualEn",
];

const snap = await admin.firestore().collection("properties").get();
const out = [];
for (const doc of snap.docs) {
  const d = doc.data();
  const entry = { id: doc.id, slug: d.slug, title: d.titleEs ?? d.title };
  for (const f of TEXT_FIELDS) {
    const v = d[f];
    if (typeof v === "string" && v.trim()) entry[f] = v.trim();
  }
  out.push(entry);
}

const path = resolve(ROOT, "scripts", "property-descriptions-export.json");
writeFileSync(path, JSON.stringify(out, null, 2), "utf8");
console.log(`Exported ${out.length} properties to ${path}`);
