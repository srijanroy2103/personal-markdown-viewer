/* ============================================================
   Markdown rendering pipeline:
   marked (parse) -> DOMPurify (sanitize) -> DOM insert ->
   enhance() (syntax highlight, mermaid, math, image resolution,
   table wrapping) run against the live, sanitized DOM.
   ============================================================ */
const Markdown = (() => {
  let currentDocPath = '';
  let slugCounts = new Map();
  let mermaidIdCounter = 0;
  let mermaidReady = false;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function slugify(text) {
    const base = text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';
    const n = (slugCounts.get(base) || 0) + 1;
    slugCounts.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  }

  const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

  function buildRenderer() {
    const renderer = new marked.Renderer();

    renderer.heading = function (token) {
      const text = this.parser.parseInline(token.tokens, this.parser.textRenderer);
      const id = slugify(text);
      const inline = this.parser.parseInline(token.tokens);
      return `<h${token.depth} id="${id}">${inline}<a class="heading-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a></h${token.depth}>\n`;
    };

    renderer.code = function (token) {
      const lang = (token.lang || '').trim().split(/\s+/)[0] || '';
      if (lang.toLowerCase() === 'mermaid') {
        return `<div class="mermaid-block"><pre class="mermaid-src" hidden>${escapeHtml(token.text)}</pre></div>\n`;
      }
      const escaped = escapeHtml(token.text);
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      return `<div class="code-block"><div class="code-block-header"><span class="code-block-lang">${escapeHtml(lang || 'text')}</span><button type="button" class="code-copy-btn" data-action="copy-code">Copy</button></div><pre><code${langClass}>${escaped}</code></pre></div>\n`;
    };

    function altTextOf(parser, token) {
      return token.tokens ? parser.parseInline(token.tokens, parser.textRenderer) : (token.text || '');
    }

    function figureHtml(parser, token) {
      const alt = altTextOf(parser, token);
      const zoomHint = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5L20.5 19l-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>';
      return `<figure class="figure"><div class="figure-media-wrap" data-mdsrc="${escapeHtml(token.href || '')}"><img class="md-image" alt="${escapeHtml(alt)}"${token.title ? ` title="${escapeHtml(token.title)}"` : ''}><span class="figure-zoom-hint">${zoomHint}</span></div>${token.title ? `<figcaption>${escapeHtml(token.title)}</figcaption>` : ''}</figure>\n`;
    }

    renderer.image = function (token) {
      const alt = altTextOf(this.parser, token);
      return `<span class="figure-media-wrap inline-image-wrap" data-mdsrc="${escapeHtml(token.href || '')}"><img class="md-image" alt="${escapeHtml(alt)}"${token.title ? ` title="${escapeHtml(token.title)}"` : ''}></span>`;
    };

    renderer.paragraph = function (token) {
      if (token.tokens && token.tokens.length === 1 && token.tokens[0].type === 'image') {
        return figureHtml(this.parser, token.tokens[0]);
      }
      return `<p>${this.parser.parseInline(token.tokens)}</p>\n`;
    };

    renderer.link = function (token) {
      const { href, title, tokens } = token;
      const text = tokens ? this.parser.parseInline(tokens) : escapeHtml(token.text || '');
      if (!href) return text;
      if (/^(mailto|tel):/i.test(href)) {
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
      }
      if (SCHEME_RE.test(href) || href.startsWith('//')) {
        return `<a class="external" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
      }
      if (href.startsWith('#')) {
        return `<a class="anchor-link" href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${text}</a>`;
      }
      const [pathPart, hashPart] = href.split('#');
      const resolved = currentDocPath ? FS.resolveRelativePath(currentDocPath, pathPart) : null;
      const node = resolved != null ? FS.findNode(resolved) : null;
      const isMd = !!(node && FS.isMarkdown(node.name));
      const attrs = [`href="${escapeHtml(href)}"`];
      if (title) attrs.push(`title="${escapeHtml(title)}"`);
      attrs.push(`class="internal-link${node ? '' : ' broken'}"`);
      if (resolved) attrs.push(`data-resolved-path="${escapeHtml(resolved)}"`);
      attrs.push(`data-is-markdown="${isMd ? '1' : '0'}"`);
      if (hashPart) attrs.push(`data-target-hash="${escapeHtml(hashPart)}"`);
      return `<a ${attrs.join(' ')}>${text}</a>`;
    };

    renderer.list = function (token) {
      const containsTask = token.items.some((i) => i.task);
      let body = '';
      for (const item of token.items) body += this.listitem(item);
      const type = token.ordered ? 'ol' : 'ul';
      const startAttr = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
      const cls = containsTask ? ' class="contains-task-list"' : '';
      return `<${type}${startAttr}${cls}>\n${body}</${type}>\n`;
    };

    renderer.listitem = function (token) {
      const cls = token.task ? ' class="task-list-item"' : '';
      return `<li${cls}>${this.parser.parse(token.tokens)}</li>\n`;
    };

    return renderer;
  }

  function init() {
    marked.setOptions({ gfm: true, breaks: false, renderer: buildRenderer() });
    if (window.hljs) hljs.configure({ ignoreUnescapedHTML: true });
  }

  function resetSlugs() { slugCounts = new Map(); }

  function currentThemeIsDark() {
    const t = Theme.get('theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function ensureMermaidInit() {
    if (!window.mermaid) return false;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: currentThemeIsDark() ? 'dark' : 'default' });
    mermaidReady = true;
    return true;
  }

  async function renderMermaidBlocks(container) {
    const blocks = container.querySelectorAll('.mermaid-block');
    if (!blocks.length) return;
    if (!window.mermaid) {
      blocks.forEach((b) => { b.innerHTML = '<div class="render-error">Mermaid library unavailable.</div>'; });
      return;
    }
    ensureMermaidInit();
    for (const block of blocks) {
      const src = block.querySelector('.mermaid-src');
      const code = src ? src.textContent : '';
      const id = `mermaid-diagram-${++mermaidIdCounter}`;
      try {
        const { svg, bindFunctions } = await mermaid.render(id, code);
        block.innerHTML = svg;
        if (bindFunctions) bindFunctions(block);
        const svgEl = block.querySelector('svg');
        if (svgEl) svgEl.addEventListener('click', () => ImageViewer.openSvg(svgEl, 'Diagram'));
      } catch (err) {
        block.innerHTML = `<div class="render-error">Mermaid diagram failed to render:\n${escapeHtml(err.message || String(err))}</div>`;
      }
    }
  }

  function highlightCode(container) {
    if (!window.hljs) return;
    container.querySelectorAll('pre code').forEach((el) => {
      try { hljs.highlightElement(el); } catch { /* leave block unhighlighted, still readable */ }
    });
  }

  function renderMath(container) {
    if (!window.renderMathInElement) return;
    try {
      renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        throwOnError: false,
      });
    } catch { /* malformed math left as plain text */ }
  }

  function wrapTables(container) {
    container.querySelectorAll('table').forEach((t) => {
      if (t.parentElement && t.parentElement.classList.contains('table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  }

  async function resolveImages(container, docPath) {
    const wraps = Array.from(container.querySelectorAll('[data-mdsrc]'));
    await Promise.all(wraps.map(async (wrap) => {
      const img = wrap.querySelector('img.md-image');
      if (!img) return;
      const raw = wrap.getAttribute('data-mdsrc') || '';
      img.loading = 'lazy';
      const showBroken = (reason) => {
        const placeholder = document.createElement('span');
        placeholder.className = 'img-broken-placeholder';
        placeholder.textContent = `Image not found: ${raw}`;
        placeholder.title = reason || '';
        wrap.replaceWith(placeholder);
      };
      if (!raw) return showBroken('Empty image reference');
      if (SCHEME_RE.test(raw) || raw.startsWith('//')) {
        img.src = raw;
        img.addEventListener('error', () => showBroken('Remote image failed to load (offline?)'), { once: true });
        return;
      }
      const resolved = FS.resolveRelativePath(docPath, raw);
      const node = resolved != null ? FS.findNode(resolved) : null;
      if (!node) return showBroken('Not found in opened folder');
      try {
        const url = await FS.getBlobURL(node);
        img.src = url;
        img.addEventListener('error', () => showBroken('Failed to read local file'), { once: true });
        wrap.addEventListener('click', () => ImageViewer.open({ src: url, alt: img.alt, caption: wrap.closest('figure') ? wrap.closest('figure').querySelector('figcaption')?.textContent : img.alt }));
      } catch {
        showBroken('Failed to read local file');
      }
    }));
  }

  async function enhance(container, docPath) {
    wrapTables(container);
    highlightCode(container);
    renderMath(container);
    await Promise.allSettled([resolveImages(container, docPath), renderMermaidBlocks(container)]);
  }

  function buildOutline(container) {
    const heads = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(heads).map((h) => ({
      id: h.id,
      level: Number(h.tagName.substring(1)),
      text: h.textContent.replace(/#\s*$/, '').trim(),
    }));
  }

  async function renderInto(container, text, docPath) {
    currentDocPath = docPath;
    resetSlugs();
    let html;
    try {
      html = marked.parse(text);
    } catch (err) {
      html = `<div class="render-error">Failed to parse Markdown:\n${escapeHtml(err.message || String(err))}</div>`;
    }
    const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    container.innerHTML = clean;
    const outline = buildOutline(container);
    await enhance(container, docPath);
    return outline;
  }

  return { init, renderInto, escapeHtml };
})();
