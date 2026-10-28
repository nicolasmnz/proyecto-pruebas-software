import type { Board, BoardItem } from "../api/board";
import type { Sprint, SprintStatus } from "../api/sprints";
import { getAllItems } from "./progress";

// Primero lo que está en curso, luego lo que viene y al final lo cerrado
const STATUS_ORDER: Record<SprintStatus, number> = {
  ACTIVE: 0,
  PLANNED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

// Dentro de cada estado, por fecha de inicio (sin fecha al final); la API
// ya los entrega del más reciente al más antiguo, y el orden es estable
export function sortSprints(sprints: Sprint[]): Sprint[] {
  return [...sprints].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"),
  );
}

// Solo se planifica hacia sprints que no terminaron
export function isOpenSprint(sprint: Sprint) {
  return sprint.status === "PLANNED" || sprint.status === "ACTIVE";
}

export function countActiveSprints(sprints: Sprint[]) {
  return sprints.filter(({ status }) => status === "ACTIVE").length;
}

// Tareas sin sprint que aún se pueden planificar (las archivadas ya terminaron)
export function getBacklogItems(board: Pick<Board, "columns" | "archived">) {
  return board.columns
    .flatMap((column) => column.items)
    .filter((item) => item.sprint_id === null);
}

// Todas las tareas del sprint, incluidas las archivadas (trabajo ya hecho)
export function getSprintItems(
  board: Pick<Board, "columns" | "archived">,
  sprintId: string,
) {
  return getAllItems(board).filter((item) => item.sprint_id === sprintId);
}

// «3 tareas · 8 pts»
export function describeLoad(items: BoardItem[]): string {
  const points = items.reduce((sum, item) => sum + (item.estimate ?? 0), 0);

  return `${items.length} ${items.length === 1 ? "tarea" : "tareas"} · ${points} pts`;
}
