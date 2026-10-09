import { describe, expect, test } from "vitest";

import type { BoardItem } from "../api/board";
import {
  EMPTY_FILTERS,
  NO_ASSIGNEE,
  hasActiveFilters,
  matchesFilters,
} from "./boardFilters";

const item: BoardItem = {
  id: "1",
  item_number: 12,
  is_archived: false,
  type: "BUG",
  title: "Corregir autenticación",
  status: "TODO",
  priority: "HIGH",
  estimate: null,
  position: 0,
  due_date: null,
  assignee_id: "u1",
  assignee_name: "Ana",
};

describe("matchesFilters", () => {
  test("sin filtros coincide todo", () => {
    expect(matchesFilters(item, EMPTY_FILTERS)).toBe(true);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  test("busca en el título sin distinguir tildes ni mayúsculas", () => {
    expect(
      matchesFilters(item, { ...EMPTY_FILTERS, query: "AUTENTICACION" }),
    ).toBe(true);
    expect(
      matchesFilters(item, { ...EMPTY_FILTERS, query: "  corregir " }),
    ).toBe(true);
    expect(matchesFilters(item, { ...EMPTY_FILTERS, query: "login" })).toBe(
      false,
    );
  });

  test("busca por número exacto, con o sin #", () => {
    expect(matchesFilters(item, { ...EMPTY_FILTERS, query: "#12" })).toBe(true);
    expect(matchesFilters(item, { ...EMPTY_FILTERS, query: "12" })).toBe(true);
    // 1 y 2 no deben coincidir con el #12
    expect(matchesFilters(item, { ...EMPTY_FILTERS, query: "1" })).toBe(false);
    expect(matchesFilters(item, { ...EMPTY_FILTERS, query: "#2" })).toBe(false);
  });

  test("filtra por tipo, prioridad y responsable", () => {
    expect(matchesFilters(item, { ...EMPTY_FILTERS, type: "BUG" })).toBe(true);
    expect(matchesFilters(item, { ...EMPTY_FILTERS, type: "TASK" })).toBe(
      false,
    );
    expect(matchesFilters(item, { ...EMPTY_FILTERS, priority: "LOW" })).toBe(
      false,
    );
    expect(matchesFilters(item, { ...EMPTY_FILTERS, assignee: "u1" })).toBe(
      true,
    );
    expect(matchesFilters(item, { ...EMPTY_FILTERS, assignee: "u2" })).toBe(
      false,
    );
    expect(
      matchesFilters(item, { ...EMPTY_FILTERS, assignee: NO_ASSIGNEE }),
    ).toBe(false);
    expect(
      matchesFilters(
        { ...item, assignee_id: null },
        { ...EMPTY_FILTERS, assignee: NO_ASSIGNEE },
      ),
    ).toBe(true);
  });

  test("todos los criterios deben cumplirse a la vez", () => {
    const filters = {
      query: "corregir",
      type: "BUG",
      priority: "HIGH",
      assignee: "u1",
    };

    expect(matchesFilters(item, filters)).toBe(true);
    expect(matchesFilters(item, { ...filters, priority: "LOW" })).toBe(false);
    expect(hasActiveFilters(filters)).toBe(true);
  });
});
