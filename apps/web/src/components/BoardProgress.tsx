import type { BoardColumn, BoardItem } from "../api/board";
import { describeProgress, getAllItems, getProgress } from "../utils/progress";

import "./BoardProgress.css";

interface BoardProgressProps {
  columns: BoardColumn[];
  archived: BoardItem[];
}

function BoardProgress({ columns, archived }: BoardProgressProps) {
  const progress = getProgress(getAllItems({ columns, archived }));
  const { total, percentage } = progress;
  const summary = describeProgress(progress);

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
