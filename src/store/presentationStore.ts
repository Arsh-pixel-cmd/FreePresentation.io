import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Presentation, Slide, ThemeId } from "@/types/presentation";
import { createClient } from "@/lib/supabase/client";

// ── Supabase cloud sync helpers ──────────────────────────────
// These fire-and-forget — LocalStorage is the source of truth for speed,
// Supabase is the durable backup when a user is authenticated.

async function syncToCloud(presentation: Presentation) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // guest mode — skip cloud sync

    await supabase.from("presentations").upsert(
      {
        id: presentation.id,
        user_id: user.id,
        title: presentation.title,
        topic: presentation.topic,
        theme_id: presentation.themeId,
        slides: presentation.slides,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("[Cloud Sync] Failed to sync presentation:", err);
  }
}

async function deleteFromCloud(presentationId: string) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("presentations").delete().eq("id", presentationId);
  } catch (err) {
    console.warn("[Cloud Sync] Failed to delete presentation:", err);
  }
}

// ── Store ────────────────────────────────────────────────────

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

  saved: Record<string, Presentation>;
  savePresentation: (p: Presentation) => void;
  getPresentation: (id: string) => Presentation | null;
  deletePresentation: (id: string) => void;
  listPresentations: () => Presentation[];

  // Cloud sync
  loadFromCloud: () => Promise<void>;

  activeSlideIndex: number;
  setActiveSlideIndex: (i: number) => void;

  isGenerating: boolean;
  setIsGenerating: (b: boolean) => void;
}

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => ({
      presentation: null,
      isGenerating: false,
      setIsGenerating: (b) => set({ isGenerating: b }),

      setPresentation: (p) =>
        set({ presentation: p, activeSlideIndex: 0 }),

      clearPresentation: () =>
        set({ presentation: null, activeSlideIndex: 0 }),

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
          syncToCloud(updated);
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
          syncToCloud(updated);
          return {
            presentation: updated,
            saved,
            activeSlideIndex: slides.length - 1,
          };
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
          const activeSlideIndex = Math.min(
            state.activeSlideIndex,
            slides.length - 1
          );
          syncToCloud(updated);
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
          syncToCloud(updated);
          return { presentation: updated, saved };
        }),

      setTheme: (themeId) =>
        set((state) => {
          if (!state.presentation) return state;
          const updated = {
            ...state.presentation,
            themeId,
            updatedAt: new Date().toISOString(),
          };
          const saved = { ...state.saved, [updated.id]: updated };
          syncToCloud(updated);
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
          syncToCloud(updated);
          return { presentation: updated, saved };
        }),

      saved: {},

      savePresentation: (p) =>
        set((state) => {
          syncToCloud(p);
          return { saved: { ...state.saved, [p.id]: p } };
        }),

      getPresentation: (id) => get().saved[id] || null,

      deletePresentation: (id) =>
        set((state) => {
          const saved = { ...state.saved };
          delete saved[id];
          deleteFromCloud(id);
          return { saved };
        }),

      listPresentations: () =>
        Object.values(get().saved).sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),

      // Pull cloud presentations and merge them into the local store
      loadFromCloud: async () => {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from("presentations")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

          if (error || !data) return;

          const cloudSaved: Record<string, Presentation> = {};
          for (const row of data) {
            cloudSaved[row.id] = {
              id: row.id,
              title: row.title,
              topic: row.topic || "",
              themeId: row.theme_id as ThemeId,
              slides: row.slides as Slide[],
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          }

          // Merge: cloud wins on conflicts (newer updated_at takes precedence)
          set((state) => {
            const merged = { ...state.saved };
            for (const [id, cloudPres] of Object.entries(cloudSaved)) {
              const local = merged[id];
              if (
                !local ||
                new Date(cloudPres.updatedAt).getTime() >
                  new Date(local.updatedAt).getTime()
              ) {
                merged[id] = cloudPres;
              }
            }
            return { saved: merged };
          });
        } catch (err) {
          console.warn("[Cloud Sync] Failed to load from cloud:", err);
        }
      },

      activeSlideIndex: 0,
      setActiveSlideIndex: (i) => set({ activeSlideIndex: i }),
    }),
    {
      name: "freepresentation-store",
      partialize: (state) => ({ saved: state.saved }),
    }
  )
);
