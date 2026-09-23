/* Search: current-document (live DOM) and cross-folder (cached raw text). */
const Search = (() => {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');
  const scopeButtons = document.querySelectorAll('[data-search-scope]');

  let scope = 'document';
  let onNavigate = null; // (node|null, {query, occurrence}) => Promise|void
  let getCurrentDoc = null; // () => {node, container}
  let docTextCache = new Map(); // path -> text
  let debounceTimer;
  let indexing = false;

  function init({ onNavigate: nav, getCurrentDoc: gcd }) {
    onNavigate = nav;
    getCurrentDoc = gcd;

    document.getElementById('btn-search').addEventListener('click', open);
    document.getElementById('btn-close-search').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    window.addEventListener('keydown', (e) => { if (overlay.hidden === false && e.key === 'Escape') close(); });

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runSearch(input.value.trim()), 250);
    });

    scopeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        scope = btn.dataset.searchScope;
        scopeButtons.forEach((b) => { b.classList.toggle('active', b === btn); b.setAttribute('aria-checked', b === btn ? 'true' : 'false'); });
        runSearch(input.value.trim());
      });
    });
  }

  function resetCache() { docTextCache = new Map(); }

  function open() {
    overlay.hidden = false;
    input.value = '';
    resultsEl.innerHTML = '<div class="search-empty">Type to search…</div>';
    setTimeout(() => input.focus(), 0);
  }
  function close() { overlay.hidden = true; }

  async function runSearch(query) {
    if (!query) { resultsEl.innerHTML = '<div class="search-empty">Type to search…</div>'; return; }
    if (scope === 'document') searchCurrentDoc(query);
    else await searchFolder(query);
  }

  function collapseWs(s) { return s.replace(/\s+/g, ' ').trim(); }

  function snippetAround(text, idx, len) {
    const radius = 50;
    const start = Math.max(0, idx - radius);
    const end = Math.min(text.length, idx + len + radius);
    let snippet = collapseWs(text.slice(start, end));
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet += '…';
    return snippet;
  }

  function headingBeforeOffset(text, offset) {
    const before = text.slice(0, offset);
    const lines = before.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(/^#{1,6}\s+(.+?)\s*#*$/);
      if (m) return m[1].trim();
    }
    return null;
  }

  function findMatches(text, query) {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const out = [];
    let from = 0, idx;
    while ((idx = lower.indexOf(q, from)) !== -1) {
      out.push(idx);
      from = idx + q.length;
      if (out.length > 200) break; // sane cap
    }
    return out;
  }

  function renderGroup(fileLabel, node, query, matches, textGetter) {
    if (!matches.length) return '';
    const items = matches.map((idx, i) => {
      const heading = headingBeforeOffset(textGetter(), idx);
      const snippet = snippetAround(textGetter(), idx, query.length);
      return `<div class="search-result-item" data-path="${node ? Markdown.escapeHtml(node.path) : ''}" data-occurrence="${i}" data-query="${Markdown.escapeHtml(query)}">
        <div class="search-result-heading">${heading ? Markdown.escapeHtml(heading) : '(no heading)'}</div>
        <div class="search-result-context">${Markdown.escapeHtml(snippet)}</div>
      </div>`;
    }).join('');
    return `<div class="search-result-group">
      <div class="search-result-file">${Markdown.escapeHtml(fileLabel)} · ${matches.length} match${matches.length === 1 ? '' : 'es'}</div>
      ${items}
    </div>`;
  }

  function searchCurrentDoc(query) {
    const current = getCurrentDoc?.();
    if (!current || !current.node) { resultsEl.innerHTML = '<div class="search-empty">Open a document first.</div>'; return; }
    const text = current.container.textContent || '';
    const matches = findMatches(text, query);
    resultsEl.innerHTML = matches.length
      ? renderGroup(current.node.name, current.node, query, matches, () => text)
      : `<div class="search-empty">No matches for "${Markdown.escapeHtml(query)}" in this document.</div>`;
    wireResultClicks();
  }

  async function ensureFolderIndex() {
    const files = FS.allMarkdownFiles();
    const missing = files.filter((f) => !docTextCache.has(f.path));
    if (!missing.length) return;
    indexing = true;
    await Promise.all(missing.map(async (f) => {
      try { docTextCache.set(f.path, await FS.getText(f)); } catch { docTextCache.set(f.path, ''); }
    }));
    indexing = false;
  }

  async function searchFolder(query) {
    resultsEl.innerHTML = '<div class="search-empty">Indexing files…</div>';
    await ensureFolderIndex();
    const files = FS.allMarkdownFiles();
    let html = '';
    let total = 0;
    for (const node of files) {
      const text = docTextCache.get(node.path) || '';
      const matches = findMatches(text, query);
      total += matches.length;
      html += renderGroup(node.path, node, query, matches, () => text);
    }
    resultsEl.innerHTML = total ? html : `<div class="search-empty">No matches for "${Markdown.escapeHtml(query)}" in this folder.</div>`;
    wireResultClicks();
  }

  function wireResultClicks() {
    resultsEl.querySelectorAll('.search-result-item').forEach((el) => {
      el.addEventListener('click', async () => {
        const path = el.dataset.path;
        const occurrence = Number(el.dataset.occurrence);
        const query = el.dataset.query;
        close();
        const node = path ? FS.findNode(path) : null;
        await onNavigate?.(node, { query, occurrence });
      });
    });
  }

  // ---- Highlight + scroll to the Nth textual occurrence inside a rendered container ----
  function clearHighlights(container) {
    container.querySelectorAll('mark.search-match-highlight').forEach((mark) => {
      const text = document.createTextNode(mark.textContent);
      mark.replaceWith(text);
    });
    container.normalize();
  }

  function highlightAndScroll(container, query, occurrenceIndex) {
    clearHighlights(container);
    if (!query) return;
    const q = query.toLowerCase();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.toLowerCase().includes(q)) return NodeFilter.FILTER_SKIP;
        if (node.parentElement && node.parentElement.closest('.mermaid-src, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    let count = 0;
    let targetMark = null;
    for (const node of nodes) {
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      const positions = [];
      let from = 0, idx;
      while ((idx = lower.indexOf(q, from)) !== -1) { positions.push(idx); from = idx + q.length; }
      if (!positions.length) continue;
      const frag = document.createDocumentFragment();
      let cursor = 0;
      for (const idx2 of positions) {
        frag.appendChild(document.createTextNode(text.slice(cursor, idx2)));
        const mark = document.createElement('mark');
        mark.className = 'search-match-highlight';
        mark.textContent = text.slice(idx2, idx2 + query.length);
        frag.appendChild(mark);
        if (count === occurrenceIndex) targetMark = mark;
        count++;
        cursor = idx2 + query.length;
      }
      frag.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(frag, node);
    }
    if (targetMark) {
      targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetMark.classList.add('active');
    }
  }

  return { init, open, close, resetCache, highlightAndScroll, clearHighlights };
})();
