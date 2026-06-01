"use client";

import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage",
    loaded: (ph) => {
      if (process.env.NODE_ENV !== "production") ph.opt_out_capturing();
    },
  });

  initialized = true;
}

export const analytics = {
  generationStarted(props: { mode: "prompt" | "upload" | "paste"; themeId: string }) {
    posthog.capture("generation_started", props);
  },

  generationCompleted(props: { slideCount: number; themeId: string; durationMs: number }) {
    posthog.capture("generation_completed", props);
  },

  generationFailed(props: { mode: string; error: string }) {
    posthog.capture("generation_failed", props);
  },

  exportStarted(props: { format: "pptx" | "pdf"; slideCount: number; themeId: string }) {
    posthog.capture("export_started", props);
  },

  themeChanged(props: { from: string; to: string }) {
    posthog.capture("theme_changed", props);
  },

  slideEdited(props: { field: "title" | "body" | "image" | "layout" | "notes" }) {
    posthog.capture("slide_edited", props);
  },

  slideAdded() {
    posthog.capture("slide_added");
  },

  slideDeleted() {
    posthog.capture("slide_deleted");
  },

  slidesReordered() {
    posthog.capture("slides_reordered");
  },

  ctaClicked(props: { location: "hero" | "nav" | "footer" | "cta_section" }) {
    posthog.capture("cta_clicked", props);
  },
};
