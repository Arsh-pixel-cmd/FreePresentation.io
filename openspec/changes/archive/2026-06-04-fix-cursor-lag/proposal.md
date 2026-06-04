## Why

The landing page exhibits noticeable lag and sluggishness when the user moves their cursor over it. This lag is caused by tracking mouse movements using React state (`cursorPos` updated via `useState` on the `mousemove` event), which triggers a complete re-render of the entire landing page component and all of its descendants on every frame of mouse movement.

## What Changes

- Refactor the custom cursor in the landing page (`src/app/page.tsx`) to bypass React state updates on mouse movement.
- Introduce React refs for direct DOM references to the custom cursor's dot and outer ring elements.
- Update the custom cursor coordinates using hardware-accelerated CSS `translate3d` transforms directly in the DOM via the mousemove event handler.
- Remove the unused `cursorPos` React state.

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->
- `custom-cursor`: Renders a high-performance custom cursor on the landing page that tracks user mouse movements without lag.

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->

## Impact

- **Affected code**: `src/app/page.tsx`
- **APIs**: None
- **Dependencies**: None
- **Systems**: Landing page performance (CPU usage, UI rendering smoothness)
