"use client";

import { useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   LENIS PROVIDER
   Initializes Lenis smooth scroll on mount.
   Also boots PostHog + Sentry on client side.
───────────────────────────────────────────── */

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // ── Lenis smooth scroll ──────────────────
    async function initLenis() {
      try {
        const Lenis = (await import("lenis")).default;
        lenisRef.current = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: "vertical",
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 2,
        });

        function raf(time: number) {
          lenisRef.current?.raf(time);
          rafRef.current = requestAnimationFrame(raf);
        }
        rafRef.current = requestAnimationFrame(raf);
      } catch (err) {
        console.warn("Lenis init failed, falling back to native scroll:", err);
      }
    }

    initLenis();

    // ── PostHog ──────────────────────────────
    async function initAnalytics() {
      if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
      try {
        const { initPostHog } = await import("@/monitoring/posthog");
        initPostHog();
      } catch {}
    }

    initAnalytics();

    // ── Sentry ───────────────────────────────
    async function initErrors() {
      if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
      try {
        const { initSentry } = await import("@/monitoring/sentry");
        initSentry();
      } catch {}
    }

    initErrors();

    return () => {
      cancelAnimationFrame(rafRef.current);
      lenisRef.current?.destroy();
    };
  }, []);

  return <>{children}</>;
}
