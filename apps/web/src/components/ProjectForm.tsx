import { useId, useState } from "react";
import type { SubmitEvent } from "react";

import { MAX_PROJECT_NAME_LENGTH } from "../api/projects";

import "./ProjectForm.css";

export interface ProjectFormValues {
  name: string;
  description?: string;
}

interface ProjectFormProps {
  initialValues?: ProjectFormValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const nameId = useId();
  const descriptionId = useId();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit({ name, description: description || undefined });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar el proyecto.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={nameId}>
          Nombre{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
        </label>

        <input
          id={nameId}
          name="name"
          type="text"
          required
          maxLength={MAX_PROJECT_NAME_LENGTH}
          defaultValue={initialValues?.name}
        />
      </div>

      <div className="field">
        <label htmlFor={descriptionId}>Descripción</label>

        <textarea
          id={descriptionId}
          name="description"
          rows={4}
          defaultValue={initialValues?.description}
        />
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ProjectForm;
