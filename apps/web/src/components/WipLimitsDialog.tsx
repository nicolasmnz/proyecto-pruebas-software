import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, SubmitEvent } from "react";

import { MAX_WIP_LIMIT, STATUS_LABELS } from "../api/board";
import type { WipLimits, WorkItemStatus } from "../api/board";
import { trapTab } from "../utils/focusTrap";

import "./WipLimitsDialog.css";

// Hecho no se limita: terminar trabajo nunca es un problema
const LIMITED_STATUSES: WorkItemStatus[] = ["TODO", "IN_PROGRESS"];

interface WipLimitsDialogProps {
  limits: WipLimits;
  onSave: (limits: WipLimits) => Promise<void>;
  onClose: () => void;
}

function WipLimitsDialog({ limits, onSave, onClose }: WipLimitsDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Devuelve el foco al botón que abrió el diálogo al cerrarlo
    const previouslyFocused = document.activeElement as HTMLElement | null;

    firstInputRef.current?.focus();

    return () => previouslyFocused?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !isSaving) {
      event.stopPropagation();
      onClose();
      return;
    }

    trapTab(event, dialogRef.current);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const next: WipLimits = {};

    for (const status of LIMITED_STATUSES) {
      const text = String(formData.get(status) ?? "").trim();

      next[status] = text ? Number(text) : null;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave(next);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible guardar los límites.",
      );
      setIsSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>Límite de trabajo en curso</h2>

        <p id={descriptionId} className="wip-limits-hint">
          Máximo de tareas recomendado por columna. Al superarlo, la columna se
          marca en rojo, pero no se bloquea nada. Déjalo vacío para no tener
          límite.
        </p>

        <form className="wip-limits-form" onSubmit={handleSubmit}>
          {LIMITED_STATUSES.map((status, index) => (
            <div className="field" key={status}>
              <label htmlFor={`${titleId}-${status}`}>
                {STATUS_LABELS[status]}
              </label>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                id={`${titleId}-${status}`}
                name={status}
                type="number"
                min={1}
                max={MAX_WIP_LIMIT}
                step={1}
                placeholder="Sin límite"
                defaultValue={limits[status] ?? ""}
              />
            </div>
          ))}

          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          <div className="actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WipLimitsDialog;
