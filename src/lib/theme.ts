export type AppTheme = "dark" | "light" | "system";

const THEME_STORAGE_KEY = "bucklist_theme_preference_v1";

export function getStoredTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") {
      return raw;
    }
  } catch {
    // ignore
  }
  return "dark";
}

export function saveStoredTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

export function resolveEffectiveTheme(theme: AppTheme): "dark" | "light" {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  }
  return theme;
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  const effective = resolveEffectiveTheme(theme);
  const root = document.documentElement;

  root.setAttribute("data-theme", effective);
  root.setAttribute("data-color-scheme", effective);

  if (effective === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
}
