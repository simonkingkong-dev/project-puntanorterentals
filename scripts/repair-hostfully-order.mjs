/**
 * Repara reservas ya creadas en Hostfully cuyo order quedó con el total equivocado
 * (la tarifa base de Hostfully en vez de lo cobrado) y/o sin el pago registrado.
 *
 * Por reserva:
 *  1. Lee el order del lead (GET /orders?leadUid=) y sus transacciones.
 *  2. Si el total del order ≠ el total cobrado → POST /leads/{uid}/alteration con el desglose
 *     (renta + VAT + City Tax). Hostfully recalcula el order; se vuelve a leer para comprobarlo.
 *  3. Si, ya corregido el total, falta el pago → POST /transactions por lo que falta.
 *  4. Guarda el resultado en reservations/{id}.hostfullyPaymentSync.
 *
 * SIMULA por defecto (solo lee). Escribe únicamente con --apply.
 *
 * Uso:
 *   node scripts/repair-hostfully-order.mjs "Lucia Paez"            # simulación
 *   node scripts/repair-hostfully-order.mjs "Lucia Paez" --apply    # aplica
 *   node scripts/repair-hostfully-order.mjs --reservation <id> [--apply]
 *   node scripts/repair-hostfully-order.mjs "Lucia Paez" --order <orderUid> [--apply]
 *       (reservas cuyo lead nunca se guardó: se resuelve el lead desde el order)
 *   node scripts/repair-hostfully-order.mjs --all [--apply]         # confirmadas sin pago registrado
 */
import dotenv from "dotenv";
import admin from "firebase-admin";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "..", ".env.local") });

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ALL = args.includes("--all");
const reservationFlag = args.indexOf("--reservation");
const RESERVATION_ID = reservationFlag >= 0 ? args[reservationFlag + 1] : null;
const TOL = 0.05; // Hostfully redondea a centavos (66.01 vs 66.00): no es una diferencia real
const excludeFlag = args.indexOf("--exclude");
const EXCLUDE = new Set(excludeFlag >= 0 ? String(args[excludeFlag + 1] ?? "").split(",").filter(Boolean) : []);
const variantFlag = args.indexOf("--variant");
const VARIANT = variantFlag >= 0 ? args[variantFlag + 1] : "fees"; // fees (verificada: VAT/City Tax con netPrice) | tax | flat
const orderFlag = args.indexOf("--order");
const ORDER_UID = orderFlag >= 0 ? args[orderFlag + 1] : null;
const searchTerm = args
  .find(
    (a, i) =>
      !a.startsWith("--") &&
      !(reservationFlag >= 0 && i === reservationFlag + 1) &&
      !(orderFlag >= 0 && i === orderFlag + 1) &&
      !(variantFlag >= 0 && i === variantFlag + 1) &&
      !(excludeFlag >= 0 && i === excludeFlag + 1)
  )
  ?.trim()
  .toLowerCase();

if (!ALL && !RESERVATION_ID && !searchTerm) {
  console.error('Indica un huésped ("Nombre Apellido"), --reservation <id> o --all.');
  process.exit(1);
}

const baseUrl = process.env.HOSTFULLY_BASE_URL || "https://sandbox.hostfully.com/api/v3.2";
const apiKey = process.env.HOSTFULLY_API_KEY;
if (!apiKey) {
  console.error("Falta HOSTFULLY_API_KEY en .env.local");
  process.exit(1);
}
console.log(`Hostfully: ${new URL(baseUrl).host}  |  modo: ${APPLY ? "APLICAR (escribe)" : "simulación (solo lectura)"}\n`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
}
const db = admin.firestore();

// ---------- Hostfully ----------
async function hf(path, options = {}) {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "X-HOSTFULLY-APIKEY": apiKey, ...(options.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Hostfully ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

/** Prueba la ruta en la versión configurada y, si da 404, en v3.3 (la que muestra la doc). */
async function hfWithFallback(path, options) {
  try {
    return await hf(path, options);
  } catch (e) {
    if (/Hostfully 404/.test(String(e.message)) && baseUrl.includes("/v3.2")) {
      return hf(`${baseUrl.replace("/v3.2", "/v3.3")}${path}`, options);
    }
    throw e;
  }
}

async function getOrder(leadUid) {
  const data = await hfWithFallback(`/orders?leadUid=${encodeURIComponent(leadUid)}`);
  const list = data?.orders ?? data?.content ?? [];
  return Array.isArray(list) && list[0] ? list[0] : null;
}

async function getTransactions(orderUid) {
  const data = await hfWithFallback(`/transactions?orderUid=${encodeURIComponent(orderUid)}`);
  const list = data?.transactions ?? data?.content ?? [];
  return Array.isArray(list) ? list : [];
}

/** Busca el order por UID entre los recientes de la propiedad y devuelve su leadUid. */
async function resolveLeadUidFromOrder(r, orderUid) {
  const propSnap = await db.collection("properties").doc(String(r.propertyId)).get();
  const propertyUid = propSnap.data()?.hostfullyPropertyId;
  if (!propertyUid) return null;
  const created = r.createdAt?.toDate?.() ?? new Date(r.createdAt);
  const since = new Date(created.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 19);
  const data = await hfWithFallback(
    `/orders?propertyUid=${encodeURIComponent(propertyUid)}&updatedSince=${encodeURIComponent(since)}`
  );
  const list = data?.orders ?? data?.content ?? [];
  const match = Array.isArray(list) ? list.find((o) => o.uid === orderUid) : null;
  return match?.leadUid ?? null;
}

/**
 * Sin UID guardado y sin --order: busca el lead entre los orders recientes de la propiedad y
 * lo identifica por correo del huésped + fecha de entrada. Solo acepta una coincidencia única.
 */
const usedLeadUids = new Set();
async function resolveLeadUidAuto(r) {
  const propSnap = await db.collection("properties").doc(String(r.propertyId)).get();
  const propertyUid = propSnap.data()?.hostfullyPropertyId;
  const email = String(r.guestEmail ?? "").trim().toLowerCase();
  if (!propertyUid || !email) return null;
  const created = r.createdAt?.toDate?.() ?? new Date(r.createdAt);
  const since = new Date(created.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 19);
  const ci = (r.checkIn?.toDate?.() ?? new Date(r.checkIn)).toISOString().slice(0, 10);
  const data = await hfWithFallback(
    `/orders?propertyUid=${encodeURIComponent(propertyUid)}&updatedSince=${encodeURIComponent(since)}`
  );
  const orders = data?.orders ?? data?.content ?? [];
  const matches = [];
  for (const o of Array.isArray(orders) ? orders : []) {
    if (!o.leadUid || usedLeadUids.has(o.leadUid)) continue;
    let lead;
    try {
      const l = await hf(`/leads/${encodeURIComponent(o.leadUid)}`);
      lead = l?.lead ?? l;
    } catch {
      continue;
    }
    const leadEmail = String(lead?.guestInformation?.email ?? "").trim().toLowerCase();
    const leadIn = String(lead?.checkInLocalDateTime ?? "").slice(0, 10);
    if (leadEmail === email && leadIn === ci) matches.push(o.leadUid);
  }
  return matches.length === 1 ? matches[0] : matches.length > 1 ? "AMBIGUO" : null;
}

// ---------- Desglose (mismo cálculo que lib/lodging-taxes.ts) ----------
const IVA = 0.16;
const ISH = 0.06;
const totalFromSubtotal = (s) => s + Math.round(s * IVA) + Math.round(s * ISH);

function breakdown(totalUsd) {
  const T = Math.round(totalUsd);
  let lo = 0;
  let hi = T;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const f = totalFromSubtotal(mid);
    if (f === T) return { subtotal: mid, iva: Math.round(mid * IVA), ish: Math.round(mid * ISH) };
    if (f < T) lo = mid + 1;
    else hi = mid - 1;
  }
  const sub = T / (1 + IVA + ISH);
  const iva = Math.round(sub * IVA);
  const ish = Math.round(sub * ISH);
  return { subtotal: T - iva - ish, iva, ish };
}

/**
 * Formas de mandar el desglose (Hostfully ignora algunas):
 *  fees → renta + líneas VAT / City Tax con netPrice (otherFees)  [verificada]
 *  tax  → renta + taxAmount dentro de `rent`
 *  flat → todo como renta (sin desglose de impuestos)
 */
function quoteOverrides(totalUsd) {
  const { subtotal, iva, ish } = breakdown(totalUsd);
  const total = Math.round(totalUsd * 100) / 100;
  const fee = (name, netPrice) => ({ name, type: "TAX", amountType: "AMOUNT", scope: "PER_STAY", netPrice, enabled: true });
  if (VARIANT === "flat") {
    return { totalPrice: total, rent: { rentBaseNetPrice: total, rentNetPrice: total, taxationRate: 0, taxAmount: 0 } };
  }
  if (VARIANT === "tax") {
    return { totalPrice: total, rent: { rentBaseNetPrice: subtotal, rentNetPrice: subtotal, taxAmount: iva + ish } };
  }
  return {
    totalPrice: total,
    rent: { rentBaseNetPrice: subtotal, rentNetPrice: subtotal, taxationRate: 0, taxAmount: 0 },
    fees: { otherFees: [fee("VAT", iva), fee("City Tax", ish)] },
  };
}

const money = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "?");

// ---------- Reservas objetivo ----------
async function findTargets() {
  if (RESERVATION_ID) {
    const s = await db.collection("reservations").doc(RESERVATION_ID).get();
    return s.exists ? [{ id: s.id, ...s.data() }] : [];
  }
  const snap = await db.collection("reservations").where("status", "==", "confirmed").get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.hostfullyLeadUid || ORDER_UID || ALL);
  if (ALL) return all.filter((r) => r.hostfullyPaymentSync?.ok !== true && !EXCLUDE.has(r.id));
  return all.filter((r) => {
    const hay = [r.guestName, r.guestFirstName, r.guestLastName, `${r.guestFirstName ?? ""} ${r.guestLastName ?? ""}`, r.guestEmail]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchTerm.split(/\s+/).every((p) => hay.includes(p));
  });
}

async function repair(r) {
  const name = r.guestName || `${r.guestFirstName ?? ""} ${r.guestLastName ?? ""}`.trim();
  console.log(`\n=== ${name} — reserva ${r.id} — lead ${r.hostfullyLeadUid}`);
  const expected = Number(r.totalAmount);
  if (!Number.isFinite(expected) || expected <= 0) return console.log("  Total de la reserva inválido: se omite.");

  if (!r.hostfullyLeadUid) {
    if (!ORDER_UID && !ALL) return console.log("  Sin lead guardado: usa --order <orderUid> o --all para resolverlo.");
    r.hostfullyLeadUid = ORDER_UID ? await resolveLeadUidFromOrder(r, ORDER_UID) : await resolveLeadUidAuto(r);
    if (r.hostfullyLeadUid === "AMBIGUO") return console.log("  ✖ Varias coincidencias en Hostfully: se omite (resolver a mano).");
    if (!r.hostfullyLeadUid) return console.log("  No se encontró un lead en Hostfully para esta reserva: se omite (no se crea nada).");
    usedLeadUids.add(r.hostfullyLeadUid);
    console.log(`  Lead resuelto (correo + fecha de entrada): ${r.hostfullyLeadUid}`);
    if (APPLY) {
      await db.collection("reservations").doc(r.id).update({
        hostfullyLeadUid: r.hostfullyLeadUid,
        hostfullySyncedAt: new Date(),
      });
    }
  }

  let order = await getOrder(r.hostfullyLeadUid);
  if (!order) return console.log("  No hay order para este lead en Hostfully: se omite.");
  let txs = await getTransactions(order.uid);
  const paid = () =>
    txs.filter((t) => t.type === "SALE" && t.status === "SUCCESS").reduce((a, t) => a + Number(t.amount || 0), 0);

  console.log(`  Total cobrado (sitio): ${money(expected)} USD  |  Order Hostfully: ${money(order.totalAmount)}  |  Pagado en Hostfully: ${money(paid())}`);
  const orderCurrency = String(order.currency ?? "").toUpperCase();
  console.log(`  Moneda del order en Hostfully: ${orderCurrency || "(no informada)"}`);
  if (orderCurrency && orderCurrency !== "USD" && orderCurrency !== "NONE") {
    return console.log(`  ✖ El order está en ${orderCurrency}, no en USD: se omite para no registrar importes en otra moneda.`);
  }

  const mismatch = Math.abs(Number(order.totalAmount) - expected) > TOL;
  const b = breakdown(expected);
  if (mismatch) {
    console.log(`  → Corregir total [variante ${VARIANT}]: renta ${b.subtotal} + VAT ${b.iva} + City Tax ${b.ish} = ${expected}`);
    if (APPLY) {
      // Leads antiguos traen líneas propias con identificador (IVA, City Tax…). La API NO deja
      // borrarlas ni modificarlas con una alteración (probado: se duplican y el total sube),
      // así que esos orders se corrigen a mano en Hostfully.
      const stale = (order.fees?.otherFees ?? []).filter((f) => f.uid);
      if (stale.length) {
        console.log(
          `    ✖ El order tiene líneas antiguas (${stale.map((f) => `${f.name} ${f.netPrice}`).join(", ")}) que la API no puede quitar. Corregir a mano en Hostfully.`
        );
        return;
      }
      const qo = quoteOverrides(expected);
      qo.rent = { ...qo.rent, extraGuestsNetPrice: 0, extraGuestsBaseNetPrice: 0 };
      await hfWithFallback(`/leads/${encodeURIComponent(r.hostfullyLeadUid)}/alteration`, {
        method: "POST",
        body: JSON.stringify({ quoteOverrides: qo }),
      });
      order = await getOrder(r.hostfullyLeadUid);
      console.log(`    Order tras la alteración: ${money(order?.totalAmount)}`);
      if (Math.abs(Number(order?.totalAmount) - expected) > TOL) {
        console.log("    ✖ Hostfully NO aplicó los importes. No se registra el pago. Ajustar a mano (Add Order Adjustment).");
        await db.collection("reservations").doc(r.id).update({
          "hostfullyPaymentSync.totalsMatch": false,
          "hostfullyPaymentSync.orderTotalUsd": Number(order?.totalAmount) || null,
        });
        return;
      }
    }
  } else {
    console.log("  Total del order correcto.");
  }

  const missing = Math.round((expected - paid()) * 100) / 100;
  if (missing > TOL) {
    console.log(`  → Registrar pago de ${money(missing)} USD (Stripe ${r.stripePaymentId ?? "?"})`);
    if (APPLY) {
      await hf("/transactions", {
        method: "POST",
        body: JSON.stringify({
          orderUid: order.uid,
          type: "SALE",
          status: "SUCCESS",
          amount: missing,
          manual: true,
          notes: `Pago Stripe ${r.stripePaymentId ?? ""} — ${money(missing)} USD (reparación manual).`.trim(),
        }),
      });
      txs = await getTransactions(order.uid);
      console.log(`    Pagado en Hostfully ahora: ${money(paid())}`);
    }
  } else if (paid() > expected + TOL) {
    console.log(`  ⚠ Pagado en Hostfully (${money(paid())}) supera el total (${money(expected)}): no se toca, revisar a mano.`);
  } else {
    console.log("  Pago ya registrado.");
  }

  if (APPLY) {
    await db.collection("reservations").doc(r.id).update({
      hostfullyPaymentSync: {
        ok: true,
        error: null,
        orderUid: order.uid,
        orderTotalUsd: Number(order.totalAmount) || null,
        paidUsd: paid(),
        totalsMatch: Math.abs(Number(order.totalAmount) - expected) <= TOL,
        repairedAt: new Date(),
        at: new Date(),
      },
    });
  }
}

const targets = await findTargets();
if (targets.length === 0) {
  console.error("No se encontraron reservas confirmadas con lead de Hostfully para esos criterios.");
  process.exit(1);
}
console.log(`Reservas a revisar: ${targets.length}`);
for (const r of targets) {
  try {
    await repair(r);
  } catch (e) {
    console.error(`  ✖ Error en ${r.id}:`, e.message);
  }
}
if (!APPLY) console.log("\n(Simulación: no se escribió nada. Repite con --apply para aplicar.)");
process.exit(0);
