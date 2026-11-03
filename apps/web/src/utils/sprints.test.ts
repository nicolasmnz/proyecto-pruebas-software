import { describe, expect, test } from "vitest";

import type { BoardItem } from "../api/board";
import type { Sprint } from "../api/sprints";
import {
  countActiveSprints,
  describeLoad,
  getBacklogItems,
  getSprintItems,
  isOpenSprint,
  sortSprints,
} from "./sprints";

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

function buildSprint(overrides: Partial<Sprint>): Sprint {
  return {
    id: "s1",
    project_id: "p1",
    name: "Sprint",
    goal: null,
    status: "PLANNED",
    start_date: null,
    end_date: null,
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

describe("sortSprints", () => {
  test("ordena por estado y luego por fecha de inicio, sin fecha al final", () => {
    const sorted = sortSprints([
      buildSprint({ id: "cancelado", status: "CANCELLED" }),
      buildSprint({ id: "planificado-sin-fecha" }),
      buildSprint({ id: "completado", status: "COMPLETED" }),
      buildSprint({ id: "planificado-dic", start_date: "2026-12-01" }),
      buildSprint({ id: "activo", status: "ACTIVE" }),
      buildSprint({ id: "planificado-nov", start_date: "2026-11-01" }),
    ]);

    expect(sorted.map(({ id }) => id)).toEqual([
      "activo",
      "planificado-nov",
      "planificado-dic",
      "planificado-sin-fecha",
      "completado",
      "cancelado",
    ]);
  });
});

describe("estado de los sprints", () => {
  test("solo los planificados y activos admiten tareas nuevas", () => {
    expect(isOpenSprint(buildSprint({ status: "PLANNED" }))).toBe(true);
    expect(isOpenSprint(buildSprint({ status: "ACTIVE" }))).toBe(true);
    expect(isOpenSprint(buildSprint({ status: "COMPLETED" }))).toBe(false);
    expect(isOpenSprint(buildSprint({ status: "CANCELLED" }))).toBe(false);
  });

  test("cuenta los sprints activos", () => {
    expect(
      countActiveSprints([
        buildSprint({ status: "ACTIVE" }),
        buildSprint({ status: "PLANNED" }),
        buildSprint({ status: "ACTIVE" }),
      ]),
    ).toBe(2);
  });
});

describe("tareas por sprint", () => {
  const board = {
    columns: [
      {
        status: "TODO" as const,
        items: [
          buildItem({ id: "a" }),
          buildItem({ id: "b", sprint_id: "s1", estimate: 3 }),
        ],
      },
      {
        status: "DONE" as const,
        items: [buildItem({ id: "c", status: "DONE", sprint_id: "s1" })],
      },
    ],
    archived: [
      buildItem({ id: "d", status: "DONE", is_archived: true }),
      buildItem({
        id: "e",
        status: "DONE",
        is_archived: true,
        sprint_id: "s1",
        estimate: 5,
      }),
    ],
  };

  test("el backlog tiene las tareas sin sprint que no están archivadas", () => {
    expect(getBacklogItems(board).map(({ id }) => id)).toEqual(["a"]);
  });

  test("un sprint incluye sus tareas archivadas", () => {
    expect(getSprintItems(board, "s1").map(({ id }) => id)).toEqual([
      "b",
      "c",
      "e",
    ]);
  });

  test("describe la cantidad de tareas y la suma de puntos", () => {
    expect(describeLoad(getSprintItems(board, "s1"))).toBe("3 tareas · 8 pts");
    expect(describeLoad([buildItem({})])).toBe("1 tarea · 0 pts");
    expect(describeLoad([])).toBe("0 tareas · 0 pts");
  });
});
