/* ============================================================
   File system layer.
   Two modes:
   - 'fsa'      File System Access API (Chromium). Gives us live
                handles so relative asset paths resolve against
                real sibling files anywhere in the tree.
   - 'fallback' <input webkitdirectory> / <input type=file>.
                Folder structure rebuilt from webkitRelativePath;
                assets resolved from an in-memory path map.
   Both modes converge on the same tree/node shape so the rest
   of the app never needs to know which one is active.
   ============================================================ */
const FS = (() => {
  const MD_EXT = ['md', 'markdown', 'mdown', 'mkd'];
  const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'];

  const hasFSA = 'showDirectoryPicker' in window;
  const hasFilePicker = 'showOpenFilePicker' in window;

  let root = null;            // tree root node
  let index = new Map();      // path -> node (files only)
  let mode = null;            // 'fsa' | 'fallback' | 'single'
  let rootHandle = null;      // FileSystemDirectoryHandle, for remember-last-folder
  let objectUrls = new Set(); // for cleanup

  function extOf(name) {
    const i = name.lastIndexOf('.');
    return i === -1 ? '' : name.slice(i + 1).toLowerCase();
  }
  function isMarkdown(name) { return MD_EXT.includes(extOf(name)); }
  function isImage(name) { return IMAGE_EXT.includes(extOf(name)); }

  function joinPath(a, b) { return a ? `${a}/${b}` : b; }

  function revokeAllObjectUrls() {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
  }

  function resetState() {
    revokeAllObjectUrls();
    root = null;
    index = new Map();
    mode = null;
    rootHandle = null;
  }

  // ---------- Tree building: File System Access API ----------
  async function buildFromDirectoryHandle(dirHandle, path, parent) {
    const node = { type: 'folder', name: dirHandle.name, path, handle: dirHandle, parent, children: [] };
    const entries = [];
    for await (const entry of dirHandle.values()) entries.push(entry);
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // skip dotfiles/dirs
      const childPath = joinPath(path, entry.name);
      if (entry.kind === 'directory') {
        const childNode = await buildFromDirectoryHandle(entry, childPath, node);
        node.children.push(childNode);
      } else {
        const fileNode = { type: 'file', name: entry.name, path: childPath, handle: entry, parent: node, ext: extOf(entry.name) };
        node.children.push(fileNode);
        index.set(childPath, fileNode);
      }
    }
    return node;
  }

  async function openFolderFSA() {
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    resetState();
    rootHandle = handle;
    mode = 'fsa';
    root = await buildFromDirectoryHandle(handle, '', null);
    saveLastFolderHandle(handle).catch(() => {});
    return root;
  }

  async function openFileFSA() {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'] } }],
      excludeAcceptAllOption: false,
    });
    resetState();
    mode = 'single';
    const fileNode = { type: 'file', name: handle.name, path: handle.name, handle, parent: null, ext: extOf(handle.name) };
    root = { type: 'folder', name: '(single file)', path: '', handle: null, parent: null, children: [fileNode] };
    index.set(fileNode.path, fileNode);
    return root;
  }

  // ---------- Tree building: <input> fallback ----------
  function buildFromFileList(fileList) {
    resetState();
    mode = 'fallback';
    const files = Array.from(fileList);
    const topName = files[0]?.webkitRelativePath?.split('/')[0] || 'Folder';
    root = { type: 'folder', name: topName, path: '', handle: null, parent: null, children: [] };
    const folderNodes = new Map([['', root]]);

    function ensureFolder(path, name, parentPath) {
      if (folderNodes.has(path)) return folderNodes.get(path);
      const parent = folderNodes.get(parentPath);
      const node = { type: 'folder', name, path, handle: null, parent, children: [] };
      parent.children.push(node);
      folderNodes.set(path, node);
      return node;
    }

    for (const file of files) {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.split('/').slice(1); // drop the top-level folder name (== root)
      if (parts.length === 0) continue;
      let parentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        const path = joinPath(parentPath, parts[i]);
        ensureFolder(path, parts[i], parentPath);
        parentPath = path;
      }
      const name = parts[parts.length - 1];
      if (name.startsWith('.')) continue;
      const path = joinPath(parentPath, name);
      const parent = folderNodes.get(parentPath);
      const fileNode = { type: 'file', name, path, file, parent, ext: extOf(name) };
      parent.children.push(fileNode);
      index.set(path, fileNode);
    }

    sortTree(root);
    return root;
  }

  function buildFromSingleFile(file) {
    resetState();
    mode = 'single';
    const fileNode = { type: 'file', name: file.name, path: file.name, file, parent: null, ext: extOf(file.name) };
    root = { type: 'folder', name: '(single file)', path: '', handle: null, parent: null, children: [fileNode] };
    index.set(fileNode.path, fileNode);
    return root;
  }

  function sortTree(node) {
    if (node.type !== 'folder') return;
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    node.children.forEach(sortTree);
  }

  // ---------- Reading file contents ----------
  async function getFile(node) {
    if (node.handle) return node.handle.getFile();
    if (node.file) return node.file;
    throw new Error('No file source for node: ' + node.path);
  }

  async function getText(node) {
    const file = await getFile(node);
    return file.text();
  }

  async function getBlobURL(node) {
    if (node._blobUrl) return node._blobUrl;
    const file = await getFile(node);
    const url = URL.createObjectURL(file);
    node._blobUrl = url;
    objectUrls.add(url);
    return url;
  }

  // ---------- Path resolution ----------
  // Resolve a Markdown-relative reference (e.g. "../images/x.png") against
  // the path of the document that referenced it, POSIX-style.
  function resolveRelativePath(fromDocPath, relRef) {
    if (!relRef || /^[a-z][a-z0-9+.-]*:/i.test(relRef)) return null; // absolute URL / data: / mailto: etc.
    const clean = relRef.split('#')[0].split('?')[0];
    if (!clean) return null;
    const baseDir = fromDocPath.includes('/') ? fromDocPath.slice(0, fromDocPath.lastIndexOf('/')) : '';
    const baseParts = clean.startsWith('/') ? [] : baseDir.split('/').filter(Boolean);
    const relParts = clean.split('/').filter(Boolean);
    for (const part of relParts) {
      if (part === '.') continue;
      else if (part === '..') baseParts.pop();
      else baseParts.push(part);
    }
    return baseParts.join('/');
  }

  function findNode(path) { return index.get(path) || null; }

  function findMarkdownByPath(path) {
    const node = index.get(path);
    return node && isMarkdown(node.name) ? node : null;
  }

  function allMarkdownFiles() {
    return Array.from(index.values()).filter((n) => isMarkdown(n.name));
  }

  // ---------- "Remember last folder" via IndexedDB (Chromium only) ----------
  const IDB_NAME = 'mdviewer-fs';
  const IDB_STORE = 'handles';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveLastFolderHandle(handle) {
    if (!hasFSA) return;
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(handle, 'lastFolder');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function getLastFolderHandle() {
    if (!hasFSA) return null;
    try {
      const db = await idbOpen();
      const handle = await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get('lastFolder');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return handle;
    } catch {
      return null;
    }
  }

  async function openRememberedFolder(handle) {
    const perm = await handle.queryPermission({ mode: 'read' });
    if (perm !== 'granted') {
      const req = await handle.requestPermission({ mode: 'read' });
      if (req !== 'granted') throw new Error('Permission denied');
    }
    resetState();
    rootHandle = handle;
    mode = 'fsa';
    root = await buildFromDirectoryHandle(handle, '', null);
    return root;
  }

  return {
    hasFSA, hasFilePicker,
    isMarkdown, isImage, extOf,
    openFolderFSA, openFileFSA,
    buildFromFileList, buildFromSingleFile,
    getFile, getText, getBlobURL,
    resolveRelativePath, findNode, findMarkdownByPath, allMarkdownFiles,
    getLastFolderHandle, openRememberedFolder,
    revokeAllObjectUrls,
    get root() { return root; },
    get mode() { return mode; },
  };
})();
