# Progress — Offline Markdown Viewer

Single source of truth for build status. Status values: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED`.

## Architecture decisions

- **No framework, no bundler.** Plain HTML/CSS/JS modules loaded via `<script defer>` tags from `assets/js/*.js`. Zero build step means the app is truly "copy the folder, open index.html" with nothing to compile — the most reliable way to guarantee offline operation and long-term portability.
- **Vendored libraries** (downloaded once at build time from npm/cdnjs, shipped locally in `assets/vendor/`, never fetched at runtime): `marked`, `DOMPurify`, `highlight.js`, `KaTeX`, `Mermaid`. Rationale for each is in README.md.
- **File access:** File System Access API (`showDirectoryPicker` / `showOpenFilePicker`) as the primary path, falling back to `<input type="file" webkitdirectory>` / `<input type="file">` for browsers without the API. Both paths converge on the same in-memory tree/node shape (`assets/js/fs.js`) so the rest of the app never branches on which mode is active.
- **Security model:** all rendered Markdown HTML passes through DOMPurify before touching the DOM. Mermaid runs with `securityLevel: 'strict'`. Verified with a live XSS probe (`<script>` + `<img onerror>`) during testing — both neutralized correctly.
- **State persistence:** `localStorage` for theme, sidebar/outline collapsed state, sidebar width, content width, font size, and last-opened file path. `IndexedDB` best-effort for remembering the last opened folder's directory handle (Chromium only; re-requests permission on load via a "Reopen folder" button so it satisfies the user-gesture requirement for `requestPermission`).
- **No React/Vue/etc, no CSS framework.** A hand-written design-token CSS system (`assets/css/theme.css`) covers the light/dark/system theming requirement precisely without pulling in a UI kit.

## Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Architecture & project scaffold | DONE |
| 2 | File System handling (open file/folder, tree building, fallback, path resolution) | DONE |
| 3 | Markdown rendering pipeline (marked + sanitize + highlight + katex + mermaid + asset resolution) | DONE |
| 4 | Layout & navigation shell (header, sidebar, outline panel, responsive drawers) | DONE |
| 5 | Image/figure viewer (zoom/pan/fit, keyboard, touch) | DONE |
| 6 | Theme system (light/dark/system, tokens) | DONE |
| 7 | Search (in-document + cross-file) | DONE |
| 8 | Responsive design pass (320px–1920px+) | DONE (implemented; see testing notes below for the one caveat) |
| 9 | Accessibility pass (keyboard nav, ARIA, focus, skip link) | DONE |
| 10 | Performance (lazy images, debounced search/filter, blob URL caching + cleanup, deferred script loading) | DONE |
| 11 | Testing (manual test matrix via browser automation against a multi-feature test document) | DONE |
| 12 | Final polish + README | DONE |

## Bugs found and fixed during testing

1. **`[hidden]` attribute silently overridden.** `.modal-overlay`/`.image-viewer` CSS classes set `display: flex` unconditionally, which (being an author rule) beat the browser's default `[hidden] { display: none }` UA rule — all three overlays (search, image viewer, shortcuts) rendered open on page load. Fixed with an explicit `[hidden] { display: none !important; }` global rule in `app.css`.
2. **Image viewer double-offset centering.** `.image-viewer-stage` used flexbox centering *and* the JS zoom/pan math assumed the image was positioned at the stage's top-left (`transform: translate(tx,ty) scale(s)` with `transform-origin: 0 0`). The two centering mechanisms stacked, pushing the image off-center. Fixed by giving the image `position: absolute; left: 0; top: 0;` so only the JS-computed transform controls its position.
3. **Document navigation shortcuts not suppressed under an open overlay.** `[` / `]` (and `?`) fired even while the image viewer or search overlay was open, which could silently change the underlying document out from under a user paging through images. Fixed by gating those handlers on `ImageViewer.isOpen` / overlay-hidden checks in `app.js`.
4. **5.4 MB Mermaid bundle blocking first script execution.** Scripts were plain `<script src>` at the end of `<body>`; added `defer` to every script tag (vendor and app) so the shell paints immediately and scripts execute without blocking perceived load.

## Testing performed

Manual, end-to-end, via browser automation against a purpose-built multi-file test folder (headings 1–6, nested/ordered/task lists, a table, two fenced code blocks with syntax highlighting, inline code, blockquotes, a horizontal rule, a standalone captioned figure image, an inline image, an SVG chart with caption, a deliberately broken image reference, inline/block/malformed math, a Mermaid flowchart, internal links (working, broken, and anchor), an external link, Unicode text, and a raw `<script>`/`onerror` XSS probe — plus a second file proving `../` asset resolution from a subfolder).

Confirmed working: full Markdown rendering fidelity in both themes; broken-image and malformed-math graceful degradation (no crash); XSS payloads neutralized (script stripped, `onerror` attribute stripped); image viewer zoom in/out/fit/actual-size/mouse-wheel-zoom-at-cursor/pan/Escape-close, with focus returned to the trigger on close; in-document search (live highlight + scroll) and cross-folder search (lazy index, filename/heading/snippet results, click-to-navigate across files with highlight); sidebar auto-expand-and-select on navigation; `[`/`]` document navigation in tree order; light/dark/system theme switching including Mermaid re-rendering in the new theme; reading-settings popover (font size, content width); keyboard-shortcuts modal; sidebar/outline collapse toggles; zero console errors across the entire session; zero non-local network requests (confirmed via network inspection — all 20 requests on load resolve to the local origin, nothing to a CDN).

**Known testing gap:** the automation environment's virtual display did not respond to window-resize requests, so the 320px–1920px responsive breakpoints could not be visually re-verified after the last round of code changes. The responsive CSS was written against the exact breakpoint table in the spec and the JavaScript-side mobile-detection helpers (`isMobileSidebar`/`isMobileOutline` in `app.js`) use the same breakpoints as the CSS media queries, but this is a code-review-level guarantee, not a pixel-verified one. Recommend a manual pass on a real device or a browser with working responsive dev tools before shipping to end users who rely heavily on mobile.

## Notes / known issues

- Mermaid bundle is large (~5.4MB on disk). This is the vendor's own bundle; no smaller offline-capable alternative exists without a custom build pipeline. Loaded with `defer` so it doesn't block first paint.
- File System Access API is Chromium-only (Chrome/Edge/Opera/Brave). Firefox/Safari use the `<input webkitdirectory>` fallback, which cannot re-request permission for "remember last folder" — that feature degrades gracefully (no last-folder prompt shown) on those browsers.
- Cross-file search matches raw Markdown text (not rendered HTML), so snippets can show literal `##`/`**` syntax around a match. Documented in README as a deliberate simplification (keeps indexing fast, no per-file render-to-DOM cost during search).
