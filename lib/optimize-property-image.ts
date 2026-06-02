import "server-only";
import { adminStorage } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 82;
const HOSTFULLY_S3_HOST = "orbirental-images.s3.amazonaws.com";
const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";

function isAlreadyOptimized(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === FIREBASE_STORAGE_HOST || host.endsWith(".firebasestorage.app");
  } catch {
    return false;
  }
}

function isHostfullySource(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === HOSTFULLY_S3_HOST;
  } catch {
    return false;
  }
}

async function resizeToJpeg(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

async function uploadToStorage(jpeg: Buffer, folder: string): Promise<string> {
  const bucket = adminStorage.bucket();
  const path = `${folder}/${uuidv4()}.jpg`;
  const file = bucket.file(path);
  await file.save(jpeg, {
    metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" },
  });
  await file.makePublic().catch(() => {
    /* bucket may use uniform access */
  });
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

/**
 * Downloads a Hostfully/S3 image, resizes, uploads to Firebase Storage.
 * Returns original URL on failure or if already on Firebase Storage.
 */
export async function optimizePropertyImageUrl(
  sourceUrl: string,
  storageFolder: string
): Promise<string> {
  if (!sourceUrl?.startsWith("http") || isAlreadyOptimized(sourceUrl)) {
    return sourceUrl;
  }
  if (!isHostfullySource(sourceUrl) && process.env.OPTIMIZE_ALL_PROPERTY_IMAGES !== "true") {
    return sourceUrl;
  }

  try {
    const res = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return sourceUrl;
    const arrayBuffer = await res.arrayBuffer();
    const jpeg = await resizeToJpeg(Buffer.from(arrayBuffer));
    return await uploadToStorage(jpeg, storageFolder);
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[optimizePropertyImage]", sourceUrl.slice(0, 80), err);
    }
    return sourceUrl;
  }
}

/** Optimizes up to `limit` images (first pass on sync). */
export async function optimizePropertyImageUrls(
  urls: string[],
  storageFolder: string,
  limit = 8
): Promise<string[]> {
  const slice = urls.slice(0, limit);
  const rest = urls.slice(limit);
  const optimized = await Promise.all(
    slice.map((url) => optimizePropertyImageUrl(url, storageFolder))
  );
  return [...optimized, ...rest];
}
