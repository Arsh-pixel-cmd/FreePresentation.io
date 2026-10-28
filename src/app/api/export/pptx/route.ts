import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
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

    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_16x9"; // 10.0 x 5.625 inches
    pres.author = "FreePresentation";
    pres.title = presentation.title || "Presentation";

    // Master slide with theme background & top accent bar
    pres.defineSlideMaster({
      title: "MAIN",
      background: { color: theme.bg.replace("#", "") },
      objects: [
        {
          rect: {
            x: 0,
            y: 0,
            w: "100%",
            h: 0.04,
            fill: { color: theme.accent.replace("#", "") },
          },
        },
      ],
    });

    for (let idx = 0; idx < presentation.slides.length; idx++) {
      const slide = presentation.slides[idx];
      const body = Array.isArray(slide.body) ? slide.body : [];
      const image = await resolveExportImage(slide.image);
      const slideNum = String(idx + 1).padStart(2, "0");

      // ─────────────────────────────────────────────────────────────
      // 1. TITLE LAYOUT
      // ─────────────────────────────────────────────────────────────
      if (slide.layout === "title") {
        const s = pres.addSlide({ masterName: "MAIN" });

        // Category Tag
        s.addText("PRESENTATION", {
          x: 1.0,
          y: 1.2,
          w: 8.0,
          h: 0.35,
          fontSize: 10,
          fontFace: "Courier New",
          color: theme.accent.replace("#", ""),
          align: "center",
          charSpacing: 3,
        });

        // Main Title
        s.addText(slide.title || presentation.title || "Untitled", {
          x: 0.8,
          y: 1.7,
          w: 8.4,
          h: 1.4,
          fontSize: 34,
          bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
          align: "center",
          charSpacing: -0.5,
        });

        // Subtitle / Body
        if (body[0]) {
          s.addText(body[0], {
            x: 1.5,
            y: 3.3,
            w: 7.0,
            h: 0.7,
            fontSize: 14,
            color: theme.muted.replace("#", ""),
            align: "center",
            fontFace: "Helvetica Neue",
            lineSpacingMultiple: 1.3,
          });
        }

        // Bottom Divider
        s.addShape(pres.ShapeType.line, {
          x: 2.5,
          y: 4.4,
          w: 5.0,
          h: 0,
          line: { color: theme.border.replace("#", ""), width: 1 },
        });

        // Slide number
        s.addText(slideNum, {
          x: 8.8,
          y: 5.1,
          w: 0.8,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
          align: "right",
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 2. IMAGE-FULL LAYOUT (Full-bleed background image with text)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-full" && image) {
        // Blank master so no top bar or default bg interferes
        const s = pres.addSlide();

        // Full bleed image (10 x 5.625)
        s.addImage({
          data: image.dataUrl,
          x: 0,
          y: 0,
          w: 10.0,
          h: 5.625,
        });

        // Dark gradient / scrim band at bottom for readability
        s.addShape(pres.ShapeType.rect, {
          x: 0,
          y: 3.2,
          w: 10.0,
          h: 2.425,
          fill: { color: "000000", transparency: 25 },
          line: { width: 0 },
        });

        // Title on image
        s.addText(slide.title || "Untitled Slide", {
          x: 0.8,
          y: 3.6,
          w: 8.4,
          h: 1.2,
          fontSize: 28,
          bold: true,
          color: "FFFFFF",
          fontFace: "Georgia",
        });

        // Image credit badge if available
        if (slide.imageCredit) {
          s.addText(slide.imageCredit, {
            x: 6.5,
            y: 5.1,
            w: 3.1,
            h: 0.3,
            fontSize: 8,
            color: "D1D5DB",
            fontFace: "Courier New",
            align: "right",
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 3. IMAGE-RIGHT LAYOUT (Left: Text, Right: Half Image)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-right" && image) {
        const s = pres.addSlide({ masterName: "MAIN" });

        // Accent pill on left
        s.addShape(pres.ShapeType.rect, {
          x: 0.8,
          y: 0.6,
          w: 1.2,
          h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { width: 0 },
        });

        // Title on left
        s.addText(slide.title || "Untitled Slide", {
          x: 0.8,
          y: 0.8,
          w: 4.2,
          h: 1.1,
          fontSize: 22,
          bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
        });

        // Bullets on left
        const bullets = body.slice(0, 4);
        if (bullets.length > 0) {
          s.addText(
            bullets.map((b) => ({
              text: b,
              options: { bullet: { type: "bullet", indent: 14 }, paraSpaceAfter: 8 },
            })),
            {
              x: 0.8,
              y: 2.1,
              w: 4.2,
              h: 2.8,
              fontSize: 11,
              color: theme.muted.replace("#", ""),
              fontFace: "Helvetica Neue",
              lineSpacingMultiple: 1.4,
            }
          );
        }

        // Image on right half (width: 4.6, height: 5.625)
        s.addImage({
          data: image.dataUrl,
          x: 5.4,
          y: 0,
          w: 4.6,
          h: 5.625,
        });

        // Image credit
        if (slide.imageCredit) {
          s.addText(slide.imageCredit, {
            x: 5.5,
            y: 5.2,
            w: 4.3,
            h: 0.3,
            fontSize: 7,
            color: "FFFFFF",
            fontFace: "Courier New",
            align: "right",
          });
        }

        // Slide number
        s.addText(slideNum, {
          x: 0.8,
          y: 5.1,
          w: 1.0,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 4. IMAGE-LEFT LAYOUT (Left: Half Image, Right: Text)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "image-left" && image) {
        const s = pres.addSlide({ masterName: "MAIN" });

        // Image on left half (width: 4.6, height: 5.625)
        s.addImage({
          data: image.dataUrl,
          x: 0,
          y: 0,
          w: 4.6,
          h: 5.625,
        });

        // Image credit
        if (slide.imageCredit) {
          s.addText(slide.imageCredit, {
            x: 0.2,
            y: 5.2,
            w: 4.2,
            h: 0.3,
            fontSize: 7,
            color: "FFFFFF",
            fontFace: "Courier New",
          });
        }

        // Accent pill on right
        s.addShape(pres.ShapeType.rect, {
          x: 5.2,
          y: 0.6,
          w: 1.2,
          h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { width: 0 },
        });

        // Title on right
        s.addText(slide.title || "Untitled Slide", {
          x: 5.2,
          y: 0.8,
          w: 4.2,
          h: 1.1,
          fontSize: 22,
          bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
        });

        // Bullets on right
        const bullets = body.slice(0, 4);
        if (bullets.length > 0) {
          s.addText(
            bullets.map((b) => ({
              text: b,
              options: { bullet: { type: "bullet", indent: 14 }, paraSpaceAfter: 8 },
            })),
            {
              x: 5.2,
              y: 2.1,
              w: 4.2,
              h: 2.8,
              fontSize: 11,
              color: theme.muted.replace("#", ""),
              fontFace: "Helvetica Neue",
              lineSpacingMultiple: 1.4,
            }
          );
        }

        // Slide number
        s.addText(slideNum, {
          x: 8.8,
          y: 5.1,
          w: 0.8,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
          align: "right",
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 5. TWO-COL LAYOUT (Left: Title, Right: Numbered List)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "two-col") {
        const s = pres.addSlide({ masterName: "MAIN" });

        // Left column: Accent bar & Title
        s.addShape(pres.ShapeType.rect, {
          x: 0.8,
          y: 0.8,
          w: 1.5,
          h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { width: 0 },
        });

        s.addText(slide.title || "Untitled Slide", {
          x: 0.8,
          y: 1.1,
          w: 3.8,
          h: 2.5,
          fontSize: 26,
          bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
        });

        // Right column: Numbered items 01, 02, 03...
        const items = body.slice(0, 4);
        items.forEach((item, i) => {
          const itemY = 1.0 + i * 1.0;
          // Number label
          s.addText(`0${i + 1}`, {
            x: 5.2,
            y: itemY,
            w: 0.6,
            h: 0.4,
            fontSize: 12,
            bold: true,
            color: theme.accent.replace("#", ""),
            fontFace: "Courier New",
          });
          // Item description
          s.addText(item, {
            x: 5.9,
            y: itemY,
            w: 3.5,
            h: 0.85,
            fontSize: 11,
            color: theme.muted.replace("#", ""),
            fontFace: "Helvetica Neue",
            lineSpacingMultiple: 1.3,
          });
        });

        // Slide number
        s.addText(slideNum, {
          x: 8.8,
          y: 5.1,
          w: 0.8,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
          align: "right",
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 6. STATS LAYOUT (Title + 3 Stat Columns)
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "stats" && slide.stats && slide.stats.length > 0) {
        const s = pres.addSlide({ masterName: "MAIN" });

        // Accent pill & Title
        s.addShape(pres.ShapeType.rect, {
          x: 0.8,
          y: 0.7,
          w: 1.4,
          h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { width: 0 },
        });

        s.addText(slide.title || "Key Metrics", {
          x: 0.8,
          y: 0.95,
          w: 8.4,
          h: 0.8,
          fontSize: 26,
          bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
        });

        // 3 Stat Columns
        slide.stats.slice(0, 3).forEach((stat, i) => {
          const colX = 0.8 + i * 2.9;
          // Top line
          s.addShape(pres.ShapeType.line, {
            x: colX,
            y: 2.3,
            w: 2.6,
            h: 0,
            line: { color: theme.border.replace("#", ""), width: 1 },
          });

          // Big Stat Value
          s.addText(stat.value, {
            x: colX,
            y: 2.5,
            w: 2.6,
            h: 1.0,
            fontSize: 36,
            bold: true,
            color: theme.accent.replace("#", ""),
            fontFace: "Georgia",
          });

          // Stat Label
          s.addText(stat.label.toUpperCase(), {
            x: colX,
            y: 3.6,
            w: 2.6,
            h: 0.6,
            fontSize: 10,
            color: theme.muted.replace("#", ""),
            fontFace: "Courier New",
            charSpacing: 1.5,
          });
        });

        // Slide number
        s.addText(slideNum, {
          x: 8.8,
          y: 5.1,
          w: 0.8,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
          align: "right",
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 7. QUOTE LAYOUT
      // ─────────────────────────────────────────────────────────────
      else if (slide.layout === "quote") {
        const s = pres.addSlide({ masterName: "MAIN" });

        // Big decorative quote mark
        s.addText("\u201C", {
          x: 1.0,
          y: 0.7,
          w: 1.0,
          h: 1.0,
          fontSize: 68,
          color: theme.accent.replace("#", ""),
          fontFace: "Georgia",
        });

        // Quote text
        s.addText(slide.quote || body[0] || slide.title || "", {
          x: 1.0,
          y: 1.6,
          w: 8.0,
          h: 2.4,
          fontSize: 18,
          italic: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
          lineSpacingMultiple: 1.45,
        });

        // Author
        if (slide.quoteAuthor) {
          s.addText(`— ${slide.quoteAuthor.toUpperCase()}`, {
            x: 1.0,
            y: 4.2,
            w: 8.0,
            h: 0.4,
            fontSize: 10,
            color: theme.muted.replace("#", ""),
            fontFace: "Courier New",
            charSpacing: 2,
          });
        }

        // Slide number
        s.addText(slideNum, {
          x: 8.8,
          y: 5.1,
          w: 0.8,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
          align: "right",
        });
      }

      // ─────────────────────────────────────────────────────────────
      // 8. CONTENT LAYOUT (Standard layout: Title, Bullets, optional image)
      // ─────────────────────────────────────────────────────────────
      else {
        const s = pres.addSlide({ masterName: "MAIN" });
        const hasImg = !!image;

        // Accent pill
        s.addShape(pres.ShapeType.rect, {
          x: 0.8,
          y: 0.6,
          w: 1.2,
          h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { width: 0 },
        });

        // Title
        s.addText(slide.title || "Untitled Slide", {
          x: 0.8,
          y: 0.8,
          w: hasImg ? 4.5 : 8.4,
          h: 1.0,
          fontSize: 24,
          bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Georgia",
        });

        // Bullets
        const bullets = body.slice(0, 5);
        if (bullets.length > 0) {
          s.addText(
            bullets.map((b) => ({
              text: b,
              options: { bullet: { type: "bullet", indent: 14 }, paraSpaceAfter: 7 },
            })),
            {
              x: 0.8,
              y: 2.0,
              w: hasImg ? 4.5 : 8.4,
              h: 2.8,
              fontSize: 11,
              color: theme.muted.replace("#", ""),
              fontFace: "Helvetica Neue",
              lineSpacingMultiple: 1.4,
            }
          );
        }

        // Optional side image
        if (image) {
          s.addImage({
            data: image.dataUrl,
            x: 5.6,
            y: 1.2,
            w: 3.6,
            h: 3.4,
            rounding: true,
          });

          if (slide.imageCredit) {
            s.addText(slide.imageCredit, {
              x: 5.6,
              y: 4.7,
              w: 3.6,
              h: 0.3,
              fontSize: 7,
              color: theme.muted.replace("#", ""),
              fontFace: "Courier New",
              align: "right",
            });
          }
        }

        // Slide number
        s.addText(slideNum, {
          x: 8.8,
          y: 5.1,
          w: 0.8,
          h: 0.3,
          fontSize: 9,
          color: theme.muted.replace("#", ""),
          fontFace: "Courier New",
          align: "right",
        });
      }
    }

    const buffer = await pres.write({ outputType: "nodebuffer" });
    const safeTitle =
      (presentation.title || "presentation")
        .replace(/[^a-zA-Z0-9_\s-]/g, "_")
        .trim() || "presentation";

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeTitle}.pptx"`,
      },
    });
  } catch (err: any) {
    console.error("PPTX export error:", err);
    return NextResponse.json(
      { error: err?.message || "Export failed" },
      { status: 500 }
    );
  }
}
