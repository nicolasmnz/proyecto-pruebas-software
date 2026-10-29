import { describe, expect, test } from "vitest";

import type { AssignedItem } from "../api/myTasks";
import { getLocalToday, groupByProject, isOverdue, isPending } from "./myTasks";

function buildItem(overrides: Partial<AssignedItem> = {}): AssignedItem {
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
    assignee_id: "u1",
    assignee_name: "Ana",
    project_id: "p1",
    project_name: "Web",
    ...overrides,
  };
}

describe("getLocalToday", () => {
  test("usa la fecha local con ceros a la izquierda", () => {
    expect(getLocalToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("isOverdue", () => {
  const today = "2026-10-29";

  test("una tarea pendiente con fecha anterior a hoy está vencida", () => {
    expect(isOverdue(buildItem({ due_date: "2026-10-28" }), today)).toBe(true);
  });

  test("vence hoy o después: no está vencida", () => {
    expect(isOverdue(buildItem({ due_date: today }), today)).toBe(false);
    expect(isOverdue(buildItem({ due_date: "2026-11-01" }), today)).toBe(false);
  });

  test("sin fecha o terminada: no está vencida", () => {
    expect(isOverdue(buildItem(), today)).toBe(false);
    expect(
      isOverdue(buildItem({ due_date: "2026-01-01", status: "DONE" }), today),
    ).toBe(false);
  });
});

describe("isPending", () => {
  test("solo las terminadas dejan de estar pendientes", () => {
    expect(isPending(buildItem({ status: "TODO" }))).toBe(true);
    expect(isPending(buildItem({ status: "IN_PROGRESS" }))).toBe(true);
    expect(isPending(buildItem({ status: "DONE" }))).toBe(false);
  });
});

describe("groupByProject", () => {
  test("agrupa por proyecto en el orden de su tarea más urgente", () => {
    const items = [
      buildItem({ id: "a", project_id: "p2", project_name: "App" }),
      buildItem({ id: "b", project_id: "p1", project_name: "Web" }),
      buildItem({ id: "c", project_id: "p2", project_name: "App" }),
    ];

    const groups = groupByProject(items);

    expect(groups.map((group) => group.projectName)).toEqual(["App", "Web"]);
    expect(groups[0].items.map((item) => item.id)).toEqual(["a", "c"]);
    expect(groups[1]).toMatchObject({ projectId: "p1", items: [items[1]] });
  });

  test("sin tareas no hay grupos", () => {
    expect(groupByProject([])).toEqual([]);
  });
});
