import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    // Extract text using PDF.js
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      const textParts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .trim();
        if (pageText) textParts.push(pageText);
      }

      extractedText = textParts.join("\n\n");
    } catch (pdfErr) {
      console.error("PDF text extraction failed:", pdfErr);
    }

    let methodUsed = "pdfjs";

    // Stage 2: Upstash OCR Fallback
    if (!extractedText.trim()) {
      try {
        console.log("[OCR Pipeline] Stage 2: Attempting Upstash OCR...");
        if (process.env.UPSTASH_OCR_API_URL && process.env.UPSTASH_OCR_API_TOKEN) {
          const upstashRes = await fetch(process.env.UPSTASH_OCR_API_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.UPSTASH_OCR_API_TOKEN}`,
              "Content-Type": "application/pdf"
            },
            body: buffer,
          });
          if (upstashRes.ok) {
            const data = await upstashRes.json();
            extractedText = data.text || "";
            if (extractedText.trim()) {
              methodUsed = "upstash_ocr";
            }
          }
        } else {
          console.warn("[OCR Pipeline] Upstash OCR keys not found. Skipping Stage 2.");
        }
      } catch (upstashErr) {
        console.error("[OCR Pipeline] Upstash OCR failed:", upstashErr);
      }
    }

    // Stage 3: Qwen / Gemini Multimodal OCR Fallback
    if (!extractedText.trim()) {
      try {
        const base64PDF = buffer.toString("base64");

        // 3a. Direct Qwen OCR via DashScope API
        if (process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY !== "your_dashscope_key_here") {
          console.log("[OCR Pipeline] Stage 3: Attempting direct Qwen-VL OCR...");
          const qwenRes = await fetch(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.DASHSCOPE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "qwen-vl-max",
                input: {
                  messages: [
                    {
                      role: "user",
                      content: [
                        { image: `data:application/pdf;base64,${base64PDF}` },
                        { text: "Extract all text and structure from this document. Provide only the extracted plain text with no formatting." }
                      ]
                    }
                  ]
                }
              }),
            }
          );
          if (qwenRes.ok) {
            const data = await qwenRes.json();
            extractedText = data.output?.choices?.[0]?.message?.content?.[0]?.text || "";
            if (extractedText.trim()) {
              methodUsed = "qwen_ocr";
            }
          }
        }

        // 3b. Fallback to Gemini Multimodal OCR
        if (!extractedText.trim()) {
          console.log("[OCR Pipeline] Stage 3: Attempting Multimodal Gemini (Qwen-level) OCR...");
          if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here") {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          inlineData: {
                            mimeType: "application/pdf",
                            data: base64PDF,
                          },
                        },
                        {
                          text: "Extract all text and structure from this document. Provide only the extracted plain text with no formatting.",
                        },
                      ],
                    },
                  ],
                }),
              }
            );
            if (geminiRes.ok) {
              const data = await geminiRes.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              extractedText = text;
              if (extractedText.trim()) {
                methodUsed = "gemini_multimodal_ocr";
              }
            }
          } else {
            console.warn("[OCR Pipeline] Gemini API Key not found. Skipping Stage 3.");
          }
        }
      } catch (ocrErr) {
        console.error("[OCR Pipeline] Stage 3 OCR failed:", ocrErr);
      }
    }

    // Stage 4: Tesseract.js offline fallback
    if (!extractedText.trim()) {
      try {
        console.log("[OCR Pipeline] Stage 4: Attempting offline Tesseract OCR...");
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const { data } = await worker.recognize(buffer);
        await worker.terminate();

        extractedText = data.text;
        if (extractedText.trim()) {
          methodUsed = "tesseract";
        }
      } catch (tessErr) {
        console.error("Tesseract OCR failed:", tessErr);
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. Try copying and pasting the content." },
        { status: 422 }
      );
    }

    const cleanedText = extractedText
      .replace(/\s{3,}/g, "\n\n")
      .replace(/\n{4,}/g, "\n\n")
      .trim()
      .substring(0, 8000);

    return NextResponse.json({
      text: cleanedText,
      charCount: cleanedText.length,
      method: methodUsed,
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}
