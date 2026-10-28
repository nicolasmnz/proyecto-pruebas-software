import { STATUS_LABELS } from "../api/board";
import type { BoardItem } from "../api/board";

import "./SprintTaskList.css";

interface SprintTaskListProps {
  items: BoardItem[];
  // Texto cuando no hay tareas
  emptyText: string;
}

function SprintTaskList({ items, emptyText }: SprintTaskListProps) {
  if (items.length === 0) {
    return <p className="sprint-tasks-empty">{emptyText}</p>;
  }

  return (
    <ul className="sprint-tasks">
      {items.map((item) => (
        <li key={item.id} className="sprint-task">
          <span className="sprint-task-key">#{item.item_number}</span>
          <span className="sprint-task-title">{item.title}</span>
          <span className="sprint-task-meta">
            {item.is_archived ? "Archivada" : STATUS_LABELS[item.status]}
            {item.estimate !== null && ` · ${item.estimate} pts`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default SprintTaskList;
