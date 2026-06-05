## Context

The current UI lacks a visual placeholder while data is being fetched for presentation slides. Users experience blank spaces and layout shifts, leading to perceived sluggishness.

## Goals / Non-Goals

**Goals:**
- Provide a reusable skeleton UI component that mimics the shape of the final content.
- Integrate with existing global loading state (`isSkeletonVisible` in `presentationStore`).
- Ensure the loader is theme‑aware and works in both light and dark modes.

**Non‑Goals:**
- Full‑screen loading screens for page navigation (handled by existing global spinner).
- Server‑side rendering of skeletons.

## Decisions

- Implement a `<SkeletonLoader>` React component using Tailwind CSS utilities and Framer Motion for a subtle shimmer effect.
- The component will accept `type` (e.g., "text", "image", "card") and optional `className` props for flexibility.
- Conditional rendering based on the `isSkeletonVisible` flag from the Zustand store.
- Reuse styling conventions from the existing `SelectionLoader` for visual consistency.

## Risks / Trade‑offs

- Adding a new component slightly increases bundle size; mitigated by tree‑shaking as it is only used in loading states.
- Must ensure the skeleton dimensions match the eventual content to avoid layout shifts.

## Migration Plan

1. Add `<SkeletonLoader>` component under `src/components/`.
2. Create a `useSkeleton` hook to manage the `isSkeletonVisible` flag.
3. Update relevant pages (`src/app/create/page.tsx` and any data‑intensive components) to render the loader while `isSkeletonVisible` is true.
4. Extend `globals.css` with CSS variables for skeleton base and highlight colors, supporting dark mode.
5. Run visual regression and unit tests.

## Open Questions

- Should the loader support custom animation duration via a prop? (Default 1.5 s, can be overridden.)
- Accessibility: ensure the skeleton is hidden from screen readers (use `aria-hidden`).
