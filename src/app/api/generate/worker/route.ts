import { NextRequest, NextResponse } from "next/server";
import { updateJob } from "@/lib/queue/upstash";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, mode, prompt, text, themeId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    await updateJob(jobId, { status: "processing" });

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

export const POST = async (req: NextRequest, ...args: any[]) => {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
    process.env.QSTASH_NEXT_SIGNING_KEY
  ) {
    const wrapped = verifySignatureAppRouter(handler);
    return wrapped(req, ...(args as any));
  }
  return handler(req);
};
