/* Modal image/figure viewer: zoom, pan, fit, actual size, mouse-wheel, touch pinch. */
const ImageViewer = (() => {
  const overlay = document.getElementById('image-viewer');
  const stage = document.getElementById('image-viewer-stage');
  const img = document.getElementById('image-viewer-img');
  const captionEl = document.getElementById('image-viewer-caption');
  const zoomLevelEl = document.getElementById('iv-zoom-level');

  const MIN_SCALE = 0.05;
  const MAX_SCALE = 12;

  let scale = 1, tx = 0, ty = 0, fitScale = 1;
  let naturalW = 0, naturalH = 0;
  let isOpen = false;
  let lastFocused = null;

  let dragging = false, dragStartX = 0, dragStartY = 0, dragOrigTx = 0, dragOrigTy = 0;
  let pointers = new Map();
  let pinchStartDist = 0, pinchStartScale = 1;
  let lastTapTime = 0;

  function apply() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    zoomLevelEl.textContent = Math.round(scale * 100) + '%';
  }

  function computeFitScale() {
    const rect = stage.getBoundingClientRect();
    if (!naturalW || !naturalH) return 1;
    return Math.min(rect.width / naturalW, rect.height / naturalH);
  }

  function centerAt(newScale) {
    const rect = stage.getBoundingClientRect();
    tx = (rect.width - naturalW * newScale) / 2;
    ty = (rect.height - naturalH * newScale) / 2;
    scale = newScale;
  }

  function fit() {
    fitScale = computeFitScale();
    centerAt(fitScale);
    apply();
  }

  function actualSize() {
    const rect = stage.getBoundingClientRect();
    const rectCx = rect.width / 2, rectCy = rect.height / 2;
    zoomAtPoint(rectCx, rectCy, 1);
  }

  function zoomAtPoint(stageX, stageY, newScale) {
    newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const imgX = (stageX - tx) / scale;
    const imgY = (stageY - ty) / scale;
    tx = stageX - imgX * newScale;
    ty = stageY - imgY * newScale;
    scale = newScale;
    apply();
  }

  function zoomBy(factor, center) {
    const rect = stage.getBoundingClientRect();
    const cx = center ? center.x - rect.left : rect.width / 2;
    const cy = center ? center.y - rect.top : rect.height / 2;
    zoomAtPoint(cx, cy, scale * factor);
  }

  function open({ src, alt, caption }) {
    lastFocused = document.activeElement;
    img.src = src;
    img.alt = alt || '';
    captionEl.textContent = caption || alt || '';
    overlay.hidden = false;
    isOpen = true;
    document.body.style.overflow = 'hidden';
    const onLoad = () => {
      naturalW = img.naturalWidth || img.width;
      naturalH = img.naturalHeight || img.height;
      img.style.width = naturalW + 'px';
      img.style.height = naturalH + 'px';
      fit();
    };
    if (img.complete && img.naturalWidth) onLoad();
    else img.onload = onLoad;
    document.getElementById('iv-close').focus();
  }

  function openSvg(svgEl, caption) {
    const clone = svgEl.cloneNode(true);
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgText = new XMLSerializer().serializeToString(clone);
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    open({ src: dataUrl, alt: caption, caption });
  }

  function close() {
    overlay.hidden = true;
    isOpen = false;
    img.src = '';
    document.body.style.overflow = '';
    img.onload = null;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // ---- Controls ----
  document.getElementById('iv-close').addEventListener('click', close);
  document.getElementById('iv-zoom-in').addEventListener('click', () => zoomBy(1.3));
  document.getElementById('iv-zoom-out').addEventListener('click', () => zoomBy(1 / 1.3));
  document.getElementById('iv-fit').addEventListener('click', fit);
  document.getElementById('iv-actual-size').addEventListener('click', actualSize);

  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.2); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.2); }
    else if (e.key === '0') { e.preventDefault(); fit(); }
  });

  stage.addEventListener('wheel', (e) => {
    if (!isOpen) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomBy(factor, { x: e.clientX, y: e.clientY });
  }, { passive: false });

  stage.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
    dragOrigTx = tx; dragOrigTy = ty;
    stage.classList.add('grabbing');
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    tx = dragOrigTx + (e.clientX - dragStartX);
    ty = dragOrigTy + (e.clientY - dragStartY);
    apply();
  });
  window.addEventListener('mouseup', () => { dragging = false; stage.classList.remove('grabbing'); });

  stage.addEventListener('dblclick', (e) => {
    if (!isOpen) return;
    const target = Math.abs(scale - fitScale) < 0.02 ? Math.min(MAX_SCALE, fitScale * 2.5) : fitScale;
    zoomAtPoint(e.clientX - stage.getBoundingClientRect().left, e.clientY - stage.getBoundingClientRect().top, target);
  });

  // Touch: pan + pinch zoom + double-tap
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.setPointerCapture(e.pointerId);
    if (pointers.size === 1) {
      dragging = true;
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragOrigTx = tx; dragOrigTy = ty;
    } else if (pointers.size === 2) {
      dragging = false;
      const pts = Array.from(pointers.values());
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      pinchStartScale = scale;
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1 && dragging) {
      tx = dragOrigTx + (e.clientX - dragStartX);
      ty = dragOrigTy + (e.clientY - dragStartY);
      apply();
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const newScale = pinchStartScale * (dist / pinchStartDist);
      zoomAtPoint(mid.x - stage.getBoundingClientRect().left, mid.y - stage.getBoundingClientRect().top, newScale);
    }
  });
  function endPointer(e) {
    if (e.pointerType !== 'touch') return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      dragging = false;
      const now = Date.now();
      if (now - lastTapTime < 280) {
        const target = Math.abs(scale - fitScale) < 0.02 ? Math.min(MAX_SCALE, fitScale * 2.5) : fitScale;
        const rect = stage.getBoundingClientRect();
        zoomAtPoint((e.clientX ?? rect.width / 2 + rect.left) - rect.left, (e.clientY ?? rect.height / 2 + rect.top) - rect.top, target);
        lastTapTime = 0;
      } else {
        lastTapTime = now;
      }
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  window.addEventListener('resize', () => { if (isOpen) fit(); });

  return { open, openSvg, close, get isOpen() { return isOpen; } };
})();
