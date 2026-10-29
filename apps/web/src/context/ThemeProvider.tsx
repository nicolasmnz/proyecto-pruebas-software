import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  applyTheme,
  readThemeSettings,
  writeThemeSettings,
} from "../utils/theme";
import type { Accent, ThemePreference, ThemeSettings } from "../utils/theme";
import { ThemeContext } from "./themeContext";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_QUERY).matches
  );
}

interface ThemeProviderProps {
  children: ReactNode;
}

function ThemeProvider({ children }: ThemeProviderProps) {
  const [settings, setSettings] = useState(readThemeSettings);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  // «Según el sistema» cambia junto con el sistema operativo
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia(DARK_QUERY);
    const handleChange = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches);

    query.addEventListener("change", handleChange);

    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    applyTheme(settings, prefersDark);
  }, [settings, prefersDark]);

  // Cambia una parte de la preferencia y la guarda
  const update = useCallback((changes: Partial<ThemeSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes };

      writeThemeSettings(next);

      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      setTheme: (theme: ThemePreference) => update({ theme }),
      setAccent: (accent: Accent) => update({ accent }),
      setHighContrast: (highContrast: boolean) => update({ highContrast }),
    }),
    [settings, update],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export default ThemeProvider;
