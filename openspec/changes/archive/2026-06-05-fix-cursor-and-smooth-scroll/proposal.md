## Why

Users experience inconsistent cursor behavior on the landing page where the default browser cursor is revealed after scrolling past the first marquee. Additionally, the application lacks visual cursor feedback during long-running async generation processes, making the interface feel "stuck". Double-smoothing conflicts between Lenis and browser-native scrolling also introduce lag. 

## What Changes

- Make the custom cursor global by moving it to the root layout or a shared provider, ensuring the default browser cursor is hidden consistently across the landing page and navigation paths.
- Add a "selection loader" (spinning progress indicator) state to the custom cursor that activates automatically when the application is performing async background tasks (e.g., generating outlines, saving decks) to prevent the site from appearing frozen.
- Clean up conflicts between browser-native `scroll-behavior` and Lenis smooth scrolling.
- Integrate Framer Motion for premium, smooth micro-animations during page loading steps, theme selection, and component entries.

## Capabilities

### New Capabilities
- `smooth-scroll`: Fully integrates Lenis smooth scrolling globally and removes conflicts with native browser behaviors.

### Modified Capabilities
- `custom-cursor`: Expands the custom cursor to cover the entire page (instead of just the hero section) and adds a visual "selection loader" spinner state when async operations are active.

## Impact

- **Affected code**: `src/app/page.tsx`, `src/app/globals.css`, `src/providers/LenisProvider.tsx`, `src/app/layout.tsx`, `src/app/create/page.tsx`
- **APIs**: None
- **Dependencies**: `framer-motion`, `lenis`
- **Systems**: Custom cursor rendering, browser scroll performance, client-side generation workflow feedback.
