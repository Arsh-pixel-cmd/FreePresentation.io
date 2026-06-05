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

/**
 * SkeletonLoader — animated shimmer placeholder.
 * Supports three shapes: `line` (text rows), `rect` (card / image blocks),
 * and `circle` (avatars / icons).  Uses a pure-CSS shimmer so there is no
 * runtime JS animation overhead.
 */
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

/** Convenience wrappers */
export function SkeletonLines({ count = 4 }: { count?: number }) {
  return <SkeletonLoader type="line" count={count} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return <SkeletonLoader type="rect" count={count} />;
}
