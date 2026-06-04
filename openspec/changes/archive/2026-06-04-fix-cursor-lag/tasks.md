## 1. Refactor Custom Cursor in Landing Page

- [x] 1.1 Add React `useRef` hooks for the dot and outer ring elements in `src/app/page.tsx`.
- [x] 1.2 Replace the `cursorPos` state with direct updates to the DOM element styles using `translate3d` inside the `mousemove` event handler.
- [x] 1.3 Remove the unused `cursorPos` React state and update the cursor markups to use the new refs.
- [x] 1.4 Verify that landing page cursor movement is smooth and does not trigger React component re-renders.
