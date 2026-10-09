import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import { STATUS_LABELS } from "../api/board";
import type { BoardColumn, BoardItem, WorkItemStatus } from "../api/board";
import AddItemForm from "./AddItemForm";
import type { AddItemValues } from "./AddItemForm";
import KanbanCard from "./KanbanCard";

import "./KanbanBoard.css";

interface KanbanBoardProps {
  columns: BoardColumn[];
  // Sin esta función el tablero es de solo lectura (proyecto archivado)
  onCreateItem?: (
    status: WorkItemStatus,
    values: AddItemValues,
  ) => Promise<void>;
  // Sin esta función las tareas no se pueden mover
  onMoveItem?: (item: BoardItem, status: WorkItemStatus) => void;
  // Sin esta función las tareas terminadas no se pueden archivar
  onArchiveItem?: (item: BoardItem) => void;
}

function KanbanBoard({
  columns,
  onCreateItem,
  onMoveItem,
  onArchiveItem,
}: KanbanBoardProps) {
  const [dragged, setDragged] = useState<BoardItem | null>(null);
  const [dropTarget, setDropTarget] = useState<WorkItemStatus | null>(null);
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
            className={`kanban-column${dropTarget === column.status ? " is-drop-target" : ""}`}
            onDragOver={(event) => {
              if (dragged && dragged.status !== column.status) {
                // Permite soltar en esta columna
                event.preventDefault();
                setDropTarget(column.status);
              }
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDropTarget(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDropTarget(null);

              if (dragged && dragged.status !== column.status) {
                onMoveItem?.(dragged, column.status);
              }

              setDragged(null);
            }}
          >
            <header className="kanban-column-header">
              <h2 id={titleId}>{STATUS_LABELS[column.status]}</h2>
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
                    <KanbanCard
                      item={item}
                      onMove={onMoveItem}
                      onArchive={
                        column.status === "DONE" ? onArchiveItem : undefined
                      }
                      onDragStart={setDragged}
                      onDragEnd={() => {
                        setDragged(null);
                        setDropTarget(null);
                      }}
                      isDragging={dragged?.id === item.id}
                    />
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
                    en {STATUS_LABELS[column.status]}
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
