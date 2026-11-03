// Preferencia de tema y acento del usuario. index.html repite applyTheme en
// un script en línea para aplicarla antes de que cargue la app (sin parpadeo):
// si cambian las reglas de aquí, hay que cambiarlas también allí

export type ThemePreference = "system" | "light" | "dark";
export type Accent = "blue" | "green" | "purple" | "orange";
export type ResolvedTheme = "light" | "dark" | "contrast" | "contrast-dark";

export interface ThemeSettings {
  theme: ThemePreference;
  accent: Accent;
  // Se aplica sobre el tema: claro u oscuro, también con «Según el sistema»
  highContrast: boolean;
}

export const THEME_KEY = "mira.theme";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: "system",
  accent: "blue",
  highContrast: false,
};

const THEMES: ThemePreference[] = ["system", "light", "dark"];
const ACCENTS: Accent[] = ["blue", "green", "purple", "orange"];

// localStorage puede fallar o tener datos de otra versión: se usa lo que sirva
export function readThemeSettings(): ThemeSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(THEME_KEY) ?? "null");

    return {
      theme: THEMES.includes(stored?.theme)
        ? stored.theme
        : DEFAULT_THEME_SETTINGS.theme,
      accent: ACCENTS.includes(stored?.accent)
        ? stored.accent
        : DEFAULT_THEME_SETTINGS.accent,
      highContrast: stored?.highContrast === true,
    };
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

export function writeThemeSettings(settings: ThemeSettings) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(settings));
  } catch {
    // Sin almacenamiento, la elección dura hasta recargar la página
  }
}

export function resolveTheme(
  { theme, highContrast }: Pick<ThemeSettings, "theme" | "highContrast">,
  prefersDark: boolean,
): ResolvedTheme {
  const mode = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  if (!highContrast) {
    return mode;
  }

  return mode === "dark" ? "contrast-dark" : "contrast";
}

// Marca en <html> el tema y el acento que usa themes.css. El azul es el de
// base y alto contraste tiene su propio acento: en esos casos no se marca
export function applyTheme(
  settings: ThemeSettings,
  prefersDark: boolean,
  root: HTMLElement = document.documentElement,
) {
  root.dataset.theme = resolveTheme(settings, prefersDark);

  if (settings.highContrast || settings.accent === "blue") {
    delete root.dataset.accent;
  } else {
    root.dataset.accent = settings.accent;
  }
}
