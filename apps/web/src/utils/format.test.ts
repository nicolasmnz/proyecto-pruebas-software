import { describe, expect, test } from "vitest";

import { formatDueDate } from "./format";

describe("formatDueDate", () => {
  test("muestra el mismo día calendario que la fecha recibida", () => {
    // Un 1 de enero interpretado como UTC se vería como 31 de diciembre en
    // husos al oeste de Greenwich
    expect(formatDueDate("2026-01-01")).toMatch(/^1 /);
    expect(formatDueDate("2026-12-31")).toMatch(/^31 /);
  });

  test("ignora la hora si la fecha viene como timestamp", () => {
    expect(formatDueDate("2026-10-31T00:00:00.000Z")).toMatch(/^31 /);
  });
});
