import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import { Presentation } from "@/types/presentation";
import { THEMES } from "@/lib/themes/themes";

export async function POST(req: NextRequest) {
  try {
    const presentation: Presentation = await req.json();
    if (!presentation || !Array.isArray(presentation.slides)) {
      return NextResponse.json({ error: "Invalid presentation data" }, { status: 400 });
    }

    const theme = THEMES[presentation.themeId] || THEMES.obsidian;

    const pres = new PptxGenJS();
    pres.layout = "LAYOUT_16x9";
    pres.author = "FreePresentation";
    pres.title = presentation.title || "Presentation";

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
      const body = Array.isArray(slide.body) ? slide.body : [];

      if (slide.layout === "title") {
        s.addText(slide.title || presentation.title || "Untitled", {
          x: 0.8, y: 1.8, w: 8.4, h: 1.2,
          fontSize: 36, bold: true,
          color: theme.text.replace("#", ""),
          fontFace: "Palatino Linotype",
          align: "center",
          charSpacing: -1,
        });
        if (body[0]) {
          s.addText(body[0], {
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
        s.addText(slide.quote || body[0] || slide.title || "", {
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
        s.addShape(pres.ShapeType.rect, {
          x: 0.6, y: 0.5, w: 0.6, h: 0.04,
          fill: { color: theme.accent.replace("#", "") },
          line: { color: theme.accent.replace("#", ""), width: 0 },
        });

        s.addText(slide.title || "Untitled Slide", {
          x: 0.6, y: 0.65, w: slide.image ? 4.5 : 8.8, h: 1.1,
          fontSize: 24, bold: false,
          color: theme.text.replace("#", ""),
          fontFace: "Palatino Linotype",
          charSpacing: -0.5,
        });

        const bullets = body.slice(0, 5);
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

        if (slide.image) {
          try {
            if (slide.image.startsWith("data:")) {
              s.addImage({
                data: slide.image,
                x: 5.5, y: 1.2, w: 3.8, h: 3.0,
                rounding: true,
              });
            } else if (slide.image.startsWith("http://") || slide.image.startsWith("https://")) {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              const imgRes = await fetch(slide.image, { signal: controller.signal });
              clearTimeout(timeout);
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
            }
          } catch (imgErr) {
            console.warn(`Could not embed image on slide "${slide.title}":`, imgErr);
            // Fall back gracefully without image
          }
        }
      }

      s.addText(`${String(presentation.slides.indexOf(slide) + 1).padStart(2, "0")}`, {
        x: 8.8, y: 4.8, w: 0.8, h: 0.4,
        fontSize: 9, color: theme.muted.replace("#", ""),
        fontFace: "Courier New", align: "right",
        charSpacing: 1,
      });
    }

    const buffer = await pres.write({ outputType: "nodebuffer" });
    const safeTitle = (presentation.title || "presentation").replace(/[^a-zA-Z0-9_\s-]/g, "_").trim() || "presentation";

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeTitle}.pptx"`,
      },
    });
  } catch (err: any) {
    console.error("PPTX export error:", err);
    return NextResponse.json({ error: err?.message || "Export failed" }, { status: 500 });
  }
}
