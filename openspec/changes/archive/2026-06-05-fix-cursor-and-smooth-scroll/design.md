## Context

The custom cursor in `src/app/page.tsx` is only applied on the hero section element, resulting in the default browser cursor showing up once the user scrolls past the marquee. Furthermore, when the user triggers a presentation generation on the `/create` page, there is no custom cursor, and the loading page steps transition abruptly. Double-smoothing conflicts between browser-native `scroll-behavior` and Lenis also need resolution.

## Goals / Non-Goals

**Goals:**
- Move the custom cursor to a global React component and render it in `RootLayout`.
- Add a custom "selection loader" state to the custom cursor. During long async tasks (like presentation generation), the cursor ring should spin.
- Disable browser default cursor globally using a CSS utility class, while preserving native cursors for text inputs, textareas, and dropdown menus.
- Resolve Lenis scroll conflicts by removing browser-native `scroll-behavior: smooth`.
- Integrate Framer Motion for smooth section reveals, tab switching on `/create`, and step transitions during generation.

**Non-Goals:**
- Replacing existing editor page cursor interactions.
- Modifying backend generation logic.

## Decisions

### 1. Global Custom Cursor Component
We will extract the custom cursor from the landing page into a global client-side component `src/components/CustomCursor.tsx` and import it in `src/app/layout.tsx`.
- *Rationale*: Centralizes cursor logic, making it available across all pages (Landing, Create, Editor, etc.) and allowing it to react to global loading states.

### 2. Global Loading State in Zustand Store
We will add `isGenerating: boolean` and `setIsGenerating: (b: boolean) => void` to `usePresentationStore`.
- *Rationale*: Lets `/create` page set the generating state, which the global `CustomCursor` component subscribes to. We will exclude this state from being serialized by modifying the Zustand `partialize` configuration to only include `saved`.

### 3. Cursor Visual Styles & States
The custom cursor will have three states:
- Default: Dot + subtle trailing ring.
- Hover: Cursor scales up slightly over links and buttons.
- Loading (Selection Loader): Ring turns into a high-performance CSS spinning loader.
We will use direct DOM manipulation on mouse move via `useRef` and `requestAnimationFrame` for performance, and CSS keyframe animations for the loader spinning behavior.

### 4. Remove Scroll Conflicts
We will remove `scroll-behavior: smooth` from `html` in `src/app/globals.css`.
- *Rationale*: Eliminates the conflict where the browser tries to smooth scroll at the same time as Lenis, causing jittery animations.

### 5. Framer Motion Animations
We will use Framer Motion for:
- Landing page reveal animations (replacing manual inline styles).
- Tab transitions on `/create/page.tsx`.
- Generation step message fade-ins/outs on the loading screen.

## Risks / Trade-offs

- **Risk**: Custom cursor might feel unnatural or delayed if mouse coordinates are updated via standard React state.
  - *Mitigation*: We will use direct ref manipulation on the DOM using native `mousemove` events to update style transforms, ensuring 60+ FPS performance.
- **Risk**: Custom cursor might block typing visibility on input/textarea fields.
  - *Mitigation*: We will restore native browser text cursors (I-beam) when hovering inputs or textareas, and hide the custom cursor.
