# Markdown Viewer

A polished, fully offline Markdown documentation reader that runs by opening a single HTML file in a browser. No server, no build step, no install, no internet connection required.

## What it does

Open a single Markdown file, or an entire folder of documentation, and browse it like a proper documentation site: collapsible file explorer, a live document outline, syntax-highlighted code, math, Mermaid diagrams, a zoomable image viewer, in-document and cross-folder search, and independently tuned light/dark themes.

## How to launch it

1. Copy the whole `markdown-viewer` folder (containing `index.html` and `assets/`) anywhere — another machine, a USB drive, it doesn't matter.
2. Double-click `index.html`, or open it from your browser with `File → Open File…`.
3. Click **Open Folder** (to browse a whole documentation tree) or **Open File** (for a single `.md` file).

No `npm install`, no dev server, no build. There is nothing to run besides opening the HTML file.

## Supported browsers

| Browser | Folder open | Single file open | Remember last folder |
|---|---|---|---|
| Chrome / Edge / Brave / Opera (Chromium) | ✅ native folder picker | ✅ native file picker | ✅ |
| Firefox | ✅ via folder input fallback | ✅ | ❌ (API unsupported) |
| Safari | ✅ via folder input fallback | ✅ | ❌ (API unsupported) |

The app detects support for the **File System Access API** at startup and automatically falls back to standard `<input type="file">` / `<input webkitdirectory>` elements where it isn't available. Every other feature (rendering, search, themes, image viewer, keyboard shortcuts) works identically either way.

Why this matters: with the File System Access API, the app holds live handles to your files, so relative asset paths like `../images/diagram.png` resolve correctly no matter how deep your folder structure goes. Without it (the fallback path), the same resolution is done against an in-memory map built from the files the browser handed over — functionally equivalent, just without the ability to silently re-request permission on a later visit.

## Offline behavior

Everything the app needs — the Markdown parser, sanitizer, syntax highlighter, math renderer, and diagram renderer — is vendored locally under `assets/vendor/`. Nothing is fetched from a CDN at runtime. Disconnect your network entirely and every feature keeps working: folder browsing, rendering, images, SVGs, diagrams, search, theme switching, the image viewer, and navigation between files.

Fonts are system fonts (no remote font requests). The only case where an image *can't* render offline is a Markdown image that itself references a remote `http(s)://` URL — that's inherent to referencing external content, not a limitation of the app, and it fails gracefully with a "not found" placeholder rather than breaking the page.

## Supported Markdown features

- Headings (H1–H6) with automatic anchors and deep-linking
- Paragraphs, bold, italic, strikethrough, inline code
- Ordered, unordered, and nested lists, plus GFM task lists
- Tables with alignment, horizontally scrollable on narrow viewports
- Fenced code blocks with language-aware syntax highlighting, a language label, and a copy button
- Blockquotes, horizontal rules
- Images and figures (a paragraph containing only an image becomes a bordered, captioned figure; inline images stay inline)
- SVG images and charts
- Mermaid diagrams (```` ```mermaid ```` fenced blocks), rendered offline and themed to match light/dark mode
- Inline (`$x$`) and block (`$$x$$`) math via KaTeX, plus `\(...\)` / `\[...\]`
- Internal links to other Markdown files in the opened folder (resolved relative to the linking document, `../` and all), external links (opened in a new tab, visually marked), and same-document anchor links
- Raw HTML is parsed but sanitized (see Security below)

## Supported image formats

PNG, JPEG, GIF, SVG, WebP, BMP, ICO, AVIF — anything the host browser can decode natively.

## Folder / asset resolution

Assets don't need to sit next to the Markdown file that references them. A reference like `![Architecture](../images/architecture.png)` is resolved relative to the *referencing document's* path against the whole opened folder tree, matching the example in the original project brief exactly.

## Image / figure viewer

Click any image, figure, or diagram to open it in a dedicated overlay viewer:

- Zoom in / out buttons, fit-to-screen, actual size (1:1), reset
- Mouse wheel to zoom (centered on the cursor)
- Click-drag to pan
- Touch: pinch to zoom, drag to pan, double-tap to toggle zoom
- Keyboard: `+` / `-` to zoom, `0` to reset (fit), `Esc` to close

## Search

- **This file**: highlights every match live in the currently rendered document and scrolls to the one you click.
- **All files**: indexes every Markdown file in the opened folder (lazily, on first use) and shows filename, nearest heading, and a text snippet per match. Clicking a result opens that file and scrolls to the match.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + B` | Toggle file explorer |
| `Ctrl/Cmd + O` | Open folder |
| `[` / `]` | Previous / next document (folder tree order) |
| `+` / `-` | Zoom in / out (image viewer) |
| `0` | Reset zoom / fit (image viewer) |
| `Esc` | Close the active dialog or viewer |
| `?` | Show the keyboard shortcuts reference |

## Themes

Light, Dark, and System, each with independently tuned tokens for background, surface, text, borders, code, tables, blockquotes, links, the image viewer, and the toolbar — not a single `background:#000` swap. The dark theme avoids pure black; the light theme avoids glaring white. Your choice (plus font size, content width, and sidebar/outline collapsed state) is remembered in `localStorage`.

## Known limitations

- **Remembering the last opened folder** works only in Chromium browsers (it relies on persisting a `FileSystemDirectoryHandle` in IndexedDB and re-requesting permission, which requires the File System Access API). Firefox/Safari always start from the welcome screen.
- **Mermaid** is a large vendored bundle (~5.4 MB uncompressed) — there's no smaller offline-capable build available without a custom bundler pipeline. It only loads its cost once per session and doesn't block first paint (loaded via `defer`).
- **Cross-file search** matches against raw Markdown text, not the rendered document, so a snippet occasionally shows literal Markdown syntax (`##`, `**`) around a match. This keeps indexing fast and dependency-free; the current-document search searches the rendered text instead, so its snippets read cleanly.
- Non-standard heading-ID syntax some Markdown flavors support (e.g. Pandoc's `{#custom-id}`) is not parsed — this app follows GitHub-Flavored Markdown, where anchors are auto-generated by slugifying the heading text.
- A Markdown image pointing at a remote `http(s)://` URL will only load when you actually have network access; that's unavoidable for any offline app referencing external content.

## Architecture

No framework, no bundler, no build step — plain HTML/CSS/JS modules loaded via `<script defer>` tags, communicating through small `const Module = (() => {...})()` singletons attached to `window`. This is a deliberate choice: a zero-build architecture is the only way to *guarantee* "copy the folder, open the file, it works," on any machine, forever, without a toolchain to rot.

```
markdown-viewer/
  index.html              entry point — open this file
  progress.md             development log (phases, status, known issues)
  README.md               this file
  assets/
    css/
      theme.css            design tokens (light / dark / system)
      app.css               layout, components, typography, responsive rules
    js/
      theme.js              theme + reading-preference persistence
      fs.js                  File System Access API + <input> fallback, tree building, path resolution
      markdown.js            marked configuration, custom renderer, sanitize, highlight, math, mermaid, image resolution
      outline.js             heading outline panel + scrollspy + reading progress
      imageViewer.js         zoom/pan/fit image & diagram viewer
      sidebar.js             file explorer tree: render, expand/collapse, filter, select
      search.js              in-document and cross-folder search
      app.js                 wires everything together: toolbar, shortcuts, layout, navigation
    vendor/                 offline copies of third-party libraries (see below) — never fetched at runtime
```

### Libraries used, and why

| Library | Purpose | Why this one |
|---|---|---|
| [marked](https://github.com/markedjs/marked) | Markdown → HTML | Zero runtime dependencies, small, and its renderer-override API lets the app fully control image/heading/link/code output without forking the parser. |
| [DOMPurify](https://github.com/cure53/DOMPurify) | HTML sanitization | The standard, battle-tested choice for sanitizing untrusted HTML before it touches the DOM — non-negotiable since users open arbitrary Markdown files. |
| [highlight.js](https://github.com/highlightjs/highlight.js) | Code syntax highlighting | Broad language auto-detection out of the box, ships light/dark themes that map cleanly onto this app's theme tokens. |
| [KaTeX](https://katex.org/) | Math rendering | Substantially lighter and faster than MathJax for the inline/block LaTeX subset Markdown documents actually use; fonts are vendored locally. |
| [Mermaid](https://mermaid.js.org/) | Diagrams | The de facto standard for Markdown-embedded diagrams; explicitly requested. Runs with `securityLevel: 'strict'` so it sanitizes diagram label content itself. |

All five are downloaded once and committed as static files under `assets/vendor/` — nothing is ever fetched from a CDN at runtime, satisfying the offline requirement even for a fresh copy of this folder with no network access at all.

## Security

Markdown is treated as untrusted input:

- All HTML produced by the Markdown renderer is passed through DOMPurify before it's inserted into the page — this strips `<script>` tags, inline event handlers (`onerror`, `onclick`, …), and `javascript:` URLs.
- Mermaid runs in `strict` security mode, which sanitizes diagram text itself (Mermaid has historically had XSS issues in permissive mode).
- Nothing you open is uploaded anywhere; the app never makes a network request of your file contents. Opened files/folders stay entirely local to your device (verified during testing: zero non-local network requests, even for external-looking links in Markdown — those are just rendered as ordinary `target="_blank"` links, never auto-fetched).

## Customizing / extending

Because there's no build step, changes are a direct edit-and-reload:

- **Design tokens** live in `assets/css/theme.css` — change a CSS custom property there and both themes (or just one) update everywhere.
- **Markdown rendering behavior** (how images, links, code blocks, or headings turn into HTML) lives entirely in the `buildRenderer()` function in `assets/js/markdown.js`.
- **New toolbar actions** go in `assets/js/app.js`'s `wireToolbar()`/`wireKeyboard()` functions, following the existing pattern of grabbing an element by id and adding a listener.
- To swap a vendored library for a newer version, replace the corresponding file under `assets/vendor/` with the same filename — no other code changes needed as long as the library's public API (`window.marked`, `window.DOMPurify`, `window.hljs`, `window.katex`, `window.mermaid`) is unchanged.

## Testing notes

This app was built and manually verified end-to-end against a representative test document exercising every Markdown feature (headings 1–6, nested/task lists, tables, fenced code in two languages, blockquotes, standalone and inline images, an SVG chart, a broken image reference, inline/block/malformed math, a Mermaid flowchart, internal/broken/anchor/external links, and a raw `<script>`/`onerror` XSS probe), across a multi-folder tree with assets resolved via `../` from a subfolder. Verified: rendering fidelity, image viewer zoom/pan/fit/actual-size, in-document and cross-folder search with navigation, light/dark theme switching, keyboard shortcuts (including that they're correctly suppressed while a modal/viewer is open), `[`/`]` document navigation, sidebar auto-expand-and-select on navigation, "remember last file" via `localStorage`, zero external network requests, and zero console errors throughout.

Live-resizing the browser window to check the 320px–1920px responsive breakpoints from the automated test harness used during development wasn't possible in that environment (the harness's virtual display didn't respond to resize requests) — the responsive CSS (`assets/css/app.css`) follows the exact breakpoint structure requested (sidebar/outline become overlay drawers under 860px/1180px, toolbar compacts under 560px) using the same `matchMedia` breakpoints the JavaScript layer checks, but hasn't been visually re-verified at those exact pixel widths after the last round of changes. If you hit a responsive layout issue on a specific device size, that's the first place to look.
