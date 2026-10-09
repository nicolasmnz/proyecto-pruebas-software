import { useRef, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";

import { STATUS_LABELS } from "../api/board";
import type {
  BoardColumn,
  BoardItem,
  WipLimits,
  WorkItemStatus,
} from "../api/board";
import TaskForm from "./TaskForm";
import type { TaskFormValues } from "./TaskForm";
import KanbanCard from "./KanbanCard";

import "./KanbanBoard.css";

interface KanbanBoardProps {
  // Todas las tareas de cada columna: los contadores y límites no dependen
  // del filtro
  columns: BoardColumn[];
  wipLimits?: WipLimits;
  // Tareas que se muestran; sin esta función se muestran todas
  isVisible?: (item: BoardItem) => boolean;
  isFiltering?: boolean;
  // Sin esta función el tablero es de solo lectura (proyecto archivado)
  onCreateItem?: (
    status: WorkItemStatus,
    values: TaskFormValues,
  ) => Promise<void>;
  // Abre la ficha de una tarea
  onOpenItem?: (item: BoardItem) => void;
  // Sin esta función las tareas no se pueden mover ni reordenar.
  // `index` es la posición final en la columna de destino (0 = primera)
  onMoveItem?: (
    item: BoardItem,
    status: WorkItemStatus,
    index?: number,
  ) => void;
  // Sin esta función las tareas terminadas no se pueden archivar
  onArchiveItem?: (item: BoardItem) => void;
}

function KanbanBoard({
  columns,
  wipLimits = {},
  isVisible = () => true,
  isFiltering = false,
  onCreateItem,
  onOpenItem,
  onMoveItem,
  onArchiveItem,
}: KanbanBoardProps) {
  const [dragged, setDragged] = useState<BoardItem | null>(null);
  const [dropTarget, setDropTarget] = useState<WorkItemStatus | null>(null);
  // Tarjeta delante de la cual caería lo que se está arrastrando
  const [dropBefore, setDropBefore] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<WorkItemStatus | null>(null);
  const addButtons = useRef<Partial<Record<WorkItemStatus, HTMLButtonElement>>>(
    {},
  );

  function closeForm(status: WorkItemStatus) {
    setAddingTo(null);
    // El foco vuelve al botón que abrió el formulario
    setTimeout(() => addButtons.current[status]?.focus());
  }

  function resetDrag() {
    setDragged(null);
    setDropTarget(null);
    setDropBefore(null);
  }

  // Mueve `item` a `status`: delante de `before`, o al final si no hay
  function requestMove(
    item: BoardItem,
    status: WorkItemStatus,
    before?: BoardItem,
  ) {
    const target = columns.find((column) => column.status === status);
    const others = (target?.items ?? []).filter(({ id }) => id !== item.id);
    const index = before
      ? others.findIndex(({ id }) => id === before.id)
      : others.length;

    // Soltarla donde ya está no cambia nada
    if (
      item.status === status &&
      target?.items.findIndex(({ id }) => id === item.id) === index
    ) {
      return;
    }

    onMoveItem?.(item, status, index);
  }

  // Sube (-1) o baja (+1) una posición dentro de su columna
  function reorder(item: BoardItem, delta: -1 | 1) {
    const column = columns.find(({ status }) => status === item.status);
    const index = column?.items.findIndex(({ id }) => id === item.id) ?? -1;

    if (index >= 0) {
      onMoveItem?.(item, item.status, index + delta);
    }
  }

  return (
    <div className="kanban-board">
      {columns.map((column) => {
        const titleId = `column-${column.status}`;
        const isAdding = addingTo === column.status;
        const visibleItems = column.items.filter(isVisible);
        const count = column.items.length;
        const limit = wipLimits[column.status] ?? null;
        const isOverLimit = limit !== null && count > limit;

        return (
          <section
            key={column.status}
            aria-labelledby={titleId}
            className={`kanban-column${dragged && dropTarget === column.status ? " is-drop-target" : ""}`}
            onDragOver={(event) => {
              if (dragged) {
                // Permite soltar en esta columna (al final)
                event.preventDefault();
                setDropTarget(column.status);
                setDropBefore(null);
              }
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDropTarget(null);
                setDropBefore(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();

              if (dragged) {
                requestMove(dragged, column.status);
              }

              resetDrag();
            }}
          >
            <header className="kanban-column-header">
              <h2 id={titleId}>{STATUS_LABELS[column.status]}</h2>
              <span
                className={`kanban-column-count${isOverLimit ? " is-over-limit" : ""}`}
              >
                {isOverLimit && <AlertTriangle size={12} aria-hidden="true" />}
                <span aria-hidden="true">
                  {limit === null ? count : `${count}/${limit}`}
                </span>
                <span className="sr-only">
                  {limit === null
                    ? `${count} elementos`
                    : isOverLimit
                      ? `${count} elementos, supera el límite de ${limit}`
                      : `${count} de ${limit} elementos`}
                </span>
              </span>
            </header>

            {visibleItems.length === 0 && !isAdding ? (
              <p className="kanban-column-empty">
                {isFiltering && count > 0 ? "Sin resultados" : "Sin elementos"}
              </p>
            ) : (
              <ul className="kanban-column-list">
                {visibleItems.map((item) => {
                  // Con filtros activos no se reordena: el orden visible es parcial
                  const position = column.items.findIndex(
                    ({ id }) => id === item.id,
                  );
                  const canReorder = Boolean(onMoveItem) && !isFiltering;

                  return (
                    <li
                      key={item.id}
                      className={dropBefore === item.id ? "is-drop-before" : ""}
                      onDragOver={(event) => {
                        if (dragged && dragged.id !== item.id) {
                          event.preventDefault();
                          // La columna no debe reemplazarlo por "al final"
                          event.stopPropagation();
                          setDropTarget(column.status);
                          setDropBefore(item.id);
                        }
                      }}
                      onDrop={(event) => {
                        if (dragged && dragged.id !== item.id) {
                          event.preventDefault();
                          event.stopPropagation();
                          requestMove(dragged, column.status, item);
                          resetDrag();
                        }
                      }}
                    >
                      <KanbanCard
                        item={item}
                        onOpen={onOpenItem}
                        onMove={onMoveItem}
                        onReorder={canReorder ? reorder : undefined}
                        canMoveUp={position > 0}
                        canMoveDown={position < count - 1}
                        onArchive={
                          column.status === "DONE" ? onArchiveItem : undefined
                        }
                        onDragStart={setDragged}
                        onDragEnd={resetDrag}
                        isDragging={dragged?.id === item.id}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {onCreateItem &&
              (isAdding ? (
                <TaskForm
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
