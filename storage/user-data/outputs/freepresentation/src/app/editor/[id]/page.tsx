"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePresentationStore } from "@/store/presentationStore";
import { Presentation, Slide, ThemeId } from "@/types/presentation";
import { THEMES, THEME_LIST } from "@/lib/themes/themes";

/* ─────────────────────────────────────────────
   EDITOR PAGE /editor/[id]
   Loads presentation from Zustand store,
   handles all state updates, theme switching
───────────────────────────────────────────── */

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    presentation,
    setPresentation,
    getPresentation,
    savePresentation,
    updateSlide,
    addSlide,
    deleteSlide,
    reorderSlides,
    setTheme,
    setTitle,
    activeSlideIndex,
    setActiveSlideIndex,
  } = usePresentationStore();

  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<"pptx" | "pdf" | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Fix: Zustand persist rehydrates async — wait for it ─────
  useEffect(() => {
    // Give Zustand's localStorage rehydration a tick to complete
    const timer = setTimeout(() => {
      if (presentation?.id === id) {
        savePresentation(presentation);
        setLoaded(true);
        return;
      }
      const saved = getPresentation(id);
      if (saved) {
        setPresentation(saved);
        setLoaded(true);
        return;
      }
      setNotFound(true);
    }, 50); // 50ms is enough for rehydration, invisible to user
    return () => clearTimeout(timer);
  }, [id]);

  // ── Outside click closes dropdowns ──────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".ep-theme-dropdown") && !target.closest("[data-theme-btn]")) {
        setThemeMenuOpen(false);
      }
      if (!target.closest(".ep-export-dropdown") && !target.closest("[data-export-btn]")) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard navigation ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingSlide || editingTitle) return; // Don't interfere with text input
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSlideIndex((i) => Math.min(i + 1, (presentation?.slides.length ?? 1) - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSlideIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Escape") {
        setEditingSlide(null);
        setThemeMenuOpen(false);
        setExportOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editingSlide, editingTitle, presentation?.slides.length]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleUpdate = (updated: Presentation) => {
    setPresentation(updated);
    savePresentation(updated);
  };

  const handleExport = async (format: "pptx" | "pdf") => {
    if (!presentation) return;
    setExporting(format);
    setExportOpen(false);
    try {
      const res = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presentation),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${presentation.title.replace(/[^a-zA-Z0-9\s]/g, "")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported as .${format} ✓`);
    } catch {
      showToast("Export failed. Try again.");
    } finally {
      setExporting(null);
    }
  };

  const handleAddSlide = () => {
    if (!presentation) return;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      layout: "content",
      title: "New Slide",
      body: ["Add your first point here", "Then another one", "And a third"],
      imageQuery: "abstract background",
    };
    addSlide(newSlide);
    showToast("Slide added");
  };

  const handleDeleteSlide = (idx: number) => {
    if (!presentation || presentation.slides.length <= 1) return;
    const slideId = presentation.slides[idx].id;
    deleteSlide(slideId);
    showToast("Slide deleted");
  };

  const handleDrop = (targetIdx: number) => {
    if (!presentation || dragIdx === null || dragIdx === targetIdx) return;
    const slides = [...presentation.slides];
    const [moved] = slides.splice(dragIdx, 1);
    slides.splice(targetIdx, 0, moved);
    reorderSlides(slides);
    setActiveSlideIndex(targetIdx);
    setDragIdx(null);
  };

  const handleSaveSlide = (updated: Slide) => {
    updateSlide(updated);
    showToast("Slide saved");
  };

  const handleTitleSave = () => {
    setTitle(titleDraft);
    setEditingTitle(false);
  };

  // ── Loading states ───────────────────────────
  if (notFound) {
    return (
      <div style={centeredStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, color: "#e8e4dc", marginBottom: 16 }}>
            Not found
          </div>
          <p style={{ color: "#52525b", marginBottom: 32, fontFamily: "monospace", fontSize: 12 }}>
            This presentation doesn't exist or was cleared.
          </p>
          <button
            onClick={() => router.push("/create")}
            style={primaryBtn}
          >
            Create a new one →
          </button>
        </div>
      </div>
    );
  }

  if (!loaded || !presentation) {
    return (
      <div style={centeredStyle}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={spinnerStyle} />
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#3f3f46", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Loading presentation…
          </div>
        </div>
      </div>
    );
  }

  const theme = THEMES[presentation.themeId];
  const activeSlide = presentation.slides[activeSlideIndex];

  return (
    <>
      <style>{EDITOR_PAGE_STYLES}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast">{toast}</div>
      )}

      {/* ── Top Toolbar ── */}
      <header className="ep-toolbar">
        <a href="/create" className="ep-logo">
          Free<span>Presentation</span>
        </a>

        {/* Title — click to edit */}
        <div className="ep-title-area">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="ep-title-input"
            />
          ) : (
            <button
              className="ep-title-btn"
              onClick={() => { setTitleDraft(presentation.title); setEditingTitle(true); }}
              title="Click to rename"
            >
              {presentation.title}
              <span className="ep-title-edit-hint">✎</span>
            </button>
          )}
          <span className="ep-slide-count">
            {presentation.slides.length} slides
          </span>
        </div>

        <div className="ep-toolbar-right">
          {/* Theme switcher */}
          <div style={{ position: "relative" }}>
            <button
              className="ep-toolbar-btn"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              data-theme-btn="true"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: theme.accent, display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {theme.name}
            </button>
            {themeMenuOpen && (
              <div className="ep-theme-dropdown">
                {THEME_LIST.map((t) => (
                  <button
                    key={t.id}
                    className={`ep-theme-option ${presentation.themeId === t.id ? "active" : ""}`}
                    onClick={() => { setTheme(t.id as ThemeId); setThemeMenuOpen(false); showToast(`Theme: ${t.name}`); }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, display: "inline-block", flexShrink: 0 }} />
                    {t.name}
                    {presentation.themeId === t.id && <span style={{ marginLeft: "auto", color: t.accent }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="ep-toolbar-btn" onClick={handleAddSlide}>
            + Add slide
          </button>

          {/* Export */}
          <div style={{ position: "relative" }}>
            <button
              className="ep-export-btn"
              onClick={() => setExportOpen(!exportOpen)}
              disabled={!!exporting}
              data-export-btn="true"
            >
              {exporting ? `Exporting ${exporting}…` : "Export ↓"}
            </button>
            {exportOpen && (
              <div className="ep-export-dropdown">
                <button className="ep-export-option" onClick={() => handleExport("pptx")}>
                  <span className="ep-export-badge">PPT</span>
                  <div>
                    <div className="ep-export-label">PowerPoint (.pptx)</div>
                    <div className="ep-export-sub">No watermark · Full quality</div>
                  </div>
                </button>
                <button className="ep-export-option" onClick={() => handleExport("pdf")}>
                  <span className="ep-export-badge">PDF</span>
                  <div>
                    <div className="ep-export-label">PDF Document (.pdf)</div>
                    <div className="ep-export-sub">Print-ready · Shareable</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="ep-layout">

        {/* ── LEFT: Slide thumbnail strip ── */}
        <aside className="ep-slide-panel">
          <div className="ep-panel-header">Slides</div>
          {presentation.slides.map((slide, i) => (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(i); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => setActiveSlideIndex(i)}
              className={`ep-thumb ${i === activeSlideIndex ? "active" : ""}`}
            >
              <div className="ep-thumb-meta">
                <span className="ep-thumb-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ep-thumb-layout">{slide.layout}</span>
              </div>
              {/* Mini preview */}
              <div className="ep-thumb-preview" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div style={{ background: theme.accent, height: 2, width: "35%", borderRadius: 1, marginBottom: 6 }} />
                <div style={{ background: theme.text, height: 5, width: "85%", opacity: 0.85, borderRadius: 1, marginBottom: 3 }} />
                <div style={{ background: theme.text, height: 3, width: "100%", opacity: 0.25, borderRadius: 1, marginBottom: 2 }} />
                <div style={{ background: theme.text, height: 3, width: "70%", opacity: 0.25, borderRadius: 1, marginBottom: 6 }} />
                {slide.image && (
                  <div style={{ background: theme.muted, height: 28, borderRadius: 2, opacity: 0.5 }} />
                )}
              </div>
            </div>
          ))}

          {/* Add slide button in panel */}
          <button className="ep-add-slide-btn" onClick={handleAddSlide}>
            + Add slide
          </button>
        </aside>

        {/* ── CENTER: Canvas ── */}
        <main className="ep-canvas-area">
          {/* Slide nav */}
          <div className="ep-canvas-nav">
            <button
              className="ep-nav-btn"
              disabled={activeSlideIndex === 0}
              onClick={() => setActiveSlideIndex(activeSlideIndex - 1)}
            >
              ← Prev
            </button>
            <span className="ep-nav-counter">
              {String(activeSlideIndex + 1).padStart(2, "0")} / {String(presentation.slides.length).padStart(2, "0")}
            </span>
            <button
              className="ep-nav-btn"
              disabled={activeSlideIndex === presentation.slides.length - 1}
              onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
            >
              Next →
            </button>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                className="ep-canvas-action-btn"
                onClick={() => setEditingSlide({ ...activeSlide })}
              >
                ✎ Edit slide
              </button>
              <button
                className="ep-canvas-action-btn ep-danger-btn"
                onClick={() => handleDeleteSlide(activeSlideIndex)}
                disabled={presentation.slides.length <= 1}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Slide canvas */}
          <div
            className="ep-canvas-frame"
            onDoubleClick={() => setEditingSlide({ ...activeSlide })}
          >
            <SlideCanvasRenderer slide={activeSlide} theme={theme} />
            <div className="ep-canvas-hint">Double-click to edit</div>
          </div>

          {/* Speaker notes */}
          {activeSlide?.speakerNotes && (
            <div className="ep-notes">
              <div className="ep-notes-label">Speaker Notes</div>
              <div className="ep-notes-text">{activeSlide.speakerNotes}</div>
            </div>
          )}
        </main>
      </div>

      {/* ── Edit Modal ── */}
      {editingSlide && (
        <EditSlideModal
          slide={editingSlide}
          onSave={(updated) => { handleSaveSlide(updated); setEditingSlide(null); }}
          onClose={() => setEditingSlide(null)}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   SLIDE CANVAS RENDERER
   Renders any slide layout as HTML
───────────────────────────────────────────── */
function SlideCanvasRenderer({
  slide,
  theme,
}: {
  slide: Slide;
  theme: ReturnType<typeof THEMES[keyof typeof THEMES]>;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16/9",
    background: theme.bg,
    color: theme.text,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderRadius: 2,
  };

  if (slide.layout === "title") return (
    <div style={base}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: theme.accent }} />
      <div style={{ padding: "8% 12%", textAlign: "center" }}>
        <div style={{ color: theme.accent, fontFamily: "monospace", fontSize: "clamp(9px,1.2vw,12px)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "4%" }}>
          Presentation
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(22px,4vw,52px)", lineHeight: 1.05, letterSpacing: "-0.025em", color: theme.text, marginBottom: "4%" }}>
          {slide.title}
        </h1>
        {slide.body[0] && (
          <p style={{ fontSize: "clamp(10px,1.4vw,15px)", color: theme.muted, fontWeight: 300, maxWidth: "60%", margin: "0 auto", lineHeight: 1.5 }}>
            {slide.body[0]}
          </p>
        )}
      </div>
      <div style={{ position: "absolute", bottom: "9%", left: "12%", right: "12%", height: 1, background: theme.border }} />
    </div>
  );

  if (slide.layout === "image-full" && slide.image) return (
    <div style={{ ...base, justifyContent: "flex-end" }}>
      <img src={slide.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />
      <div style={{ position: "relative", padding: "5% 7%", zIndex: 1 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(16px,3vw,38px)", color: "#fff", letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
          {slide.title}
        </h2>
      </div>
    </div>
  );

  if (slide.layout === "quote") return (
    <div style={{ ...base, padding: "7% 11%" }}>
      <div style={{ color: theme.accent, fontSize: "clamp(40px,6vw,80px)", fontFamily: "Georgia, serif", lineHeight: 0.7, marginBottom: "3%" }}>"</div>
      <blockquote style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(13px,2vw,24px)", lineHeight: 1.45, color: theme.text, fontStyle: "italic", marginBottom: "4%" }}>
        {slide.quote || slide.body[0]}
      </blockquote>
      {slide.quoteAuthor && (
        <div style={{ fontFamily: "monospace", fontSize: "clamp(8px,1vw,11px)", color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          — {slide.quoteAuthor}
        </div>
      )}
    </div>
  );

  if (slide.layout === "stats") return (
    <div style={{ ...base, padding: "5% 7%" }}>
      <div style={{ background: theme.accent, height: 2, width: "16%", borderRadius: 1, marginBottom: "3%" }} />
      <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(14px,2.4vw,28px)", color: theme.text, letterSpacing: "-0.02em", marginBottom: "5%" }}>
        {slide.title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4%" }}>
        {(slide.stats || []).slice(0, 3).map((s, i) => (
          <div key={i} style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "3%" }}>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(18px,3.2vw,40px)", color: theme.accent, marginBottom: "2%", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "monospace", fontSize: "clamp(7px,0.9vw,10px)", color: theme.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (slide.layout === "two-col") return (
    <div style={{ ...base, flexDirection: "row", padding: "5% 7%", gap: "5%", alignItems: "flex-start", justifyContent: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ background: theme.accent, height: 2, width: "30%", marginBottom: "7%", borderRadius: 1 }} />
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(13px,2.2vw,26px)", lineHeight: 1.1, color: theme.text, letterSpacing: "-0.02em" }}>{slide.title}</h2>
      </div>
      <div style={{ flex: 1, paddingTop: "4%" }}>
        {slide.body.slice(0, 4).map((b, i) => (
          <div key={i} style={{ display: "flex", gap: "5%", marginBottom: "4%", fontSize: "clamp(8px,1.1vw,12px)", color: theme.muted, lineHeight: 1.55, alignItems: "flex-start" }}>
            <span style={{ color: theme.accent, flexShrink: 0, fontFamily: "monospace", fontSize: "0.85em" }}>0{i + 1}</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (slide.layout === "image-right" || slide.layout === "image-left") {
    const imgRight = slide.layout === "image-right";
    return (
      <div style={{ ...base, flexDirection: imgRight ? "row" : "row-reverse", padding: 0, justifyContent: "flex-start", alignItems: "stretch" }}>
        <div style={{ flex: "0 0 52%", padding: "6% 7%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ background: theme.accent, height: 2, width: "28%", marginBottom: "6%", borderRadius: 1 }} />
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(13px,2vw,24px)", color: theme.text, lineHeight: 1.15, marginBottom: "4%", letterSpacing: "-0.02em" }}>{slide.title}</h2>
          {slide.body.slice(0, 3).map((b, i) => (
            <p key={i} style={{ fontSize: "clamp(7px,1vw,11px)", color: theme.muted, marginBottom: "3%", lineHeight: 1.6 }}>{b}</p>
          ))}
        </div>
        <div style={{ flex: "0 0 48%", overflow: "hidden" }}>
          {slide.image
            ? <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: theme.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: theme.border, fontFamily: "monospace", fontSize: 11 }}>No image</span>
              </div>
          }
        </div>
      </div>
    );
  }

  // ── Default: content ──
  return (
    <div style={{ ...base, padding: "5% 7%" }}>
      <div style={{ background: theme.accent, height: 2, width: "16%", borderRadius: 1, marginBottom: "3%" }} />
      <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "clamp(14px,2.4vw,28px)", color: theme.text, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "3%", maxWidth: "65%" }}>
        {slide.title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: slide.image ? "1fr 1fr" : "1fr", gap: "5%" }}>
        <div>
          {slide.body.slice(0, 5).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: "3%", marginBottom: "2.5%", fontSize: "clamp(8px,1.1vw,12px)", color: theme.muted, lineHeight: 1.55, alignItems: "flex-start" }}>
              <span style={{ color: theme.accent, flexShrink: 0 }}>—</span>
              <span>{b}</span>
            </div>
          ))}
        </div>
        {slide.image && (
          <div style={{ borderRadius: 3, overflow: "hidden", maxHeight: "65%", alignSelf: "start" }}>
            <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDIT SLIDE MODAL
───────────────────────────────────────────── */
function EditSlideModal({
  slide,
  onSave,
  onClose,
}: {
  slide: Slide;
  onSave: (s: Slide) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...slide });
  const layouts = ["title", "content", "two-col", "image-right", "image-left", "image-full", "quote", "stats"] as const;

  return (
    <div
      className="ep-modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ep-modal">
        <div className="ep-modal-header">
          <div className="ep-modal-title">Edit Slide</div>
          <button className="ep-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Layout */}
        <div className="ep-field">
          <label className="ep-label">Layout</label>
          <div className="ep-layout-grid">
            {layouts.map((l) => (
              <button
                key={l}
                className={`ep-layout-btn ${draft.layout === l ? "active" : ""}`}
                onClick={() => setDraft({ ...draft, layout: l })}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="ep-field">
          <label className="ep-label">Title</label>
          <input
            className="ep-input"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Slide title"
          />
        </div>

        {/* Body */}
        <div className="ep-field">
          <label className="ep-label">Content — one bullet per line</label>
          <textarea
            className="ep-textarea"
            value={draft.body.join("\n")}
            onChange={(e) => setDraft({ ...draft, body: e.target.value.split("\n") })}
            rows={5}
            placeholder={"First key point\nSecond key point\nThird key point"}
          />
        </div>

        {/* Quote (if quote layout) */}
        {draft.layout === "quote" && (
          <>
            <div className="ep-field">
              <label className="ep-label">Quote text</label>
              <textarea
                className="ep-textarea"
                value={draft.quote || ""}
                onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                rows={3}
              />
            </div>
            <div className="ep-field">
              <label className="ep-label">Quote author</label>
              <input
                className="ep-input"
                value={draft.quoteAuthor || ""}
                onChange={(e) => setDraft({ ...draft, quoteAuthor: e.target.value })}
                placeholder="Author name"
              />
            </div>
          </>
        )}

        {/* Image URL */}
        <div className="ep-field">
          <label className="ep-label">Image URL (optional)</label>
          <input
            className="ep-input"
            value={draft.image || ""}
            onChange={(e) => setDraft({ ...draft, image: e.target.value })}
            placeholder="https://images.unsplash.com/…"
          />
          {draft.image && (
            <img src={draft.image} alt="" style={{ marginTop: 10, width: "100%", height: 120, objectFit: "cover", borderRadius: 3, border: "1px solid #1a1a1a" }} />
          )}
        </div>

        {/* Speaker notes */}
        <div className="ep-field">
          <label className="ep-label">Speaker notes</label>
          <textarea
            className="ep-textarea"
            value={draft.speakerNotes || ""}
            onChange={(e) => setDraft({ ...draft, speakerNotes: e.target.value })}
            rows={3}
            placeholder="Your personal notes for this slide…"
          />
        </div>

        {/* Actions */}
        <div className="ep-modal-actions">
          <button className="ep-save-btn" onClick={() => onSave(draft)}>
            Save changes
          </button>
          <button className="ep-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#080808",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "'DM Sans', sans-serif",
};
const primaryBtn: React.CSSProperties = {
  background: "#e8e4dc", color: "#080808", border: "none",
  padding: "12px 28px", borderRadius: 3, cursor: "pointer",
  fontFamily: "monospace", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
};
const spinnerStyle: React.CSSProperties = {
  width: 36, height: 36,
  border: "1px solid rgba(99,102,241,0.3)",
  borderTop: "1px solid #6366f1",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const EDITOR_PAGE_STYLES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }

  body { background:#080808; color:#e8e4dc; font-family:'DM Sans','Helvetica Neue',sans-serif; margin:0; }
  *, *::before, *::after { box-sizing:border-box; }

  .toast {
    position:fixed; bottom:28px; right:28px; z-index:9999;
    background:#111; border:1px solid #2a2a2a; color:#e8e4dc;
    padding:12px 20px; border-radius:3px;
    font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em;
    animation:toastIn 0.25s ease; box-shadow:0 8px 32px rgba(0,0,0,0.5);
  }

  /* Toolbar */
  .ep-toolbar {
    position:fixed; top:0; left:0; right:0; z-index:100;
    height:54px; display:flex; align-items:center; justify-content:space-between;
    padding:0 20px; background:#080808; border-bottom:1px solid #141414;
  }
  .ep-logo { font-family:'DM Serif Display',serif; font-size:16px; color:#e8e4dc; text-decoration:none; white-space:nowrap; flex-shrink:0; }
  .ep-logo span { color:#6366f1; }
  .ep-title-area { position:absolute; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:10px; }
  .ep-title-btn { background:none; border:none; color:#e8e4dc; font-size:13px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:6px; padding:4px 8px; border-radius:2px; transition:background 0.2s; }
  .ep-title-btn:hover { background:#141414; }
  .ep-title-edit-hint { color:#3f3f46; font-size:11px; }
  .ep-title-input { background:#141414; border:1px solid #6366f1; color:#e8e4dc; font-size:13px; padding:4px 10px; border-radius:2px; outline:none; font-family:'DM Sans',sans-serif; }
  .ep-slide-count { font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.1em; color:#3f3f46; background:#0d0d0d; border:1px solid #1a1a1a; padding:2px 8px; border-radius:2px; }
  .ep-toolbar-right { display:flex; gap:8px; align-items:center; flex-shrink:0; }
  .ep-toolbar-btn { background:transparent; border:1px solid #1a1a1a; color:#71717a; padding:5px 12px; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; border-radius:2px; cursor:pointer; transition:all 0.2s; white-space:nowrap; display:flex; align-items:center; gap:6px; }
  .ep-toolbar-btn:hover { border-color:#52525b; color:#e8e4dc; }
  .ep-export-btn { background:#6366f1; border:none; color:#fff; padding:6px 16px; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; border-radius:2px; cursor:pointer; transition:background 0.2s; white-space:nowrap; }
  .ep-export-btn:hover:not(:disabled) { background:#4f46e5; }
  .ep-export-btn:disabled { opacity:0.5; cursor:not-allowed; }

  /* Theme dropdown */
  .ep-theme-dropdown { position:absolute; top:calc(100% + 6px); right:0; background:#0c0c0c; border:1px solid #1a1a1a; border-radius:3px; overflow:hidden; min-width:160px; box-shadow:0 12px 40px rgba(0,0,0,0.6); z-index:200; animation:slideUp 0.2s ease; }
  .ep-theme-option { display:flex; align-items:center; gap:10px; width:100%; padding:10px 16px; background:transparent; border:none; color:#71717a; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; transition:all 0.15s; border-bottom:1px solid #141414; }
  .ep-theme-option:last-child { border-bottom:none; }
  .ep-theme-option:hover { background:#111; color:#e8e4dc; }
  .ep-theme-option.active { color:#e8e4dc; }

  /* Export dropdown */
  .ep-export-dropdown { position:absolute; top:calc(100% + 6px); right:0; background:#0c0c0c; border:1px solid #1a1a1a; border-radius:3px; overflow:hidden; min-width:240px; box-shadow:0 12px 40px rgba(0,0,0,0.6); z-index:200; animation:slideUp 0.2s ease; }
  .ep-export-option { display:flex; align-items:center; gap:14px; width:100%; padding:16px 18px; background:transparent; border:none; color:#e8e4dc; cursor:pointer; text-align:left; transition:background 0.15s; border-bottom:1px solid #141414; }
  .ep-export-option:last-child { border-bottom:none; }
  .ep-export-option:hover { background:#111; }
  .ep-export-badge { background:#1a1a1a; border:1px solid #2a2a2a; color:#6366f1; padding:3px 8px; border-radius:2px; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.1em; flex-shrink:0; }
  .ep-export-label { font-size:12px; margin-bottom:2px; }
  .ep-export-sub { font-family:'DM Mono',monospace; font-size:10px; color:#3f3f46; letter-spacing:0.06em; }

  /* Layout */
  .ep-layout { display:grid; grid-template-columns:192px 1fr; min-height:100vh; padding-top:54px; }

  /* Slide panel */
  .ep-slide-panel { background:#060606; border-right:1px solid #141414; padding:14px 10px; overflow-y:auto; height:calc(100vh - 54px); position:sticky; top:54px; }
  .ep-slide-panel::-webkit-scrollbar { width:0; }
  .ep-panel-header { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#27272a; margin-bottom:12px; padding:0 4px; }
  .ep-thumb { padding:8px; border-radius:3px; border:1px solid transparent; cursor:pointer; transition:all 0.2s; margin-bottom:6px; user-select:none; }
  .ep-thumb:hover { border-color:#2a2a2a; background:#0a0a0a; }
  .ep-thumb.active { border-color:#6366f1; background:#0d0d0d; }
  .ep-thumb-meta { display:flex; align-items:center; gap:6px; margin-bottom:5px; }
  .ep-thumb-num { font-family:'DM Mono',monospace; font-size:9px; color:#3f3f46; letter-spacing:0.08em; }
  .ep-thumb-layout { font-family:'DM Mono',monospace; font-size:9px; color:#27272a; letter-spacing:0.06em; text-transform:uppercase; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
  .ep-thumb-preview { border-radius:2px; padding:8px 10px; aspect-ratio:16/9; }
  .ep-add-slide-btn { width:100%; margin-top:10px; background:transparent; border:1px dashed #1a1a1a; color:#3f3f46; padding:10px; border-radius:2px; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
  .ep-add-slide-btn:hover { border-color:#6366f1; color:#6366f1; }

  /* Canvas area */
  .ep-canvas-area { padding:32px 48px; background:#080808; }
  .ep-canvas-nav { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
  .ep-nav-btn { background:transparent; border:1px solid #1a1a1a; color:#52525b; padding:6px 14px; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; border-radius:2px; cursor:pointer; transition:all 0.2s; }
  .ep-nav-btn:hover:not(:disabled) { border-color:#52525b; color:#e8e4dc; }
  .ep-nav-btn:disabled { opacity:0.3; cursor:not-allowed; }
  .ep-nav-counter { font-family:'DM Mono',monospace; font-size:11px; color:#3f3f46; letter-spacing:0.1em; }
  .ep-canvas-action-btn { background:transparent; border:1px solid #1a1a1a; color:#52525b; padding:6px 14px; font-family:'DM Mono',monospace; font-size:10px; letter-spacing:0.1em; text-transform:uppercase; border-radius:2px; cursor:pointer; transition:all 0.2s; }
  .ep-canvas-action-btn:hover:not(:disabled) { border-color:#52525b; color:#e8e4dc; }
  .ep-danger-btn:hover:not(:disabled) { border-color:#ef4444 !important; color:#ef4444 !important; }
  .ep-canvas-action-btn:disabled { opacity:0.25; cursor:not-allowed; }

  .ep-canvas-frame { position:relative; border:1px solid #1a1a1a; border-radius:4px; overflow:hidden; cursor:pointer; max-width:960px; box-shadow:0 20px 60px rgba(0,0,0,0.6); transition:border-color 0.2s; }
  .ep-canvas-frame:hover { border-color:#2a2a2a; }
  .ep-canvas-hint { position:absolute; bottom:10px; right:14px; font-family:'DM Mono',monospace; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.06); pointer-events:none; }

  .ep-notes { margin-top:24px; max-width:960px; padding:18px 22px; background:#0a0a0a; border:1px solid #141414; border-radius:3px; }
  .ep-notes-label { font-family:'DM Mono',monospace; font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:#3f3f46; margin-bottom:7px; }
  .ep-notes-text { font-size:13px; color:#52525b; line-height:1.6; font-weight:300; }

  /* Modal */
  .ep-modal-backdrop { position:fixed; inset:0; z-index:500; background:rgba(0,0,0,0.88); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:24px; }
  .ep-modal { background:#0c0c0c; border:1px solid #1a1a1a; border-radius:4px; padding:36px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; animation:slideUp 0.25s ease; }
  .ep-modal::-webkit-scrollbar { width:0; }
  .ep-modal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
  .ep-modal-title { font-family:'DM Serif Display',serif; font-size:22px; color:#e8e4dc; letter-spacing:-0.01em; }
  .ep-modal-close { background:none; border:none; color:#52525b; font-size:22px; cursor:pointer; line-height:1; transition:color 0.2s; padding:0; }
  .ep-modal-close:hover { color:#e8e4dc; }
  .ep-field { margin-bottom:20px; }
  .ep-label { display:block; font-family:'DM Mono',monospace; font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:#3f3f46; margin-bottom:8px; }
  .ep-input { width:100%; background:#0a0a0a; border:1px solid #1a1a1a; color:#e8e4dc; border-radius:2px; padding:10px 14px; font-family:'DM Sans',sans-serif; font-size:13px; outline:none; transition:border-color 0.2s; }
  .ep-input:focus { border-color:#6366f1; }
  .ep-textarea { width:100%; background:#0a0a0a; border:1px solid #1a1a1a; color:#e8e4dc; border-radius:2px; padding:10px 14px; font-family:'DM Sans',sans-serif; font-size:13px; outline:none; resize:vertical; transition:border-color 0.2s; line-height:1.6; }
  .ep-textarea:focus { border-color:#6366f1; }
  .ep-layout-grid { display:flex; flex-wrap:wrap; gap:6px; }
  .ep-layout-btn { background:transparent; border:1px solid #1a1a1a; color:#52525b; padding:5px 11px; border-radius:2px; font-family:'DM Mono',monospace; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; transition:all 0.15s; }
  .ep-layout-btn:hover { border-color:#52525b; color:#e8e4dc; }
  .ep-layout-btn.active { background:#6366f1; border-color:#6366f1; color:#fff; }
  .ep-modal-actions { display:flex; gap:10px; margin-top:28px; }
  .ep-save-btn { flex:1; background:#e8e4dc; color:#080808; border:none; padding:12px; border-radius:2px; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; transition:background 0.2s; }
  .ep-save-btn:hover { background:#fff; }
  .ep-cancel-btn { background:transparent; color:#52525b; border:1px solid #1a1a1a; padding:12px 20px; border-radius:2px; font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
  .ep-cancel-btn:hover { color:#e8e4dc; border-color:#52525b; }

  @media (max-width:768px) {
    .ep-layout { grid-template-columns:1fr; }
    .ep-slide-panel { display:none; }
    .ep-canvas-area { padding:20px; }
    .ep-title-area { display:none; }
  }
`;
