"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { Property } from "@/lib/types";

export async function handleCreateProperty(formData: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'availability'>) {
  try {
    // Generamos el slug automáticamente si no viene (seguridad extra)
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newProperty = {
      ...formData,
      slug,
      availability: {}, // Inicializamos disponibilidad vacía
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('properties').add(newProperty);

    revalidatePath("/admin/properties");
    // Redireccionamos después del éxito fuera del try-catch para evitar conflictos de Next.js
  } catch (error) {
    console.error("Error creating property:", error);
    return { success: false, error: "Error al crear la propiedad." };
  }
  
  redirect("/admin/properties");
}


// --- ACTUALIZAR ---

export type UpdatePropertyFormData = Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'slug' | 'availability'>>;

export async function handleUpdateProperty(propertyId: string, formData: UpdatePropertyFormData) {
  if (!propertyId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('properties').doc(propertyId).update({
      ...formData,
      updatedAt: new Date(),
    });

    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}/edit`);
    return { success: true };
  } catch (error) {
    console.error("Error updating property:", error);
    return { success: false, error: "Error al actualizar la propiedad." };
  }
}


// --- AMENIDADES EN MASA (por idioma) ---

const FIRESTORE_BATCH_LIMIT = 500;

export async function handleBulkUpdatePropertyAmenities(
  lang: "es" | "en",
  amenities: string[]
) {
  const normalized = amenities.map((a) => a.trim()).filter(Boolean);

  try {
    const snapshot = await adminDb.collection("properties").get();
    const docs = snapshot.docs;

    if (docs.length === 0) {
      return { success: true, count: 0 };
    }

    for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = adminDb.batch();
      const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);

      for (const doc of chunk) {
        if (lang === "es") {
          batch.update(doc.ref, {
            amenitiesEs: normalized,
            amenities: normalized,
            updatedAt: new Date(),
          });
        } else {
          batch.update(doc.ref, {
            amenitiesEn: normalized,
            updatedAt: new Date(),
          });
        }
      }

      await batch.commit();
    }

    revalidatePath("/admin/properties");
    revalidatePath("/properties");

    return { success: true, count: docs.length };
  } catch (error) {
    console.error("Error bulk updating amenities:", error);
    return {
      success: false,
      error: "Error al guardar amenidades en todas las propiedades.",
    };
  }
}

function getAmenitiesForLang(
  data: FirebaseFirestore.DocumentData,
  lang: "es" | "en"
): string[] {
  if (lang === "es") {
    const es = data.amenitiesEs;
    if (Array.isArray(es)) return es.filter((a): a is string => typeof a === "string");
    const legacy = data.amenities;
    if (Array.isArray(legacy)) {
      return legacy.filter((a): a is string => typeof a === "string");
    }
    return [];
  }
  const en = data.amenitiesEn;
  if (Array.isArray(en)) return en.filter((a): a is string => typeof a === "string");
  return [];
}

export async function handleBulkAppendPropertyAmenity(
  lang: "es" | "en",
  amenity: string
) {
  const trimmed = amenity.trim();
  if (!trimmed) {
    return { success: false, error: "La amenidad no puede estar vacía." };
  }

  try {
    const snapshot = await adminDb.collection("properties").get();
    const docs = snapshot.docs;

    if (docs.length === 0) {
      return { success: true, count: 0, addedCount: 0, skippedCount: 0 };
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const batch = adminDb.batch();
      const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);

      for (const doc of chunk) {
        const current = getAmenitiesForLang(doc.data(), lang);
        if (current.includes(trimmed)) {
          skippedCount++;
          continue;
        }

        const next = [...current, trimmed];
        if (lang === "es") {
          batch.update(doc.ref, {
            amenitiesEs: next,
            amenities: next,
            updatedAt: new Date(),
          });
        } else {
          batch.update(doc.ref, {
            amenitiesEn: next,
            updatedAt: new Date(),
          });
        }
        addedCount++;
      }

      await batch.commit();
    }

    revalidatePath("/admin/properties");
    revalidatePath("/properties");

    return {
      success: true,
      count: docs.length,
      addedCount,
      skippedCount,
    };
  } catch (error) {
    console.error("Error bulk appending amenity:", error);
    return {
      success: false,
      error: "Error al añadir la amenidad en todas las propiedades.",
    };
  }
}

export async function handleUpdatePropertyAmenities(
  propertyId: string,
  lang: "es" | "en",
  amenities: string[]
) {
  if (!propertyId) return { success: false, error: "ID requerido" };

  const normalized = amenities.map((a) => a.trim()).filter(Boolean);

  try {
    if (lang === "es") {
      await adminDb.collection("properties").doc(propertyId).update({
        amenitiesEs: normalized,
        amenities: normalized,
        updatedAt: new Date(),
      });
    } else {
      await adminDb.collection("properties").doc(propertyId).update({
        amenitiesEn: normalized,
        updatedAt: new Date(),
      });
    }

    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${propertyId}/edit`);
    revalidatePath("/properties");

    return { success: true };
  } catch (error) {
    console.error("Error updating property amenities:", error);
    return { success: false, error: "Error al guardar las amenidades." };
  }
}

// --- BORRAR ---

export async function handleDeleteProperty(propertyId: string) {
  if (!propertyId) return { success: false, error: "ID requerido" };

  try {
    await adminDb.collection('properties').doc(propertyId).delete();
    revalidatePath("/admin/properties");
    return { success: true };
  } catch (error) {
    console.error("Error deleting property:", error);
    return { success: false, error: "Error al borrar la propiedad." };
  }
}