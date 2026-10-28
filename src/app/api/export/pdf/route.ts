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

      // Set consistent line height factor for clean, uncompressed typography
      doc.setLineHeightFactor(1.25);

      // ─────────────────────────────────────────────────────────────
      // 1. TITLE LAYOUT
      // ─────────────────────────────────────────────────────────────
      if (slide.layout === "title") {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 2, "F");

        // Category Tag
        doc.setFont("courier", "bold");
        doc.setFontSize(9);
        setTextColor(theme.accent);
        doc.text("PRESENTATION", W / 2, 38, { align: "center" });

        // Main Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        setTextColor(theme.text);
        const titleText = slide.title || presentation.title || "Untitled";
        const titleLines = doc.splitTextToSize(titleText, 210);

        // Vertically calculate start position based on title length
        const titleStartY = titleLines.length > 2 ? 48 : titleLines.length === 2 ? 54 : 60;
        doc.text(titleLines, W / 2, titleStartY, { align: "center" });

        // Subtitle positioned dynamically below the title lines
        let nextY = titleStartY + titleLines.length * 10.5 + 4;
        if (body[0]) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          setTextColor(theme.muted);
          const subLines = doc.splitTextToSize(body[0], 180);
          doc.text(subLines, W / 2, nextY, { align: "center" });
          nextY += subLines.length * 5.5;
        }

        // Bottom Divider
        setDrawColor(theme.border);
        doc.setLineWidth(0.3);
        const divY = Math.min(Math.max(nextY + 12, 110), 135);
        doc.line(W / 2 - 40, divY, W / 2 + 40, divY);

        // Footer slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 9, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 2. IMAGE-FULL LAYOUT (Full-bleed background image with scrim)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-full" && image) {
        try {
          doc.addImage(image.dataUrl, image.format, 0, 0, W, H);
        } catch {
          setFill(theme.bg);
          doc.rect(0, 0, W, H, "F");
        }

        // Scrim gradient / band at bottom for high-contrast readability
        setFill("#000000");
        doc.rect(0, 100, W, 67, "F");

        // Slide title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        setTextColor("#FFFFFF");
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 240);
        const titleY = Math.max(148 - titleLines.length * 9, 115);
        doc.text(titleLines, 20, titleY);

        // Image credit
        if (slide.imageCredit) {
          doc.setFont("courier", "normal");
          doc.setFontSize(7);
          setTextColor("#D1D5DB");
          doc.text(slide.imageCredit, W - 20, H - 9, { align: "right" });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 3. IMAGE-RIGHT LAYOUT (Left: Text, Right: Half Image)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-right" && image) {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Right side image (x: 152 to 297, width: 145mm)
        try {
          doc.addImage(image.dataUrl, image.format, 152, 0, 145, H);
        } catch {
          setFill(theme.surface);
          doc.rect(152, 0, 145, H, "F");
        }

        // Left side accent pill
        setFill(theme.accent);
        doc.rect(20, 18, 16, 0.8, "F");

        // Title on left (max width: 120mm to leave margin before image)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 120);
        doc.text(titleLines, 20, 28);

        // Bullets dynamically spaced below title
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let curY = 28 + titleLines.length * 7.5 + 4;

        for (const bullet of body.slice(0, 4)) {
          if (curY > H - 24) break; // Guard against overflowing into footer
          const lines = doc.splitTextToSize(`•  ${bullet}`, 120);
          doc.text(lines, 20, curY);
          curY += lines.length * 4.4 + 4;
        }

        // Image credit at bottom-right overlaying the image
        if (slide.imageCredit) {
          doc.setFont("courier", "normal");
          doc.setFontSize(6.5);
          setTextColor("#FFFFFF");
          doc.text(slide.imageCredit, W - 6, H - 6, { align: "right" });
        }

        // Slide number on left footer
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, 20, H - 9);
      }

      // ─────────────────────────────────────────────────────────────
      // 4. IMAGE-LEFT LAYOUT (Left: Half Image, Right: Text)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-left" && image) {
        setFill(theme.bg);
        doc.rect(0, 0, W, H, "F");
        setFill(theme.accent);
        doc.rect(0, 0, W, 1.5, "F");

        // Left side image (x: 0 to 145)
        try {
          doc.addImage(image.dataUrl, image.format, 0, 0, 145, H);
        } catch {
          setFill(theme.surface);
          doc.rect(0, 0, 145, H, "F");
        }

        // Right side accent pill
        setFill(theme.accent);
        doc.rect(160, 18, 16, 0.8, "F");

        // Title on right (max width: 120mm)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 120);
        doc.text(titleLines, 160, 28);

        // Bullets on right
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let curY = 28 + titleLines.length * 7.5 + 4;

        for (const bullet of body.slice(0, 4)) {
          if (curY > H - 24) break;
          const lines = doc.splitTextToSize(`•  ${bullet}`, 120);
          doc.text(lines, 160, curY);
          curY += lines.length * 4.4 + 4;
        }

        // Image credit at bottom-left overlaying the image
        if (slide.imageCredit) {
          doc.setFont("courier", "normal");
          doc.setFontSize(6.5);
          setTextColor("#FFFFFF");
          doc.text(slide.imageCredit, 6, H - 6);
        }

        // Slide number on right footer
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 9, { align: "right" });
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
        doc.text(titleLines, 20, 32);

        // Right side numbered list starting at x: 140
        let curY = 28;
        for (let i = 0; i < Math.min(body.length, 4); i++) {
          if (curY > H - 24) break;
          const item = body[i];

          // Number badge (01, 02...)
          doc.setFont("courier", "bold");
          doc.setFontSize(10);
          setTextColor(theme.accent);
          doc.text(`0${i + 1}`, 140, curY);

          // Content
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          setTextColor(theme.muted);
          const lines = doc.splitTextToSize(item, 125);
          doc.text(lines, 152, curY);

          curY += Math.max(lines.length * 4.4 + 5, 14);
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 9, { align: "right" });
      }

      // ─────────────────────────────────────────────────────────────
      // 6. STATS LAYOUT (Title + 3 Stat Columns with Auto-Scaling)
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
        const titleLines = doc.splitTextToSize(slide.title || "Key Metrics", 255);
        doc.text(titleLines, 20, 30);

        // 3 Stat Columns with auto-scaling to prevent horizontal overlap
        const colWidth = 72;
        const colGap = 16;
        const startX = 20;

        slide.stats.slice(0, 3).forEach((stat, i) => {
          const colX = startX + i * (colWidth + colGap);

          // Top divider line for the metric card
          setDrawColor(theme.border);
          doc.setLineWidth(0.3);
          doc.line(colX, 58, colX + colWidth, 58);

          // Dynamic font sizing for stat value so it never overflows column width
          let valFs = 26;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(valFs);
          while (doc.getTextWidth(stat.value) > colWidth && valFs > 13) {
            valFs -= 1.5;
            doc.setFontSize(valFs);
          }

          setTextColor(theme.accent);
          const valLines = doc.splitTextToSize(stat.value, colWidth);
          doc.text(valLines, colX, 74);

          // Position label dynamically below the value
          const valHeight = valLines.length * (valFs * 0.45);
          const labelY = 74 + valHeight + 4;

          doc.setFont("courier", "bold");
          doc.setFontSize(7.5);
          setTextColor(theme.muted);
          const labelLines = doc.splitTextToSize(stat.label.toUpperCase(), colWidth);
          doc.text(labelLines, colX, labelY);
        });

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 9, { align: "right" });
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
        doc.setFontSize(50);
        setTextColor(theme.accent);
        doc.text("\u201C", 25, 40);

        // Quote text
        doc.setFont("helvetica", "italic");
        doc.setFontSize(15);
        setTextColor(theme.text);
        const quoteText = slide.quote || body[0] || slide.title || "";
        const quoteLines = doc.splitTextToSize(quoteText, 240);
        doc.text(quoteLines, 25, 56);

        // Author positioned dynamically below quote
        if (slide.quoteAuthor) {
          const authorY = 56 + quoteLines.length * 6.5 + 8;
          doc.setFont("courier", "normal");
          doc.setFontSize(9);
          setTextColor(theme.muted);
          doc.text(`— ${slide.quoteAuthor.toUpperCase()}`, 25, authorY);
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 9, { align: "right" });
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
        const textWidth = hasImg ? 130 : 255;

        // Accent pill
        setFill(theme.accent);
        doc.rect(20, 18, 16, 0.8, "F");

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", textWidth);
        doc.text(titleLines, 20, 28);

        // Bullets dynamically positioned below title
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let curY = 28 + titleLines.length * 7.5 + 4;

        for (const bullet of body.slice(0, 5)) {
          if (curY > H - 24) break; // Prevent colliding with footer
          const lines = doc.splitTextToSize(`—  ${bullet}`, textWidth);
          doc.text(lines, 20, curY);
          curY += lines.length * 4.4 + 4;
        }

        // Optional image on right
        if (image) {
          try {
            doc.addImage(image.dataUrl, image.format, 165, 22, 110, 110);
          } catch {
            // Gracefully ignore image embedding failure
          }
          if (slide.imageCredit) {
            doc.setFont("courier", "normal");
            doc.setFontSize(6.5);
            setTextColor(theme.muted);
            doc.text(slide.imageCredit, W - 22, 137, { align: "right" });
          }
        }

        // Slide number
        doc.setFont("courier", "normal");
        doc.setFontSize(7.5);
        setTextColor(theme.muted);
        doc.text(pageIndicator, W - 20, H - 9, { align: "right" });
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
