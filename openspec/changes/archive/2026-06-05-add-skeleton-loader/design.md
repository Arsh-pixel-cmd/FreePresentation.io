## Context

The application currently shows a spinner or blank space while data is being fetched, which creates a jarring experience. We aim to replace this with a visually engaging skeleton loader that provides placeholder shapes mirroring the final layout.

## Goals / Non-Goals

**Goals:**
- Introduce a reusable `SkeletonLoader` component.
- Provide a hook `useSkeleton` to manage loading state.
- Integrate the loader into existing pages (e.g., `create/page.tsx`).
- Extend the global store with an `isSkeletonVisible` flag.
- Ensure minimal impact on performance.

**Non-Goals:**
- Reworking existing API endpoints.
- Changing the core data fetching logic beyond state management.

## Decisions

- **Component Library:** Use Tailwind CSS for styling and Framer Motion for shimmer animation (already a dependency).
- **API:** The loader will accept a `type` prop (`line`, `rect`, `circle`) and optional `count` to render multiple placeholders.
- **State Management:** Store a boolean `isSkeletonVisible` in `presentationStore.ts` to globally toggle the loader.
- **Hook:** `useSkeleton` will wrap async calls, set the flag, and handle cleanup.

## Risks / Trade-offs

- **Performance Overhead:** Adding Framer Motion animations may increase bundle size. Mitigation: load animation only when needed using dynamic imports.
- **Complexity:** Introducing a new global state flag could interfere with existing loading logic. Mitigation: Keep the flag scoped to UI components and ensure backward compatibility.

## Migration Plan

1. Add `SkeletonLoader.tsx` and `useSkeleton.ts`.
2. Update `presentationStore.ts` with `isSkeletonVisible`.
3. Replace existing spinner usages with `SkeletonLoader` where appropriate.
4. Run tests and verify no regressions.
5. Deploy and monitor performance metrics.

## Open Questions

- Should the skeleton loader support dark mode out of the box?
- Do we need a configurable animation speed?
