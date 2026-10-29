import { describe, expect, test } from "vitest";

import type { BoardItem } from "../api/board";
import { getEpicId, getParentStory, indexItems } from "./hierarchy";

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

// La épica «e1» no está en el tablero: el tablero no trae épicas
const story = buildItem({ id: "story", type: "STORY", parent_id: "e1" });
const loneStory = buildItem({ id: "lone", type: "STORY" });
const direct = buildItem({ id: "direct", parent_id: "e1" });
const viaStory = buildItem({ id: "via", parent_id: "story" });
const viaLoneStory = buildItem({ id: "via-lone", parent_id: "lone" });
const archivedViaStory = buildItem({
  id: "archived",
  parent_id: "story",
  is_archived: true,
  status: "DONE",
});
const noEpic = buildItem({ id: "none" });

const itemsById = indexItems({
  columns: [
    {
      status: "TODO",
      items: [story, loneStory, direct, viaStory, viaLoneStory, noEpic],
    },
  ],
  archived: [archivedViaStory],
});

describe("indexItems", () => {
  test("incluye las tareas de las columnas y las archivadas", () => {
    expect(itemsById.get("story")).toBe(story);
    expect(itemsById.get("archived")).toBe(archivedViaStory);
  });
});

describe("getParentStory", () => {
  test("devuelve la historia de la que cuelga la tarea", () => {
    expect(getParentStory(viaStory, itemsById)).toBe(story);
    expect(getParentStory(archivedViaStory, itemsById)).toBe(story);
  });

  test("si cuelga de una épica o de nada, no tiene historia", () => {
    expect(getParentStory(direct, itemsById)).toBeNull();
    expect(getParentStory(noEpic, itemsById)).toBeNull();
  });
});

describe("getEpicId", () => {
  test("la épica directa de la tarea", () => {
    expect(getEpicId(direct, itemsById)).toBe("e1");
    expect(getEpicId(story, itemsById)).toBe("e1");
  });

  test("hereda la épica de su historia", () => {
    expect(getEpicId(viaStory, itemsById)).toBe("e1");
    expect(getEpicId(archivedViaStory, itemsById)).toBe("e1");
  });

  test("sin épica si ni ella ni su historia tienen", () => {
    expect(getEpicId(viaLoneStory, itemsById)).toBeNull();
    expect(getEpicId(noEpic, itemsById)).toBeNull();
  });
});
