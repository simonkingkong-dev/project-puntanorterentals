import "server-only";

export interface ExtractedReviewFields {
  author: string;
  rating: number;
  text: string;
  reviewDate?: string;
  locale?: "es" | "en";
}

const EXTRACT_PROMPT = `You analyze a screenshot of a guest review from Airbnb, Booking.com, Google, Vrbo, or similar.
Return ONLY valid JSON (no markdown) with:
- author: string (reviewer name)
- rating: number 1-5 (stars; use 5 if unclear)
- text: string (full review body)
- reviewDate: string optional (as shown, e.g. "March 2024" or ISO date)
- locale: "es" or "en" based on review language`;

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
              { text: EXTRACT_PROMPT },
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("La IA no devolvió JSON válido. Edita el borrador manualmente.");
  }

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
