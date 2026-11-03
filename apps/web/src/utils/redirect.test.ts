import { describe, expect, test } from "vitest";

import { getRedirectTarget } from "./redirect";

describe("getRedirectTarget", () => {
  test("sin destino vuelve al listado de proyectos", () => {
    expect(getRedirectTarget(null)).toBe("/projects");
    expect(getRedirectTarget("")).toBe("/projects");
  });

  test("acepta rutas internas con su búsqueda", () => {
    expect(getRedirectTarget("/projects/abc/board?q=login")).toBe(
      "/projects/abc/board?q=login",
    );
  });

  test.each([
    "https://otro.sitio",
    "//otro.sitio",
    "/\\otro.sitio",
    "proyectos",
  ])("rechaza %s porque no es una ruta interna", (redirect) => {
    expect(getRedirectTarget(redirect)).toBe("/projects");
  });

  test("no vuelve al propio login", () => {
    expect(getRedirectTarget("/login?redirect=/projects")).toBe("/projects");
  });
});
