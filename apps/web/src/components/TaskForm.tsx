import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";

import { MAX_WORK_ITEM_TITLE_LENGTH } from "../api/board";
import type { BoardMember, UpdateWorkItemData } from "../api/board";

import "./TaskForm.css";

export type TaskFormValues = Omit<
  UpdateWorkItemData,
  "assigneeId" | "dueDate"
> &
  Partial<Pick<UpdateWorkItemData, "assigneeId" | "dueDate">>;

interface TaskFormProps {
  initialValues?: TaskFormValues;
  // Con miembros el formulario incluye responsable y fecha límite
  members?: BoardMember[];
  submitLabel?: string;
  submittingLabel?: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

function TaskForm({
  initialValues,
  members,
  submitLabel = "Crear",
  submittingLabel = "Creando...",
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const titleId = useId();
  const typeId = useId();
  const priorityId = useId();
  const estimateId = useId();
  const assigneeId = useId();
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

    const values: TaskFormValues = {
      title,
      description: description || undefined,
      type: String(formData.get("type")) as TaskFormValues["type"],
      priority: String(formData.get("priority")) as TaskFormValues["priority"],
      estimate: estimateText ? Number(estimateText) : undefined,
    };

    if (members) {
      values.assigneeId = String(formData.get("assignee") ?? "") || undefined;
      values.dueDate = String(formData.get("dueDate") ?? "") || undefined;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit(values);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar la tarea.",
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

      <div className="task-form-row">
        <div className="field">
          <label htmlFor={typeId}>Tipo</label>
          <select
            id={typeId}
            name="type"
            defaultValue={initialValues?.type ?? "TASK"}
          >
            <option value="TASK">Tarea</option>
            <option value="STORY">Historia</option>
            <option value="BUG">Error</option>
          </select>
        </div>

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

      {members && (
        <div className="task-form-row task-form-row-two">
          <div className="field">
            <label htmlFor={assigneeId}>Responsable</label>
            <select
              id={assigneeId}
              name="assignee"
              defaultValue={initialValues?.assigneeId ?? ""}
            >
              <option value="">Sin asignar</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
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
        </div>
      )}

      <div className="field">
        <label htmlFor={descriptionId}>Descripción</label>
        <textarea
          id={descriptionId}
          name="description"
          rows={members ? 5 : 3}
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

export default TaskForm;
