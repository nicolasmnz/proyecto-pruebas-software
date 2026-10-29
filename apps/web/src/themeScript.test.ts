// @vitest-environment jsdom
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

import { applyTheme, THEME_KEY } from "./utils/theme";
import type { Accent, ThemePreference } from "./utils/theme";

// El script en línea de index.html que aplica el tema antes de cargar la app
const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const inlineScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  ([, code]) => code,
)[0];

function runInlineScript(stored: string | null, prefersDark: boolean) {
  const root = document.documentElement;

  root.removeAttribute("data-theme");
  root.removeAttribute("data-accent");

  if (stored === null) {
    localStorage.removeItem(THEME_KEY);
  } else {
    localStorage.setItem(THEME_KEY, stored);
  }

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: prefersDark })),
  );

  new Function(inlineScript)();

  return {
    theme: root.getAttribute("data-theme"),
    accent: root.getAttribute("data-accent"),
  };
}

const THEMES: ThemePreference[] = ["system", "light", "dark"];
const ACCENTS: Accent[] = ["blue", "green", "purple", "orange"];

describe("script de tema de index.html", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  test("existe", () => {
    expect(inlineScript).toContain("mira.theme");
  });

  test.each(
    THEMES.flatMap((theme) =>
      ACCENTS.flatMap((accent) =>
        [true, false].flatMap((highContrast) =>
          [true, false].map(
            (prefersDark) =>
              [theme, accent, highContrast, prefersDark] as const,
          ),
        ),
      ),
    ),
  )(
    "con %s, acento %s, alto contraste %s y sistema oscuro %s da lo mismo que applyTheme",
    (theme, accent, highContrast, prefersDark) => {
      const settings = { theme, accent, highContrast };
      const expected = document.createElement("html");

      applyTheme(settings, prefersDark, expected);

      expect(runInlineScript(JSON.stringify(settings), prefersDark)).toEqual({
        theme: expected.getAttribute("data-theme"),
        accent: expected.getAttribute("data-accent"),
      });
    },
  );

  test("sin preferencia guardada, o ilegible, sigue al sistema", () => {
    expect(runInlineScript(null, true)).toEqual({
      theme: "dark",
      accent: null,
    });
    expect(runInlineScript("{oscuro", false)).toEqual({
      theme: "light",
      accent: null,
    });
  });
});
