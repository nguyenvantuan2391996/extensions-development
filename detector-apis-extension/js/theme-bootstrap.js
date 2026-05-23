(function () {
  var storageKey = "detector-apis-extension-theme";
  var preference = "light";

  try {
    var stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      preference = stored;
    }
  } catch (error) {
    preference = "light";
  }

  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  var resolvedTheme = preference === "system" ? (prefersDark ? "dark" : "light") : preference;
  var root = document.documentElement;

  root.dataset.themePreference = preference;
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
})();

