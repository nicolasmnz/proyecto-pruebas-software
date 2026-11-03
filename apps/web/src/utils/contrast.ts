// Contraste entre dos colores según WCAG 2.x (de 1:1 a 21:1)

function parseHex(color: string): [number, number, number] {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Color no válido: ${color}`);
  }

  return [0, 2, 4].map((start) =>
    parseInt(full.slice(start, start + 2), 16),
  ) as [number, number, number];
}

function relativeLuminance(color: string): number {
  const [r, g, b] = parseHex(color).map((value) => {
    const channel = value / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}
