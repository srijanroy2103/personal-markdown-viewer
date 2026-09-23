/* Application shell: wires file system, rendering, navigation, and UI chrome together. */
const App = (() => {
  const $ = (id) => document.getElementById(id);

  const el = {
    sidebar: $('sidebar'), outline: $('outline'),
    sidebarScrim: $('sidebar-scrim'), outlineScrim: $('outline-scrim'),
    contentScroll: $('content-scroll'), contentInner: $('content-inner'),
    markdownContent: $('markdown-content'), welcomeState: $('welcome-state'),
    breadcrumbs: $('breadcrumbs'), fsaHint: $('fsa-support-hint'),
    statusFileCount: $('status-file-count'), statusWordCount: $('status-word-count'),
    btnToggleSidebar: $('btn-toggle-sidebar'), btnToggleOutline: $('btn-toggle-outline'),
    sidebarResize: $('sidebar-resize'),
    toastRegion: $('toast-region'),
    edgePeekSidebar: $('edge-peek-sidebar'), edgePeekOutline: $('edge-peek-outline'),
  };

  const LAST_FILE_KEY = 'mdviewer.lastFile.v1';
  let currentNode = null;
  let currentRawText = '';
  let markdownFileInput, folderInput;

  // ---------------- Toasts ----------------
  function toast(message, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    t.textContent = message;
    el.toastRegion.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // ---------------- Popovers (generic) ----------------
  function wirePopover(triggerId, popoverId) {
    const trigger = $(triggerId), pop = $(popoverId);
    if (!trigger || !pop) return;
    function close() { pop.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
    function toggle(e) {
      e.stopPropagation();
      const willOpen = pop.hidden;
      document.querySelectorAll('.popover').forEach((p) => { p.hidden = true; });
      document.querySelectorAll('[aria-haspopup="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      pop.hidden = !willOpen;
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }
    trigger.addEventListener('click', toggle);
    pop.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', close);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return { close };
  }

  // ---------------- Layout: sidebar / outline toggling ----------------
  function isMobileSidebar() { return window.matchMedia('(max-width: 860px)').matches; }
  function isMobileOutline() { return window.matchMedia('(max-width: 1180px)').matches; }

  function setSidebarCollapsed(collapsed, opts = {}) {
    el.sidebar.dataset.collapsed = String(collapsed);
    el.btnToggleSidebar.setAttribute('aria-expanded', String(!collapsed));
    el.edgePeekSidebar.hidden = !collapsed;
    if (isMobileSidebar()) el.sidebarScrim.hidden = collapsed;
    else el.sidebarScrim.hidden = true;
    if (!opts.skipPersist) Theme.set('sidebarCollapsed', collapsed);
  }
  function setOutlineCollapsed(collapsed, opts = {}) {
    el.outline.dataset.collapsed = String(collapsed);
    el.btnToggleOutline.setAttribute('aria-expanded', String(!collapsed));
    el.edgePeekOutline.hidden = !collapsed;
    if (isMobileOutline()) el.outlineScrim.hidden = collapsed;
    else el.outlineScrim.hidden = true;
    if (!opts.skipPersist) Theme.set('outlineCollapsed', collapsed);
  }

  function applyPersistedLayout() {
    setSidebarCollapsed(isMobileSidebar() ? true : Theme.get('sidebarCollapsed'), { skipPersist: true });
    setOutlineCollapsed(isMobileOutline() ? true : Theme.get('outlineCollapsed'), { skipPersist: true });
    const w = Theme.get('sidebarWidth');
    if (w) el.sidebar.style.width = w + 'px';
  }

  function wireSidebarResize() {
    let dragging = false, startX = 0, startW = 0;
    el.sidebarResize.addEventListener('mousedown', (e) => {
      dragging = true; startX = e.clientX; startW = el.sidebar.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const w = Math.min(480, Math.max(180, startW + (e.clientX - startX)));
      el.sidebar.style.width = w + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      Theme.set('sidebarWidth', Math.round(el.sidebar.getBoundingClientRect().width));
    });
  }

  // ---------------- Reading settings popover ----------------
  function wireReadingSettings() {
    wirePopover('btn-reading-settings', 'reading-settings-popover');

    const themeButtons = document.querySelectorAll('[data-theme-choice]');
    function syncThemeButtons() {
      const cur = Theme.get('theme');
      themeButtons.forEach((b) => b.setAttribute('aria-checked', b.dataset.themeChoice === cur ? 'true' : 'false'));
    }
    themeButtons.forEach((b) => b.addEventListener('click', () => {
      Theme.set('theme', b.dataset.themeChoice);
      syncThemeButtons();
      rerenderMermaidForTheme();
    }));
    syncThemeButtons();

    const widthButtons = document.querySelectorAll('[data-width-choice]');
    function syncWidthButtons() {
      const cur = Theme.get('contentWidth');
      widthButtons.forEach((b) => b.setAttribute('aria-checked', b.dataset.widthChoice === cur ? 'true' : 'false'));
    }
    widthButtons.forEach((b) => b.addEventListener('click', () => { Theme.set('contentWidth', b.dataset.widthChoice); syncWidthButtons(); }));
    syncWidthButtons();

    const fontValueEl = $('font-size-value');
    function syncFont() { fontValueEl.textContent = Theme.get('fontSize') + 'px'; }
    $('font-decrease').addEventListener('click', () => { Theme.set('fontSize', Math.max(12, Theme.get('fontSize') - 1)); syncFont(); });
    $('font-increase').addEventListener('click', () => { Theme.set('fontSize', Math.min(24, Theme.get('fontSize') + 1)); syncFont(); });
    syncFont();
  }

  function rerenderMermaidForTheme() {
    if (currentNode && window.mermaid) renderDocument(currentNode, { keepScroll: true });
  }

  // ---------------- Fullscreen ----------------
  function wireFullscreen() {
    $('btn-fullscreen').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.getElementById('app').requestFullscreen?.().catch(() => toast('Fullscreen is not available.', 'error'));
    });
  }

  // ---------------- More menu ----------------
  function wireMoreMenu() {
    wirePopover('btn-more', 'more-popover');
    $('btn-show-shortcuts').addEventListener('click', () => { $('more-popover').hidden = true; openShortcuts(); });
    $('btn-print').addEventListener('click', () => { $('more-popover').hidden = true; window.print(); });
  }

  function openShortcuts() { $('shortcuts-overlay').hidden = false; }
  function closeShortcuts() { $('shortcuts-overlay').hidden = true; }

  // ---------------- File System wiring ----------------
  function setupFallbackInputs() {
    folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.webkitdirectory = true;
    folderInput.multiple = true;
    folderInput.hidden = true;
    folderInput.addEventListener('change', () => {
      if (!folderInput.files.length) return;
      loadTree(FS.buildFromFileList(folderInput.files));
      folderInput.value = '';
    });
    document.body.appendChild(folderInput);

    markdownFileInput = document.createElement('input');
    markdownFileInput.type = 'file';
    markdownFileInput.accept = '.md,.markdown,.mdown,.mkd,text/markdown';
    markdownFileInput.hidden = true;
    markdownFileInput.addEventListener('change', () => {
      if (!markdownFileInput.files.length) return;
      const root = FS.buildFromSingleFile(markdownFileInput.files[0]);
      loadTree(root, { flat: true });
      markdownFileInput.value = '';
    });
    document.body.appendChild(markdownFileInput);
  }

  function updateFsaHint() {
    el.fsaHint.textContent = FS.hasFSA
      ? 'Folder access uses your browser’s native picker — nothing leaves this device.'
      : 'Your browser doesn’t support the File System Access API; using standard file/folder selection instead. Some features (like remembering the last folder) are unavailable.';
  }

  async function openFolder() {
    try {
      if (FS.hasFSA) {
        const root = await FS.openFolderFSA();
        loadTree(root);
      } else {
        folderInput.click();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Could not open folder: ' + err.message, 'error');
    }
  }

  async function openFile() {
    try {
      if (FS.hasFilePicker) {
        const root = await FS.openFileFSA();
        loadTree(root, { flat: true });
      } else {
        markdownFileInput.click();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast('Could not open file: ' + err.message, 'error');
    }
  }

  async function tryRestoreLastFolder() {
    if (!FS.hasFSA) return;
    const handle = await FS.getLastFolderHandle();
    if (!handle) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-subtle';
    btn.style.marginTop = '10px';
    btn.textContent = `Reopen "${handle.name}"`;
    btn.addEventListener('click', async () => {
      try {
        const root = await FS.openRememberedFolder(handle);
        loadTree(root);
      } catch (err) {
        toast('Could not reopen folder — permission was not granted.', 'error');
      }
    });
    el.welcomeState.appendChild(btn);
  }

  function loadTree(root, opts = {}) {
    Search.resetCache();
    Sidebar.render(root, opts);
    el.statusFileCount.textContent = `${FS.allMarkdownFiles().length} file${FS.allMarkdownFiles().length === 1 ? '' : 's'}`;
    const remembered = localStorage.getItem(LAST_FILE_KEY);
    const files = FS.allMarkdownFiles();
    let target = null;
    if (remembered) target = files.find((f) => f.path === remembered) || null;
    if (!target) target = files.find((f) => /^readme\./i.test(f.name)) || files[0] || null;
    if (target) selectFile(target);
    else toast('No Markdown files found in this folder.', 'error');
  }

  async function selectFile(node) {
    currentNode = node;
    Sidebar.setSelected(node.path);
    localStorage.setItem(LAST_FILE_KEY, node.path);
    await renderDocument(node);
  }

  async function renderDocument(node, opts = {}) {
    try {
      currentRawText = await FS.getText(node);
    } catch (err) {
      toast('Failed to read file: ' + err.message, 'error');
      return;
    }
    el.welcomeState.hidden = true;
    el.markdownContent.hidden = false;
    const scrollTop = opts.keepScroll ? el.contentScroll.scrollTop : 0;
    let outline;
    try {
      outline = await Markdown.renderInto(el.markdownContent, currentRawText, node.path);
    } catch (err) {
      el.markdownContent.innerHTML = `<div class="render-error">Rendering failed: ${Markdown.escapeHtml(err.message || String(err))}</div>`;
      outline = [];
    }
    Outline.render(outline);
    renderBreadcrumbs(node);
    const words = currentRawText.trim() ? currentRawText.trim().split(/\s+/).length : 0;
    el.statusWordCount.textContent = `${words.toLocaleString()} words`;
    el.contentScroll.scrollTop = scrollTop;
    if (isMobileSidebar()) setSidebarCollapsed(true);
    document.title = `${node.name} — Markdown Viewer`;
  }

  function renderBreadcrumbs(node) {
    const parts = node.path.split('/');
    el.breadcrumbs.innerHTML = parts.map((p, i) => {
      const isLast = i === parts.length - 1;
      return `${i > 0 ? '<span class="crumb-sep">/</span>' : ''}<span class="crumb${isLast ? ' crumb-current' : ''}">${Markdown.escapeHtml(p)}</span>`;
    }).join('');
  }

  function flatOrderedMarkdownFiles() { return FS.allMarkdownFiles(); }

  async function navigateRelative(delta) {
    const files = flatOrderedMarkdownFiles();
    if (!currentNode || !files.length) return;
    const idx = files.findIndex((f) => f.path === currentNode.path);
    const next = files[(idx + delta + files.length) % files.length];
    if (next) await selectFile(next);
  }

  // ---------------- Content interactions (links, copy buttons) ----------------
  function wireContentClicks() {
    el.markdownContent.addEventListener('click', async (e) => {
      const copyBtn = e.target.closest('[data-action="copy-code"]');
      if (copyBtn) {
        const codeEl = copyBtn.closest('.code-block').querySelector('code');
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('copied');
          setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1600);
        } catch { toast('Could not copy to clipboard.', 'error'); }
        return;
      }

      const anchorLink = e.target.closest('a.anchor-link, a.heading-anchor');
      if (anchorLink) {
        e.preventDefault();
        Outline.scrollToHeading(anchorLink.getAttribute('href').slice(1));
        return;
      }

      const internalLink = e.target.closest('a.internal-link');
      if (internalLink) {
        e.preventDefault();
        const path = internalLink.dataset.resolvedPath;
        const isMd = internalLink.dataset.isMarkdown === '1';
        const hash = internalLink.dataset.targetHash;
        if (!path || internalLink.classList.contains('broken')) {
          toast('That file could not be found in the opened folder.', 'error');
          return;
        }
        if (!isMd) {
          toast('This file type can’t be previewed here.', 'error');
          return;
        }
        const node = FS.findNode(path);
        if (!node) { toast('That file could not be found.', 'error'); return; }
        await selectFile(node);
        if (hash) Outline.scrollToHeading(hash);
        return;
      }
    });
  }

  // ---------------- Search navigation ----------------
  async function handleSearchNavigate(node, { query, occurrence }) {
    if (node && (!currentNode || node.path !== currentNode.path)) {
      await selectFile(node);
    }
    requestAnimationFrame(() => Search.highlightAndScroll(el.markdownContent, query, occurrence));
  }

  // ---------------- Keyboard shortcuts ----------------
  function wireKeyboard() {
    window.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      const overlayOpen = ImageViewer.isOpen || !$('search-overlay').hidden || !$('shortcuts-overlay').hidden;

      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); Search.open(); return; }
      if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); setSidebarCollapsed(el.sidebar.dataset.collapsed !== 'true'); return; }
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openFolder(); return; }
      if (overlayOpen || typing) {
        if (e.key === 'Escape' && !$('shortcuts-overlay').hidden) closeShortcuts();
        return;
      }
      if (e.key === '?') { e.preventDefault(); openShortcuts(); return; }
      if (e.key === '[') { navigateRelative(-1); return; }
      if (e.key === ']') { navigateRelative(1); return; }
    });
    $('btn-close-shortcuts').addEventListener('click', closeShortcuts);
    $('shortcuts-overlay').addEventListener('click', (e) => { if (e.target.id === 'shortcuts-overlay') closeShortcuts(); });
  }

  function wireToolbar() {
    el.btnToggleSidebar.addEventListener('click', () => setSidebarCollapsed(el.sidebar.dataset.collapsed !== 'true'));
    el.btnToggleOutline.addEventListener('click', () => setOutlineCollapsed(el.outline.dataset.collapsed !== 'true'));
    el.sidebarScrim.addEventListener('click', () => setSidebarCollapsed(true));
    el.outlineScrim.addEventListener('click', () => setOutlineCollapsed(true));
    el.edgePeekSidebar.addEventListener('click', () => setSidebarCollapsed(false));
    el.edgePeekOutline.addEventListener('click', () => setOutlineCollapsed(false));
    $('btn-open-file').addEventListener('click', openFile);
    $('btn-open-file-welcome').addEventListener('click', openFile);
    $('btn-open-folder').addEventListener('click', openFolder);
    $('btn-open-folder-welcome').addEventListener('click', openFolder);
    $('btn-scroll-top').addEventListener('click', () => el.contentScroll.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('resize', debounceLayout);
  }

  let layoutTimer;
  function debounceLayout() {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => {
      if (!isMobileSidebar() && el.sidebarScrim) el.sidebarScrim.hidden = true;
      if (!isMobileOutline() && el.outlineScrim) el.outlineScrim.hidden = true;
    }, 120);
  }

  async function init() {
    Theme.init();
    Markdown.init();
    Sidebar.init(selectFile);
    Search.init({ onNavigate: handleSearchNavigate, getCurrentDoc: () => ({ node: currentNode, container: el.markdownContent }) });

    wireToolbar();
    wireContentClicks();
    wireKeyboard();
    wireSidebarResize();
    wireReadingSettings();
    wireFullscreen();
    wireMoreMenu();
    applyPersistedLayout();
    setupFallbackInputs();
    updateFsaHint();

    window.addEventListener('beforeunload', () => FS.revokeAllObjectUrls());

    await tryRestoreLastFolder();
  }

  return { init, openFolder, openFile };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
