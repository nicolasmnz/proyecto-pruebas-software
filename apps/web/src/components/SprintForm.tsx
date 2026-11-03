import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";

import { MAX_SPRINT_NAME_LENGTH, SPRINT_STATUS_LABELS } from "../api/sprints";
import type { SprintStatus, UpdateSprintData } from "../api/sprints";

import "./TaskForm.css";
import "./EpicForm.css";

// Al crear no se elige estado: todo sprint nuevo empieza Planificado
export type SprintFormValues = Omit<UpdateSprintData, "status"> &
  Partial<Pick<UpdateSprintData, "status">>;

interface SprintFormProps {
  initialValues?: SprintFormValues;
  // Solo al editar se puede cambiar el estado
  withStatus?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  onSubmit: (values: SprintFormValues) => Promise<void>;
  onCancel: () => void;
}

const STATUSES = Object.keys(SPRINT_STATUS_LABELS) as SprintStatus[];

function SprintForm({
  initialValues,
  withStatus = false,
  submitLabel = "Crear",
  submittingLabel = "Creando...",
  onSubmit,
  onCancel,
}: SprintFormProps) {
  const nameId = useId();
  const statusId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const goalId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") ?? "").trim();
    const goal = String(formData.get("goal") ?? "").trim();
    const startDate = String(formData.get("startDate") ?? "") || undefined;
    const endDate = String(formData.get("endDate") ?? "") || undefined;

    if (!name) {
      setError("El nombre es obligatorio.");
      nameRef.current?.focus();
      return;
    }

    // AAAA-MM-DD se puede comparar como texto
    if (startDate && endDate && endDate < startDate) {
      setError("La fecha de término no puede ser anterior a la de inicio.");
      return;
    }

    const values: SprintFormValues = {
      name,
      goal: goal || undefined,
      startDate,
      endDate,
    };

    if (withStatus) {
      values.status = String(formData.get("status")) as SprintStatus;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit(values);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el sprint.",
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
        <label htmlFor={nameId}>
          Nombre{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
        </label>
        <input
          ref={nameRef}
          id={nameId}
          name="name"
          type="text"
          required
          maxLength={MAX_SPRINT_NAME_LENGTH}
          defaultValue={initialValues?.name}
        />
      </div>

      <div className="task-form-row epic-form-row">
        {withStatus && (
          <div className="field">
            <label htmlFor={statusId}>Estado</label>
            <select
              id={statusId}
              name="status"
              defaultValue={initialValues?.status ?? "PLANNED"}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SPRINT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor={startDateId}>Fecha de inicio</label>
          <input
            id={startDateId}
            name="startDate"
            type="date"
            defaultValue={initialValues?.startDate}
          />
        </div>

        <div className="field">
          <label htmlFor={endDateId}>Fecha de término</label>
          <input
            id={endDateId}
            name="endDate"
            type="date"
            defaultValue={initialValues?.endDate}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor={goalId}>Objetivo</label>
        <textarea
          id={goalId}
          name="goal"
          rows={2}
          defaultValue={initialValues?.goal}
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

export default SprintForm;
