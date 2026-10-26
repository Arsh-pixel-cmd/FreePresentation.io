import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Presentation, Slide, ThemeId } from "@/types/presentation";

// ── Store interface ──────────────────────────────────────────

interface PresentationStore {
  presentation: Presentation | null;
  setPresentation: (p: Presentation) => void;
  clearPresentation: () => void;

  updateSlide: (slide: Slide) => void;
  addSlide: (slide: Slide) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (slides: Slide[]) => void;

  setTheme: (themeId: ThemeId) => void;
  setTitle: (title: string) => void;

  // Local persistence helpers (pure in-browser localStorage)
  saved: Record<string, Presentation>;
  savePresentation: (p: Presentation) => void;
  getPresentation: (id: string) => Presentation | null;
  deletePresentation: (id: string) => void;
  listPresentations: () => Presentation[];

  // Editor UI state
  activeSlideIndex: number;
  setActiveSlideIndex: (i: number) => void;

  // Loading & Generation states
  isGenerating: boolean;
  setIsGenerating: (b: boolean) => void;
  isSkeletonVisible: boolean;
  setIsSkeletonVisible: (b: boolean) => void;
}

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => ({
      presentation: null,
      saved: {},
      activeSlideIndex: 0,
      isGenerating: false,
      isSkeletonVisible: false,

      setIsGenerating: (b) => set({ isGenerating: b }),
      setIsSkeletonVisible: (b) => set({ isSkeletonVisible: b }),

      setPresentation: (p) => {
        set((state) => ({
          presentation: p,
          saved: { ...state.saved, [p.id]: p },
          activeSlideIndex: 0,
        }));
      },

      clearPresentation: () => set({ presentation: null, activeSlideIndex: 0 }),

      updateSlide: (slide) =>
        set((state) => {
          if (!state.presentation) return state;
          const slides = state.presentation.slides.map((s) =>
            s.id === slide.id ? slide : s
          );
          const updated = {
            ...state.presentation,
            slides,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          return { presentation: updated, saved };
        }),

      addSlide: (slide) =>
        set((state) => {
          if (!state.presentation) return state;
          const slides = [...state.presentation.slides, slide];
          const updated = {
            ...state.presentation,
            slides,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          return { presentation: updated, saved, activeSlideIndex: slides.length - 1 };
        }),

      deleteSlide: (id) =>
        set((state) => {
          if (!state.presentation) return state;
          if (state.presentation.slides.length <= 1) return state;
          const slides = state.presentation.slides.filter((s) => s.id !== id);
          const updated = {
            ...state.presentation,
            slides,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          const activeSlideIndex = Math.min(state.activeSlideIndex, slides.length - 1);
          return { presentation: updated, saved, activeSlideIndex };
        }),

      reorderSlides: (slides) =>
        set((state) => {
          if (!state.presentation) return state;
          const updated = {
            ...state.presentation,
            slides,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          return { presentation: updated, saved };
        }),

      // Theme & title
      setTheme: (themeId) =>
        set((state) => {
          if (!state.presentation) return state;
          const updated = {
            ...state.presentation,
            themeId,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          return { presentation: updated, saved };
        }),

      setTitle: (title) =>
        set((state) => {
          if (!state.presentation) return state;
          const updated = {
            ...state.presentation,
            title,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          return { presentation: updated, saved };
        }),

      // Persistence helpers (pure in-browser localStorage)
      savePresentation: (p) =>
        set((state) => ({
          saved: { ...state.saved, [p.id]: p },
        })),

      getPresentation: (id) => get().saved[id] || null,

      deletePresentation: (id) =>
        set((state) => {
          const saved = { ...state.saved };
          delete saved[id];
          return { saved };
        }),

      listPresentations: () =>
        Object.values(get().saved).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),

      setActiveSlideIndex: (i) => set({ activeSlideIndex: i }),
    }),
    {
      name: "freepresentation-store",
      partialize: (state) => ({ saved: state.saved }),
    }
  )
);
