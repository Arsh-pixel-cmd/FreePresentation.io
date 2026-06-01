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

    // OCR fallback with Tesseract
    if (!extractedText.trim()) {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const { data } = await worker.recognize(buffer);
        await worker.terminate();

        extractedText = data.text;
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
      method: extractedText ? "pdfjs" : "tesseract",
    });
  } catch (err) {
    console.error("PDF parse error:", err);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}
