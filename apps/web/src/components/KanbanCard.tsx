import { useId } from "react";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Bug,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { STATUS_LABELS } from "../api/board";
import type { BoardItem, WorkItemStatus, WorkItemType } from "../api/board";
import { getInitials } from "../utils/format";
import { PRIORITY_LABELS, TYPE_LABELS } from "./taskLabels";

import "./KanbanCard.css";

function TypeIcon({ type }: { type: WorkItemType }) {
  if (type === "BUG") {
    return <Bug size={14} aria-hidden="true" />;
  }

  if (type === "STORY") {
    return <BookOpen size={14} aria-hidden="true" />;
  }

  return <CheckSquare size={14} aria-hidden="true" />;
}

interface KanbanCardProps {
  item: BoardItem;
  // Sin esta función la tarjeta es de solo lectura
  onMove?: (item: BoardItem, status: WorkItemStatus) => void;
  // Sube o baja la tarea dentro de su columna (alternativa al arrastre)
  onReorder?: (item: BoardItem, delta: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  // Abre la ficha de la tarea
  onOpen?: (item: BoardItem) => void;
  // Solo en tareas terminadas: la sacan del tablero
  onArchive?: (item: BoardItem) => void;
  // Solo en tareas archivadas: la devuelven a Hecho
  onRestore?: (item: BoardItem) => void;
  onDragStart?: (item: BoardItem) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

function KanbanCard({
  item,
  onOpen,
  onMove,
  onReorder,
  canMoveUp = true,
  canMoveDown = true,
  onArchive,
  onRestore,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: KanbanCardProps) {
  const moveId = useId();

  return (
    <article
      className={`kanban-card${isDragging ? " is-dragging" : ""}`}
      draggable={Boolean(onMove)}
      onDragStart={(event) => {
        // Firefox exige datos para iniciar el arrastre
        event.dataTransfer?.setData("text/plain", item.id);
        onDragStart?.(item);
      }}
      onDragEnd={onDragEnd}
    >
      <p className="kanban-card-key" title="Identificador de la tarea">
        <span className="sr-only">Tarea </span>#{item.item_number}
      </p>

      <h3 className="kanban-card-title">
        {onOpen ? (
          <button
            type="button"
            className="kanban-card-open"
            onClick={() => onOpen(item)}
          >
            {item.title}
          </button>
        ) : (
          item.title
        )}
      </h3>

      <div className="kanban-card-meta">
        <span className={`kanban-type kanban-type-${item.type.toLowerCase()}`}>
          <TypeIcon type={item.type} />
          {TYPE_LABELS[item.type]}
        </span>

        <span
          className={`kanban-priority kanban-priority-${item.priority.toLowerCase()}`}
        >
          Prioridad {PRIORITY_LABELS[item.priority].toLowerCase()}
        </span>

        {item.estimate !== null && (
          <span className="kanban-estimate" title="Puntos de historia">
            {item.estimate} pts
          </span>
        )}

        {item.assignee_name ? (
          <span
            className="kanban-assignee"
            title={item.assignee_name}
            role="img"
            aria-label={`Asignado a ${item.assignee_name}`}
          >
            {getInitials(item.assignee_name)}
          </span>
        ) : (
          <span
            className="kanban-assignee is-empty"
            role="img"
            aria-label="Sin asignar"
          >
            ?
          </span>
        )}
      </div>

      {onMove && (
        <div className="kanban-card-move">
          <label htmlFor={moveId} className="sr-only">
            Mover «{item.title}» a
          </label>
          <select
            id={moveId}
            value=""
            onChange={(event) =>
              onMove(item, event.target.value as WorkItemStatus)
            }
          >
            <option value="">Mover a…</option>
            {(Object.keys(STATUS_LABELS) as WorkItemStatus[])
              .filter((status) => status !== item.status)
              .map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
          </select>

          {onReorder && (
            <>
              <button
                type="button"
                className="kanban-card-reorder"
                aria-label={`Subir «${item.title}»`}
                disabled={!canMoveUp}
                onClick={() => onReorder(item, -1)}
              >
                <ChevronUp size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="kanban-card-reorder"
                aria-label={`Bajar «${item.title}»`}
                disabled={!canMoveDown}
                onClick={() => onReorder(item, 1)}
              >
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

      {onArchive && (
        <button
          type="button"
          className="kanban-card-action"
          aria-label={`Archivar «${item.title}»`}
          onClick={() => onArchive(item)}
        >
          <Archive size={14} aria-hidden="true" />
          Archivar
        </button>
      )}

      {onRestore && (
        <button
          type="button"
          className="kanban-card-action"
          aria-label={`Restaurar «${item.title}»`}
          onClick={() => onRestore(item)}
        >
          <ArchiveRestore size={14} aria-hidden="true" />
          Restaurar
        </button>
      )}
    </article>
  );
}

export default KanbanCard;
