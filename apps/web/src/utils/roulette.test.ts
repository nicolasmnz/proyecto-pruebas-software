import { describe, expect, test } from "vitest";

import type { BoardItem } from "../api/board";
import { getRouletteOdds, pickSlice } from "./roulette";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: "1",
    item_number: 1,
    is_archived: false,
    parent_id: null,
    sprint_id: null,
    type: "TASK",
    title: "Tarea",
    status: "TODO",
    priority: "MEDIUM",
    estimate: null,
    position: 0,
    due_date: null,
    assignee_id: null,
    assignee_name: null,
    ...overrides,
  };
}

const ana = { id: "u1", name: "Ana" };
const beto = { id: "u2", name: "Beto" };
const carla = { id: "u3", name: "Carla" };

describe("getRouletteOdds", () => {
  test("sin carga todos tienen la misma probabilidad", () => {
    const odds = getRouletteOdds([ana, beto], []);

    expect(odds.map(({ probability }) => probability)).toEqual([0.5, 0.5]);
    expect(odds.map(({ percentage }) => percentage)).toEqual([50, 50]);
  });

  test("quien tiene menos puntos pendientes tiene más probabilidad", () => {
    // Ana: 0 pts (peso 1); Beto: 1 pt (peso 1/2); Carla: 3 pts (peso 1/4)
    const odds = getRouletteOdds(
      [ana, beto, carla],
      [
        buildItem({ assignee_id: "u2", estimate: 1 }),
        buildItem({ assignee_id: "u3", estimate: 3 }),
      ],
    );

    expect(odds.map(({ pendingPoints }) => pendingPoints)).toEqual([0, 1, 3]);
    expect(odds[0].probability).toBeCloseTo(4 / 7);
    expect(odds[1].probability).toBeCloseTo(2 / 7);
    expect(odds[2].probability).toBeCloseTo(1 / 7);
    // 57,1 · 28,6 · 14,3: los porcentajes redondeados suman 100
    expect(odds.map(({ percentage }) => percentage)).toEqual([57, 29, 14]);
  });

  test("una tarea sin estimar cuenta como 1 punto; lo terminado y lo archivado no cuenta", () => {
    const odds = getRouletteOdds(
      [ana],
      [
        buildItem({ assignee_id: "u1" }),
        buildItem({ assignee_id: "u1", estimate: 8, status: "DONE" }),
        buildItem({
          assignee_id: "u1",
          estimate: 5,
          status: "DONE",
          is_archived: true,
        }),
      ],
    );

    expect(odds[0].pendingPoints).toBe(1);
    expect(odds[0].percentage).toBe(100);
  });

  test("los porcentajes siempre suman 100", () => {
    const odds = getRouletteOdds([ana, beto, carla], []);

    expect(odds.map(({ percentage }) => percentage)).toEqual([34, 33, 33]);
  });

  test("sin integrantes no hay sectores", () => {
    expect(getRouletteOdds([], [buildItem({})])).toEqual([]);
  });
});

describe("pickSlice", () => {
  // Ana 4/7 ≈ 0,571 · Beto 2/7 ≈ 0,286 · Carla 1/7 ≈ 0,143
  const odds = getRouletteOdds(
    [ana, beto, carla],
    [
      buildItem({ assignee_id: "u2", estimate: 1 }),
      buildItem({ assignee_id: "u3", estimate: 3 }),
    ],
  );

  test.each([
    [0, "Ana"],
    [0.57, "Ana"],
    [0.58, "Beto"],
    [0.85, "Beto"],
    [0.86, "Carla"],
    [0.9999, "Carla"],
  ])("con azar %s sale %s", (random, name) => {
    expect(pickSlice(odds, () => random).member.name).toBe(name);
  });

  test("sin participantes no se puede girar", () => {
    expect(() => pickSlice([])).toThrow("La ruleta no tiene participantes");
  });
});
