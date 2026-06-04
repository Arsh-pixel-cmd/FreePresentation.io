## Context

The landing page custom cursor currently tracks mouse coordinate changes using a React state hook (`cursorPos`). Invoking the state setter on every single `mousemove` event forces React to perform virtual DOM diffing and re-render the entire `LandingPage` component along with all of its static child components (such as stats, marquee, features grids, themes previews). This leads to a severe drop in frame rate, high CPU usage, and noticeable cursor lag.

## Goals / Non-Goals

**Goals:**
- Eliminate the performance bottleneck caused by React state updates on mouse movement.
- Keep the custom cursor visual design and outer-ring lagging animation identical.
- Implement the fix using standard React hooks and clean DOM styling.

**Non-Goals:**
- Removing the custom cursor feature entirely.
- Refactoring unrelated interactive features of the landing page.

## Decisions

### 1. Direct DOM updates via Refs
We will use React `useRef` hooks to obtain direct references to the cursor's dot and outer-ring DOM elements. The `mousemove` event listener will directly update the `transform` style property of these refs. This completely bypasses React's virtual DOM reconciliation loop.

### 2. Hardware-Accelerated CSS `translate3d`
Instead of animating `left` and `top` properties (which trigger layout reflows and browser paint cycles), we will use `transform: translate3d(x, y, 0)`. This offloads rendering to the GPU, ensuring smooth 60fps movement.

### 3. Smooth Trail Effect
The outer ring will maintain its trailing effect by applying a transition on the transform property (`transition-transform duration-300 ease-out`), similar to the original design's style.

## Risks / Trade-offs

- **Risk**: The cursor might briefly appear at (0, 0) before the first mouse movement.
- **Mitigation**: Position the cursor off-screen initially by styling the default transform to `translate3d(-100px, -100px, 0)`.
