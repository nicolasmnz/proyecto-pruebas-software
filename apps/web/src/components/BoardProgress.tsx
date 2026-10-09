import type { BoardColumn, BoardItem } from "../api/board";

import "./BoardProgress.css";

interface BoardProgressProps {
  columns: BoardColumn[];
  archived: BoardItem[];
}

function BoardProgress({ columns, archived }: BoardProgressProps) {
  // Las archivadas solo pueden venir de Hecho: cuentan como terminadas
  const doneItems = [
    ...(columns.find((column) => column.status === "DONE")?.items ?? []),
    ...archived,
  ];
  const allItems = [...columns.flatMap((column) => column.items), ...archived];

  const sumPoints = (items: BoardItem[]) =>
    items.reduce((sum, item) => sum + (item.estimate ?? 0), 0);

  const done = doneItems.length;
  const total = allItems.length;
  const donePoints = sumPoints(doneItems);
  const totalPoints = sumPoints(allItems);

  // La barra pesa por puntos; si nadie estimó, por cantidad de tareas
  const usesPoints = totalPoints > 0;
  const percentage = usesPoints
    ? Math.round((donePoints / totalPoints) * 100)
    : total === 0
      ? 0
      : Math.round((done / total) * 100);

  const summary = [
    `${done} de ${total} ${total === 1 ? "tarea hecha" : "tareas hechas"}`,
    ...(usesPoints ? [`${donePoints} de ${totalPoints} pts`] : []),
    `${percentage} %`,
  ].join(" · ");

  return (
    <section className="board-progress" aria-labelledby="board-progress-title">
      <div className="board-progress-header">
        <h2 id="board-progress-title">Progreso</h2>

        <p>{total === 0 ? "Aún no hay tareas" : summary}</p>
      </div>

      <div
        className="board-progress-track"
        role="progressbar"
        aria-labelledby="board-progress-title"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${percentage} % completado`}
      >
        <div
          className="board-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}

export default BoardProgress;
