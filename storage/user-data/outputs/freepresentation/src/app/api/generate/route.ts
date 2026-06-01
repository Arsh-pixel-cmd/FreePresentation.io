import { NextRequest, NextResponse } from "next/server";
import { Presentation, Slide, ThemeId } from "@/types/presentation";
import { checkRateLimit } from "@/lib/queue/upstash";

/* ─────────────────────────────────────────────
   POST /api/generate
   Accepts: FormData { mode, themeId, prompt?, text?, file? }
   Returns: { presentation: Presentation }
───────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a professional presentation designer and content strategist.
Your job is to create a structured JSON presentation from a user's topic or content.

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no backticks, no preamble
2. Generate exactly 12 slides
3. Use varied layouts: title, content, two-col, image-right, image-left, image-full, quote, stats
4. The first slide must be layout: "title"
5. Every slide needs a compelling imageQuery (2-5 words for Unsplash search)
6. Content should be professional, insightful, and well-structured
7. Body bullets: 3-5 items, each 8-15 words
8. Stats layout: include "stats" array with 3 items: { label: string, value: string }
9. Quote layout: include "quote" string and "quoteAuthor" string
10. DO NOT use generic filler like "Key Point 1" — write real, substantive content

JSON SCHEMA (return this exact structure):
{
  "title": "Presentation title",
  "slides": [
    {
      "id": "slide-1",
      "layout": "title",
      "title": "Main title",
      "body": ["Subtitle or tagline"],
      "imageQuery": "relevant photo query",
      "speakerNotes": "Notes for this slide"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    // ── Rate limiting ────────────────────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "anonymous";

    const { allowed, remaining, resetIn } = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Try again in ${resetIn}s.` },
        { status: 429, headers: { "Retry-After": String(resetIn) } }
      );
    }

    const formData = await req.formData();
    const mode = formData.get("mode") as string;
    const themeId = (formData.get("themeId") as ThemeId) || "obsidian";
    let userContent = "";

    if (mode === "prompt") {
      userContent = formData.get("prompt") as string;
    } else if (mode === "paste") {
      userContent = formData.get("text") as string;
    }

    if (!userContent?.trim()) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nCreate a presentation about:\n${userContent}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      // Fallback to DeepSeek
      return await generateWithDeepSeek(userContent, themeId);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const slideData = parseJSON(rawText);
    if (!slideData) {
      return await generateWithDeepSeek(userContent, themeId);
    }

    // Validate slides array
    if (!Array.isArray(slideData.slides) || slideData.slides.length === 0) {
      return await generateWithDeepSeek(userContent, themeId);
    }

    // Fetch images for each slide
    const slidesWithImages = await attachImages(slideData.slides as Slide[]);

    const presentation: Presentation = {
      id: `pres-${Date.now()}`,
      title: slideData.title || "My Presentation",
      topic: userContent,
      slides: slidesWithImages,
      themeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ presentation });
  } catch (err) {
    console.error("Generation error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

// ── DeepSeek fallback ─────────────────────────
async function generateWithDeepSeek(userContent: string, themeId: ThemeId) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Create a presentation about:\n${userContent}` },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error("Both AI providers failed");

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content || "";
  const slideData = parseJSON(rawText);

  if (!slideData) throw new Error("Could not parse AI response");

  const slidesWithImages = await attachImages(slideData.slides as Slide[]);

  const presentation: Presentation = {
    id: `pres-${Date.now()}`,
    title: slideData.title || "My Presentation",
    topic: userContent,
    slides: slidesWithImages,
    themeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ presentation });
}

// ── Image attachment ──────────────────────────
async function attachImages(slides: Slide[]): Promise<Slide[]> {
  return await Promise.all(
    slides.map(async (slide) => {
      if (!slide.imageQuery) return slide;

      // Try Unsplash first
      const unsplashUrl = await fetchUnsplashImage(slide.imageQuery);
      if (unsplashUrl) return { ...slide, image: unsplashUrl };

      // Fallback to Pollinations.ai
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        slide.imageQuery + ", professional photography, high quality"
      )}?width=1200&height=675&nologo=true`;

      return { ...slide, image: pollinationsUrl };
    })
  );
}

async function fetchUnsplashImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.urls?.regular || null;
  } catch {
    return null;
  }
}

// ── JSON parser (strips markdown fences) ─────
function parseJSON(raw: string): any {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON in the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); }
      catch { return null; }
    }
    return null;
  }
}
