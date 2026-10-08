import { Bug, CheckSquare, BookOpen } from "lucide-react";

import type { BoardItem, WorkItemPriority, WorkItemType } from "../api/board";
import { getInitials } from "../utils/format";

import "./KanbanCard.css";

const TYPE_LABELS: Record<WorkItemType, string> = {
  EPIC: "Épica",
  STORY: "Historia",
  TASK: "Tarea",
  BUG: "Error",
};

const PRIORITY_LABELS: Record<WorkItemPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

function TypeIcon({ type }: { type: WorkItemType }) {
  if (type === "BUG") {
    return <Bug size={14} aria-hidden="true" />;
  }

  if (type === "STORY") {
    return <BookOpen size={14} aria-hidden="true" />;
  }

  return <CheckSquare size={14} aria-hidden="true" />;
}

function KanbanCard({ item }: { item: BoardItem }) {
  return (
    <article className="kanban-card">
      <h3 className="kanban-card-title">{item.title}</h3>

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
          <span className="kanban-assignee is-empty" role="img" aria-label="Sin asignar">
            ?
          </span>
        )}
      </div>
    </article>
  );
}

export default KanbanCard;
