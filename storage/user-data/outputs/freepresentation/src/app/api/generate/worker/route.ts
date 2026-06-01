import { NextRequest, NextResponse } from "next/server";
import { updateJob } from "@/lib/queue/upstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

/* ─────────────────────────────────────────────
   POST /api/generate/worker
   Called by QStash for background generation.
   Signature is verified to prevent abuse.
───────────────────────────────────────────── */

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, mode, prompt, text, themeId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    // Mark job as processing
    await updateJob(jobId, { status: "processing" });

    // Build formdata and call the main generate route
    const formData = new FormData();
    formData.append("mode", mode || "prompt");
    formData.append("themeId", themeId || "obsidian");
    if (prompt) formData.append("prompt", prompt);
    if (text) formData.append("text", text);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/generate`,
      { method: "POST", body: formData }
    );

    const data = await res.json();

    if (data.error || !data.presentation) {
      await updateJob(jobId, { status: "failed", error: data.error || "No presentation returned" });
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // Mark job as done with presentation ID
    await updateJob(jobId, {
      status: "done",
      presentationId: data.presentation.id,
    });

    return NextResponse.json({ ok: true, presentationId: data.presentation.id });
  } catch (err: any) {
    console.error("Worker error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Verify QStash signature in production
export const POST =
  process.env.NODE_ENV === "production"
    ? verifySignatureAppRouter(handler)
    : handler;
