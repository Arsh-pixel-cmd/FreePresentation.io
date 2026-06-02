"use server";

import { createClient } from "@/lib/supabase/server";
import { Presentation } from "@/types/presentation";

const hasSupabaseConfig = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "your_supabase_url_here"
);

/**
 * Server Action to duplicate an existing presentation and optionally save it to Supabase if authenticated.
 */
export async function duplicatePresentationAction(presentation: Presentation): Promise<Presentation> {
  const newId = `pres-${Date.now()}`;
  const duplicated: Presentation = {
    ...presentation,
    id: newId,
    title: `${presentation.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase.from("presentations").insert({
          id: duplicated.id,
          user_id: user.id,
          title: duplicated.title,
          topic: duplicated.topic,
          theme_id: duplicated.themeId,
          slides: duplicated.slides,
          created_at: duplicated.createdAt,
          updated_at: duplicated.updatedAt,
        });
        if (error) {
          console.error("[Server Action] Supabase DB insert error:", error);
        }
      }
    } catch (err) {
      console.error("[Server Action] Duplicate sync to Supabase failed:", err);
    }
  }

  return duplicated;
}

/**
 * Server Action to update the title of a presentation in Supabase.
 */
export async function updatePresentationTitleAction(id: string, title: string): Promise<{ success: boolean; title: string }> {
  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from("presentations")
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) {
          console.error("[Server Action] Supabase DB update error:", error);
          return { success: false, title };
        }
      }
    } catch (err) {
      console.error("[Server Action] Update title sync to Supabase failed:", err);
      return { success: false, title };
    }
  }

  return { success: true, title };
}
