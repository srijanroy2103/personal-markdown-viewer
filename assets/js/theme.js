/* Theme, font-size, content-width, sidebar/outline persistence. */
const Theme = (() => {
  const STORE_KEY = 'mdviewer.prefs.v1';

  const defaults = {
    theme: 'system', // 'light' | 'dark' | 'system'
    fontSize: 16,
    contentWidth: 'normal', // 'narrow' | 'normal' | 'wide'
    sidebarCollapsed: false,
    outlineCollapsed: false,
    sidebarWidth: 268,
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { ...defaults };
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return { ...defaults };
    }
  }

  let prefs = load();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable, non-fatal */ }
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }

  function applyFontSize() {
    document.documentElement.style.setProperty('--reading-font-size', prefs.fontSize + 'px');
  }

  function applyContentWidth() {
    const inner = document.getElementById('content-inner');
    if (inner) inner.style.setProperty('--content-width', `var(--content-width-${prefs.contentWidth})`);
  }

  function get(key) { return prefs[key]; }
  function set(key, value) {
    prefs[key] = value;
    save();
    if (key === 'theme') applyTheme();
    if (key === 'fontSize') applyFontSize();
    if (key === 'contentWidth') applyContentWidth();
  }

  function init() {
    applyTheme();
    applyFontSize();
    applyContentWidth();
  }

  return { get, set, init, defaults };
})();
