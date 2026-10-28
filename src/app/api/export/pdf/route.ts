import { NextRequest, NextResponse } from "next/server";
import { Presentation } from "@/types/presentation";
import { THEMES } from "@/lib/themes/themes";

export async function POST(req: NextRequest) {
  try {
    const presentation: Presentation = await req.json();
    if (!presentation || !Array.isArray(presentation.slides)) {
      return NextResponse.json({ error: "Invalid presentation data" }, { status: 400 });
    }

    const theme = THEMES[presentation.themeId] || THEMES.obsidian;

    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [297, 167],
    });

    const W = 297;
    const H = 167;

    const hexToRgb = (hex: string) => {
      const cleanHex = (hex || "#000000").replace("#", "");
      const n = parseInt(cleanHex, 16);
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

    for (let idx = 0; idx < presentation.slides.length; idx++) {
      const slide = presentation.slides[idx];
      const body = Array.isArray(slide.body) ? slide.body : [];

      if (idx > 0) doc.addPage([W, H], "landscape");

      setFill(theme.bg);
      doc.rect(0, 0, W, H, "F");

      setFill(theme.accent);
      doc.rect(0, 0, W, 1.5, "F");

      if (slide.layout === "title") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        setTextColor(theme.text);
        const titleText = slide.title || presentation.title || "Untitled";
        doc.text(titleText, W / 2, H / 2 - 10, { align: "center" });

        if (body[0]) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          setTextColor(theme.muted);
          doc.text(body[0], W / 2, H / 2 + 6, { align: "center" });
        }

        setDrawColor(theme.accent);
        doc.setLineWidth(0.3);
        doc.line(W / 2 - 30, H / 2 + 18, W / 2 + 30, H / 2 + 18);
      } else if (slide.layout === "quote") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(40);
        setTextColor(theme.accent);
        doc.text("\u201C", 20, 36);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(15);
        setTextColor(theme.text);
        const quoteText = slide.quote || body[0] || slide.title || "";
        const quoteLines = doc.splitTextToSize(quoteText, 250);
        doc.text(quoteLines, 20, 50);

        if (slide.quoteAuthor) {
          doc.setFont("courier", "normal");
          doc.setFontSize(9);
          setTextColor(theme.muted);
          doc.text(`— ${slide.quoteAuthor}`, 20, 50 + quoteLines.length * 7 + 6);
        }
      } else {
        setFill(theme.accent);
        doc.rect(20, 18, 18, 0.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title || "Untitled Slide", 160);
        doc.text(titleLines, 20, 30);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let y = 46;
        body.slice(0, 5).forEach((bullet) => {
          const lines = doc.splitTextToSize(`— ${bullet}`, 150);
          doc.text(lines, 20, y);
          y += lines.length * 6 + 3;
        });

        if (slide.layout === "stats" && slide.stats) {
          slide.stats.slice(0, 3).forEach((stat, i) => {
            const x = 20 + i * 85;
            setDrawColor(theme.border);
            doc.setLineWidth(0.2);
            doc.line(x, 55, x + 70, 55);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(24);
            setTextColor(theme.accent);
            doc.text(stat.value, x, 70);
            doc.setFontSize(8);
            setTextColor(theme.muted);
            doc.text(stat.label.toUpperCase(), x, 78);
          });
        }
      }

      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      setTextColor(theme.muted);
      doc.text(
        `${String(idx + 1).padStart(2, "0")} / ${String(presentation.slides.length).padStart(2, "0")}`,
        W - 20, H - 8,
        { align: "right" }
      );

      setDrawColor(theme.border);
      doc.setLineWidth(0.2);
      doc.line(20, H - 14, W - 20, H - 14);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const safeTitle = (presentation.title || "presentation").replace(/[^a-zA-Z0-9_\s-]/g, "_").trim() || "presentation";

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF export error:", err);
    return NextResponse.json({ error: err?.message || "PDF export failed" }, { status: 500 });
  }
}
