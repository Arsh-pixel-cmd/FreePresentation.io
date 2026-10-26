"use server";

import { Presentation } from "@/types/presentation";

/**
 * Server Action to duplicate an existing presentation in-memory.
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

  return duplicated;
}

/**
 * Server Action to update the title of a presentation in-memory.
 */
export async function updatePresentationTitleAction(id: string, title: string): Promise<{ success: boolean; title: string }> {
  return { success: true, title };
}
