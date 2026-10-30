import type { Board, BoardItem } from "../api/board";
import { getAllItems } from "./progress";

// Todas las tareas del tablero por id, incluidas las archivadas
export function indexItems(
  board: Pick<Board, "columns" | "archived">,
): Map<string, BoardItem> {
  return new Map(getAllItems(board).map((item) => [item.id, item]));
}

// Una tarea cuelga de una épica o de una historia (épica → historia → tarea).
// El tablero no trae épicas: si el padre está entre sus tareas, es una historia
export function getParentStory(
  item: BoardItem,
  itemsById: Map<string, BoardItem>,
): BoardItem | null {
  return item.parent_id ? (itemsById.get(item.parent_id) ?? null) : null;
}

// Épica de la tarea: la suya o, si cuelga de una historia, la de la historia
export function getEpicId(
  item: BoardItem,
  itemsById: Map<string, BoardItem>,
): string | null {
  const story = getParentStory(item, itemsById);

  return story ? story.parent_id : item.parent_id;
}
