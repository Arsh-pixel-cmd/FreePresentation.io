import { NextRequest, NextResponse } from "next/server";
import { Presentation } from "@/types/presentation";
import { THEMES } from "@/lib/themes/themes";

/* ─────────────────────────────────────────────
   POST /api/export/pdf
   Uses jsPDF server-side via html2canvas approach
   Returns: .pdf blob
───────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const presentation: Presentation = await req.json();
    const theme = THEMES[presentation.themeId];

    // Build an HTML representation for each slide, then convert via jsPDF
    // Since we're server-side, we generate a clean multi-page PDF directly
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [297, 167], // 16:9 at A4 landscape proportions
    });

    const W = 297;
    const H = 167;
    const bgHex = theme.bg.replace("#", "");
    const textHex = theme.text.replace("#", "");
    const accentHex = theme.accent.replace("#", "");
    const mutedHex = theme.muted.replace("#", "");

    const hexToRgb = (hex: string) => {
      const n = parseInt(hex.replace("#", ""), 16);
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
      if (idx > 0) doc.addPage([W, H], "landscape");

      // Background
      setFill(theme.bg);
      doc.rect(0, 0, W, H, "F");

      // Accent top bar
      setFill(theme.accent);
      doc.rect(0, 0, W, 1.5, "F");

      if (slide.layout === "title") {
        // Centered title layout
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        setTextColor(theme.text);
        doc.text(slide.title, W / 2, H / 2 - 10, { align: "center" });

        if (slide.body[0]) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          setTextColor(theme.muted);
          doc.text(slide.body[0], W / 2, H / 2 + 6, { align: "center" });
        }

        setDrawColor(theme.accent);
        doc.setLineWidth(0.3);
        doc.line(W / 2 - 30, H / 2 + 18, W / 2 + 30, H / 2 + 18);
      } else {
        // Accent bar
        setFill(theme.accent);
        doc.rect(20, 18, 18, 0.5, "F");

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        setTextColor(theme.text);
        const titleLines = doc.splitTextToSize(slide.title, 160);
        doc.text(titleLines, 20, 30);

        // Body
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setTextColor(theme.muted);
        let y = 46;
        slide.body.slice(0, 5).forEach((bullet) => {
          const lines = doc.splitTextToSize(`— ${bullet}`, 150);
          doc.text(lines, 20, y);
          y += lines.length * 6 + 3;
        });

        // Stats
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

      // Slide number
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      setTextColor(theme.muted);
      doc.text(
        `${String(idx + 1).padStart(2, "0")} / ${String(presentation.slides.length).padStart(2, "0")}`,
        W - 20, H - 8,
        { align: "right" }
      );

      // Footer line
      setDrawColor(theme.border);
      doc.setLineWidth(0.2);
      doc.line(20, H - 14, W - 20, H - 14);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${presentation.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF export error:", err);
    return NextResponse.json({ error: "PDF export failed" }, { status: 500 });
  }
}
