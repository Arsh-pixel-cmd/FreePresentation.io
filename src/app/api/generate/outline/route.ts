import { NextRequest, NextResponse } from "next/server";
import { ThemeId } from "@/types/presentation";
import { checkRateLimit } from "@/lib/queue/upstash";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NVIDIA_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes for outline (smaller task)
const NVIDIA_MAX_RETRIES = 2;

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

// ---------------------------------------------------------------------------
// NVIDIA streaming helper — avoids headers timeout by reading SSE chunks
// ---------------------------------------------------------------------------
async function callNvidiaStreaming(
  systemPrompt: string,
  userPrompt: string,
  nvidiaKey: string,
  model: string,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= NVIDIA_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
      console.log(`NVIDIA outline retry ${attempt}/${NVIDIA_MAX_RETRIES} after ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);

    try {
      const res = await fetch(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${nvidiaKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
            stream: true,
          }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`NVIDIA outline API error (attempt ${attempt}):`, errorText);
        lastError = new Error(`NVIDIA API returned ${res.status}: ${errorText}`);
        continue;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("NVIDIA response has no body stream");

      const decoder = new TextDecoder();
      let assembled = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;

          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) assembled += delta;
          } catch {
            // skip malformed chunks
          }
        }
      }

      clearTimeout(timeout);
      return assembled;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === "AbortError") {
        lastError = new Error("NVIDIA outline API request timed out");
      } else {
        lastError = err;
      }
      console.error(`NVIDIA outline fetch error (attempt ${attempt}):`, lastError);
    }
  }

  throw lastError || new Error("NVIDIA outline API failed after retries");
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
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

    const body = await req.json();
    const { text, audience = "General Public", tone = "Professional", slideCount = 10, turnstileToken } = body;

    const token = turnstileToken || req.headers.get("x-turnstile-token");
    const turnstileResult = await verifyTurnstileToken(token, ip);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || "Turnstile verification failed" },
        { status: 403 }
      );
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No topic or content provided" }, { status: 400 });
    }

    const cleanedText = text.trim().substring(0, 5000);
    const systemPrompt = getOutlineSystemPrompt(audience, tone, slideCount);

    const rawKey = process.env["NVIDIA_diffusiongemma-26b-a4b-it_API_KEY"];
    if (!rawKey) {
      return NextResponse.json({ error: "NVIDIA API Key not configured" }, { status: 500 });
    }
    const nvidiaKey = rawKey.startsWith("nvapi-") ? rawKey : `nvapi-${rawKey}`;

    // --- Call NVIDIA with streaming + retries ---
    const rawText = await callNvidiaStreaming(
      systemPrompt,
      `Create a presentation outline about:\n${cleanedText}`,
      nvidiaKey,
      "google/gemma-4-31b-it",
    );

    const outlineData = parseJSON(rawText);
    if (!outlineData || !Array.isArray(outlineData.slides) || outlineData.slides.length === 0) {
      console.error("Failed to parse Nvidia outline response. Raw text was:", rawText.slice(0, 500));
      return NextResponse.json({ error: "Failed to generate a valid presentation outline structure" }, { status: 502 });
    }

    return NextResponse.json({ outline: outlineData });
  } catch (err) {
    console.error("Outline generation error:", err);
    return NextResponse.json({ error: "Outline generation failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// JSON parser — tolerant of markdown wrappers
// ---------------------------------------------------------------------------
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

