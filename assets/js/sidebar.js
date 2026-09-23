/* File explorer tree: render, expand/collapse, select, filter. */
const Sidebar = (() => {
  const treeEl = document.getElementById('file-tree');
  const filterInput = document.getElementById('file-filter');

  const FOLDER_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" class="tree-icon" aria-hidden="true"><path d="M10 4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z"/></svg>';
  const FILE_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" class="tree-icon" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 2.5L18.5 9H14V4.5z"/></svg>';
  const CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" class="tree-toggle" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  let onSelectFile = null;
  let expanded = new Set();
  let selectedPath = null;
  let rowEls = new Map(); // path -> row element
  let nodeByPath = new Map();

  function init(callback) {
    onSelectFile = callback;
    filterInput.addEventListener('input', debounce(() => applyFilter(filterInput.value.trim().toLowerCase()), 120));
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function showEmpty() {
    treeEl.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M10 4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6z"/></svg>
      <p>No folder open</p>
      <button type="button" class="btn btn-subtle" id="btn-open-folder-empty">Open Folder</button>
    </div>`;
    document.getElementById('btn-open-folder-empty')?.addEventListener('click', () => App.openFolder());
  }

  function render(root, opts = {}) {
    expanded = new Set();
    rowEls = new Map();
    nodeByPath = new Map();
    treeEl.innerHTML = '';
    if (!root || !root.children || !root.children.length) { showEmpty(); return; }
    indexNodes(root);

    const list = document.createElement('div');
    if (opts.flat) {
      root.children.forEach((child) => list.appendChild(buildFileRow(child)));
    } else {
      expanded.add(root.path);
      list.appendChild(buildNode(root, 0, true));
    }
    treeEl.appendChild(list);
  }

  function indexNodes(node) {
    if (node.type === 'file') nodeByPath.set(node.path, node);
    else (node.children || []).forEach(indexNodes);
  }

  function buildNode(node, depth, isRoot = false) {
    if (node.type === 'file') return buildFileRow(node, depth);

    const wrap = document.createElement('div');
    wrap.className = 'tree-node';
    wrap.dataset.type = 'folder';
    wrap.dataset.path = node.path;

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.style.paddingLeft = (depth * 14) + 'px';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    const isExpanded = expanded.has(node.path);
    row.innerHTML = `${CHEVRON}${FOLDER_ICON}<span class="tree-label">${escapeHtml(node.name)}</span>`;
    row.querySelector('.tree-toggle').classList.toggle('expanded', isExpanded);
    row.addEventListener('click', () => toggleFolder(node.path));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFolder(node.path); } });
    wrap.appendChild(row);
    rowEls.set(node.path, row);

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'tree-children';
    childrenWrap.hidden = !isExpanded;
    node.children.forEach((child) => childrenWrap.appendChild(buildNode(child, depth + 1)));
    wrap.appendChild(childrenWrap);
    return wrap;
  }

  function buildFileRow(node, depth = 0) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-node';
    wrap.dataset.type = 'file';
    wrap.dataset.path = node.path;

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.style.paddingLeft = (depth * 14 + 4) + 'px';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    const isMd = FS.isMarkdown(node.name);
    row.innerHTML = `${FILE_ICON}<span class="tree-label">${escapeHtml(node.name)}</span>`;
    if (!isMd) row.style.opacity = '0.55';
    if (node.path === selectedPath) row.classList.add('selected');
    row.addEventListener('click', () => { if (isMd) onSelectFile?.(node); });
    row.addEventListener('keydown', (e) => { if (isMd && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectFile?.(node); } });
    wrap.appendChild(row);
    rowEls.set(node.path, row);
    return wrap;
  }

  function toggleFolder(path) {
    const wrap = treeEl.querySelector(`.tree-node[data-path="${cssEsc(path)}"]`);
    if (!wrap) return;
    const childrenWrap = wrap.querySelector(':scope > .tree-children');
    const row = wrap.querySelector(':scope > .tree-row');
    const nowExpanded = childrenWrap.hidden;
    childrenWrap.hidden = !nowExpanded;
    row.querySelector('.tree-toggle')?.classList.toggle('expanded', nowExpanded);
    if (nowExpanded) expanded.add(path); else expanded.delete(path);
  }

  function expandAncestors(path) {
    const parts = path.split('/');
    let acc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      acc = acc ? acc + '/' + parts[i] : parts[i];
      const wrap = treeEl.querySelector(`.tree-node[data-path="${cssEsc(acc)}"]`);
      if (!wrap) continue;
      const childrenWrap = wrap.querySelector(':scope > .tree-children');
      const row = wrap.querySelector(':scope > .tree-row');
      if (childrenWrap && childrenWrap.hidden) {
        childrenWrap.hidden = false;
        row?.querySelector('.tree-toggle')?.classList.toggle('expanded', true);
        expanded.add(acc);
      }
    }
  }

  function setSelected(path) {
    if (selectedPath && rowEls.has(selectedPath)) rowEls.get(selectedPath).classList.remove('selected');
    selectedPath = path;
    expandAncestors(path);
    if (rowEls.has(path)) {
      const row = rowEls.get(path);
      row.classList.add('selected');
      row.scrollIntoView({ block: 'nearest' });
    }
  }

  function applyFilter(query) {
    const nodes = treeEl.querySelectorAll('.tree-node');
    if (!query) {
      nodes.forEach((n) => { n.classList.remove('filtered-hidden'); });
      return;
    }
    const matches = new Set();
    for (const [path, node] of nodeByPath) {
      if (node.name.toLowerCase().includes(query)) {
        matches.add(path);
        const parts = path.split('/');
        let acc = '';
        for (let i = 0; i < parts.length - 1; i++) { acc = acc ? acc + '/' + parts[i] : parts[i]; matches.add(acc); }
      }
    }
    nodes.forEach((n) => {
      const path = n.dataset.path;
      const visible = matches.has(path);
      n.classList.toggle('filtered-hidden', !visible);
      if (visible && n.dataset.type === 'folder') {
        const childrenWrap = n.querySelector(':scope > .tree-children');
        const row = n.querySelector(':scope > .tree-row');
        if (childrenWrap) childrenWrap.hidden = false;
        row?.querySelector('.tree-toggle')?.classList.add('expanded');
      }
    });
  }

  function escapeHtml(s) { return Markdown.escapeHtml(s); }
  function cssEsc(s) { return CSS.escape(s); }

  return { init, render, setSelected, reset: showEmpty };
})();
