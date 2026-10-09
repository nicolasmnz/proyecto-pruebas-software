import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";

import {
  STATUS_LABELS,
  deleteWorkItem,
  getWorkItem,
  updateWorkItem,
} from "../api/board";
import type { BoardMember, WorkItemDetail } from "../api/board";
import { formatDate, formatDueDate } from "../utils/format";
import ConfirmDialog from "./ConfirmDialog";
import TaskForm from "./TaskForm";
import type { TaskFormValues } from "./TaskForm";
import { PRIORITY_LABELS, TYPE_LABELS } from "./taskLabels";

import "./TaskDialog.css";

interface TaskDialogProps {
  projectId: string;
  itemId: string;
  members: BoardMember[];
  // En proyectos archivados la ficha solo se puede leer
  readOnly: boolean;
  onClose: () => void;
  onUpdated: (item: WorkItemDetail) => void;
  onDeleted: (item: WorkItemDetail) => void;
}

type State =
  | { status: "success"; item: WorkItemDetail }
  | { status: "error"; message: string };

const FOCUSABLE =
  "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function TaskDialog({
  projectId,
  itemId,
  members,
  readOnly,
  onClose,
  onUpdated,
  onDeleted,
}: TaskDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; state: State } | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mientras no llegue el resultado de esta carga, el diálogo está cargando
  const requestKey = `${itemId}:${attempt}`;
  const state = result?.key === requestKey ? result.state : null;

  useEffect(() => {
    const controller = new AbortController();

    getWorkItem(projectId, itemId, controller.signal)
      .then((item) =>
        setResult({ key: requestKey, state: { status: "success", item } }),
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key: requestKey,
            state: {
              status: "error",
              message: getErrorMessage(error, "No fue posible cargar la tarea"),
            },
          });
        }
      });

    return () => controller.abort();
  }, [projectId, itemId, requestKey]);

  useEffect(() => {
    // Devuelve el foco a la tarjeta que abrió el diálogo al cerrarlo
    const previouslyFocused = document.activeElement as HTMLElement | null;

    dialogRef.current?.focus();

    return () => previouslyFocused?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Escape cierra el diálogo; en edición lo atiende el formulario
    if (event.key === "Escape" && !isEditing) {
      onClose();
      return;
    }

    // Mantiene el foco dentro del diálogo
    if (event.key === "Tab") {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === dialogRef.current) {
        event.preventDefault();
        last?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  async function handleSave(item: WorkItemDetail, values: TaskFormValues) {
    // PUT reemplaza la ficha: lo que queda vacío en el formulario se borra
    const updated = await updateWorkItem(projectId, item.id, values);

    setResult({ key: requestKey, state: { status: "success", item: updated } });
    setIsEditing(false);
    onUpdated(updated);
  }

  async function handleDelete(item: WorkItemDetail) {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteWorkItem(projectId, item.id);

      onDeleted(item);
    } catch (error) {
      setDeleteError(
        getErrorMessage(error, "No fue posible eliminar la tarea."),
      );
      setIsDeleting(false);
    }
  }

  const item = state?.status === "success" ? state.item : null;

  // El responsable actual siempre se puede elegir, aunque ya no sea miembro
  const assignableMembers =
    item?.assignee_id && !members.some(({ id }) => id === item.assignee_id)
      ? [
          ...members,
          { id: item.assignee_id, name: item.assignee_name ?? "Responsable" },
        ]
      : members;

  return (
    <>
      <div className="dialog-backdrop" onKeyDown={handleKeyDown}>
        <div
          ref={dialogRef}
          className="dialog task-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={item ? titleId : undefined}
          aria-label={item ? undefined : "Detalle de la tarea"}
          tabIndex={-1}
        >
          {!state && (
            <p role="status" className="task-dialog-status">
              Cargando tarea…
            </p>
          )}

          {state?.status === "error" && (
            <div role="alert" className="task-dialog-status">
              <p>{state.message}</p>
              <div className="actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {item && (
            <>
              <header className="task-dialog-header">
                <div>
                  <p className="task-dialog-key">
                    <span className="sr-only">Tarea </span>#{item.item_number}
                    {item.is_archived && (
                      <span className="badge">Archivada</span>
                    )}
                  </p>
                  <h2 id={titleId}>{item.title}</h2>
                </div>

                <button
                  type="button"
                  className="task-dialog-close"
                  aria-label="Cerrar"
                  onClick={onClose}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </header>

              {isEditing ? (
                <TaskForm
                  key={item.updated_at}
                  initialValues={{
                    title: item.title,
                    description: item.description ?? undefined,
                    type: item.type as TaskFormValues["type"],
                    priority: item.priority,
                    estimate: item.estimate ?? undefined,
                    assigneeId: item.assignee_id ?? undefined,
                    dueDate: item.due_date ?? undefined,
                  }}
                  members={assignableMembers}
                  submitLabel="Guardar cambios"
                  submittingLabel="Guardando..."
                  onSubmit={(values) => handleSave(item, values)}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  <dl className="task-dialog-meta">
                    <div>
                      <dt>Estado</dt>
                      <dd>{STATUS_LABELS[item.status]}</dd>
                    </div>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{TYPE_LABELS[item.type]}</dd>
                    </div>
                    <div>
                      <dt>Prioridad</dt>
                      <dd>{PRIORITY_LABELS[item.priority]}</dd>
                    </div>
                    <div>
                      <dt>Puntos</dt>
                      <dd>{item.estimate ?? "Sin estimar"}</dd>
                    </div>
                    <div>
                      <dt>Responsable</dt>
                      <dd>{item.assignee_name ?? "Sin asignar"}</dd>
                    </div>
                    <div>
                      <dt>Fecha límite</dt>
                      <dd>
                        {item.due_date
                          ? formatDueDate(item.due_date)
                          : "Sin fecha"}
                      </dd>
                    </div>
                    <div>
                      <dt>Creada por</dt>
                      <dd>{item.created_by_name}</dd>
                    </div>
                    <div>
                      <dt>Creada</dt>
                      <dd>
                        <time dateTime={item.created_at}>
                          {formatDate(item.created_at)}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Actualizada</dt>
                      <dd>
                        <time dateTime={item.updated_at}>
                          {formatDate(item.updated_at)}
                        </time>
                      </dd>
                    </div>
                  </dl>

                  <section aria-label="Descripción">
                    <h3 className="task-dialog-section">Descripción</h3>
                    {item.description ? (
                      <p className="task-dialog-description">
                        {item.description}
                      </p>
                    ) : (
                      <p className="task-dialog-description is-empty">
                        Esta tarea no tiene descripción.
                      </p>
                    )}
                  </section>

                  {!readOnly && (
                    <div className="actions task-dialog-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setDeleteError(null);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {item && isDeleteOpen && (
        <ConfirmDialog
          title="¿Eliminar esta tarea?"
          confirmLabel="Eliminar"
          confirmingLabel="Eliminando..."
          isConfirming={isDeleting}
          error={deleteError}
          onConfirm={() => handleDelete(item)}
          onCancel={() => setIsDeleteOpen(false)}
        >
          <p>
            <strong>
              #{item.item_number} {item.title}
            </strong>{" "}
            se eliminará de forma permanente.
          </p>
          <p>Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </>
  );
}

export default TaskDialog;
