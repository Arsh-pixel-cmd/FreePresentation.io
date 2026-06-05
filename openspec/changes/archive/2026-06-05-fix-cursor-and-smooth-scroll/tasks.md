## 1. Setup and Global States

- [x] 1.1 Add `isGenerating` and `setIsGenerating` states to `presentationStore.ts` without persisting them.
- [x] 1.2 Remove the browser-native `scroll-behavior: smooth` conflict from `src/app/globals.css`.
- [x] 1.3 Add CSS styles in `src/app/globals.css` to hide the default browser cursor globally when `.custom-cursor-active` class is applied, keeping default cursor for inputs and textareas.

## 2. Global Custom Cursor

- [x] 2.1 Create the `CustomCursor` component in `src/components/CustomCursor.tsx` using `useRef` and `requestAnimationFrame` for 60+ FPS positioning.
- [x] 2.2 Implement hover state detection (detecting buttons, links, etc.) and loading state (linking to `isGenerating` store state) in `CustomCursor`.
- [x] 2.3 Import and render `CustomCursor` in the root layout file `src/app/layout.tsx`.
- [x] 2.4 Clean up the local custom cursor markup and `mousemove` listener from `src/app/page.tsx`.

## 3. Cursor Loader & Create Flow Integration

- [x] 3.1 Hook up `setIsGenerating` in the `handleGenerateOutline` callback within `src/app/create/page.tsx`.
- [x] 3.2 Hook up `setIsGenerating` in the `handleGeneratePresentation` callback within `src/app/create/page.tsx`.

## 4. Framer Motion Animations & Smooth Transitions

- [x] 4.1 Replace the manual `Reveal` component in `src/app/page.tsx` with a Framer Motion `motion.div` transition for smooth landing page reveals.
- [x] 4.2 Add Framer Motion transitions for tab panel switching in `src/app/create/page.tsx`.
- [x] 4.3 Animate loading step content changes smoothly during presentation generation in `src/app/create/page.tsx` using `AnimatePresence`.
