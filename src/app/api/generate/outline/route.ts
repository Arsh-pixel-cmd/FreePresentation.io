import { NextRequest, NextResponse } from "next/server";
import { ThemeId } from "@/types/presentation";
import { checkRateLimit } from "@/lib/queue/upstash";

function getOutlineSystemPrompt(audience: string, tone: string, slideCount: number) {
  return `You are a professional presentation architect.
Your job is to generate a logical, highly structured presentation outline JSON from a user's prompt or text source.

TARGET AUDIENCE: ${audience}
TONE OF VOICE: ${tone}

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no backticks, no preamble
2. Create exactly ${slideCount} slides
3. Use varied layouts: title, content, two-col, image-right, image-left, image-full, quote, stats
4. The first slide must be layout: "title"
5. Each slide outline must include:
   - "id": string (unique key like "slide-1", "slide-2")
   - "title": string (compelling, focused slide title)
   - "layout": string (one of the valid layouts)
   - "summary": string (a concise 15-25 word description or primary talking point)
6. DO NOT write full slide content (no body bullet arrays or image queries), just high-level outlines.

JSON SCHEMA (return this exact structure):
{
  "title": "Overall Presentation Title",
  "slides": [
    {
      "id": "slide-1",
      "layout": "title",
      "title": "Main Presentation Title",
      "summary": "Introduction to the topic and outline of core themes."
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
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

    const { text, audience = "General Public", tone = "Professional", slideCount = 10 } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No topic or content provided" }, { status: 400 });
    }

    const cleanedText = text.trim().substring(0, 5000);
    const systemPrompt = getOutlineSystemPrompt(audience, tone, slideCount);

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
                  text: `${systemPrompt}\n\nCreate a presentation outline about:\n${cleanedText}`,
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
      return await generateOutlineWithDeepSeek(cleanedText, audience, tone, slideCount);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const outlineData = parseJSON(rawText);
    if (!outlineData || !Array.isArray(outlineData.slides) || outlineData.slides.length === 0) {
      return await generateOutlineWithDeepSeek(cleanedText, audience, tone, slideCount);
    }

    return NextResponse.json({ outline: outlineData });
  } catch (err) {
    console.error("Outline generation error:", err);
    return NextResponse.json({ error: "Outline generation failed" }, { status: 500 });
  }
}

async function generateOutlineWithDeepSeek(text: string, audience: string, tone: string, slideCount: number) {
  const systemPrompt = getOutlineSystemPrompt(audience, tone, slideCount);

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a presentation outline about:\n${text}` },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error("Primary and backup generation engines failed to generate outline");

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content || "";
  const outlineData = parseJSON(rawText);

  if (!outlineData || !Array.isArray(outlineData.slides) || outlineData.slides.length === 0) {
    throw new Error("Failed to parse DeepSeek outline response");
  }

  return NextResponse.json({ outline: outlineData });
}

function parseJSON(raw: string): any {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
