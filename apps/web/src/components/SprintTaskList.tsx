import { STATUS_LABELS } from "../api/board";
import type { BoardItem } from "../api/board";
import type { Sprint } from "../api/sprints";

import "./SprintTaskList.css";

// Valor del selector que devuelve la tarea al backlog
const BACKLOG = "backlog";

interface SprintTaskListProps {
  items: BoardItem[];
  // Texto cuando no hay tareas
  emptyText: string;
  // Sprints a los que se puede mover una tarea (planificados y activos)
  moveTargets?: Pick<Sprint, "id" | "name">[];
  // Sin esta función las tareas no se pueden mover (proyecto archivado).
  // sprintId null = al backlog
  onMove?: (item: BoardItem, sprintId: string | null) => void;
}

function SprintTaskList({
  items,
  emptyText,
  moveTargets = [],
  onMove,
}: SprintTaskListProps) {
  if (items.length === 0) {
    return <p className="sprint-tasks-empty">{emptyText}</p>;
  }

  return (
    <ul className="sprint-tasks">
      {items.map((item) => {
        const targets = moveTargets.filter(({ id }) => id !== item.sprint_id);
        // Las archivadas ya terminaron: no se replanifican
        const canMove = onMove && !item.is_archived;

        return (
          <li key={item.id} className="sprint-task">
            <span className="sprint-task-key">#{item.item_number}</span>
            <span className="sprint-task-title">{item.title}</span>
            <span className="sprint-task-meta">
              {item.is_archived ? "Archivada" : STATUS_LABELS[item.status]}
              {item.estimate !== null && ` · ${item.estimate} pts`}
            </span>

            {canMove && (
              <select
                className="sprint-task-move"
                aria-label={`Mover «${item.title}» a`}
                value=""
                onChange={(event) =>
                  onMove(
                    item,
                    event.target.value === BACKLOG ? null : event.target.value,
                  )
                }
              >
                <option value="">Mover a…</option>
                {item.sprint_id !== null && (
                  <option value={BACKLOG}>Backlog</option>
                )}
                {targets.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default SprintTaskList;
