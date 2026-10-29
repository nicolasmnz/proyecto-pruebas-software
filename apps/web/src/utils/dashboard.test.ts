import { describe, expect, test } from "vitest";

import type { BoardItem } from "../api/board";
import type { Sprint } from "../api/sprints";
import { canManageProject } from "../api/members";
import {
  daysBetween,
  describeSprintTiming,
  getActiveSprints,
  getMemberLoad,
  getOverdueItems,
  isPendingItem,
} from "./dashboard";

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
    status: "ACTIVE",
    start_date: null,
    end_date: null,
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

const ana = { id: "u1", name: "Ana" };
const beto = { id: "u2", name: "Beto" };
const carla = { id: "u3", name: "Carla" };

describe("isPendingItem", () => {
  test("pendiente es lo que no está terminado ni archivado", () => {
    expect(isPendingItem(buildItem({ status: "TODO" }))).toBe(true);
    expect(isPendingItem(buildItem({ status: "IN_PROGRESS" }))).toBe(true);
    expect(isPendingItem(buildItem({ status: "DONE" }))).toBe(false);
    expect(
      isPendingItem(buildItem({ status: "DONE", is_archived: true })),
    ).toBe(false);
  });
});

describe("daysBetween", () => {
  test("cuenta días de calendario, también entre meses", () => {
    expect(daysBetween("2026-10-29", "2026-10-29")).toBe(0);
    expect(daysBetween("2026-10-29", "2026-11-02")).toBe(4);
    expect(daysBetween("2026-10-29", "2026-10-26")).toBe(-3);
  });
});

describe("getMemberLoad", () => {
  const items = [
    buildItem({
      id: "a",
      assignee_id: "u1",
      assignee_name: "Ana",
      estimate: 3,
    }),
    buildItem({
      id: "b",
      assignee_id: "u1",
      assignee_name: "Ana",
      estimate: 2,
    }),
    buildItem({
      id: "c",
      assignee_id: "u2",
      assignee_name: "Beto",
      estimate: 8,
    }),
    // Lo terminado y lo archivado no es carga
    buildItem({
      id: "d",
      assignee_id: "u3",
      assignee_name: "Carla",
      status: "DONE",
      estimate: 5,
    }),
    buildItem({
      id: "e",
      assignee_id: "u3",
      is_archived: true,
      status: "DONE",
    }),
    buildItem({ id: "f", estimate: 1 }),
    buildItem({ id: "g" }),
  ];

  test("suma tareas y puntos pendientes por integrante, de mayor a menor carga", () => {
    const { members } = getMemberLoad(items, [ana, beto, carla]);

    expect(members).toEqual([
      { id: "u2", name: "Beto", tasks: 1, points: 8 },
      { id: "u1", name: "Ana", tasks: 2, points: 5 },
      { id: "u3", name: "Carla", tasks: 0, points: 0 },
    ]);
  });

  test("separa lo que no tiene responsable", () => {
    expect(getMemberLoad(items, [ana]).unassigned).toEqual({
      id: null,
      name: "Sin asignar",
      tasks: 2,
      points: 1,
    });
  });

  test("incluye a responsables que ya no son miembros", () => {
    const { members } = getMemberLoad(
      [buildItem({ assignee_id: "u9", assignee_name: "Exintegrante" })],
      [ana],
    );

    expect(members).toEqual([
      { id: "u9", name: "Exintegrante", tasks: 1, points: 0 },
      { id: "u1", name: "Ana", tasks: 0, points: 0 },
    ]);
  });
});

describe("getOverdueItems", () => {
  const today = "2026-10-29";

  test("lista las pendientes con fecha pasada, de la más atrasada", () => {
    const overdue = getOverdueItems(
      [
        buildItem({ id: "ayer", item_number: 2, due_date: "2026-10-28" }),
        buildItem({ id: "hoy", item_number: 3, due_date: today }),
        buildItem({ id: "mes", item_number: 4, due_date: "2026-09-29" }),
        buildItem({
          id: "hecha",
          item_number: 5,
          due_date: "2026-09-01",
          status: "DONE",
        }),
        buildItem({ id: "sin-fecha", item_number: 6 }),
      ],
      today,
    );

    expect(overdue.map(({ item, daysLate }) => [item.id, daysLate])).toEqual([
      ["mes", 30],
      ["ayer", 1],
    ]);
  });
});

describe("getActiveSprints", () => {
  test("solo los activos, del que empezó antes", () => {
    const sprints = [
      buildSprint({ id: "b", start_date: "2026-10-10" }),
      buildSprint({ id: "plan", status: "PLANNED", start_date: "2026-09-01" }),
      buildSprint({ id: "a", start_date: "2026-10-01" }),
    ];

    expect(getActiveSprints(sprints).map(({ id }) => id)).toEqual(["a", "b"]);
  });
});

describe("describeSprintTiming", () => {
  const today = "2026-10-29";

  test("los días que quedan, en singular o plural", () => {
    expect(describeSprintTiming({ end_date: "2026-11-01" }, today)).toEqual({
      text: "Quedan 3 días",
      isLate: false,
    });
    expect(describeSprintTiming({ end_date: "2026-10-30" }, today).text).toBe(
      "Queda 1 día",
    );
    expect(describeSprintTiming({ end_date: today }, today).text).toBe(
      "Termina hoy",
    );
  });

  test("si pasó la fecha de término, está atrasado", () => {
    expect(describeSprintTiming({ end_date: "2026-10-10" }, today)).toEqual({
      text: "Atrasado: debía terminar hace 19 días",
      isLate: true,
    });
  });

  test("sin fecha de término no hay plazo", () => {
    expect(describeSprintTiming({ end_date: null }, today).text).toBe(
      "Sin fecha de término",
    );
  });
});

describe("canManageProject", () => {
  test("solo el dueño y los jefes de proyecto", () => {
    expect(canManageProject("OWNER")).toBe(true);
    expect(canManageProject("ADMIN")).toBe(true);
    expect(canManageProject("MEMBER")).toBe(false);
    expect(canManageProject("VIEWER")).toBe(false);
    expect(canManageProject(null)).toBe(false);
  });
});
