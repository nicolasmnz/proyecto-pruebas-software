import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";

import { MAX_WORK_ITEM_TITLE_LENGTH } from "../api/board";
import type { CreateWorkItemData } from "../api/board";

import "./AddItemForm.css";

export type AddItemValues = Pick<
  CreateWorkItemData,
  "title" | "description" | "type" | "priority" | "estimate"
>;

interface AddItemFormProps {
  onSubmit: (values: AddItemValues) => Promise<void>;
  onCancel: () => void;
}

function AddItemForm({ onSubmit, onCancel }: AddItemFormProps) {
  const titleId = useId();
  const typeId = useId();
  const priorityId = useId();
  const estimateId = useId();
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

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit({
        title,
        description: description || undefined,
        type: String(formData.get("type")) as AddItemValues["type"],
        priority: String(formData.get("priority")) as AddItemValues["priority"],
        estimate: estimateText ? Number(estimateText) : undefined,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible crear la tarea.",
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
      className="add-item-form"
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
        />
      </div>

      <div className="add-item-row">
        <div className="field">
          <label htmlFor={typeId}>Tipo</label>
          <select id={typeId} name="type" defaultValue="TASK">
            <option value="TASK">Tarea</option>
            <option value="STORY">Historia</option>
            <option value="BUG">Error</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor={priorityId}>Prioridad</label>
          <select id={priorityId} name="priority" defaultValue="MEDIUM">
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
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor={descriptionId}>Descripción</label>
        <textarea id={descriptionId} name="description" rows={3} />
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
          {isSubmitting ? "Creando..." : "Crear"}
        </button>
      </div>
    </form>
  );
}

export default AddItemForm;
