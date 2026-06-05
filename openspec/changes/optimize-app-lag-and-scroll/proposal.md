## Why

Users experience visual lag and frame drops (sluggishness) when scrolling the landing page or moving their cursor. This is caused by:
1. CSS transitions on the custom cursor `transform` property interfering with high-frequency mousemove updates, leading to rendering jank.
2. A heavy SVG grain noise filter using dynamic `<feTurbulence>` with 4 octaves, which is painted on top of the entire body and causes high rendering overhead, especially during scroll.
3. Conflict between the native browser `scroll-behavior: smooth` and the Lenis smooth scrolling engine.

## What Changes

- Implement requestAnimationFrame-based Linear Interpolation (lerp) for the custom cursor's trailing ring positioning, removing CSS transitions on the `transform` property to avoid rendering jank.
- Optimize the grain noise overlay filter in `src/app/globals.css` by reducing `<feTurbulence>` octaves from 4 to 1 (or replacing it with a static pre-rendered PNG) to reduce browser paint overhead during scroll.
- Remove the browser-native `scroll-behavior: smooth` setting on the `html` tag when Lenis smooth scrolling is active, eliminating double-smoothing conflicts.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->
- `smooth-scroll`: Ensures smooth scrolling behavior globally across the app and optimizes heavy rendering overlays.

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->

## Impact

- **Affected code**: `src/app/page.tsx`, `src/app/globals.css`
- **APIs**: None
- **Dependencies**: None
- **Systems**: Browser rendering pipeline, GPU/CPU scroll performance, custom cursor smoothness.
