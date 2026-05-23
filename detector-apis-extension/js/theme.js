const ThemeProvider = (() => {
  const STORAGE_KEY = "detector-apis-extension-theme";
  const DEFAULT_THEME = "light";
  const AVAILABLE_THEMES = ["light", "dark", "system"];
  const mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function isValidTheme(theme) {
    return AVAILABLE_THEMES.includes(theme);
  }

  function getStoredTheme() {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);
      return isValidTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
    } catch (error) {
      console.log(error);
      return DEFAULT_THEME;
    }
  }

  function resolveTheme(themePreference) {
    if (themePreference === "system") {
      return mediaQuery && mediaQuery.matches ? "dark" : "light";
    }

    return themePreference;
  }

  function persistTheme(themePreference) {
    try {
      localStorage.setItem(STORAGE_KEY, themePreference);
    } catch (error) {
      console.log(error);
    }
  }

  function updateThemeUI(themePreference, resolvedTheme) {
    const themeButtons = document.querySelectorAll("[data-theme-choice]");
    const themeStatus = document.getElementById("theme-status");

    for (const button of themeButtons) {
      const isActive = button.dataset.themeChoice === themePreference;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }

    if (!themeStatus) {
      return;
    }

    if (themePreference === "system") {
      themeStatus.textContent = `System · ${capitalize(resolvedTheme)}`;
      return;
    }

    themeStatus.textContent = `${capitalize(themePreference)} mode`;
  }

  function applyTheme(themePreference, options = {}) {
    const nextThemePreference = isValidTheme(themePreference) ? themePreference : DEFAULT_THEME;
    const resolvedTheme = resolveTheme(nextThemePreference);
    const root = document.documentElement;

    root.dataset.themePreference = nextThemePreference;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;

    if (options.persist !== false) {
      persistTheme(nextThemePreference);
    }

    updateThemeUI(nextThemePreference, resolvedTheme);
  }

  function handleSystemThemeChange() {
    if ((document.documentElement.dataset.themePreference || DEFAULT_THEME) === "system") {
      applyTheme("system", { persist: false });
    }
  }

  function registerEvents() {
    const themeButtons = document.querySelectorAll("[data-theme-choice]");
    for (const button of themeButtons) {
      button.addEventListener("click", function () {
        applyTheme(button.dataset.themeChoice);
      });
    }

    if (mediaQuery && typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else if (mediaQuery && typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleSystemThemeChange);
    }
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function init() {
    applyTheme(document.documentElement.dataset.themePreference || getStoredTheme(), { persist: false });
    registerEvents();
    document.documentElement.classList.add("theme-ready");
  }

  return {
    init,
  };
})();

window.ThemeProvider = ThemeProvider;

window.addEventListener("load", function () {
  ThemeProvider.init();
}, { once: true });

