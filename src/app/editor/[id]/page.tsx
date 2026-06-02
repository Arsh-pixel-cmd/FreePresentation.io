"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePresentationStore } from "@/store/presentationStore";
import { Presentation, Slide, ThemeId, SlideTheme } from "@/types/presentation";
import { THEMES, THEME_LIST } from "@/lib/themes/themes";
import { duplicatePresentationAction, updatePresentationTitleAction } from "@/app/actions";

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
  const [activePeers, setActivePeers] = useState<string[]>([]);
  const channelRef = useRef<any>(null);

  // Setup Supabase Realtime Collaboration channel
  useEffect(() => {
    const supabase = createClient();
    const sessionUserId = `user-${Math.random().toString(36).substring(2, 6)}`;
    const channel = supabase.channel(`presentation:${id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: sessionUserId },
      },
    });

    channel
      .on("broadcast", { event: "slide-mutation" }, ({ payload }) => {
        const { type, data } = payload;
        if (type === "update-slide") {
          updateSlide(data);
        } else if (type === "add-slide") {
          addSlide(data);
        } else if (type === "delete-slide") {
          deleteSlide(data);
        } else if (type === "reorder-slides") {
          reorderSlides(data);
        } else if (type === "set-theme") {
          setTheme(data);
        } else if (type === "set-title") {
          setTitle(data);
        }
      })
      .on("broadcast", { event: "peer-active-slide" }, ({ payload }) => {
        const { peerName, slideIndex } = payload;
        showToast(`${peerName || "Someone"} moved to slide ${slideIndex + 1}`);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const peers = Object.keys(state).map((k) => `User ${k.replace("user-", "")}`);
        setActivePeers(peers);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to presentation realtime room:", id);
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, updateSlide, addSlide, deleteSlide, reorderSlides, setTheme, setTitle]);

  // Broadcast local active slide changes to other peers
  useEffect(() => {
    if (channelRef.current && presentation) {
      channelRef.current.send({
        type: "broadcast",
        event: "peer-active-slide",
        payload: {
          peerName: `User ${id.substring(0, 4)}`,
          slideIndex: activeSlideIndex,
        },
      });
    }
  }, [activeSlideIndex, presentation, id]);

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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
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
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      layout: "content",
      title: "New Slide",
      body: ["Add your first point here", "Then another one", "And a third"],
      imageQuery: "abstract background",
    };
    addSlide(newSlide);
    showToast("Slide added");
    channelRef.current?.send({
      type: "broadcast",
      event: "slide-mutation",
      payload: { type: "add-slide", data: newSlide }
    });
  };

  const handleDeleteSlide = (idx: number) => {
    if (!presentation || presentation.slides.length <= 1) return;
    const slideId = presentation.slides[idx].id;
    deleteSlide(slideId);
    showToast("Slide deleted");
    channelRef.current?.send({
      type: "broadcast",
      event: "slide-mutation",
      payload: { type: "delete-slide", data: slideId }
    });
  };

  const handleDrop = (targetIdx: number) => {
    if (!presentation || dragIdx === null || dragIdx === targetIdx) return;
    const slides = [...presentation.slides];
    const [moved] = slides.splice(dragIdx, 1);
    slides.splice(targetIdx, 0, moved);
    reorderSlides(slides);
    setActiveSlideIndex(targetIdx);
    setDragIdx(null);
    channelRef.current?.send({
      type: "broadcast",
      event: "slide-mutation",
      payload: { type: "reorder-slides", data: slides }
    });
  };

  const handleSaveSlide = (updated: Slide) => {
    updateSlide(updated);
    showToast("Slide saved");
    channelRef.current?.send({
      type: "broadcast",
      event: "slide-mutation",
      payload: { type: "update-slide", data: updated }
    });
  };

  const handleTitleSave = async () => {
    setTitle(titleDraft);
    setEditingTitle(false);
    try {
      const res = await updatePresentationTitleAction(presentation.id, titleDraft);
      if (res.success) {
        showToast("Title synced to cloud ✓");
      }
      channelRef.current?.send({
        type: "broadcast",
        event: "slide-mutation",
        payload: { type: "set-title", data: titleDraft }
      });
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
          <div style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 48, color: "#e8e4dc", marginBottom: 16 }}>
            Not found
          </div>
          <p style={{ color: "#52525b", marginBottom: 32, fontFamily: "monospace", fontSize: 12 }}>
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
      {toast && (
        <div className="fixed bottom-7 right-7 z-[9999] bg-[#111] border border-zinc-800 text-cream px-5 py-3 rounded-[3px] font-mono text-[11px] tracking-wide animate-toast-in shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {toast}
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-[100] h-[54px] flex items-center justify-between px-5 bg-surface border-b border-surface-border">
        <a href="/create" className="font-serif text-base text-cream no-underline whitespace-nowrap shrink-0">
          Free<span className="text-indigo">Presentation</span>
        </a>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5 max-md:hidden">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="bg-[#141414] border border-indigo text-cream text-[13px] px-2.5 py-1 rounded-[2px] outline-none font-sans"
            />
          ) : (
            <button
              className="bg-transparent border-none text-cream text-[13px] font-medium cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-[2px] hover:bg-[#141414] transition-colors duration-200"
              onClick={() => { setTitleDraft(presentation.title); setEditingTitle(true); }}
              title="Click to rename"
            >
              {presentation.title}
              <span className="text-zinc-700 text-[11px]">✎</span>
            </button>
          )}
          <span className="font-mono text-[10px] tracking-wide text-zinc-700 bg-surface-subtle border border-surface-border-light px-2 py-0.5 rounded-[2px]">
            {presentation.slides.length} slides
          </span>
          {activePeers.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                {activePeers.length} active
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center shrink-0">
          <div className="relative">
            <button
              className="bg-transparent border border-surface-border-light text-zinc-400 hover:border-zinc-600 hover:text-cream px-3 py-[5px] rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5"
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
              <div className="ep-theme-dropdown absolute top-[calc(100%+6px)] right-0 bg-[#0c0c0c] border border-surface-border-light rounded-[3px] overflow-hidden min-w-[160px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-[200] animate-slide-up">
                {THEME_LIST.map((t) => (
                  <button
                    key={t.id}
                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 bg-transparent border-none cursor-pointer font-mono text-[11px] tracking-wide uppercase transition-all duration-150 border-b border-surface-border last:border-b-0 hover:bg-[#111] hover:text-cream ${
                      presentation.themeId === t.id ? "text-cream" : "text-zinc-500"
                    }`}
                    onClick={() => {
                      setTheme(t.id as ThemeId);
                      setThemeMenuOpen(false);
                      showToast(`Theme: ${t.name}`);
                      channelRef.current?.send({
                        type: "broadcast",
                        event: "slide-mutation",
                        payload: { type: "set-theme", data: t.id }
                      });
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.accent, display: "inline-block", flexShrink: 0 }} />
                    {t.name}
                    {presentation.themeId === t.id && <span className="ml-auto" style={{ color: t.accent }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="bg-transparent border border-surface-border-light text-zinc-400 hover:border-zinc-600 hover:text-cream px-3 py-[5px] rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5" onClick={handleAddSlide}>
            + Add slide
          </button>

          <button className="bg-transparent border border-surface-border-light text-zinc-400 hover:border-zinc-600 hover:text-cream px-3 py-[5px] rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer transition-all duration-200 whitespace-nowrap flex items-center gap-1.5" onClick={handleDuplicate}>
            Duplicate
          </button>

          <div className="relative">
            <button
              className="bg-indigo hover:bg-indigo-hover text-white px-4 py-[6px] rounded-[2px] font-mono text-[11px] tracking-wide uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
              onClick={() => setExportOpen(!exportOpen)}
              disabled={!!exporting}
              data-export-btn="true"
            >
              {exporting ? `Exporting ${exporting}…` : "Export ↓"}
            </button>
            {exportOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 bg-[#0c0c0c] border border-surface-border-light rounded-[3px] overflow-hidden min-w-[240px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-[200] animate-slide-up">
                <button className="flex items-center gap-3.5 w-full px-[18px] py-4 bg-transparent border-none text-cream cursor-pointer text-left hover:bg-[#111] transition-colors duration-150 border-b border-surface-border last:border-b-0" onClick={() => handleExport("pptx")}>
                  <span className="bg-[#1a1a1a] border border-zinc-800 text-indigo px-2 py-[3px] rounded-[2px] font-mono text-[10px] tracking-wide shrink-0">PPT</span>
                  <div>
                    <div className="text-xs mb-0.5">PowerPoint (.pptx)</div>
                    <div className="font-mono text-[10px] text-zinc-700 tracking-wide">No watermark · Full quality</div>
                  </div>
                </button>
                <button className="flex items-center gap-3.5 w-full px-[18px] py-4 bg-transparent border-none text-cream cursor-pointer text-left hover:bg-[#111] transition-colors duration-150 border-b border-surface-border last:border-b-0" onClick={() => handleExport("pdf")}>
                  <span className="bg-[#1a1a1a] border border-zinc-800 text-indigo px-2 py-[3px] rounded-[2px] font-mono text-[10px] tracking-wide shrink-0">PDF</span>
                  <div>
                    <div className="text-xs mb-0.5">PDF Document (.pdf)</div>
                    <div className="font-mono text-[10px] text-zinc-700 tracking-wide">Print-ready · Shareable</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[192px_1fr] min-h-screen pt-[54px]">
        <aside className="bg-[#060606] border-r border-surface-border p-2.5 overflow-y-auto h-[calc(100vh-54px)] sticky top-[54px] max-md:hidden [&::-webkit-scrollbar]:w-0">
          <div className="font-mono text-[9px] tracking-widest uppercase text-zinc-800 mb-3 px-1">Slides</div>
          {presentation.slides.map((slide, i) => (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragIdx(i); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => setActiveSlideIndex(i)}
              className={`p-2 rounded-[3px] border cursor-pointer transition-all duration-200 mb-1.5 select-none hover:border-zinc-800 hover:bg-[#0a0a0a] ${
                i === activeSlideIndex ? "border-indigo bg-surface-subtle" : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-[9px] text-zinc-700 tracking-wide">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-mono text-[9px] text-zinc-800 tracking-wide uppercase overflow-hidden whitespace-nowrap text-ellipsis">{slide.layout}</span>
              </div>
              <div className="rounded-[2px] p-2 aspect-video" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <div style={{ background: theme.accent, height: 2, width: "35%", borderRadius: 1, marginBottom: 6 }} />
                <div style={{ background: theme.text, height: 5, width: "85%", opacity: 0.85, borderRadius: 1, marginBottom: 3 }} />
                <div style={{ background: theme.text, height: 3, width: "100%", opacity: 0.25, borderRadius: 1, marginBottom: 2 }} />
                <div style={{ background: theme.text, height: 3, width: "70%", opacity: 0.25, borderRadius: 1, marginBottom: 6 }} />
                {slide.image && (
                  <div style={{ background: theme.border, height: 28, borderRadius: 2, opacity: 0.5 }} />
                )}
              </div>
            </div>
          ))}

          <button className="w-full mt-2.5 bg-transparent border border-dashed border-surface-border-light text-zinc-700 p-2.5 rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer hover:border-indigo hover:text-indigo transition-all duration-200" onClick={handleAddSlide}>
            + Add slide
          </button>
        </aside>

        <main className="px-6 md:px-12 py-8 bg-surface">
          <div className="flex items-center gap-3 mb-5">
            <button
              className="bg-transparent border border-surface-border-light text-zinc-500 hover:border-zinc-600 hover:text-cream px-3.5 py-1.5 rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              disabled={activeSlideIndex === 0}
              onClick={() => setActiveSlideIndex(activeSlideIndex - 1)}
            >
              ← Prev
            </button>
            <span className="font-mono text-[11px] text-zinc-700 tracking-wide">
              {String(activeSlideIndex + 1).padStart(2, "0")} / {String(presentation.slides.length).padStart(2, "0")}
            </span>
            <button
              className="bg-transparent border border-surface-border-light text-zinc-500 hover:border-zinc-600 hover:text-cream px-3.5 py-1.5 rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              disabled={activeSlideIndex === presentation.slides.length - 1}
              onClick={() => setActiveSlideIndex(activeSlideIndex + 1)}
            >
              Next →
            </button>

            <div className="ml-auto flex gap-2">
              <button
                className="bg-transparent border border-surface-border-light text-zinc-500 hover:border-zinc-600 hover:text-cream px-3.5 py-1.5 rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200"
                onClick={() => setEditingSlide({ ...activeSlide })}
              >
                ✎ Edit slide
              </button>
              <button
                className="bg-transparent border border-surface-border-light text-zinc-500 hover:border-red-500 hover:text-red-500 px-3.5 py-1.5 rounded-[2px] font-mono text-[10px] tracking-wide uppercase cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200"
                onClick={() => handleDeleteSlide(activeSlideIndex)}
                disabled={presentation.slides.length <= 1}
              >
                Delete
              </button>
            </div>
          </div>

          <div
            className="relative border border-surface-border-light rounded-[4px] overflow-hidden cursor-pointer max-w-[960px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] hover:border-zinc-800 transition-colors duration-200"
            onDoubleClick={() => setEditingSlide({ ...activeSlide })}
          >
            <SlideCanvasRenderer slide={activeSlide} theme={theme} />
            <div className="absolute bottom-2.5 right-3.5 font-mono text-[9px] tracking-wide uppercase text-white/5 pointer-events-none">Double-click to edit</div>
          </div>

          {activeSlide?.speakerNotes && (
            <div className="mt-6 max-w-[960px] p-5 bg-[#0a0a0a] border border-surface-border rounded-[3px]">
              <div className="font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-1.5">Speaker Notes</div>
              <div className="text-xs md:text-sm text-zinc-500 leading-relaxed font-light">{activeSlide.speakerNotes}</div>
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
        <div style={{ flex: "0 0 48%", overflow: "hidden" }}>
          {slide.image
            ? /* eslint-disable-next-line @next/next/no-img-element */
              <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: theme.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: theme.border, fontFamily: "monospace", fontSize: 11 }}>No image</span>
              </div>
          }
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
          <div style={{ borderRadius: 3, overflow: "hidden", maxHeight: "65%", alignSelf: "start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
      className="fixed inset-0 z-[500] bg-black/88 backdrop-blur-md flex items-center justify-center p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0c0c0c] border border-surface-border-light rounded-[4px] p-9 w-full max-w-[540px] max-h-[90vh] overflow-y-auto animate-slide-up [&::-webkit-scrollbar]:w-0">
        <div className="flex items-center justify-between mb-7">
          <div className="font-serif text-xl text-cream tracking-tight">Edit Slide</div>
          <button className="bg-transparent border-none text-zinc-500 hover:text-cream text-2xl cursor-pointer p-0 transition-colors duration-200" onClick={onClose}>×</button>
        </div>

        <div className="mb-5">
          <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Layout</label>
          <div className="flex flex-wrap gap-1.5">
            {layouts.map((l) => (
              <button
                key={l}
                className={`bg-transparent border border-surface-border-light text-zinc-500 hover:border-zinc-600 hover:text-cream px-[11px] py-[5px] rounded-[2px] font-mono text-[9px] tracking-wide uppercase cursor-pointer transition-all duration-150 ${
                  draft.layout === l ? "bg-indigo border-indigo text-white" : ""
                }`}
                onClick={() => setDraft({ ...draft, layout: l })}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Title</label>
          <input
            className="w-full bg-[#0a0a0a] border border-surface-border-light focus:border-indigo text-cream rounded-[2px] px-3.5 py-2.5 font-sans text-xs md:text-sm outline-none transition-colors duration-200"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Slide title"
          />
        </div>

        <div className="mb-5">
          <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Content — one bullet per line</label>
          <textarea
            className="w-full bg-[#0a0a0a] border border-surface-border-light focus:border-indigo text-cream rounded-[2px] px-3.5 py-2.5 font-sans text-xs md:text-sm outline-none resize-y transition-colors duration-200 leading-relaxed"
            value={draft.body.join("\n")}
            onChange={(e) => setDraft({ ...draft, body: e.target.value.split("\n") })}
            rows={5}
            placeholder={"First key point\nSecond key point\nThird key point"}
          />
        </div>

        {draft.layout === "quote" && (
          <>
            <div className="mb-5">
              <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Quote text</label>
              <textarea
                className="w-full bg-[#0a0a0a] border border-surface-border-light focus:border-indigo text-cream rounded-[2px] px-3.5 py-2.5 font-sans text-xs md:text-sm outline-none resize-y transition-colors duration-200 leading-relaxed"
                value={draft.quote || ""}
                onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                rows={3}
              />
            </div>
            <div className="mb-5">
              <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Quote author</label>
              <input
                className="w-full bg-[#0a0a0a] border border-surface-border-light focus:border-indigo text-cream rounded-[2px] px-3.5 py-2.5 font-sans text-xs md:text-sm outline-none transition-colors duration-200"
                value={draft.quoteAuthor || ""}
                onChange={(e) => setDraft({ ...draft, quoteAuthor: e.target.value })}
                placeholder="Author name"
              />
            </div>
          </>
        )}

        <div className="mb-5">
          <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Image URL (optional)</label>
          <input
            className="w-full bg-[#0a0a0a] border border-surface-border-light focus:border-indigo text-cream rounded-[2px] px-3.5 py-2.5 font-sans text-xs md:text-sm outline-none transition-colors duration-200"
            value={draft.image || ""}
            onChange={(e) => setDraft({ ...draft, image: e.target.value })}
            placeholder="https://images.unsplash.com/…"
          />
          {draft.image && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={draft.image} alt="" style={{ marginTop: 10, width: "100%", height: 120, objectFit: "cover", borderRadius: 3, border: "1px solid #1a1a1a" }} />
          )}
        </div>

        <div className="mb-5">
          <label className="block font-mono text-[9px] tracking-widest uppercase text-zinc-700 mb-2">Speaker notes</label>
          <textarea
            className="w-full bg-[#0a0a0a] border border-surface-border-light focus:border-indigo text-cream rounded-[2px] px-3.5 py-2.5 font-sans text-xs md:text-sm outline-none resize-y transition-colors duration-200 leading-relaxed"
            value={draft.speakerNotes || ""}
            onChange={(e) => setDraft({ ...draft, speakerNotes: e.target.value })}
            rows={3}
            placeholder="Your personal notes for this slide…"
          />
        </div>

        <div className="flex gap-2.5 mt-7">
          <button className="flex-1 bg-cream hover:bg-white text-[#080808] border-none py-3 rounded-[2px] font-mono text-[11px] tracking-wide uppercase cursor-pointer transition-colors duration-200" onClick={() => onSave(draft)}>
            Save changes
          </button>
          <button className="bg-transparent border border-surface-border-light hover:border-zinc-600 hover:text-cream text-zinc-500 py-3 px-5 rounded-[2px] font-mono text-[11px] tracking-wide uppercase cursor-pointer transition-all duration-200" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  minHeight: "100vh", background: "#080808",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-dm-sans), sans-serif",
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
