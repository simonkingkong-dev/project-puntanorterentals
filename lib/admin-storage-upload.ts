import "server-only";
import { adminStorage } from "@/lib/firebase-admin";
import { v4 as uuidv4 } from "uuid";

export async function uploadAdminBuffer(
  buffer: Buffer,
  contentType: string,
  folder: string
): Promise<string> {
  const bucket = adminStorage.bucket();
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${folder}/${uuidv4()}.${ext}`;
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: { contentType, cacheControl: "public, max-age=31536000" },
  });
  await file.makePublic().catch(() => undefined);
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}
