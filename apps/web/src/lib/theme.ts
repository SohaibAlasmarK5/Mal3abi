export type Theme = "light" | "dark";

export const themeStorageKey = "mal3abi-theme";

/**
 * Runs in <head> before the page paints, so the wrong theme never flashes.
 * Uses the saved choice, otherwise the system setting, and follows system changes
 * until the user picks a theme.
 */
export const themeScript = `(function () {
  var key = ${JSON.stringify(themeStorageKey)};
  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function saved() {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function apply() {
    var choice = saved();
    root.dataset.theme = choice === "light" || choice === "dark" ? choice : media.matches ? "dark" : "light";
  }
  apply();
  media.addEventListener("change", function () { if (!saved()) apply(); });
})();`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  // Switch every color at once instead of animating each element's transition.
  const pause = document.createElement("style");
  pause.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(pause);
  document.documentElement.dataset.theme = theme;
  void getComputedStyle(document.body).backgroundColor;
  requestAnimationFrame(() => pause.remove());
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit.
  }
}
