(() => {
  const THEME_KEY = "auraliq.web.theme";
  const SCANLINE_KEY = "auraliq.web.scanlines";

  const root = document.documentElement;
  const themeButtons = document.querySelectorAll("[data-set-theme]");
  const scanlineBtn = document.querySelector("[data-toggle-scanlines]");

  function applyTheme(themeId) {
    if (themeId === "midnight-cassette") {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = themeId;
    }
    themeButtons.forEach((btn) => {
      const active = btn.getAttribute("data-set-theme") === themeId;
      btn.classList.toggle("aq-btn--active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    try {
      localStorage.setItem(THEME_KEY, themeId);
    } catch {
      // Ignore storage errors
    }
  }

  function applyScanlines(enabled) {
    root.dataset.scanlines = enabled ? "on" : "off";
    if (scanlineBtn) {
      scanlineBtn.textContent = enabled ? "CRT Scanlines: On" : "CRT Scanlines: Off";
      scanlineBtn.classList.toggle("aq-btn--active", enabled);
      scanlineBtn.setAttribute("aria-pressed", String(enabled));
    }
    try {
      localStorage.setItem(SCANLINE_KEY, enabled ? "on" : "off");
    } catch {
      // Ignore storage errors
    }
  }

  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-set-theme") || "midnight-cassette";
      applyTheme(id);
    });
  });

  if (scanlineBtn) {
    scanlineBtn.addEventListener("click", () => {
      const currentlyOn = root.dataset.scanlines !== "off";
      applyScanlines(!currentlyOn);
    });
  }

  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      applyTheme(savedTheme);
    }
    const savedScan = localStorage.getItem(SCANLINE_KEY);
    applyScanlines(savedScan !== "off");
  } catch {
    applyScanlines(true);
  }
})();
