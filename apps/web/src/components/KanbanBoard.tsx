import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import type { BoardColumn, WorkItemStatus } from "../api/board";
import AddItemForm from "./AddItemForm";
import type { AddItemValues } from "./AddItemForm";
import KanbanCard from "./KanbanCard";

import "./KanbanBoard.css";

const COLUMN_TITLES: Record<WorkItemStatus, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  DONE: "Hecho",
};

interface KanbanBoardProps {
  columns: BoardColumn[];
  // Sin esta función el tablero es de solo lectura (proyecto archivado)
  onCreateItem?: (
    status: WorkItemStatus,
    values: AddItemValues,
  ) => Promise<void>;
}

function KanbanBoard({ columns, onCreateItem }: KanbanBoardProps) {
  const [addingTo, setAddingTo] = useState<WorkItemStatus | null>(null);
  const addButtons = useRef<Partial<Record<WorkItemStatus, HTMLButtonElement>>>(
    {},
  );

  function closeForm(status: WorkItemStatus) {
    setAddingTo(null);
    // El foco vuelve al botón que abrió el formulario
    setTimeout(() => addButtons.current[status]?.focus());
  }

  return (
    <div className="kanban-board">
      {columns.map((column) => {
        const titleId = `column-${column.status}`;
        const isAdding = addingTo === column.status;

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

            {column.items.length === 0 && !isAdding ? (
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

            {onCreateItem &&
              (isAdding ? (
                <AddItemForm
                  onSubmit={async (values) => {
                    await onCreateItem(column.status, values);
                    closeForm(column.status);
                  }}
                  onCancel={() => closeForm(column.status)}
                />
              ) : (
                <button
                  ref={(element) => {
                    if (element) {
                      addButtons.current[column.status] = element;
                    }
                  }}
                  type="button"
                  className="kanban-add-button"
                  onClick={() => setAddingTo(column.status)}
                >
                  <Plus size={16} aria-hidden="true" />
                  Crear tarea
                  <span className="sr-only">
                    {" "}
                    en {COLUMN_TITLES[column.status]}
                  </span>
                </button>
              ))}
          </section>
        );
      })}
    </div>
  );
}

export default KanbanBoard;
