// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { contrastRatio } from "./utils/contrast";

// Vitest entrega vacío el CSS importado: se lee el archivo tal cual
const css = readFileSync(new URL("./themes.css", import.meta.url), "utf8");

type Tokens = Record<string, string>;

// Variables de cada bloque de themes.css, por selector
function parseBlocks(source: string): Map<string, Tokens> {
  const blocks = new Map<string, Tokens>();
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");

  for (const [, selector, body] of withoutComments.matchAll(
    /([^{}]+)\{([^{}]*)\}/g,
  )) {
    const tokens: Tokens = {};

    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      tokens[name] = value.trim();
    }

    blocks.set(selector.trim(), tokens);
  }

  return blocks;
}

const blocks = parseBlocks(css);

function block(selector: string): Tokens {
  const tokens = blocks.get(selector);

  if (!tokens) {
    throw new Error(`Falta el bloque ${selector} en themes.css`);
  }

  return tokens;
}

const light = block(":root");
const dark = { ...light, ...block(':root[data-theme="dark"]') };
const contrast = { ...light, ...block(':root[data-theme="contrast"]') };
const contrastDark = {
  ...light,
  ...block(':root[data-theme="contrast-dark"]'),
};
const ACCENTS = ["green", "purple", "orange"];

// Cada tema combinado como lo ve el navegador
const THEMES: [string, Tokens, number][] = [
  ["claro", light, 4.5],
  ["oscuro", dark, 4.5],
  ["alto contraste", contrast, 7],
  ["alto contraste oscuro", contrastDark, 7],
  ...ACCENTS.flatMap((accent): [string, Tokens, number][] => [
    [
      `claro con acento ${accent}`,
      { ...light, ...block(`:root[data-accent="${accent}"]`) },
      4.5,
    ],
    [
      `oscuro con acento ${accent}`,
      {
        ...dark,
        ...block(`:root[data-theme="dark"][data-accent="${accent}"]`),
      },
      4.5,
    ],
  ]),
];

// Texto sobre el fondo en que realmente aparece en la aplicación
const TEXT_PAIRS: [string, string][] = [
  ["--color-text", "--color-bg"],
  ["--color-text", "--color-surface"],
  ["--color-text", "--color-neutral"],
  ["--color-text-strong", "--color-surface"],
  ["--color-text-secondary", "--color-surface"],
  ["--color-text-secondary", "--color-neutral"],
  ["--color-text-subtle", "--color-surface"],
  ["--color-text-subtle", "--color-neutral"],
  ["--color-text-subtle", "--color-surface-subtle"],
  ["--color-text-secondary", "--color-chip"],
  ["--color-accent", "--color-surface"],
  ["--color-accent", "--color-accent-subtle"],
  ["--color-accent-strong", "--color-accent-subtle"],
  ["--color-text", "--color-accent-subtle"],
  ["--color-text-secondary", "--color-accent-subtle"],
  ["--color-on-accent", "--color-accent"],
  ["--color-on-accent", "--color-accent-hover"],
  ["--color-danger-text", "--color-surface"],
  ["--color-danger-text", "--color-danger-subtle"],
  ["--color-danger-text", "--color-danger-surface"],
  ["--color-on-danger", "--color-danger"],
  ["--color-on-danger", "--color-danger-hover"],
  ["--color-success-text", "--color-success-subtle"],
  ["--color-warning-text", "--color-warning-subtle"],
  ["--color-warning-text", "--color-warning-surface"],
  ["--color-epic", "--color-surface"],
];

describe("contrastRatio", () => {
  test("negro sobre blanco es 21:1 y un color consigo mismo 1:1", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21);
    expect(contrastRatio("#0c66e4", "#0c66e4")).toBeCloseTo(1);
  });

  test("rechaza lo que no es un color hexadecimal", () => {
    expect(() => contrastRatio("azul", "#fff")).toThrow("Color no válido");
  });
});

describe("temas", () => {
  test.each([
    ':root[data-theme="dark"]',
    ':root[data-theme="contrast"]',
    ':root[data-theme="contrast-dark"]',
  ])("%s define todas las variables del tema claro", (selector) => {
    expect(Object.keys(block(selector))).toEqual(
      expect.arrayContaining(Object.keys(light)),
    );
  });

  describe.each(THEMES)("tema %s", (_name, tokens, minimum) => {
    test.each(TEXT_PAIRS)(
      `%s sobre %s cumple ${minimum}:1`,
      (foreground, background) => {
        expect(
          contrastRatio(tokens[foreground], tokens[background]),
        ).toBeGreaterThanOrEqual(minimum);
      },
    );
  });
});
