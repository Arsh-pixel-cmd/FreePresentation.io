"use client";

import React from "react";

type SkeletonType = "line" | "rect" | "circle";

interface SkeletonLoaderProps {
  /** Shape of each placeholder element */
  type?: SkeletonType;
  /** Number of placeholder items to render */
  count?: number;
  /** Extra class names for the wrapper */
  className?: string;
}


export default function SkeletonLoader({
  type = "rect",
  count = 3,
  className = "",
}: SkeletonLoaderProps) {
  const itemClass = {
    line: "skeleton-item skeleton-line",
    rect: "skeleton-item skeleton-rect",
    circle: "skeleton-item skeleton-circle",
  }[type];

  return (
    <div
      role="status"
      aria-label="Loading…"
      className={`skeleton-loader ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={itemClass} />
      ))}
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

/**
 * SlideSkeletonLoader — 16:9 presentation slide canvas with centered progress spinner
 * and theme-accented styling to provide consistent, context-aware visual feedback.
 */
export function SlideSkeletonLoader({
  themeAccent = "#6366f1",
  themeName = "Theme",
  activeStepText = "Structuring presentation…",
  className = "",
}: {
  themeAccent?: string;
  themeName?: string;
  activeStepText?: string;
  className?: string;
}) {
  return (
    <div
      className={`w-full max-w-[620px] aspect-[16/9] mx-auto rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${themeAccent}14 0%, #0d121f 75%)`,
        boxShadow: `0 20px 60px -15px ${themeAccent}20, inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
      }}
    >
      {/* Top slide metadata bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: themeAccent }}
          />
          <span className="font-mono text-[11px] tracking-wider uppercase text-slate-400 font-medium">
            AI Presentation Engine
          </span>
        </div>
        <div className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-400 font-semibold">
          16:9 HD
        </div>
      </div>

      {/* Centered slide mock layout + Centered Progress Spinner */}
      <div className="relative my-auto flex flex-col items-center justify-center py-2 z-10">
        {/* Centered Spinner */}
        <div className="relative flex items-center justify-center mb-4">
          {/* Subtle outer pulse aura */}
          <div
            className="absolute w-16 h-16 rounded-full animate-ping opacity-20 pointer-events-none"
            style={{ backgroundColor: themeAccent }}
          />
          {/* Track ring */}
          <div className="w-12 h-12 rounded-full border-2 border-white/10" />
          {/* Spinning ring */}
          <div
            className="w-12 h-12 rounded-full border-2 border-transparent border-t-current border-r-current animate-spin absolute"
            style={{ color: themeAccent }}
          />
          {/* Inner core */}
          <div
            className="w-4 h-4 rounded-full absolute shadow-sm"
            style={{ backgroundColor: themeAccent }}
          />
        </div>

        {/* Mock slide header skeleton */}
        <div className="w-3/5 h-3.5 bg-white/15 rounded-md skeleton-item mb-2.5" />
        <div className="w-2/5 h-2.5 bg-white/10 rounded-md skeleton-item mb-5" />

        {/* Mock slide bullet / columns skeleton */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-[380px] opacity-60">
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-white/10 rounded skeleton-item" />
            <div className="w-4/5 h-2 bg-white/10 rounded skeleton-item" />
            <div className="w-3/4 h-2 bg-white/10 rounded skeleton-item" />
          </div>
          <div className="h-10 bg-white/10 rounded-lg skeleton-item" />
        </div>
      </div>

      {/* Bottom slide footer indicator */}
      <div className="flex items-center justify-between z-10 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-slate-500">Theme</span>
          <span
            className="font-mono text-[10px] uppercase font-bold tracking-wider"
            style={{ color: themeAccent }}
          >
            {themeName}
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          Rendering Slide Canvas…
        </div>
      </div>
    </div>
  );
}

/** Convenience wrappers */
export function SkeletonLines({ count = 4 }: { count?: number }) {
  return <SkeletonLoader type="line" count={count} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return <SkeletonLoader type="rect" count={count} />;
}
