import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { Presentation } from "@/types/presentation";
import { THEMES } from "@/lib/themes/themes";

/* ─────────────────────────────────────────────
   POST /api/export/pptx
   Accepts: Presentation JSON
   Returns: .pptx blob
───────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const presentation: Presentation = await req.json();
    const theme = THEMES[presentation.themeId];

    const pres = new PptxGenJS();

    // Slide dimensions: 16:9
    pres.layout = "LAYOUT_16x9";
    pres.author = "FreePresentation";
    pres.title = presentation.title;

    // Define slide master
    pres.defineSlideMaster({
      title: "MAIN",
      background: { color: theme.bg.replace("#", "") },
      objects: [
        {
          rect: {
            x: 0, y: 0, w: "100%", h: 0.04,
            fill: { color: theme.accent.replace("#", "") },
          },
        },
      ],
    });

    for (const slide of presentation.slides) {
      const s = pres.addSlide({ masterName: "MAIN" });

      if (slide.layout === "title") {
        // Title slide
        s.addText(presentation.title, {
          x: 0.8, y: 1.8, w: 8.4, h: 1.2,
          fontSize: 36, bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Palatino Linotype",
          align: "center",
          charSpacing: -1,
        });
        if (slide.body[0]) {
          s.addText(slide.body[0], {
            x: 1.5, y: 3.2, w: 7, h: 0.6,
            fontSize: 14, color: theme.muted.replace("#", ""),
            align: "center", fontFace: "Helvetica Neue",
          });
        }
        s.addShape(pres.ShapeType.line, {
          x: 3, y: 4.2, w: 4, h: 0,
          line: { color: theme.accent.replace("#", ""), width: 1 },
        });
      } else if (slide.layout === "quote") {
        s.addText("\u201C", {
          x: 0.8, y: 0.8, w: 1, h: 1.2,
          fontSize: 72, color: theme.accent.replace("#", ""),
          fontFace: "Georgia",
        });
        s.addText(slide.quote || slide.body[0] || "", {
          x: 0.8, y: 1.6, w: 8.4, h: 2.5,
          fontSize: 18, italic: true,
          color: theme.text.replace("#", ""),
          fontFace: "Palatino Linotype",
          lineSpacingMultiple: 1.4,
        });
        if (slide.quoteAuthor) {
          s.addText(`— ${slide.quoteAuthor}`, {
            x: 0.8, y: 4.1, w: 8.4, h: 0.5,
            fontSize: 11, color: theme.muted.replace("#", ""),
            fontFace: "Courier New", charSpacing: 1,
          });
        }
      } else {
        // Title bar accent
        s.addShape(pres.ShapeType.rect, {
          x: 0.6, y: 0.5, w: 0.6, h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { color: theme.accent.replace("#", ""), width: 0 },
        });

        // Slide title
        s.addText(slide.title, {
          x: 0.6, y: 0.65, w: slide.image ? 4.5 : 8.8, h: 1.1,
          fontSize: 24, bold: false,
          color: theme.text.replace("#", ""),
          fontFace: "Palatino Linotype",
          charSpacing: -0.5,
        });

        // Body bullets
        const bullets = slide.body.slice(0, 5);
        if (bullets.length > 0) {
          s.addText(
            bullets.map((b) => ({ text: b, options: { bullet: { type: "bullet", indent: 15 }, paraSpaceAfter: 6 } })),
            {
              x: 0.6, y: 1.9, w: slide.image ? 4.5 : 8.8, h: 2.8,
              fontSize: 12, color: theme.muted.replace("#", ""),
              fontFace: "Helvetica Neue",
              lineSpacingMultiple: 1.4,
            }
          );
        }

        // Stats layout
        if (slide.layout === "stats" && slide.stats) {
          slide.stats.slice(0, 3).forEach((stat, i) => {
            const x = 0.6 + i * 3.0;
            s.addShape(pres.ShapeType.line, {
              x, y: 2.0, w: 2.4, h: 0,
              line: { color: theme.border.replace("#", ""), width: 0.5 },
            });
            s.addText(stat.value, {
              x, y: 2.2, w: 2.4, h: 0.8,
              fontSize: 32, bold: false,
              color: theme.accent.replace("#", ""),
              fontFace: "Palatino Linotype",
            });
            s.addText(stat.label, {
              x, y: 3.1, w: 2.4, h: 0.4,
              fontSize: 10, color: theme.muted.replace("#", ""),
              fontFace: "Courier New", charSpacing: 1,
            });
          });
        }

        // Image
        if (slide.image) {
          try {
            // Fetch image as base64 for embedding
            const imgRes = await fetch(slide.image);
            if (imgRes.ok) {
              const imgBuffer = await imgRes.arrayBuffer();
              const base64 = Buffer.from(imgBuffer).toString("base64");
              const contentType = imgRes.headers.get("content-type") || "image/jpeg";
              s.addImage({
                data: `data:${contentType};base64,${base64}`,
                x: 5.5, y: 1.2, w: 3.8, h: 3.0,
                rounding: true,
              });
            }
          } catch {
            // Skip image if fetch fails
          }
        }
      }

      // Slide number
      s.addText(`${String(presentation.slides.indexOf(slide) + 1).padStart(2, "0")}`, {
        x: 8.8, y: 4.8, w: 0.8, h: 0.4,
        fontSize: 9, color: theme.muted.replace("#", ""),
        fontFace: "Courier New", align: "right",
        charSpacing: 1,
      });
    }

    const buffer = await pres.write({ outputType: "nodebuffer" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${presentation.title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx"`,
      },
    });
  } catch (err) {
    console.error("PPTX export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
