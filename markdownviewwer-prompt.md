# Build a Complete Offline Markdown Viewer — Production-Quality Application

## ROLE

Act as a senior full-stack engineer, UI/UX designer, frontend architect, accessibility specialist, and software tester.

Your task is to build a **complete, production-quality Markdown Viewer** that can run entirely locally and offline.

Do not create a basic Markdown previewer.

Build a polished application that feels like a professional documentation/knowledge-reading application, with excellent typography, navigation, image/figure viewing, charts, diagrams, responsive behavior, dark/light themes, and smooth interactions.

The final application must be usable by simply opening a local HTML file in a browser, without requiring:

* a backend server
* Node.js at runtime
* an internet connection
* an external database
* an online API
* cloud storage
* an installation process

The application should work with locally selected folders/files through browser-supported file/folder APIs.

---

# 1. PRIMARY OBJECTIVE

Create a standalone offline Markdown Viewer with the following core workflow:

1. User opens the HTML application.
2. User selects a local folder OR individual Markdown file.
3. If a folder is selected:

   * recursively discover Markdown files
   * discover related images/assets
   * display the folder/file hierarchy in a collapsible left sidebar
   * allow navigation between Markdown documents
4. When a Markdown file is selected:

   * render the Markdown accurately
   * render headings, paragraphs, lists, tables, blockquotes, code blocks, links, images, figures, charts, diagrams, math, etc.
   * show the document's heading structure in a separate navigational area
5. Images, figures, graphs and charts should be viewable in an expanded viewer inside the same browser.
6. The user should be able to zoom, pan, and inspect visual content comfortably.
7. Provide a polished dark/light theme system.
8. Everything must remain functional offline.

---

# 2. TECHNOLOGY PRINCIPLES

Choose the most appropriate modern frontend technologies.

Prefer a simple architecture that can ultimately be distributed as:

```
index.html
```

or as a small self-contained static application.

Runtime must not depend on a backend.

If libraries are required, make the application capable of working offline by bundling or embedding the required dependencies.

Do NOT create a solution that silently depends on CDN URLs.

The application must continue working when:

* Wi-Fi is disabled
* internet access is unavailable
* the browser is launched locally
* the application is copied to another computer
* the application is copied to another device

Avoid unnecessary dependencies.

Use progressive enhancement where browser capabilities differ.

---

# 3. FILE/FOLDER IMPORT

The application must support:

## A. Individual Markdown File

Allow the user to select:

* `.md`
* `.markdown`
* optionally `.mdown`
* optionally `.mkd`

After selecting the file:

* render the Markdown
* detect all headings
* build a heading navigation tree
* resolve relative image paths when possible
* show document metadata where useful

---

## B. Entire Folder

Allow the user to select a folder.

The application should:

* recursively scan the folder
* identify Markdown files
* identify images/assets
* preserve folder hierarchy
* display folders and files in the left navigation pane
* allow folder expansion/collapse
* allow Markdown files to be selected
* maintain the relative relationship between Markdown files and their assets

Example:

```
Documentation/
├── README.md
├── Introduction/
│   ├── overview.md
│   └── architecture.md
├── Guides/
│   ├── setup.md
│   └── deployment.md
├── images/
│   ├── architecture.png
│   └── workflow.svg
└── charts/
    └── performance.svg
```

The viewer must correctly resolve references such as:

```
![Architecture](../images/architecture.png)
```

and:

```
![Performance](../charts/performance.svg)
```

Do not assume that all assets are located beside the Markdown file.

---

# 4. FILE SYSTEM API / BROWSER COMPATIBILITY

Use appropriate browser-native APIs such as:

* File System Access API
* directory selection APIs
* File/Blob/Object URL mechanisms

where supported.

Gracefully handle browsers that do not support directory selection.

Provide a clear fallback for individual file selection.

Do not request unnecessary permissions.

Do not upload files anywhere.

All user-selected content must remain local to the device.

---

# 5. APPLICATION LAYOUT

Design a professional documentation-reader layout.

Recommended structure:

```
┌───────────────────────────────────────────────────────────┐
│ Header / Toolbar                                          │
├──────────────┬───────────────────────────┬───────────────┤
│              │                           │               │
│ File         │                           │ Document      │
│ Explorer     │      Markdown Content     │ Outline       │
│              │                           │               │
│              │                           │               │
│              │                           │               │
└──────────────┴───────────────────────────┴───────────────┘
```

But do not blindly follow this layout.

Use your own UX judgment to produce the most usable interface.

---

# 6. LEFT FILE EXPLORER

Create a collapsible left sidebar.

It should contain:

* folder tree
* Markdown files
* folders
* file icons
* expand/collapse controls
* selected-file highlighting
* search/filter capability if useful
* scrollable content
* clear visual hierarchy

Important:

The sidebar must not consume excessive screen space.

Allow the user to:

* collapse the entire sidebar
* resize it if appropriate
* expand/collapse folders
* quickly locate files

On mobile:

* convert the sidebar into an overlay/drawer
* allow swipe/tap-based opening and closing where appropriate
* never permanently consume desktop-style sidebar width

---

# 7. DOCUMENT OUTLINE / HEADINGS

When a Markdown file is open, automatically extract:

* H1
* H2
* H3
* H4
* H5
* H6

Display them in a separate collapsible outline/navigation panel.

The outline should:

* reflect heading hierarchy
* allow clicking a heading to scroll to it
* highlight the currently visible section
* support long documents
* remain usable while scrolling

Use smooth scrolling.

Do not create a simplistic flat list.

The hierarchy should visually communicate document structure.

---

# 8. MARKDOWN RENDERING

Markdown rendering must be comprehensive and robust.

Support at minimum:

### Text

* paragraphs
* bold
* italic
* strikethrough
* inline code
* links
* automatic URLs where appropriate
* superscript/subscript where supported

### Headings

* H1–H6
* automatic anchors
* deep-linking

### Lists

* unordered lists
* ordered lists
* nested lists
* task/check lists

### Tables

Support:

* alignment
* long text
* horizontal scrolling on mobile
* responsive presentation

### Code

Support:

* inline code
* fenced code blocks
* syntax highlighting
* language labels
* copy-code button

Code blocks should be visually polished and readable in both themes.

### Blockquotes

Render professionally.

### Horizontal separators

Render cleanly.

---

# 9. IMAGES

Images are a major feature.

Support:

* PNG
* JPG/JPEG
* GIF
* SVG
* WebP
* other browser-supported image formats

Images referenced from Markdown should render correctly.

Important:

Do not distort aspect ratios.

Do not unnecessarily upscale small images.

Use intelligent sizing based on:

* image dimensions
* available content width
* viewport size

Images should look like part of a professional documentation system rather than raw HTML `<img>` elements.

---

# 10. IMAGE / FIGURE EXPANSION VIEWER

Every image, figure, chart, diagram, or major visual element should have an option to open in a dedicated viewer.

When the user clicks an image:

Open an overlay/modal viewer inside the same browser.

The viewer must support:

* zoom in
* zoom out
* fit to screen
* reset zoom
* actual size
* pan
* mouse-wheel zoom
* Ctrl + mouse wheel where appropriate
* keyboard zoom shortcuts
* `+`
* `-`
* `0` reset
* `Esc` close

On touch devices support:

* pinch zoom
* drag/pan
* double-tap zoom where appropriate

The image viewer must preserve sharpness and aspect ratio.

Do not open an entirely separate browser window unless the user explicitly chooses that behavior.

---

# 11. VISUAL CONTENT

The application must treat visual content as first-class content.

This includes:

* images
* diagrams
* charts
* graphs
* SVGs
* figures
* screenshots
* architecture diagrams
* flow diagrams
* mathematical figures

They should not look like generic browser images.

Create elegant visual containers with:

* subtle borders
* appropriate spacing
* captions where available
* zoom controls
* fullscreen/expanded mode
* clear background separation
* responsive sizing

Avoid excessive borders, shadows, gradients, or visual noise.

---

# 12. CHARTS AND GRAPHS

Markdown documents may contain:

* embedded SVG charts
* PNG charts
* generated diagrams
* Mermaid diagrams
* other supported visual formats

Render them clearly.

If Mermaid diagrams are supported, make sure they work offline by bundling the required library.

Do NOT depend on:

```
https://cdn....
```

or any external network resource.

For charts and diagrams:

* preserve readability
* avoid excessive scaling
* allow expansion
* allow zoom
* allow pan where appropriate
* maintain crisp rendering

Visuals should feel polished and modern rather than "mechanical arrow-based" or like raw developer tooling.

---

# 13. MATH / EQUATIONS

If practical, support Markdown documents containing:

* inline LaTeX
* block equations

Example:

```
$E = mc^2$
```

and:

```
$$\int_0^\infty e^{-x} dx = 1$$
```

If a math rendering library is used, it must work offline.

Do not introduce online CDN dependencies.

If complete offline math support would substantially complicate the standalone architecture, document the limitation and implement the most reliable offline approach possible.

---

# 14. LINKS

Handle links intelligently.

For internal Markdown links:

```
[Architecture](architecture.md)
```

attempt to navigate to the corresponding Markdown document inside the imported folder.

For external links:

* make them visually identifiable
* open them safely according to browser behavior
* do not break the application

For anchor links:

```
#section
```

scroll to the appropriate heading.

---

# 15. SEARCH

Implement document search if it can be done cleanly.

At minimum support:

* search within current document

Preferably also support:

* search across imported Markdown files

Search results should show:

* filename
* matching heading/section
* short context
* number of matches

Clicking a result should open the appropriate file and scroll to the match.

Use a polished search UI.

---

# 16. DARK MODE / LIGHT MODE

This is NOT supposed to be a simple:

```
background: black;
text: white;
```

theme switch.

Build an intelligent design system with separate theme tokens.

Light and dark themes should independently optimize:

* background
* surface
* elevated surface
* text
* secondary text
* headings
* borders
* code blocks
* tables
* blockquotes
* links
* selected navigation items
* images
* diagrams
* modal viewer
* toolbar
* scrollbar
* focus states

The dark theme must be comfortable for long reading sessions.

Avoid pure black backgrounds unless there is a strong design reason.

Avoid excessively bright saturated colors.

The light theme should not be glaring white everywhere.

Support:

* Light
* Dark
* System

if practical.

Remember the user's selected preference.

---

# 17. TYPOGRAPHY

Typography is extremely important.

Create a professional reading experience.

Use:

* readable body font
* clear heading hierarchy
* appropriate line height
* comfortable paragraph width
* excellent code typography
* readable tables
* balanced whitespace

Avoid overly narrow or overly wide text columns.

Long-form Markdown should feel like reading a high-quality technical documentation site.

---

# 18. UI / UX QUALITY

The application should feel polished.

Use:

* smooth transitions
* subtle animations
* hover states
* active states
* focus states
* keyboard navigation
* sensible tooltips
* accessible controls
* loading states where needed
* empty states
* error states

Animations must be subtle.

Do NOT over-animate.

Do NOT use excessive glassmorphism.

Do NOT create a flashy dashboard.

This is primarily a professional reading/documentation application.

---

# 19. RESPONSIVE DESIGN

This is mandatory.

The application must work properly on:

* desktop
* laptop
* tablet
* mobile phone

Test at multiple viewport sizes.

Desktop:

```
File explorer | Content | Outline
```

Tablet:

```
Collapsible explorer | Content
Outline can become a drawer
```

Mobile:

```
Header
Content
File explorer as drawer
Outline as drawer
```

The content must never:

* overflow horizontally unnecessarily
* become unreadably small
* overlap
* hide controls
* produce broken layouts

Tables should horizontally scroll when necessary.

Images should resize intelligently.

Code blocks should remain readable.

Modals must fit within the viewport.

Touch targets should be sufficiently large.

---

# 20. ACCESSIBILITY

Implement proper accessibility.

Support:

* semantic HTML
* keyboard navigation
* visible focus states
* ARIA labels where required
* accessible buttons
* accessible dialogs
* escape-to-close
* screen-reader-friendly navigation
* adequate contrast

Do not sacrifice accessibility for visual design.

---

# 21. ERROR HANDLING

The application must handle:

* unsupported file
* malformed Markdown
* missing image
* broken image path
* unsupported browser
* folder access failure
* permission denial
* malformed Mermaid
* malformed math
* extremely large Markdown files

Gracefully.

Never allow one broken image or diagram to crash the entire document.

Display helpful non-intrusive error states.

---

# 22. LARGE DOCUMENT PERFORMANCE

The viewer should remain usable with large documentation sets.

Consider:

* lazy-loading images
* efficient DOM updates
* avoiding unnecessary rerenders
* debounced search
* efficient file indexing
* caching parsed content
* efficient object URL handling
* cleaning up unused object URLs
* avoiding memory leaks

Do not load every large image into memory unnecessarily.

---

# 23. SECURITY

Because users may open arbitrary Markdown files, treat imported content carefully.

Do not execute arbitrary JavaScript embedded in Markdown.

Sanitize rendered HTML.

Prevent:

* XSS
* script injection
* unsafe HTML execution
* malicious links where practical

Do not allow Markdown content to gain unnecessary access to the application.

---

# 24. OFFLINE REQUIREMENT

This requirement is critical.

The final application must work with internet completely disabled.

Before declaring the project complete, test the following scenario:

1. Disconnect internet.
2. Open the HTML application.
3. Select a Markdown folder.
4. Open multiple Markdown files.
5. Display images.
6. Display SVGs.
7. Display diagrams.
8. Use search.
9. Change theme.
10. Open image viewer.
11. Zoom images.
12. Navigate between files.

Everything that is supposed to work offline must continue working.

Do not depend on:

* CDN
* remote fonts
* remote JavaScript
* remote CSS
* remote APIs

unless explicitly documented as optional external functionality.

---

# 25. STANDALONE DISTRIBUTION

The final output should be as easy to distribute as possible.

Ideally provide:

```
markdown-viewer/
    index.html
    assets/
    README.md
```

or, if technically practical:

```
markdown-viewer.html
```

that can be opened directly.

If a true single-file architecture causes unacceptable compromises, prefer a small self-contained folder over sacrificing reliability.

The user should be able to copy the application to another computer and use it without installation.

---

# 26. UI FEATURES

Include a polished top toolbar containing appropriate controls such as:

* Open File
* Open Folder
* Search
* Toggle sidebar
* Toggle outline
* Theme switch
* Reading settings
* Fullscreen where appropriate

Do not overcrowd the toolbar.

On mobile convert secondary actions into an overflow menu.

---

# 27. READING EXPERIENCE

Add thoughtful reading features where they improve usability.

Potential features:

* reading progress indicator
* scroll-to-top button
* breadcrumbs
* document title
* last-opened file
* remember theme
* remember sidebar state
* remember outline state
* font-size controls
* content-width controls

Only implement features that improve the experience.

Do not turn this into an unnecessarily complicated application.

---

# 28. CONTENT WIDTH

Provide an optimal reading width.

For example:

```
┌──────────────────────────────────┐
│                                  │
│        Markdown content          │
│                                  │
└──────────────────────────────────┘
```

Do not allow paragraphs to stretch across the entire 4K monitor.

Allow the user to adjust content width if practical.

---

# 29. CODE BLOCK EXPERIENCE

Make code blocks excellent.

Include:

* syntax highlighting
* copy button
* language label
* horizontal scrolling
* line wrapping option if practical
* readable dark/light styling

The code block must not destroy the overall reading flow.

---

# 30. TABLE EXPERIENCE

Tables must be professionally styled.

Support:

* header distinction
* row spacing
* alignment
* horizontal scrolling
* responsive behavior
* readable text
* dark/light styling

Do not allow large tables to break the page layout.

---

# 31. FIGURE CAPTIONS

If Markdown contains image captions or figure-like structures, preserve them where possible.

Make captions visually distinct but subtle.

Example:

```
Figure 1 — System Architecture
```

Captions should remain readable in both themes.

---

# 32. KEYBOARD SHORTCUTS

Implement useful shortcuts.

For example:

```
Ctrl/Cmd + K    Search
Ctrl/Cmd + +    Zoom in
Ctrl/Cmd + -    Zoom out
Ctrl/Cmd + 0    Reset zoom
Esc              Close modal
[ / ]            Navigate where appropriate
```

Do not create shortcuts that interfere with normal browser behavior unnecessarily.

Document all shortcuts.

---

# 33. IMAGE ZOOM EXPERIENCE

The image viewer should feel similar to a professional document/image viewer.

Include:

* zoom percentage
* zoom in
* zoom out
* fit
* reset
* fullscreen
* close
* mouse-wheel zoom
* drag to pan

Ensure zooming is centered intelligently around the cursor where practical.

Do not let zoomed images become impossible to navigate.

---

# 34. MOBILE IMAGE EXPERIENCE

On mobile:

* use nearly the full viewport
* support pinch zoom
* support pan
* keep close controls accessible
* avoid accidental page scrolling while interacting with the image
* ensure controls don't cover important content

---

# 35. VISUAL DESIGN DIRECTION

The design should feel inspired by the best modern documentation/readers, but DO NOT simply clone another product.

Desired qualities:

* minimal
* sophisticated
* professional
* calm
* technical
* highly readable
* modern
* responsive
* polished

Avoid:

* excessive gradients
* huge rounded cards everywhere
* excessive shadows
* neon colors
* unnecessary animations
* dashboard-like appearance
* clutter
* mechanical-looking diagrams
* generic template aesthetics

The goal is:

"premium technical documentation reader"

rather than:

"basic Markdown HTML converter".

---

# 36. ARCHITECTURE

Before implementing the application:

1. Analyze the requirements.
2. Decide the architecture.
3. Identify browser limitations.
4. Identify libraries that are genuinely necessary.
5. Ensure offline compatibility.
6. Create a clear project structure.
7. Create a development plan.

Do not immediately generate thousands of lines of code without architecture.

---

# 37. DEVELOPMENT WORKFLOW

Create a `progress.md` file.

This file is the SINGLE SOURCE OF TRUTH for project progress.

Divide the work into logical phases.

Example:

```
Phase 1 — Architecture
Phase 2 — File system handling
Phase 3 — Markdown rendering
Phase 4 — Layout/navigation
Phase 5 — Images and visual viewer
Phase 6 — Themes
Phase 7 — Search
Phase 8 — Responsive design
Phase 9 — Accessibility
Phase 10 — Performance
Phase 11 — Testing
Phase 12 — Final polish
```

For each task maintain:

* status
* implementation notes
* known issues
* tests completed
* remaining work

Use:

```
TODO
IN PROGRESS
DONE
BLOCKED
```

Do not mark a task DONE unless it has actually been implemented and tested.

---

# 38. ITERATIVE IMPLEMENTATION

Do NOT attempt to build the entire application in one enormous response.

Work phase-by-phase.

After completing each meaningful phase:

1. implement
2. inspect
3. test
4. fix issues
5. update `progress.md`
6. continue

Prioritize a working foundation before visual polish.

---

# 39. TESTING REQUIREMENT

Create meaningful tests/checks for:

### File handling

* single Markdown file
* folder
* nested folders
* missing assets
* relative paths
* spaces in filenames
* special characters

### Markdown

* headings
* nested lists
* tables
* code blocks
* blockquotes
* links
* images
* malformed Markdown

### Visuals

* PNG
* JPG
* SVG
* large images
* very small images
* broken images
* zoom
* pan
* reset
* fullscreen

### Responsive

Test:

* 320px
* 375px
* 390px
* 768px
* 1024px
* 1366px
* 1440px
* 1920px
* large desktop displays

### Themes

Test:

* light
* dark
* system preference
* switching during document viewing

### Offline

Disable internet and test the entire workflow.

---

# 40. SELF-REVIEW

Before declaring completion, perform a complete product review.

Ask yourself:

* Does the application actually work by opening the HTML file?
* Does it work offline?
* Can I open an entire folder?
* Are nested folders displayed correctly?
* Are Markdown assets resolved correctly?
* Are images rendered correctly?
* Can I zoom images?
* Can I pan images?
* Does Ctrl +/- work appropriately?
* Does mouse-wheel zoom work?
* Does mobile pinch zoom work?
* Does dark mode look professionally designed?
* Does light mode look professionally designed?
* Are headings navigable?
* Does the sidebar collapse properly?
* Does the outline work?
* Does search work?
* Do tables remain usable?
* Do code blocks remain readable?
* Are external dependencies completely offline-safe?
* Does the UI work on mobile?
* Does anything overflow?
* Are there console errors?
* Are there memory leaks?
* Are broken assets handled gracefully?

Fix problems before considering the project complete.

---

# 41. NO FAKE IMPLEMENTATION

Do not create placeholder buttons that do nothing.

Do not claim a feature works when it does not.

Do not create mock file data instead of implementing actual folder selection.

Do not hard-code a sample Markdown document as the primary functionality.

Every visible control should either work or not be presented.

---

# 42. FINAL DELIVERABLES

The final project must contain:

1. Working Markdown viewer
2. Standalone offline-capable application
3. Folder selection
4. Individual file selection
5. Folder tree
6. Collapsible sidebar
7. Markdown renderer
8. Heading outline
9. Image rendering
10. Image/figure expansion viewer
11. Zoom/pan
12. Charts/diagram support where practical
13. Dark mode
14. Light mode
15. Responsive mobile layout
16. Search
17. Keyboard shortcuts
18. Accessibility support
19. Error handling
20. Performance optimizations
21. `progress.md`
22. `README.md`

---

# 43. README REQUIREMENTS

Create a professional README explaining:

* what the application does
* how to launch it
* supported browsers
* offline behavior
* supported Markdown features
* supported image formats
* folder selection
* keyboard shortcuts
* limitations
* architecture
* libraries used
* why each dependency was selected
* how to modify/customize the viewer

Clearly explain browser limitations such as File System Access API support.

---

# 44. FINAL QUALITY BAR

The application should NOT feel like:

"Markdown converted to HTML."

It should feel like:

"A professional offline documentation and knowledge-reading application."

Prioritize:

1. correctness
2. offline reliability
3. Markdown fidelity
4. asset resolution
5. visual readability
6. navigation
7. responsive design
8. accessibility
9. performance
10. visual polish

Do not sacrifice correctness merely to make the UI flashy.

---

# 45. START NOW

Start by:

1. Inspecting the current project directory.
2. Determining whether an existing project exists.
3. Inspecting existing files before modifying anything.
4. Creating the architecture plan.
5. Creating `progress.md`.
6. Creating `README.md`.
7. Choosing the implementation approach.
8. Beginning Phase 1.
9. Implementing incrementally.
10. Testing each completed phase.
11. Updating `progress.md` continuously.

Do not ask unnecessary questions.

Make reasonable engineering decisions yourself.

If there are multiple technically valid approaches, choose the approach that provides the best combination of:

* offline reliability
* browser compatibility
* maintainability
* performance
* visual quality
* simplicity
* long-term usability

When a requirement cannot be perfectly implemented because of browser security restrictions or platform limitations, do not fake it. Document the limitation and implement the best available alternative.

Continue until the application is genuinely functional and polished rather than stopping after scaffolding.
