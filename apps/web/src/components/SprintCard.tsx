import { useEffect, useId, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import type { BoardItem } from "../api/board";
import { SPRINT_STATUS_LABELS } from "../api/sprints";
import type { Sprint } from "../api/sprints";
import { formatDueDate } from "../utils/format";
import { describeLoad } from "../utils/sprints";
import SprintForm from "./SprintForm";
import type { SprintFormValues } from "./SprintForm";
import SprintTaskList from "./SprintTaskList";

import "./SprintCard.css";

interface SprintCardProps {
  sprint: Sprint;
  items: BoardItem[];
  // Sin esta función la tarjeta es de solo lectura (proyecto archivado)
  onSave?: (values: SprintFormValues) => Promise<void>;
  moveTargets?: Pick<Sprint, "id" | "name">[];
  onMoveItem?: (item: BoardItem, sprintId: string | null) => void;
}

function formatRange(sprint: Sprint) {
  const start = sprint.start_date ? formatDueDate(sprint.start_date) : null;
  const end = sprint.end_date ? formatDueDate(sprint.end_date) : null;

  if (start && end) {
    return `${start} – ${end}`;
  }

  if (start) {
    return `Desde el ${start}`;
  }

  return end ? `Hasta el ${end}` : "Sin fechas";
}

function SprintCard({
  sprint,
  items,
  onSave,
  moveTargets,
  onMoveItem,
}: SprintCardProps) {
  const titleId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // Al cerrar el formulario, el foco vuelve al botón Editar
  useEffect(() => {
    if (wasEditing.current && !isEditing) {
      editButtonRef.current?.focus();
    }

    wasEditing.current = isEditing;
  }, [isEditing]);

  async function handleSave(values: SprintFormValues) {
    await onSave?.(values);
    setIsEditing(false);
  }

  return (
    <article className="sprint-card" aria-labelledby={titleId}>
      <header className="sprint-card-header">
        <h2 id={titleId}>{sprint.name}</h2>
        <span className={`sprint-status is-${sprint.status.toLowerCase()}`}>
          {SPRINT_STATUS_LABELS[sprint.status]}
        </span>
        <p className="sprint-card-load">{describeLoad(items)}</p>
      </header>

      {isEditing ? (
        <SprintForm
          initialValues={{
            name: sprint.name,
            goal: sprint.goal ?? undefined,
            status: sprint.status,
            startDate: sprint.start_date ?? undefined,
            endDate: sprint.end_date ?? undefined,
          }}
          withStatus
          submitLabel="Guardar cambios"
          submittingLabel="Guardando..."
          onSubmit={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <p className="sprint-card-dates">{formatRange(sprint)}</p>

          {sprint.goal && <p className="sprint-card-goal">{sprint.goal}</p>}

          <SprintTaskList
            items={items}
            emptyText="Este sprint aún no tiene tareas."
            moveTargets={moveTargets}
            onMove={onMoveItem}
          />

          {onSave && (
            <div className="actions sprint-card-actions">
              <button
                ref={editButtonRef}
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                <Pencil size={16} aria-hidden="true" />
                Editar
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default SprintCard;
