import "server-only";
import sharp from "sharp";
import type { PropertyReviewChannel } from "@/lib/types";

/** Recorte normalizado 0-1000 (convención de Gemini para bounding boxes). */
export interface AvatarBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ExtractedReviewFields {
  author: string;
  rating: number;
  text: string;
  reviewDate?: string;
  locale?: "es" | "en";
}

export interface ExtractedPlatformStatFields {
  averageRating: number;
  reviewCount: number;
}

/** Campos para el formulario de testimonios del sitio. */
export interface ExtractedTestimonialFields {
  name: string;
  text: string;
  rating: number;
  location?: string;
  locale?: "es" | "en";
  /** Plataforma de origen detectada en la captura. */
  platform?: PropertyReviewChannel;
  /** Id de la propiedad, sólo si coincide con una de las candidatas enviadas. */
  propertyId?: string;
  /** Recorte del avatar real del huésped, si Gemini detectó uno en la captura. */
  avatarBox?: AvatarBox;
}

/**
 * Alias estable de Google: siempre apunta al Flash vigente, así que no hay que
 * tocar el código cuando retiran una versión. Se puede fijar con GEMINI_MODEL.
 */
const DEFAULT_MODEL = "gemini-flash-latest";

const EXTRACT_REVIEW_PROMPT = `You analyze a screenshot of a guest review from Airbnb, Booking.com, Google, Vrbo, or similar.
Return ONLY valid JSON (no markdown) with:
- author: string (reviewer name)
- rating: number 1-5 (stars; use 5 if unclear)
- text: string (full review body)
- reviewDate: string optional (as shown, e.g. "March 2024" or ISO date)
- locale: "es" or "en" based on review language`;

const EXTRACT_PLATFORM_STAT_PROMPT = `You analyze a screenshot of a platform rating SUMMARY (not a single review), e.g. Google Business profile rating, Airbnb listing score, Booking.com property score.
Extract the overall average rating and total review count shown in the image.
Return ONLY valid JSON (no markdown) with:
- averageRating: number from 1 to 5 (one decimal allowed). If the platform shows a score out of 10 (e.g. Booking 9.2/10), convert to 5-star scale: (score/10)*5 rounded to one decimal.
- reviewCount: integer total number of reviews/opinions/ratings shown (e.g. 127, 1.2k -> 1200)`;

function buildTestimonialPrompt(properties: PropertyCandidate[]): string {
  const propertyBlock =
    properties.length > 0
      ? `\n\nCandidate properties (match ONLY if the screenshot clearly names or describes one of them):\n${properties
          .map((p) => `- id: ${p.id} | name: ${p.title}`)
          .join("\n")}\n- If none clearly matches, use null.`
      : "\n\nNo candidate properties were provided: always return null for propertyId.";

  return `You analyze a screenshot of a COMPLETE guest review from Airbnb, Booking.com, Google, Vrbo, Tripadvisor, or similar.
The image usually shows the reviewer name, star rating, review text, and sometimes their city or country.
Extract data for a vacation rental website testimonial card. Return ONLY valid JSON (no markdown) with:
- name: string (reviewer display name as shown)
- text: string (full review comment; keep line breaks as \\n if the review has paragraphs)
- rating: number 1-5 (stars shown; round to integer; use 5 if unclear)
- location: string optional (reviewer location if visible, e.g. "Monterrey, México" or "United States")
- locale: "es" or "en" based on the review language
- platform: one of "airbnb" | "booking" | "google" | "vrbo" | "tripadvisor" | "other".
  Infer it from branding, logo, colours, layout or wording in the screenshot. Use "other" only if genuinely unclear.
- propertyId: string or null. The listing/property the review refers to.${propertyBlock}
- avatarBox: bounding box of the reviewer's profile photo, as [ymin, xmin, ymax, xmax] with
  integers normalized to 0-1000 relative to image height/width. ONLY return this if it is a
  REAL photo of a person (not a generic silhouette icon, not a colored circle with initials,
  not a platform logo, not missing). If there is no real profile photo, use null.`;
}

export interface PropertyCandidate {
  id: string;
  title: string;
}

/** Imagen a analizar: bytes en memoria, o una URL pública que Gemini pueda leer. */
export type ScreenshotSource = { buffer: Buffer; mime: string } | string;

async function toInlineImage(
  source: ScreenshotSource
): Promise<{ mime: string; base64: string }> {
  if (typeof source !== "string") {
    return {
      mime: (source.mime || "image/jpeg").split(";")[0],
      base64: source.buffer.toString("base64"),
    };
  }
  const res = await fetch(source, { signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error("No se pudo descargar el screenshot");
  return {
    mime: (res.headers.get("content-type") || "image/jpeg").split(";")[0],
    base64: Buffer.from(await res.arrayBuffer()).toString("base64"),
  };
}

async function callGeminiVision(
  source: ScreenshotSource,
  prompt: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const { mime, base64 } = await toInlineImage(source);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          // Holgado: los modelos recientes consumen presupuesto en razonamiento
          // antes de emitir el JSON, y con poco margen devuelven texto vacío.
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 200);
    try {
      detail = (JSON.parse(errText) as { error?: { message?: string } }).error?.message ?? detail;
    } catch {
      // se queda el texto crudo recortado
    }
    if (res.status === 404) {
      throw new Error(
        `El modelo "${model}" no está disponible. Quita GEMINI_MODEL para usar el alias estable (${DEFAULT_MODEL}). Detalle: ${detail}`
      );
    }
    if (res.status === 429) {
      throw new Error("Límite de cuota de Gemini alcanzado. Intenta de nuevo en unos minutos.");
    }
    throw new Error(`Gemini error ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = json.candidates?.[0];
  const rawText = candidate?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!rawText) {
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new Error("La reseña es demasiado larga para analizarla de una vez. Recorta la captura.");
    }
    if (candidate?.finishReason === "SAFETY") {
      throw new Error("Gemini bloqueó la imagen por filtros de contenido.");
    }
    throw new Error("Gemini no devolvió contenido. Prueba con otra captura.");
  }

  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("La IA no devolvió JSON válido. Edita el borrador manualmente.");
  }
}

const REVIEW_CHANNELS: PropertyReviewChannel[] = [
  "airbnb",
  "booking",
  "google",
  "vrbo",
  "tripadvisor",
  "other",
];

function normalizeRating(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 5;
}

function normalizeString(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

/** Acepta [ymin,xmin,ymax,xmax] (formato Gemini) o el objeto equivalente; sólo valida forma, no geometría. */
function parseAvatarBox(raw: unknown): AvatarBox | undefined {
  if (Array.isArray(raw) && raw.length === 4 && raw.every((n) => typeof n === "number")) {
    const [ymin, xmin, ymax, xmax] = raw as number[];
    return { ymin, xmin, ymax, xmax };
  }
  if (raw && typeof raw === "object") {
    const b = raw as Record<string, unknown>;
    const { ymin, xmin, ymax, xmax } = b;
    if ([ymin, xmin, ymax, xmax].every((n) => typeof n === "number" && Number.isFinite(n))) {
      return { ymin, xmin, ymax, xmax } as AvatarBox;
    }
  }
  return undefined;
}

/**
 * Recorta el avatar detectado y lo devuelve como PNG cuadrado listo para subir.
 * Rechaza cajas geométricamente implausibles (logos, texto, la captura entera)
 * en vez de confiar ciegamente en lo que devolvió el modelo.
 */
export async function cropAvatarFromScreenshot(
  buffer: Buffer,
  box: AvatarBox
): Promise<Buffer | null> {
  const { ymin, xmin, ymax, xmax } = box;
  if (
    ![ymin, xmin, ymax, xmax].every((n) => Number.isFinite(n)) ||
    xmin < 0 ||
    ymin < 0 ||
    xmax > 1000 ||
    ymax > 1000 ||
    xmax <= xmin ||
    ymax <= ymin
  ) {
    return null;
  }

  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;

    const left = Math.max(0, Math.round((xmin / 1000) * meta.width));
    const top = Math.max(0, Math.round((ymin / 1000) * meta.height));
    const right = Math.min(meta.width, Math.round((xmax / 1000) * meta.width));
    const bottom = Math.min(meta.height, Math.round((ymax / 1000) * meta.height));
    const width = right - left;
    const height = bottom - top;
    if (width < 20 || height < 20) return null;

    // Geometría en píxeles reales: x e y normalizados a 0-1000 usan escalas
    // distintas (ancho vs alto) en capturas no cuadradas, así que comparar las
    // fracciones normalizadas directamente distorsiona el aspect ratio real.
    const minSide = Math.min(meta.width, meta.height);
    if (width > minSide * 0.4 || height > minSide * 0.4) return null;
    const aspect = width / height;
    if (aspect < 0.6 || aspect > 1.7) return null;

    return await sharp(buffer)
      .extract({ left, top, width, height })
      .resize(256, 256, { fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function extractReviewFromScreenshot(
  source: ScreenshotSource
): Promise<ExtractedReviewFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { author: "Huésped", rating: 5, text: "", locale: "es" };
  }

  const parsed = await callGeminiVision(source, EXTRACT_REVIEW_PROMPT);

  return {
    author: normalizeString(parsed.author) ?? "Huésped",
    rating: normalizeRating(parsed.rating),
    text: typeof parsed.text === "string" ? parsed.text.trim() : "",
    reviewDate: normalizeString(parsed.reviewDate),
    locale: parsed.locale === "en" ? "en" : "es",
  };
}

export async function extractTestimonialFromScreenshot(
  source: ScreenshotSource,
  properties: PropertyCandidate[] = []
): Promise<ExtractedTestimonialFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no configurada en el servidor. Añádela para analizar capturas."
    );
  }

  const parsed = await callGeminiVision(source, buildTestimonialPrompt(properties));

  const platformRaw = normalizeString(parsed.platform)?.toLowerCase();
  const platform = REVIEW_CHANNELS.find((c) => c === platformRaw);

  // Sólo se acepta un id que venga de la lista enviada: la IA no puede inventar propiedades.
  const propertyIdRaw = normalizeString(parsed.propertyId);
  const propertyId = properties.some((p) => p.id === propertyIdRaw) ? propertyIdRaw : undefined;

  return {
    name: normalizeString(parsed.name) ?? normalizeString(parsed.author) ?? "Huésped",
    rating: normalizeRating(parsed.rating),
    text: typeof parsed.text === "string" ? parsed.text.trim() : "",
    location: normalizeString(parsed.location),
    locale: parsed.locale === "en" ? "en" : "es",
    platform,
    propertyId,
    avatarBox: parseAvatarBox(parsed.avatarBox),
  };
}

export async function extractPlatformStatsFromScreenshot(
  source: ScreenshotSource
): Promise<ExtractedPlatformStatFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { averageRating: 5, reviewCount: 0 };
  }

  const parsed = await callGeminiVision(source, EXTRACT_PLATFORM_STAT_PROMPT);

  const averageRaw = parsed.averageRating;
  const countRaw = parsed.reviewCount;

  const averageRating =
    typeof averageRaw === "number"
      ? Math.min(5, Math.max(0, Math.round(averageRaw * 10) / 10))
      : 5;

  let reviewCount = 0;
  if (typeof countRaw === "number" && Number.isFinite(countRaw)) {
    reviewCount = Math.max(0, Math.round(countRaw));
  } else if (typeof countRaw === "string") {
    const normalized = countRaw.replace(/,/g, "").trim().toLowerCase();
    const kMatch = /^([\d.]+)\s*k$/.exec(normalized);
    if (kMatch) {
      reviewCount = Math.round(parseFloat(kMatch[1]) * 1000);
    } else {
      const n = parseInt(normalized, 10);
      reviewCount = Number.isFinite(n) ? Math.max(0, n) : 0;
    }
  }

  return { averageRating, reviewCount };
}
