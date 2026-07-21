/**
 * Diagnóstica y reintenta sync Hostfully para una reserva por nombre de huésped.
 * Uso: node scripts/resync-hostfully-booking.mjs "Juan Carlos Castillo Tuz"
 */
import dotenv from "dotenv";
import admin from "firebase-admin";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
dotenv.config({ path: resolve(ROOT, ".env.local") });

function formatPrivateKey(key) {
  return (key ?? "").replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });
}

const db = admin.firestore();
const searchName = (process.argv[2] || "Juan Carlos Castillo Tuz").trim().toLowerCase();

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

const snap = await db.collection("reservations").get();
const matches = [];
for (const doc of snap.docs) {
  const d = doc.data();
  const hay = [
    d.guestName,
    d.guestFirstName,
    d.guestLastName,
    `${d.guestFirstName ?? ""} ${d.guestLastName ?? ""}`,
    d.guestEmail,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (hay.includes(searchName) || searchName.split(/\s+/).every((p) => hay.includes(p))) {
    matches.push({ id: doc.id, ...d });
  }
}

if (matches.length === 0) {
  console.error("No se encontró reserva para:", searchName);
  process.exit(1);
}

console.log(`Encontradas ${matches.length} reserva(s):\n`);
for (const m of matches) {
  console.log({
    id: m.id,
    guestName: m.guestName || `${m.guestFirstName ?? ""} ${m.guestLastName ?? ""}`.trim(),
    guestEmail: m.guestEmail,
    guestPhone: m.guestPhone,
    status: m.status,
    propertyId: m.propertyId,
    checkIn: toDate(m.checkIn)?.toISOString(),
    checkOut: toDate(m.checkOut)?.toISOString(),
    totalAmount: m.totalAmount,
    stripePaymentId: m.stripePaymentId,
    hostfullyLeadUid: m.hostfullyLeadUid ?? null,
    hostfullySyncedAt: toDate(m.hostfullySyncedAt)?.toISOString() ?? null,
    createdAt: toDate(m.createdAt)?.toISOString(),
  });
}

const target = matches.sort((a, b) => {
  const ta = toDate(a.createdAt)?.getTime() ?? 0;
  const tb = toDate(b.createdAt)?.getTime() ?? 0;
  return tb - ta;
})[0];

console.log("\nUsando reserva:", target.id);

const propSnap = await db.collection("properties").doc(target.propertyId).get();
if (!propSnap.exists) {
  console.error("Propiedad no encontrada:", target.propertyId);
  process.exit(1);
}
const prop = propSnap.data();
console.log("Propiedad:", {
  title: prop.titleEs || prop.title,
  hostfullyPropertyId: prop.hostfullyPropertyId ?? null,
});

console.log("\nEnv Hostfully:", {
  HOSTFULLY_ENABLE_WRITES: process.env.HOSTFULLY_ENABLE_WRITES,
  HOSTFULLY_BASE_URL: process.env.HOSTFULLY_BASE_URL || "(default sandbox)",
  hasApiKey: Boolean(process.env.HOSTFULLY_API_KEY),
  hasAgencyUid: Boolean(process.env.HOSTFULLY_AGENCY_UID),
});

if (process.env.HOSTFULLY_ENABLE_WRITES !== "true") {
  console.error("\nHOSTFULLY_ENABLE_WRITES no es 'true'. Abortando sync.");
  process.exit(2);
}

if (!prop.hostfullyPropertyId) {
  console.error("\nLa propiedad no tiene hostfullyPropertyId. Abortando.");
  process.exit(2);
}

// Dynamic import of TS modules via compiled path won't work easily.
// Call Hostfully API directly mirroring sync-booking-lead + registerHostfullyLeadPayment.
const baseUrl = process.env.HOSTFULLY_BASE_URL || "https://sandbox.hostfully.com/api/v3.2";
const apiKey = process.env.HOSTFULLY_API_KEY;
const agencyUid = process.env.HOSTFULLY_AGENCY_UID;

async function hostfullyFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-HOSTFULLY-APIKEY": apiKey,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Hostfully ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

const checkIn = toDate(target.checkIn);
const checkOut = toDate(target.checkOut);
const toLocalDateTime = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
};
const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const normalizedName = (target.guestName ?? "").trim();
const firstName =
  (target.guestFirstName ?? "").trim() ||
  normalizedName.split(/\s+/).filter(Boolean)[0] ||
  "Guest";
const lastName =
  (target.guestLastName ?? "").trim() ||
  normalizedName.split(/\s+/).filter(Boolean).slice(1).join(" ") ||
  "Punta Norte";

let leadUid = (target.hostfullyLeadUid ?? "").trim() || undefined;

if (leadUid) {
  console.log("\nYa tiene hostfullyLeadUid:", leadUid, "— se intentará registrar pago si falta.");
} else {
  const guestInformation = {
    firstName,
    lastName,
    email: target.guestEmail,
    fullName: normalizedName || `${firstName} ${lastName}`,
  };
  if (target.guestPhone) guestInformation.phoneNumber = String(target.guestPhone).trim();
  const guests = Number(target.guests);
  if (Number.isFinite(guests) && guests > 0) guestInformation.adultCount = guests;

  const payload = {
    type: "BOOKING",
    status: "BOOKED",
    propertyUid: prop.hostfullyPropertyId,
    agencyUid,
    checkInLocalDateTime: toLocalDateTime(checkIn),
    checkOutLocalDateTime: toLocalDateTime(checkOut),
    guestInformation,
    externalReservationId: target.id,
    channel: "HOSTFULLY",
    checkInDate: toDateStr(checkIn),
    checkOutDate: toDateStr(checkOut),
  };
  const totalUsd = Number(target.totalAmount);
  if (Number.isFinite(totalUsd) && totalUsd > 0) {
    payload.notes = `Reserva web Punta Norte — total cobrado ${totalUsd} USD (incl. IVA/ISH). Sync manual.`;
  }

  console.log("\nCreando lead Hostfully con payload:");
  console.log(JSON.stringify(payload, null, 2));

  try {
    const lead = await hostfullyFetch("/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    leadUid = lead?.uid || lead?.leadUid;
    console.log("Lead creado:", leadUid, lead);
    await db.collection("reservations").doc(target.id).update({
      hostfullyLeadUid: leadUid,
      hostfullySyncedAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Firestore actualizado con hostfullyLeadUid");
  } catch (e) {
    console.error("Error creando lead:", e.message);
    if (e.body) console.error(JSON.stringify(e.body, null, 2));
    process.exit(3);
  }
}

// Register payment
if (leadUid) {
  try {
    const lead = await hostfullyFetch(`/leads/${encodeURIComponent(leadUid)}`);
    const orderUid =
      lead?.orderUid ||
      lead?.order?.uid ||
      lead?.orders?.[0]?.uid ||
      (typeof lead?.order === "string" ? lead.order : undefined);
    console.log("Lead orderUid:", orderUid);

    if (!orderUid) {
      console.warn("No se encontró orderUid en el lead; no se puede registrar transacción.");
    } else {
      const amount = Number(target.paidAmount ?? target.totalAmount);
      const currency = String(target.paidCurrency || "USD").toUpperCase();
      const note = `Pago Stripe ${target.stripePaymentId || "n/a"} — sync manual`;
      const body = {
        orderUid,
        type: "SALE",
        status: "SUCCESS",
        fullPayment: true,
        manual: true,
        notes: note,
      };
      // Prefer amount if available
      const variants = [
        { orderUid, type: "SALE", status: "SUCCESS", fullPayment: true, manual: true, notes: note },
        {
          orderUid,
          type: "SALE",
          status: "SUCCESS",
          amount: Number.isFinite(amount) ? amount : undefined,
          manual: false,
          transactionId: target.stripePaymentId,
          notes: note,
        },
      ];
      let synced = false;
      for (const v of variants) {
        try {
          const r = await hostfullyFetch("/transactions", {
            method: "POST",
            body: JSON.stringify(v),
          });
          console.log("Pago registrado:", r);
          synced = true;
          break;
        } catch (e) {
          console.warn("Variante pago rechazada:", e.message);
        }
      }
      if (!synced) console.error("No se pudo registrar el pago en Hostfully.");
    }
  } catch (e) {
    console.error("Error registrando pago:", e.message);
  }
}

console.log("\nListo.");
process.exit(0);
