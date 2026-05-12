/**
 * Hostfully / Orbirental S3 originals are often multi‑MB JPEGs.
 * Next.js image optimization (remote fetch + sharp) can hit timeouts and return 500.
 * For this host only, skip the optimizer so the browser loads the asset directly (still uses next/image layout/sizes).
 */
export function remoteImageShouldBypassOptimization(src: string | null | undefined): boolean {
  if (!src || !/^https?:\/\//i.test(src)) return false;
  try {
    return new URL(src).hostname.toLowerCase() === "orbirental-images.s3.amazonaws.com";
  } catch {
    return false;
  }
}
