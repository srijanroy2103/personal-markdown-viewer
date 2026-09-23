/* Document outline panel: renders heading hierarchy, scrollspy, reading progress. */
const Outline = (() => {
  const body = document.getElementById('outline-body');
  const progressBar = document.getElementById('reading-progress');
  const scrollTopBtn = document.getElementById('btn-scroll-top');
  let headingEls = [];
  let scrollHandler = null;

  function render(outline) {
    if (!outline.length) {
      body.innerHTML = '<div class="empty-state small"><p>No headings in this document</p></div>';
      headingEls = [];
      return;
    }
    body.innerHTML = outline.map((h) =>
      `<a class="outline-link" href="#${h.id}" data-level="${h.level}" data-outline-id="${h.id}">${Markdown.escapeHtml(h.text)}</a>`
    ).join('');
    headingEls = outline.map((h) => document.getElementById(h.id)).filter(Boolean);
    attachScrollSpy();
    update();
  }

  body.addEventListener('click', (e) => {
    const link = e.target.closest('.outline-link');
    if (!link) return;
    e.preventDefault();
    const id = link.dataset.outlineId;
    scrollToHeading(id);
  });

  function scrollToHeading(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  }

  function attachScrollSpy() {
    const scrollEl = document.getElementById('content-scroll');
    if (scrollHandler) scrollEl.removeEventListener('scroll', scrollHandler);
    let ticking = false;
    scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    };
    scrollEl.addEventListener('scroll', scrollHandler, { passive: true });
  }

  function update() {
    const scrollEl = document.getElementById('content-scroll');
    const top = scrollEl.scrollTop + 90;
    let activeId = headingEls[0]?.id || null;
    for (const el of headingEls) {
      if (el.offsetTop <= top) activeId = el.id; else break;
    }
    body.querySelectorAll('.outline-link.active').forEach((a) => a.classList.remove('active'));
    if (activeId) {
      const link = body.querySelector(`.outline-link[data-outline-id="${CSS.escape(activeId)}"]`);
      if (link) {
        link.classList.add('active');
        link.scrollIntoView({ block: 'nearest' });
      }
    }

    const max = scrollEl.scrollHeight - scrollEl.clientHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, (scrollEl.scrollTop / max) * 100)) : 0;
    progressBar.style.width = pct + '%';
    scrollTopBtn.hidden = scrollEl.scrollTop < 400;
  }

  function reset() {
    body.innerHTML = '<div class="empty-state small"><p>No headings yet</p></div>';
    headingEls = [];
    progressBar.style.width = '0%';
    scrollTopBtn.hidden = true;
  }

  return { render, update, reset, scrollToHeading };
})();
