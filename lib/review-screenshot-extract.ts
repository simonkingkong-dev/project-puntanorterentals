import "server-only";

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
}

const EXTRACT_REVIEW_PROMPT = `You analyze a screenshot of a guest review from Airbnb, Booking.com, Google, Vrbo, or similar.
Return ONLY valid JSON (no markdown) with:
- author: string (reviewer name)
- rating: number 1-5 (stars; use 5 if unclear)
- text: string (full review body)
- reviewDate: string optional (as shown, e.g. "March 2024" or ISO date)
- locale: "es" or "en" based on review language`;

const EXTRACT_TESTIMONIAL_PROMPT = `You analyze a screenshot of a COMPLETE guest review from Airbnb, Booking.com, Google, Vrbo, Tripadvisor, or similar.
The image usually shows the reviewer name, star rating, review text, and sometimes their city or country.
Extract data for a vacation rental website testimonial card. Return ONLY valid JSON (no markdown) with:
- name: string (reviewer display name as shown)
- text: string (full review comment; keep line breaks as \\n if the review has paragraphs)
- rating: number 1-5 (stars shown; round to integer; use 5 if unclear)
- location: string optional (reviewer location if visible, e.g. "Monterrey, México" or "United States")
- locale: "es" or "en" based on the review language`;

const EXTRACT_PLATFORM_STAT_PROMPT = `You analyze a screenshot of a platform rating SUMMARY (not a single review), e.g. Google Business profile rating, Airbnb listing score, Booking.com property score.
Extract the overall average rating and total review count shown in the image.
Return ONLY valid JSON (no markdown) with:
- averageRating: number from 1 to 5 (one decimal allowed). If the platform shows a score out of 10 (e.g. Booking 9.2/10), convert to 5-star scale: (score/10)*5 rounded to one decimal.
- reviewCount: integer total number of reviews/opinions/ratings shown (e.g. 127, 1.2k -> 1200)`;

async function callGeminiVision(
  imageUrl: string,
  prompt: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada");
  }

  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(25_000) });
  if (!imageRes.ok) throw new Error("No se pudo descargar el screenshot");
  const mime = imageRes.headers.get("content-type") || "image/jpeg";
  const base64 = Buffer.from(await imageRes.arrayBuffer()).toString("base64");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
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
              { inline_data: { mime_type: mime.split(";")[0], data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(60_000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${res.status} ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("La IA no devolvió JSON válido. Edita el borrador manualmente.");
  }
}

export async function extractReviewFromScreenshot(
  imageUrl: string
): Promise<ExtractedReviewFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      author: "Huésped",
      rating: 5,
      text: "",
      locale: "es",
    };
  }

  const parsed = await callGeminiVision(imageUrl, EXTRACT_REVIEW_PROMPT);

  const ratingRaw = parsed.rating;
  const rating =
    typeof ratingRaw === "number"
      ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
      : 5;

  return {
    author: typeof parsed.author === "string" && parsed.author.trim() ? parsed.author.trim() : "Huésped",
    rating,
    text: typeof parsed.text === "string" ? parsed.text.trim() : "",
    reviewDate:
      typeof parsed.reviewDate === "string" && parsed.reviewDate.trim()
        ? parsed.reviewDate.trim()
        : undefined,
    locale: parsed.locale === "en" ? "en" : "es",
  };
}

export async function extractTestimonialFromScreenshot(
  imageUrl: string
): Promise<ExtractedTestimonialFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY no configurada. Añádela en .env.local para analizar capturas."
    );
  }

  const parsed = await callGeminiVision(imageUrl, EXTRACT_TESTIMONIAL_PROMPT);

  const ratingRaw = parsed.rating;
  const rating =
    typeof ratingRaw === "number"
      ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
      : 5;

  const name =
    typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name.trim()
      : typeof parsed.author === "string" && parsed.author.trim()
        ? parsed.author.trim()
        : "Huésped";

  return {
    name,
    rating,
    text: typeof parsed.text === "string" ? parsed.text.trim() : "",
    location:
      typeof parsed.location === "string" && parsed.location.trim()
        ? parsed.location.trim()
        : undefined,
    locale: parsed.locale === "en" ? "en" : "es",
  };
}

export async function extractPlatformStatsFromScreenshot(
  imageUrl: string
): Promise<ExtractedPlatformStatFields> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      averageRating: 5,
      reviewCount: 0,
    };
  }

  const parsed = await callGeminiVision(imageUrl, EXTRACT_PLATFORM_STAT_PROMPT);

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

