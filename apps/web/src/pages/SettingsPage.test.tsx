import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import SettingsPage from "./SettingsPage";
import ThemeProvider from "../context/ThemeProvider";
import { THEME_KEY } from "../utils/theme";

// matchMedia simulado: el modo del sistema se puede cambiar durante el test
function mockSystemTheme(initiallyDark: boolean) {
  let matches = initiallyDark;
  const listeners = new Set<(event: { matches: boolean }) => void>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (
        _: string,
        listener: (event: { matches: boolean }) => void,
      ) => listeners.add(listener),
      removeEventListener: (
        _: string,
        listener: (event: { matches: boolean }) => void,
      ) => listeners.delete(listener),
    })),
  );

  return (dark: boolean) => {
    matches = dark;
    act(() => listeners.forEach((listener) => listener({ matches: dark })));
  };
}

function renderPage() {
  render(
    <ThemeProvider>
      <SettingsPage />
    </ThemeProvider>,
  );
}

const root = document.documentElement;

function saved() {
  return JSON.parse(localStorage.getItem(THEME_KEY) ?? "null");
}

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute("data-theme");
    root.removeAttribute("data-accent");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("por defecto sigue al sistema con el acento azul", () => {
    mockSystemTheme(true);

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Configuración" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Según el sistema/ }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Azul" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Alto contraste/ }),
    ).not.toBeChecked();
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.accent).toBeUndefined();
  });

  test("con «Según el sistema» cambia sola cuando cambia el sistema", () => {
    const setSystemDark = mockSystemTheme(false);

    renderPage();

    expect(root.dataset.theme).toBe("light");

    setSystemDark(true);

    expect(root.dataset.theme).toBe("dark");
  });

  test("elegir un tema lo aplica al instante y lo guarda", async () => {
    const user = userEvent.setup();
    const setSystemDark = mockSystemTheme(false);

    renderPage();

    await user.click(screen.getByRole("radio", { name: /^Oscuro/ }));

    expect(root.dataset.theme).toBe("dark");
    expect(saved()).toEqual({
      theme: "dark",
      accent: "blue",
      highContrast: false,
    });

    // Un tema elegido a mano no sigue al sistema
    setSystemDark(false);

    expect(root.dataset.theme).toBe("dark");

    await user.click(screen.getByRole("radio", { name: /^Claro/ }));

    expect(root.dataset.theme).toBe("light");
  });

  test("elegir un acento lo aplica y lo guarda", async () => {
    const user = userEvent.setup();

    mockSystemTheme(false);
    renderPage();

    await user.click(screen.getByRole("radio", { name: "Naranja" }));

    expect(root.dataset.accent).toBe("orange");
    expect(saved()).toEqual({
      theme: "system",
      accent: "orange",
      highContrast: false,
    });

    await user.click(screen.getByRole("radio", { name: "Azul" }));

    expect(root.dataset.accent).toBeUndefined();
  });

  test("alto contraste usa su propio acento y deshabilita la elección", async () => {
    const user = userEvent.setup();

    mockSystemTheme(false);
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ theme: "light", accent: "green", highContrast: false }),
    );
    renderPage();

    expect(root.dataset.accent).toBe("green");

    await user.click(screen.getByRole("checkbox", { name: /Alto contraste/ }));

    expect(root.dataset.theme).toBe("contrast");
    expect(root.dataset.accent).toBeUndefined();
    expect(saved()).toEqual({
      theme: "light",
      accent: "green",
      highContrast: true,
    });

    const accents = screen.getByRole("group", { name: "Color de acento" });

    expect(accents).toBeDisabled();
    expect(accents).toHaveAccessibleDescription(
      "El alto contraste usa su propio color de acento.",
    );
    // El acento elegido se conserva para cuando se quite el alto contraste
    expect(screen.getByRole("radio", { name: "Verde" })).toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: /Alto contraste/ }));

    expect(root.dataset.theme).toBe("light");
    expect(root.dataset.accent).toBe("green");
  });

  test("el alto contraste es oscuro con el tema oscuro y sigue al sistema", async () => {
    const user = userEvent.setup();
    const setSystemDark = mockSystemTheme(false);

    renderPage();

    await user.click(screen.getByRole("checkbox", { name: /Alto contraste/ }));

    expect(root.dataset.theme).toBe("contrast");

    // De noche, con «Según el sistema», pasa solo a blanco sobre negro
    setSystemDark(true);

    expect(root.dataset.theme).toBe("contrast-dark");

    await user.click(screen.getByRole("radio", { name: /^Claro/ }));

    expect(root.dataset.theme).toBe("contrast");

    await user.click(screen.getByRole("radio", { name: /^Oscuro/ }));

    expect(root.dataset.theme).toBe("contrast-dark");
  });

  test("muestra la preferencia guardada", () => {
    mockSystemTheme(false);
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ theme: "dark", accent: "purple", highContrast: true }),
    );

    renderPage();

    expect(screen.getByRole("radio", { name: /^Oscuro/ })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Alto contraste/ }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Morado" })).toBeChecked();
    expect(root.dataset.theme).toBe("contrast-dark");
  });
});
