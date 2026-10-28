import { NextRequest, NextResponse } from "next/server";
import { Presentation } from "@/types/presentation";
import { THEMES } from "@/lib/themes/themes";
import { resolveExportImage } from "@/lib/export/imageHelper";

export async function POST(req: NextRequest) {
  try {
    const presentation: Presentation = await req.json();
    if (!presentation || !Array.isArray(presentation.slides)) {
      return NextResponse.json({ error: "Invalid presentation data" }, { status: 400 });
    }

    const theme = THEMES[presentation.themeId] || THEMES.obsidian;

    const { jsPDF } = await import("jspdf");

    // Standard 16:9 widescreen presentation format (297mm x 167mm)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [297, 167],
    });

    const W = 297;
    const H = 167;

    const hexToRgb = (hex: string) => {
      const clean = (hex || "#000000").replace("#", "");
      const n = parseInt(clean, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };

    const setFill = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      doc.setFillColor(r, g, b);
    };
    const setTextColor = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      doc.setTextColor(r, g, b);
    };
    const setDrawColor = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      doc.setDrawColor(r, g, b);
    };

    const totalSlides = presentation.slides.length;

    for (let idx = 0; idx < totalSlides; idx++) {
      const slide = presentation.slides[idx];
      const body = Array.isArray(slide.body) ? slide.body : [];
      const image = await resolveExportImage(slide.image);
      const slideNum = String(idx + 1).padStart(2, "0");
      const pageIndicator = `${slideNum} / ${String(totalSlides).padStart(2, "0")}`;

      if (idx > 0) doc.addPage([W, H], "landscape");

      // ─────────────────────────────────────────────────────────────
      // 1. TITLE LAYOUT
      // ─────────────────────────────────────────────────────────────
      if (slide.layout === "title") {
        // Base background & top accent line
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Category Tag
        doc.setFont("courier", "bold");
        doc.setFontSize(9);
        setTextColor(theme.accent);
        doc.text("PRESENTATION", W / 2, 42, { align: "center" });

        // Main Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        setTextColor(theme.text);
        const titleText = slide.title || presentation.title || "Untitled";
        const titleLines = doc.splitTextToSize(titleText, 220);
        doc.text(titleLines, W / 2, 60, { align: "center" });

        // Subtitle
        if (body[0]) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          setTextColor(theme.muted);
          const subLines = doc.splitTextToSize(body[0], 180);
          doc.text(subLines, W / 2, 85, { align: "center" });
        }

        // Bottom Divider
        setDrawColor(theme.border);
        doc.setLineWidth(0.3);
        doc.line(W / 2 - 40, 115, W / 2 + 40, 115);

        // Footer slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 8, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 2. IMAGE-FULL LAYOUT (Full-bleed background image with scrim)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-full" && image) {
        // Full bleed image
        try {
          doc.addImage(image.dataUrl, image.format, 0, 0, W, H);
        } catch {
          setFill(theme.bg);
          doc.rect(0, 0, W, H, "F");
        }

        // Dark scrim band at bottom for text contrast
        setFill("#000000");
        doc.rect(0, 105, W, 62, "F");

        // Slide title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        setTextColor("#FFFFFF");
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 240);
        doc.text(titleLines, 20, 136);

        // Image credit
        if (slide.imageCredit) {
          doc.setFont("courier", "normal");
          doc.setFontSize(7);
          setTextColor("#CCCCCC");
          doc.text(slide.imageCredit, W - 20, H - 8, { align: "right" });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 3. IMAGE-RIGHT LAYOUT (Left: Text, Right: Half Image)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-right" && image) {
        // Background
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Right side image (width 145mm, height 167mm)
        try {
          doc.addImage(image.dataUrl, image.format, 152, 0, 145, H);
        } catch {
          setFill(theme.surface);
          doc.rect(152, 0, 145, H, "F");
        }

        // Left side text: accent pill
        setFill(theme.accent);
        doc.rect(20, 18, 16, 0.8, "F");

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 120);
        doc.text(titleLines, 20, 30);

        // Bullets
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let curY = 30 + titleLines.length * 7 + 6;
        body.slice(0, 4).forEach((bullet) => {
          const lines = doc.splitTextToSize(`• ${bullet}`, 120);
          doc.text(lines, 20, curY);
          curY += lines.length * 5 + 4;
        });

        // Image credit
        if (slide.imageCredit) {
          doc.setFont("courier", "normal");
          doc.setFontSize(6);
          setTextColor("#FFFFFF");
          doc.text(slide.imageCredit, W - 6, H - 6, { align: "right" });
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, 20, H - 8);
      }

      // ─────────────────────────────────────────────────────────────
      // 4. IMAGE-LEFT LAYOUT (Left: Half Image, Right: Text)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-left" && image) {
        // Background
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Left side image
        try {
          doc.addImage(image.dataUrl, image.format, 0, 0, 145, H);
        } catch {
          setFill(theme.surface);
          doc.rect(0, 0, 145, H, "F");
        }

        // Right side text: accent pill
        setFill(theme.accent);
        doc.rect(160, 18, 16, 0.8, "F");

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 120);
        doc.text(titleLines, 160, 30);

        // Bullets
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let curY = 30 + titleLines.length * 7 + 6;
        body.slice(0, 4).forEach((bullet) => {
          const lines = doc.splitTextToSize(`• ${bullet}`, 120);
          doc.text(lines, 160, curY);
          curY += lines.length * 5 + 4;
        });

        // Image credit
        if (slide.imageCredit) {
          doc.setFont("courier", "normal");
          doc.setFontSize(6);
          setTextColor("#FFFFFF");
          doc.text(slide.imageCredit, 6, H - 6);
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 8, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 5. TWO-COL LAYOUT (Left: Title, Right: Numbered List)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "two-col") {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Left side accent bar & title
        setFill(theme.accent);
        doc.rect(20, 20, 20, 0.8, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 100);
        doc.text(titleLines, 20, 34);

        // Right side numbered list
        let curY = 30;
        body.slice(0, 4).forEach((item, i) => {
          // Number 01, 02...
          doc.setFont("courier", "bold");
          doc.setFontSize(10);
          setTextColor(theme.accent);
          doc.text(`0${i + 1}`, 145, curY);

          // Content
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          setTextColor(theme.muted);
          const lines = doc.splitTextToSize(item, 125);
          doc.text(lines, 155, curY);
          curY += Math.max(lines.length * 5 + 8, 16);
        });

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 8, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 6. STATS LAYOUT (Title + 3 Stat Columns)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "stats" && slide.stats && slide.stats.length > 0) {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Accent pill & Title
        setFill(theme.accent);
        doc.rect(20, 18, 18, 0.8, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        setTextColor(theme.text);
        doc.text(slide.title || "Key Metrics", 20, 32);

        // 3 Stat Columns
        slide.stats.slice(0, 3).forEach((stat, i) => {
          const colX = 20 + i * 85;
          // Divider line
          setDrawColor(theme.border);
          doc.setLineWidth(0.3);
          doc.line(colX, 60, colX + 75, 60);

          // Value
          doc.setFont("helvetica", "bold");
          doc.setFontSize(28);
          setTextColor(theme.accent);
          doc.text(stat.value, colX, 80);

          // Label
          doc.setFont("courier", "bold");
          doc.setFontSize(8);
          setTextColor(theme.muted);
          const labelLines = doc.splitTextToSize(stat.label.toUpperCase(), 75);
          doc.text(labelLines, colX, 92);
        });

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 8, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 7. QUOTE LAYOUT
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "quote") {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Big quotation mark
        doc.setFont("helvetica", "bold");
        doc.setFontSize(56);
        setTextColor(theme.accent);
        doc.text("\u201C", 25, 42);

        // Quote text
        doc.setFont("helvetica", "italic");
        doc.setFontSize(16);
        setTextColor(theme.text);
        const quoteText = slide.quote || body[0] || slide.title || "";
        const quoteLines = doc.splitTextToSize(quoteText, 245);
        doc.text(quoteLines, 25, 62);

        // Author
        if (slide.quoteAuthor) {
          doc.setFont("courier", "normal");
          doc.setFontSize(10);
          setTextColor(theme.muted);
          doc.text(
            `— ${slide.quoteAuthor.toUpperCase()}`,
            25,
            62 + quoteLines.length * 8 + 8
          );
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 8, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 8. CONTENT LAYOUT (Standard layout: Title, Bullets, optional image)
      // ─────────────────────────────────────────────────────────────
      else {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        const hasImg = !!image;
        const textWidth = hasImg ? 135 : 255;

        // Accent pill
        setFill(theme.accent);
        doc.rect(20, 18, 16, 0.8, "F");

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", textWidth);
        doc.text(titleLines, 20, 30);

        // Bullets
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let curY = 30 + titleLines.length * 7 + 4;
        body.slice(0, 5).forEach((bullet) => {
          const lines = doc.splitTextToSize(`— ${bullet}`, textWidth);
          doc.text(lines, 20, curY);
          curY += lines.length * 5 + 4;
        });

        // Optional image
        if (image) {
          try {
            doc.addImage(image.dataUrl, image.format, 170, 25, 105, 105);
          } catch {
            // Gracefully ignore image embedding failure
          }
          if (slide.imageCredit) {
            doc.setFont("courier", "normal");
            doc.setFontSize(6);
            setTextColor(theme.muted);
            doc.text(slide.imageCredit, W - 22, 134, { align: "right" });
          }
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 8, { align: "right" });
      }
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const safeTitle =
      (presentation.title || "presentation")
        .replace(/[^a-zA-Z0-9_\s-]/g, "_")
        .trim() || "presentation";

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF export error:", err);
    return NextResponse.json(
      { error: err?.message || "PDF export failed" },
      { status: 500 }
    );
  }
}
