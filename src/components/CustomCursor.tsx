"use client";

import { useEffect, useRef, useState } from "react";
import { usePresentationStore } from "@/store/presentationStore";

export default function CustomCursor() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const isGenerating = usePresentationStore((state) => state.isGenerating);
  
  // Track mouse coordinates directly without state to avoid component re-renders
  const mousePosRef = useRef({ x: -100, y: -100 });
  const currentDotRef = useRef({ x: -100, y: -100 });
  const currentRingRef = useRef({ x: -100, y: -100 });
  
  const [isHovered, setIsHovered] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    document.body.classList.add("custom-cursor-active");

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Detect interactive elements to trigger hover scaling
      const hoverable = target.closest("a, button, select, input[type='submit'], input[type='button'], [role='button']");
      setIsHovered(!!hoverable);

      // Detect text inputs where custom cursor should hide itself to expose browser's I-beam
      const textEntry = target.closest("input[type='text'], input[type='email'], input[type='password'], textarea, [contenteditable='true']");
      setIsHidden(!!textEntry);
    };

    const handleMouseLeave = () => {
      setIsHidden(true);
    };

    const handleMouseEnter = () => {
      setIsHidden(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    let animationFrameId: number;

    // Linear interpolation for smooth trailing ring lag
    const updateCursor = () => {
      const targetX = mousePosRef.current.x;
      const targetY = mousePosRef.current.y;

      // Faster response for the dot
      currentDotRef.current.x += (targetX - currentDotRef.current.x) * 0.35;
      currentDotRef.current.y += (targetY - currentDotRef.current.y) * 0.35;

      // Smooth lag for the outer ring (LERP coefficient 0.15)
      currentRingRef.current.x += (targetX - currentRingRef.current.x) * 0.15;
      currentRingRef.current.y += (targetY - currentRingRef.current.y) * 0.15;

      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${currentDotRef.current.x - 5}px, ${currentDotRef.current.y - 5}px, 0)`;
      }

      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${currentRingRef.current.x - 18}px, ${currentRingRef.current.y - 18}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(updateCursor);
    };

    animationFrameId = requestAnimationFrame(updateCursor);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Cursor Dot */}
      <div
        ref={cursorDotRef}
        className={`fixed top-0 left-0 w-2.5 h-2.5 bg-indigo rounded-full pointer-events-none z-[9999] mix-blend-difference will-change-transform transition-[opacity,scale] duration-200 ${
          isHidden ? "opacity-0 scale-0" : isGenerating ? "opacity-40 scale-75" : "opacity-100 scale-100"
        }`}
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      />

      {/* Cursor Ring — calm follower, never a rogue spinning loader */}
      <div
        ref={cursorRingRef}
        className={`fixed top-0 left-0 w-9 h-9 border rounded-full pointer-events-none z-[9998] will-change-transform transition-[opacity,scale,border-color,background-color] duration-200 ${
          isHovered && !isGenerating
            ? "scale-[1.5] border-indigo bg-indigo/5"
            : "border-indigo-muted"
        } ${isHidden ? "opacity-0 scale-0" : isGenerating ? "opacity-30 scale-90" : "opacity-100"}`}
        style={{ transform: "translate3d(-100px, -100px, 0)" }}
      />
    </>
  );
}
