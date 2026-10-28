import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";

import { MAX_WORK_ITEM_TITLE_LENGTH, STATUS_LABELS } from "../api/board";
import type { WorkItemStatus } from "../api/board";
import type { UpdateEpicData } from "../api/epics";

import "./TaskForm.css";
import "./EpicForm.css";

// Al crear no se elige estado: toda épica nueva empieza en Por hacer
export type EpicFormValues = Omit<UpdateEpicData, "status"> &
  Partial<Pick<UpdateEpicData, "status">>;

interface EpicFormProps {
  initialValues?: EpicFormValues;
  // Solo al editar se puede cambiar el estado
  withStatus?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  onSubmit: (values: EpicFormValues) => Promise<void>;
  onCancel: () => void;
}

const STATUSES = Object.keys(STATUS_LABELS) as WorkItemStatus[];

function EpicForm({
  initialValues,
  withStatus = false,
  submitLabel = "Crear",
  submittingLabel = "Creando...",
  onSubmit,
  onCancel,
}: EpicFormProps) {
  const titleId = useId();
  const statusId = useId();
  const priorityId = useId();
  const estimateId = useId();
  const dueDateId = useId();
  const descriptionId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const estimateText = String(formData.get("estimate") ?? "").trim();

    if (!title) {
      setError("El título es obligatorio.");
      titleRef.current?.focus();
      return;
    }

    const values: EpicFormValues = {
      title,
      description: description || undefined,
      priority: String(formData.get("priority")) as EpicFormValues["priority"],
      estimate: estimateText ? Number(estimateText) : undefined,
      dueDate: String(formData.get("dueDate") ?? "") || undefined,
    };

    if (withStatus) {
      values.status = String(formData.get("status")) as WorkItemStatus;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit(values);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la épica.",
      );
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape" && !isSubmitting) {
      event.stopPropagation();
      onCancel();
    }
  }

  return (
    <form
      className="task-form"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className="field">
        <label htmlFor={titleId}>
          Título{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
        </label>
        <input
          ref={titleRef}
          id={titleId}
          name="title"
          type="text"
          required
          maxLength={MAX_WORK_ITEM_TITLE_LENGTH}
          defaultValue={initialValues?.title}
        />
      </div>

      <div className="task-form-row epic-form-row">
        {withStatus && (
          <div className="field">
            <label htmlFor={statusId}>Estado</label>
            <select
              id={statusId}
              name="status"
              defaultValue={initialValues?.status ?? "TODO"}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor={priorityId}>Prioridad</label>
          <select
            id={priorityId}
            name="priority"
            defaultValue={initialValues?.priority ?? "MEDIUM"}
          >
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor={dueDateId}>Fecha límite</label>
          <input
            id={dueDateId}
            name="dueDate"
            type="date"
            defaultValue={initialValues?.dueDate}
          />
        </div>

        <div className="field">
          <label htmlFor={estimateId}>Puntos</label>
          <input
            id={estimateId}
            name="estimate"
            type="number"
            min={0}
            step={1}
            defaultValue={initialValues?.estimate}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor={descriptionId}>Descripción</label>
        <textarea
          id={descriptionId}
          name="description"
          rows={3}
          defaultValue={initialValues?.description}
        />
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <div className="actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default EpicForm;
