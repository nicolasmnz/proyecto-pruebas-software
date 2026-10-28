import { useEffect, useId, useRef, useState } from "react";
import { Archive, Pencil } from "lucide-react";

import { STATUS_LABELS } from "../api/board";
import type { Epic } from "../api/epics";
import { formatDueDate } from "../utils/format";
import { describeProgress } from "../utils/progress";
import type { Progress } from "../utils/progress";
import EpicForm from "./EpicForm";
import type { EpicFormValues } from "./EpicForm";
import { PRIORITY_LABELS } from "./taskLabels";

import "./BoardProgress.css";
import "./EpicCard.css";

interface EpicCardProps {
  epic: Epic;
  progress: Progress;
  // Sin estas funciones la tarjeta es de solo lectura (proyecto archivado)
  onSave?: (values: EpicFormValues) => Promise<void>;
  onArchive?: () => void;
}

function EpicCard({ epic, progress, onSave, onArchive }: EpicCardProps) {
  const titleId = useId();
  const progressId = useId();
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

  async function handleSave(values: EpicFormValues) {
    await onSave?.(values);
    setIsEditing(false);
  }

  return (
    <article className="epic-card" aria-labelledby={titleId}>
      <header className="epic-card-header">
        <p className="epic-card-key">
          <span className="sr-only">Épica </span>#{epic.item_number}
        </p>
        <h2 id={titleId}>{epic.title}</h2>
        <div className="epic-card-badges">
          <span className={`epic-status is-${epic.status.toLowerCase()}`}>
            {STATUS_LABELS[epic.status]}
          </span>
          <span className="badge">
            <span className="sr-only">Prioridad </span>
            {PRIORITY_LABELS[epic.priority]}
          </span>
        </div>
      </header>

      {isEditing ? (
        <EpicForm
          initialValues={{
            title: epic.title,
            description: epic.description ?? undefined,
            status: epic.status,
            priority: epic.priority,
            estimate: epic.estimate ?? undefined,
            dueDate: epic.due_date ?? undefined,
          }}
          withStatus
          submitLabel="Guardar cambios"
          submittingLabel="Guardando..."
          onSubmit={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          {epic.description && (
            <p className="epic-card-description">{epic.description}</p>
          )}

          <dl className="epic-card-meta">
            <div>
              <dt>Fecha límite</dt>
              <dd>
                {epic.due_date ? formatDueDate(epic.due_date) : "Sin fecha"}
              </dd>
            </div>
            <div>
              <dt>Puntos estimados</dt>
              <dd>{epic.estimate ?? "Sin estimar"}</dd>
            </div>
          </dl>

          <div className="epic-card-progress">
            <p id={progressId}>
              {progress.total === 0
                ? "Aún no tiene tareas"
                : describeProgress(progress)}
            </p>
            <div
              className="board-progress-track"
              role="progressbar"
              aria-label={`Avance de ${epic.title}`}
              aria-describedby={progressId}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percentage}
              aria-valuetext={`${progress.percentage} % completado`}
            >
              <div
                className="board-progress-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {(onSave || onArchive) && (
            <div className="actions epic-card-actions">
              {onSave && (
                <button
                  ref={editButtonRef}
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil size={16} aria-hidden="true" />
                  Editar
                </button>
              )}
              {onArchive && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onArchive}
                >
                  <Archive size={16} aria-hidden="true" />
                  Archivar
                </button>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default EpicCard;
