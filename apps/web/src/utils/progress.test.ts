import { describe, expect, test } from "vitest";

import type { BoardItem } from "../api/board";
import {
  describeProgress,
  getAllItems,
  getEpicItems,
  getProgress,
} from "./progress";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
  return {
    id: "1",
    item_number: 1,
    is_archived: false,
    parent_id: null,
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

describe("getProgress", () => {
  test("sin tareas el avance es 0 %", () => {
    expect(getProgress([])).toMatchObject({ done: 0, total: 0, percentage: 0 });
  });

  test("sin estimaciones pesa por cantidad de tareas", () => {
    const progress = getProgress([
      buildItem({ status: "DONE" }),
      buildItem({ status: "IN_PROGRESS" }),
      buildItem({ status: "TODO" }),
    ]);

    expect(progress).toMatchObject({
      done: 1,
      total: 3,
      usesPoints: false,
      percentage: 33,
    });
    expect(describeProgress(progress)).toBe("1 de 3 tareas hechas · 33 %");
  });

  test("con estimaciones pesa por puntos y cuenta las archivadas como hechas", () => {
    const progress = getProgress([
      buildItem({ status: "DONE", is_archived: true, estimate: 3 }),
      buildItem({ status: "TODO", estimate: 1 }),
    ]);

    expect(progress).toMatchObject({
      done: 1,
      donePoints: 3,
      totalPoints: 4,
      percentage: 75,
    });
    expect(describeProgress(progress)).toBe(
      "1 de 2 tareas hechas · 3 de 4 pts · 75 %",
    );
  });

  test("usa el singular con una sola tarea", () => {
    expect(describeProgress(getProgress([buildItem({})]))).toBe(
      "0 de 1 tarea hecha · 0 %",
    );
  });
});

describe("getEpicItems", () => {
  const board = {
    columns: [
      {
        status: "TODO" as const,
        items: [
          buildItem({ id: "a", parent_id: "e1" }),
          buildItem({ id: "b", parent_id: "e2" }),
        ],
      },
      { status: "DONE" as const, items: [buildItem({ id: "c" })] },
    ],
    archived: [
      buildItem({
        id: "d",
        parent_id: "e1",
        status: "DONE",
        is_archived: true,
      }),
    ],
  };

  test("incluye las tareas de las columnas y las archivadas", () => {
    expect(getAllItems(board).map(({ id }) => id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  test("filtra las tareas de una épica", () => {
    expect(getEpicItems(board, "e1").map(({ id }) => id)).toEqual(["a", "d"]);
  });
});
