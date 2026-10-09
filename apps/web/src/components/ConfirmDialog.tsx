import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  isConfirming?: boolean;
  confirmingLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  title,
  children,
  confirmLabel,
  isConfirming = false,
  confirmingLabel = confirmLabel,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Devuelve el foco al elemento que abrió el diálogo al cerrarlo
    const previouslyFocused = document.activeElement as HTMLElement | null;

    cancelRef.current?.focus();

    return () => previouslyFocused?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !isConfirming) {
      event.stopPropagation();
      onCancel();
      return;
    }

    // Mantiene el foco dentro del diálogo
    if (event.key === "Tab") {
      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? [],
      );

      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  return (
    <div className="dialog-backdrop" onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>{title}</h2>

        <div id={descriptionId} className="dialog-body">
          {children}
        </div>

        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isConfirming}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
