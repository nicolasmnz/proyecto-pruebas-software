import type { BoardColumn, BoardItem } from "../api/board";

import "./BoardProgress.css";

interface BoardProgressProps {
  columns: BoardColumn[];
  archived: BoardItem[];
}

function BoardProgress({ columns, archived }: BoardProgressProps) {
  // Las archivadas solo pueden venir de Hecho: cuentan como terminadas
  const done =
    (columns.find((column) => column.status === "DONE")?.items.length ?? 0) +
    archived.length;
  const total =
    columns.reduce((sum, column) => sum + column.items.length, 0) +
    archived.length;
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <section className="board-progress" aria-labelledby="board-progress-title">
      <div className="board-progress-header">
        <h2 id="board-progress-title">Progreso</h2>

        <p>
          {total === 0
            ? "Aún no hay tareas"
            : `${done} de ${total} ${total === 1 ? "tarea hecha" : "tareas hechas"} · ${percentage} %`}
        </p>
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
