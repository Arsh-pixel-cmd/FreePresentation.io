"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePresentationStore } from "@/store/presentationStore";
import { Presentation, Slide, ThemeId, SlideTheme } from "@/types/presentation";
import { THEMES, THEME_LIST } from "@/lib/themes/themes";
import { duplicatePresentationAction, updatePresentationTitleAction } from "@/app/actions";
import SlideAnnotationCanvas from "@/components/SlideAnnotationCanvas";
import SkeletonLoader from "@/components/SkeletonLoader";

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
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);


  useEffect(() => {
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
    }, 50);
    return () => clearTimeout(timer);
  }, [id, presentation, getPresentation, savePresentation, setPresentation]);

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingSlide || editingTitle) return;
      if (!presentation) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setActiveSlideIndex(Math.min(presentation.slides.length - 1, activeSlideIndex + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingSlide, editingTitle, activeSlideIndex, presentation, setActiveSlideIndex]);

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

  const handleTitleSave = async () => {
    if (!presentation) return;
    setTitle(titleDraft);
    setEditingTitle(false);
    try {
      const res = await updatePresentationTitleAction(presentation.id, titleDraft);
      if (res.success) {
        showToast("Title updated ✓");
      }
    } catch (err) {
      console.error("[Server Action] Title save failed:", err);
    }
  };

  const handleDuplicate = async () => {
    if (!presentation) return;
    try {
      showToast("Duplicating presentation...");
      const duplicated = await duplicatePresentationAction(presentation);
      savePresentation(duplicated);
      showToast("Duplicated successfully! Redirecting...");
      setTimeout(() => {
        router.push(`/editor/${duplicated.id}`);
      }, 800);
    } catch (err) {
      showToast("Duplication failed.");
      console.error("[Server Action] Duplication failed:", err);
    }
  };

  if (notFound) {
    return (
      <div style={centeredStyle}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 48, color: "#f8fafc", marginBottom: 16 }}>
            Not found
          </div>
          <p style={{ color: "#94a3b8", marginBottom: 32, fontFamily: "monospace", fontSize: 13 }}>
            This presentation doesn&apos;t exist or was cleared.
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
      <div className="min-h-screen bg-surface flex flex-col">
        {/* Header Skeleton */}
        <header className="h-[54px] flex items-center justify-between px-5 bg-surface border-b border-surface-border">
          <div className="font-serif text-base text-cream opacity-70">
            Free<span className="text-indigo">Presentation</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-[100px] h-[24px] skeleton-item" />
            <div className="w-[80px] h-[24px] skeleton-item" />
            <div className="w-[120px] h-[24px] skeleton-item" />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] flex-1">
          {/* Sidebar Skeleton */}
          <aside className="bg-surface-raised border-r border-surface-border p-3 max-md:hidden space-y-3">
            <div className="font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-3 px-1">Slides</div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-2 border border-transparent space-y-2">
                <div className="w-12 h-3 skeleton-item" />
                <div className="w-full aspect-video skeleton-item" />
              </div>
            ))}
          </aside>

          {/* Main Area Skeleton */}
          <main className="px-6 md:px-12 py-8 bg-surface space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-7 skeleton-item" />
              <div className="w-16 h-7 skeleton-item" />
              <div className="w-16 h-7 skeleton-item" />
              <div className="ml-auto w-24 h-7 skeleton-item" />
            </div>

            {/* Slide Canvas Placeholder */}
            <div className="w-full max-w-[960px] aspect-video skeleton-item rounded-lg" />

            {/* Notes Placeholder */}
            <div className="w-full max-w-[960px] p-5 bg-surface-raised border border-surface-border rounded-lg space-y-2">
              <div className="w-24 h-3 skeleton-item" />
              <div className="w-full h-4 skeleton-item" />
              <div className="w-3/4 h-4 skeleton-item" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const theme = THEMES[presentation.themeId];
  const activeSlide = presentation.slides[activeSlideIndex];

  return (
    <>
      {toast && (
        <div className="fixed bottom-7 right-7 z-[9999] bg-surface-overlay border border-surface-border-light text-cream px-5 py-3 rounded-lg font-mono text-xs tracking-wide animate-toast-in shadow-2xl">
          {toast}
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-[100] h-[54px] flex items-center justify-between px-5 bg-surface/90 backdrop-blur-md border-b border-surface-border">
        <a href="/create" className="font-serif text-base text-cream no-underline whitespace-nowrap shrink-0 flex items-center gap-1.5">
          <span>Free<span className="text-indigo font-bold">Presentation</span></span>
        </a>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 max-md:hidden">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="bg-surface-subtle border border-indigo text-cream text-[13px] px-3 py-1 rounded-md outline-none font-sans"
            />
          ) : (
            <button
              className="bg-transparent border-none text-cream text-[14px] font-medium cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-surface-subtle transition-colors duration-200"
              onClick={() => { setTitleDraft(presentation.title); setEditingTitle(true); }}
              title="Click to rename"
            >
              {presentation.title}
              <span className="text-slate-400 text-xs">✎</span>
            </button>
          )}
          <span className="font-mono text-xs tracking-wide text-slate-300 bg-surface-subtle border border-surface-border px-2.5 py-0.5 rounded-md font-semibold">
            {presentation.slides.length} slides
          </span>
        </div>

        <div className="flex gap-2 items-center shrink-0">
          <div className="relative">
            <button
              className="bg-surface-raised/80 border border-surface-border text-slate-200 hover:border-slate-500 hover:text-white px-3 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              data-theme-btn="true"
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
              <div className="ep-theme-dropdown absolute top-[calc(100%+6px)] right-0 bg-surface-overlay border border-surface-border rounded-xl overflow-hidden min-w-[170px] shadow-2xl z-[200] animate-slide-up">
                {THEME_LIST.map((t) => (
                  <button
                    key={t.id}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 bg-transparent border-none cursor-pointer font-mono text-xs tracking-wide uppercase transition-all duration-150 border-b border-surface-border last:border-b-0 hover:bg-surface-subtle hover:text-white ${
                      presentation.themeId === t.id ? "text-cream font-bold" : "text-slate-300"
                    }`}
                    onClick={() => {
                      setTheme(t.id as ThemeId);
                      setThemeMenuOpen(false);
                      showToast(`Theme: ${t.name}`);
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, display: "inline-block", flexShrink: 0 }} />
                    {t.name}
                    {presentation.themeId === t.id && <span className="ml-auto font-bold" style={{ color: t.accent }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className={`px-3 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 font-medium ${
              isDrawingMode
                ? "bg-rose-500 border border-rose-500 text-white hover:bg-rose-600 shadow-md"
                : "bg-surface-raised/80 border border-surface-border text-slate-200 hover:border-slate-500 hover:text-white"
            }`}
            onClick={() => setIsDrawingMode(!isDrawingMode)}
          >
            {isDrawingMode ? "✎ Draw: ON" : "✎ Annotate"}
          </button>

          <button className="bg-surface-raised/80 border border-surface-border text-slate-200 hover:border-slate-500 hover:text-white px-3 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5" onClick={handleAddSlide}>
            + Add slide
          </button>

          <button className="bg-surface-raised/80 border border-surface-border text-slate-200 hover:border-slate-500 hover:text-white px-3 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5" onClick={handleDuplicate}>
            Duplicate
          </button>

          <div className="relative">
            <button
              className="bg-indigo hover:bg-indigo-hover text-white px-4 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap font-semibold shadow-md shadow-indigo/20"
              onClick={() => setExportOpen(!exportOpen)}
              disabled={!!exporting}
              data-export-btn="true"
            >
              {exporting ? `Exporting ${exporting}…` : "Export ↓"}
            </button>
            {exportOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 bg-surface-overlay border border-surface-border rounded-xl overflow-hidden min-w-[250px] shadow-2xl z-[200] animate-slide-up">
                <button className="flex items-center gap-3.5 w-full px-5 py-4 bg-transparent border-none text-cream cursor-pointer text-left hover:bg-surface-subtle transition-colors duration-150 border-b border-surface-border last:border-b-0" onClick={() => handleExport("pptx")}>
                  <span className="bg-surface-subtle border border-surface-border-light text-indigo-400 px-2.5 py-1 rounded-md font-mono text-xs tracking-wide shrink-0 font-bold">PPT</span>
                  <div>
                    <div className="text-xs font-semibold mb-0.5">PowerPoint (.pptx)</div>
                    <div className="font-mono text-[10px] text-slate-400 tracking-wide font-medium">No watermark · Full quality</div>
                  </div>
                </button>
                <button className="flex items-center gap-3.5 w-full px-5 py-4 bg-transparent border-none text-cream cursor-pointer text-left hover:bg-surface-subtle transition-colors duration-150 border-b border-surface-border last:border-b-0" onClick={() => handleExport("pdf")}>
                  <span className="bg-surface-subtle border border-surface-border-light text-indigo-400 px-2.5 py-1 rounded-md font-mono text-xs tracking-wide shrink-0 font-bold">PDF</span>
                  <div>
                    <div className="text-xs font-semibold mb-0.5">PDF Document (.pdf)</div>
                    <div className="font-mono text-[10px] text-slate-400 tracking-wide font-medium">Print-ready · Shareable</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] min-h-screen pt-[54px]">
        <aside className="bg-surface-raised/80 border-r border-surface-border p-3 overflow-y-auto h-[calc(100vh-54px)] sticky top-[54px] max-md:hidden [&::-webkit-scrollbar]:w-0">
          <div className="font-mono text-xs tracking-widest uppercase text-slate-300 font-bold mb-3 px-1">Slides</div>
          {presentation.slides.map((slide, i) => (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(i); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => setActiveSlideIndex(i)}
              className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 mb-2 select-none hover:border-slate-500 hover:bg-surface-subtle/50 ${
                i === activeSlideIndex ? "border-indigo bg-surface-subtle shadow-md shadow-indigo/10" : "border-surface-border/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="font-mono text-[10px] text-slate-300 font-bold tracking-wide">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-mono text-[10px] text-slate-400 font-medium tracking-wide uppercase overflow-hidden whitespace-nowrap text-ellipsis max-w-[110px]">{slide.layout}</span>
              </div>
              <div className="rounded-md p-2 aspect-video shadow-sm" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div style={{ background: theme.accent, height: 2, width: "35%", borderRadius: 1, marginBottom: 5 }} />
                <div style={{ background: theme.text, height: 5, width: "85%", opacity: 0.9, borderRadius: 1, marginBottom: 3 }} />
                <div style={{ background: theme.text, height: 3, width: "100%", opacity: 0.35, borderRadius: 1, marginBottom: 2 }} />
                <div style={{ background: theme.text, height: 3, width: "70%", opacity: 0.35, borderRadius: 1, marginBottom: 5 }} />
                {slide.image && (
                  <div style={{ background: theme.border, height: 26, borderRadius: 2, opacity: 0.6 }} />
                )}
              </div>
            </div>
          ))}

          <button className="w-full mt-3 bg-surface-subtle/60 border border-dashed border-surface-border text-slate-300 p-2.5 rounded-lg font-mono text-xs tracking-wide uppercase cursor-pointer hover:border-indigo hover:text-indigo-400 transition-all duration-200 font-semibold" onClick={handleAddSlide}>
            + Add slide
          </button>
        </aside>

        <main className="px-6 md:px-12 py-8 bg-surface">
          <div className="flex items-center gap-3 mb-5 max-w-[960px]">
            <button
              className="bg-surface-raised/70 border border-surface-border text-slate-300 hover:border-slate-500 hover:text-white px-3.5 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              disabled={activeSlideIndex === 0}
              onClick={() => setActiveSlideIndex(activeSlideIndex - 1)}
            >
              ← Prev
            </button>
            <span className="font-mono text-xs text-slate-300 font-semibold tracking-wide">
              {String(activeSlideIndex + 1).padStart(2, "0")} / {String(presentation.slides.length).padStart(2, "0")}
            </span>
            <button
              className="bg-surface-raised/70 border border-surface-border text-slate-300 hover:border-slate-500 hover:text-white px-3.5 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              disabled={activeSlideIndex === presentation.slides.length - 1}
              onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
            >
              Next →
            </button>

            <div className="ml-auto flex gap-2">
              <button
                className="bg-surface-raised/70 border border-surface-border text-slate-300 hover:border-slate-500 hover:text-white px-3.5 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-200 font-medium"
                onClick={() => setEditingSlide({ ...activeSlide })}
              >
                ✎ Edit slide
              </button>
              <button
                className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:border-rose-500/40 hover:text-rose-300 px-3.5 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                onClick={() => handleDeleteSlide(activeSlideIndex)}
                disabled={presentation.slides.length <= 1}
              >
                Delete
              </button>
            </div>
          </div>

          <div
            className="relative border border-surface-border rounded-xl overflow-hidden cursor-pointer max-w-[960px] shadow-2xl hover:border-slate-500 transition-colors duration-200"
            onDoubleClick={() => !isDrawingMode && setEditingSlide({ ...activeSlide })}
          >
            <SlideCanvasRenderer slide={activeSlide} theme={theme} />
            <SlideAnnotationCanvas
              strokes={activeSlide.annotations || []}
              onChange={(updatedStrokes) => {
                handleSaveSlide({ ...activeSlide, annotations: updatedStrokes });
              }}
              isDrawingMode={isDrawingMode}
              themeAccent={theme.accent}
            />
            {!isDrawingMode && (
              <div className="absolute bottom-3 right-4 font-mono text-[10px] tracking-wide uppercase text-white/30 pointer-events-none font-medium">Double-click to edit</div>
            )}
          </div>

          {activeSlide?.speakerNotes && (
            <div className="mt-6 max-w-[960px] p-5 bg-surface-raised border border-surface-border rounded-xl shadow-md">
              <div className="font-mono text-xs tracking-widest uppercase text-slate-300 font-bold mb-2">Speaker Notes</div>
              <div className="text-sm text-slate-200 leading-relaxed font-normal">{activeSlide.speakerNotes}</div>
            </div>
          )}
        </main>
      </div>

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

function SlideCanvasRenderer({
  slide,
  theme,
}: {
  slide: Slide;
  theme: SlideTheme;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    aspectRatio: "16/9",
    background: theme.bg,
    color: theme.text,
    fontFamily: "var(--font-dm-sans), 'Helvetica Neue', sans-serif",
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
        <h1 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(22px,4vw,52px)", lineHeight: 1.05, letterSpacing: "-0.025em", color: theme.text, marginBottom: "4%" }}>
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />
      <div style={{ position: "relative", padding: "5% 7%", zIndex: 1 }}>
        <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(16px,3vw,38px)", color: "#fff", letterSpacing: "-0.02em", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
          {slide.title}
        </h2>
      </div>
      {slide.imageCredit && (
        <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: "clamp(6px, 0.8vw, 10px)", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)", padding: "2px 6px", borderRadius: 2, zIndex: 10 }}>
          {slide.imageCreditUrl ? (
            <a href={slide.imageCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{slide.imageCredit}</a>
          ) : (
            slide.imageCredit
          )}
        </div>
      )}
    </div>
  );

  if (slide.layout === "quote") return (
    <div style={{ ...base, padding: "7% 11%" }}>
      <div style={{ color: theme.accent, fontSize: "clamp(40px,6vw,80px)", fontFamily: "Georgia, serif", lineHeight: 0.7, marginBottom: "3%" }}>&quot;</div>
      <blockquote style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(13px,2vw,24px)", lineHeight: 1.45, color: theme.text, fontStyle: "italic", marginBottom: "4%" }}>
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
      <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(14px,2.4vw,28px)", color: theme.text, letterSpacing: "-0.02em", marginBottom: "5%" }}>
        {slide.title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "4%" }}>
        {(slide.stats || []).slice(0, 3).map((s, i) => (
          <div key={i} style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "3%" }}>
            <div style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(18px,3.2vw,40px)", color: theme.accent, marginBottom: "2%", lineHeight: 1 }}>{s.value}</div>
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
        <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(13px,2.2vw,26px)", lineHeight: 1.1, color: theme.text, letterSpacing: "-0.02em" }}>{slide.title}</h2>
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
          <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(13px,2vw,24px)", color: theme.text, lineHeight: 1.15, marginBottom: "4%", letterSpacing: "-0.02em" }}>{slide.title}</h2>
          {slide.body.slice(0, 3).map((b, i) => (
            <p key={i} style={{ fontSize: "clamp(7px,1vw,11px)", color: theme.muted, marginBottom: "3%", lineHeight: 1.6 }}>{b}</p>
          ))}
        </div>
        <div style={{ flex: "0 0 48%", overflow: "hidden", position: "relative" }}>
          {slide.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {slide.imageCredit && (
                <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: "clamp(6px, 0.8vw, 10px)", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)", padding: "2px 6px", borderRadius: 2, zIndex: 10 }}>
                  {slide.imageCreditUrl ? (
                    <a href={slide.imageCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{slide.imageCredit}</a>
                  ) : (
                    slide.imageCredit
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", background: theme.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: theme.border, fontFamily: "monospace", fontSize: 11 }}>No image</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...base, padding: "5% 7%" }}>
      <div style={{ background: theme.accent, height: 2, width: "16%", borderRadius: 1, marginBottom: "3%" }} />
      <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: "clamp(14px,2.4vw,28px)", color: theme.text, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "3%", maxWidth: "65%" }}>
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
          <div style={{ borderRadius: 3, overflow: "hidden", maxHeight: "65%", alignSelf: "start", position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {slide.imageCredit && (
              <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: "clamp(6px, 0.8vw, 10px)", fontFamily: "monospace", background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.8)", padding: "2px 6px", borderRadius: 2, zIndex: 10 }}>
                {slide.imageCreditUrl ? (
                  <a href={slide.imageCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{slide.imageCredit}</a>
                ) : (
                  slide.imageCredit
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
      className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-overlay border border-surface-border rounded-xl p-8 w-full max-w-[560px] max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl [&::-webkit-scrollbar]:w-0">
        <div className="flex items-center justify-between mb-7 border-b border-surface-border pb-4">
          <div className="font-serif text-2xl text-cream tracking-tight font-medium">Edit Slide</div>
          <button className="bg-transparent border-none text-slate-400 hover:text-white text-2xl cursor-pointer p-0 transition-colors duration-200" onClick={onClose}>×</button>
        </div>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Layout</label>
          <div className="flex flex-wrap gap-2">
            {layouts.map((l) => (
              <button
                key={l}
                className={`border px-3 py-1.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-150 ${
                  draft.layout === l
                    ? "bg-indigo border-indigo text-white font-bold shadow-sm"
                    : "bg-surface-subtle border-surface-border text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
                onClick={() => setDraft({ ...draft, layout: l })}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Title</label>
          <input
            className="w-full bg-surface-subtle border border-surface-border focus:border-indigo text-cream rounded-md px-4 py-2.5 font-sans text-sm outline-none transition-colors duration-200 placeholder:text-slate-500"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Slide title"
          />
        </div>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Content — one bullet per line</label>
          <textarea
            className="w-full bg-surface-subtle border border-surface-border focus:border-indigo text-cream rounded-md px-4 py-3 font-sans text-sm outline-none resize-y transition-colors duration-200 leading-relaxed placeholder:text-slate-500"
            value={draft.body.join("\n")}
            onChange={(e) => setDraft({ ...draft, body: e.target.value.split("\n") })}
            rows={5}
            placeholder={"First key point\nSecond key point\nThird key point"}
          />
        </div>

        {draft.layout === "quote" && (
          <>
            <div className="mb-5">
              <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Quote text</label>
              <textarea
                className="w-full bg-surface-subtle border border-surface-border focus:border-indigo text-cream rounded-md px-4 py-2.5 font-sans text-sm outline-none resize-y transition-colors duration-200 leading-relaxed placeholder:text-slate-500"
                value={draft.quote || ""}
                onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                rows={3}
              />
            </div>
            <div className="mb-5">
              <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Quote author</label>
              <input
                className="w-full bg-surface-subtle border border-surface-border focus:border-indigo text-cream rounded-md px-4 py-2.5 font-sans text-sm outline-none transition-colors duration-200 placeholder:text-slate-500"
                value={draft.quoteAuthor || ""}
                onChange={(e) => setDraft({ ...draft, quoteAuthor: e.target.value })}
                placeholder="Author name"
              />
            </div>
          </>
        )}

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Image URL (optional)</label>
          <input
            className="w-full bg-surface-subtle border border-surface-border focus:border-indigo text-cream rounded-md px-4 py-2.5 font-sans text-sm outline-none transition-colors duration-200 placeholder:text-slate-500"
            value={draft.image || ""}
            onChange={(e) => setDraft({ ...draft, image: e.target.value, imageCredit: "", imageCreditUrl: "" })}
            placeholder="https://images.unsplash.com/…"
          />
          {draft.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={draft.image} alt="" style={{ marginTop: 10, width: "100%", height: 130, objectFit: "cover", borderRadius: 6, border: "1px solid #1e293b" }} />
          )}
        </div>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest uppercase text-slate-300 font-semibold mb-2">Speaker notes</label>
          <textarea
            className="w-full bg-surface-subtle border border-surface-border focus:border-indigo text-cream rounded-md px-4 py-2.5 font-sans text-sm outline-none resize-y transition-colors duration-200 leading-relaxed placeholder:text-slate-500"
            value={draft.speakerNotes || ""}
            onChange={(e) => setDraft({ ...draft, speakerNotes: e.target.value })}
            rows={3}
            placeholder="Your personal notes for this slide…"
          />
        </div>

        <div className="flex gap-3 mt-7 pt-4 border-t border-surface-border">
          <button className="flex-1 bg-cream hover:bg-white text-surface border-none py-3.5 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-colors duration-200 font-bold shadow-md" onClick={() => onSave(draft)}>
            Save changes
          </button>
          <button className="bg-transparent border border-surface-border hover:border-slate-500 hover:text-white text-slate-300 py-3.5 px-6 rounded-md font-mono text-xs tracking-wide uppercase cursor-pointer transition-all duration-200" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#090d16",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-dm-sans), sans-serif",
};
const primaryBtn: React.CSSProperties = {
  background: "#f8fafc", color: "#090d16", border: "none",
  padding: "12px 28px", borderRadius: 6, cursor: "pointer",
  fontFamily: "monospace", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
  fontWeight: "bold",
};
