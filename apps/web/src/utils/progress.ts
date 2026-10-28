import type { Board, BoardItem } from "../api/board";

export interface Progress {
  done: number;
  total: number;
  donePoints: number;
  totalPoints: number;
  // Pesa por puntos; si nadie estimó, por cantidad de tareas
  usesPoints: boolean;
  percentage: number;
}

// Las archivadas solo pueden venir de Hecho: cuentan como terminadas
function isDone(item: BoardItem) {
  return item.is_archived || item.status === "DONE";
}

function sumPoints(items: BoardItem[]) {
  return items.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
}

export function getProgress(items: BoardItem[]): Progress {
  const doneItems = items.filter(isDone);

  const done = doneItems.length;
  const total = items.length;
  const donePoints = sumPoints(doneItems);
  const totalPoints = sumPoints(items);
  const usesPoints = totalPoints > 0;

  const percentage = usesPoints
    ? Math.round((donePoints / totalPoints) * 100)
    : total === 0
      ? 0
      : Math.round((done / total) * 100);

  return { done, total, donePoints, totalPoints, usesPoints, percentage };
}

export function describeProgress(progress: Progress): string {
  const { done, total, donePoints, totalPoints, usesPoints, percentage } =
    progress;

  return [
    `${done} de ${total} ${total === 1 ? "tarea hecha" : "tareas hechas"}`,
    ...(usesPoints ? [`${donePoints} de ${totalPoints} pts`] : []),
    `${percentage} %`,
  ].join(" · ");
}

// Todas las tareas del tablero, incluidas las archivadas
export function getAllItems(board: Pick<Board, "columns" | "archived">) {
  return [
    ...board.columns.flatMap((column) => column.items),
    ...board.archived,
  ];
}

export function getEpicItems(
  board: Pick<Board, "columns" | "archived">,
  epicId: string,
) {
  return getAllItems(board).filter((item) => item.parent_id === epicId);
}
