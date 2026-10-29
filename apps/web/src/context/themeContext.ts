import { createContext, useContext } from "react";

import { DEFAULT_THEME_SETTINGS } from "../utils/theme";
import type { Accent, ThemePreference, ThemeSettings } from "../utils/theme";

export interface ThemeContextValue extends ThemeSettings {
  setTheme: (theme: ThemePreference) => void;
  setAccent: (accent: Accent) => void;
  setHighContrast: (highContrast: boolean) => void;
}

// Sin provider se usan los valores por defecto (p. ej. en tests)
export const ThemeContext = createContext<ThemeContextValue>({
  ...DEFAULT_THEME_SETTINGS,
  setTheme: () => {},
  setAccent: () => {},
  setHighContrast: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
