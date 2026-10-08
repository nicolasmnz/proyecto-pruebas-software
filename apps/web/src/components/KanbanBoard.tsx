import type { BoardColumn, WorkItemStatus } from "../api/board";
import KanbanCard from "./KanbanCard";

import "./KanbanBoard.css";

const COLUMN_TITLES: Record<WorkItemStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  DONE: "Hecho",
};

function KanbanBoard({ columns }: { columns: BoardColumn[] }) {
  return (
    <div className="kanban-board">
      {columns.map((column) => {
        const titleId = `column-${column.status}`;

        return (
          <section
            key={column.status}
            aria-labelledby={titleId}
            className="kanban-column"
          >
            <header className="kanban-column-header">
              <h2 id={titleId}>{COLUMN_TITLES[column.status]}</h2>
              <span
                className="kanban-column-count"
                aria-label={`${column.items.length} elementos`}
              >
                {column.items.length}
              </span>
            </header>

            {column.items.length === 0 ? (
              <p className="kanban-column-empty">Sin elementos</p>
            ) : (
              <ul className="kanban-column-list">
                {column.items.map((item) => (
                  <li key={item.id}>
                    <KanbanCard item={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default KanbanBoard;
