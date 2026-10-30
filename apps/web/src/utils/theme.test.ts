import { beforeEach, describe, expect, test } from "vitest";

import {
  applyTheme,
  DEFAULT_THEME_SETTINGS,
  readThemeSettings,
  resolveTheme,
  THEME_KEY,
  writeThemeSettings,
} from "./theme";

describe("readThemeSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("sin preferencia guardada sigue al sistema con el acento azul", () => {
    expect(readThemeSettings()).toEqual(DEFAULT_THEME_SETTINGS);
    expect(DEFAULT_THEME_SETTINGS).toEqual({
      theme: "system",
      accent: "blue",
      highContrast: false,
    });
  });

  test("lee lo guardado", () => {
    writeThemeSettings({ theme: "dark", accent: "green", highContrast: true });

    expect(readThemeSettings()).toEqual({
      theme: "dark",
      accent: "green",
      highContrast: true,
    });
  });

  test("ignora valores que no conoce y conserva los válidos", () => {
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ theme: "sepia", accent: "purple", highContrast: "sí" }),
    );

    expect(readThemeSettings()).toEqual({
      theme: "system",
      accent: "purple",
      highContrast: false,
    });
  });

  test("con datos que no son JSON usa los valores por defecto", () => {
    localStorage.setItem(THEME_KEY, "{oscuro");

    expect(readThemeSettings()).toEqual(DEFAULT_THEME_SETTINGS);
  });
});

describe("resolveTheme", () => {
  test("«Según el sistema» toma el modo del sistema", () => {
    expect(resolveTheme({ theme: "system", highContrast: false }, true)).toBe(
      "dark",
    );
    expect(resolveTheme({ theme: "system", highContrast: false }, false)).toBe(
      "light",
    );
  });

  test("claro y oscuro no dependen del sistema", () => {
    expect(resolveTheme({ theme: "light", highContrast: false }, true)).toBe(
      "light",
    );
    expect(resolveTheme({ theme: "dark", highContrast: false }, false)).toBe(
      "dark",
    );
  });

  test("el alto contraste es claro u oscuro según el tema", () => {
    expect(resolveTheme({ theme: "light", highContrast: true }, true)).toBe(
      "contrast",
    );
    expect(resolveTheme({ theme: "dark", highContrast: true }, false)).toBe(
      "contrast-dark",
    );
    expect(resolveTheme({ theme: "system", highContrast: true }, false)).toBe(
      "contrast",
    );
    expect(resolveTheme({ theme: "system", highContrast: true }, true)).toBe(
      "contrast-dark",
    );
  });
});

describe("applyTheme", () => {
  test("marca el tema y el acento en el elemento raíz", () => {
    const root = document.createElement("html");

    applyTheme(
      { theme: "system", accent: "orange", highContrast: false },
      true,
      root,
    );

    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.accent).toBe("orange");
  });

  test("el azul y el alto contraste no marcan acento", () => {
    const root = document.createElement("html");

    root.dataset.accent = "green";
    applyTheme(
      { theme: "light", accent: "blue", highContrast: false },
      false,
      root,
    );

    expect(root.dataset.accent).toBeUndefined();

    applyTheme(
      { theme: "dark", accent: "green", highContrast: true },
      false,
      root,
    );

    expect(root.dataset.theme).toBe("contrast-dark");
    expect(root.dataset.accent).toBeUndefined();
  });
});
