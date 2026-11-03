import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Dices, Pencil, Trash2, X } from "lucide-react";

import {
  STATUS_LABELS,
  deleteWorkItem,
  getWorkItem,
  updateWorkItem,
} from "../api/board";
import type { BoardItem, BoardMember, WorkItemDetail } from "../api/board";
import { assignWorkItemToEpic } from "../api/epics";
import type { Epic } from "../api/epics";
import { trapTab } from "../utils/focusTrap";
import { formatDate, formatDueDate } from "../utils/format";
import type { RouletteSlice } from "../utils/roulette";
import ConfirmDialog from "./ConfirmDialog";
import RoulettePanel from "./RoulettePanel";
import TaskForm from "./TaskForm";
import type { TaskFormValues } from "./TaskForm";
import { PRIORITY_LABELS, TYPE_LABELS } from "./taskLabels";

import "./TaskDialog.css";

interface TaskDialogProps {
  projectId: string;
  itemId: string;
  members: BoardMember[];
  // Épicas activas del proyecto, para mostrar y cambiar la de la tarea
  epics: Epic[];
  // Historia de la que cuelga la tarea (épica → historia → tarea): la épica
  // es la de la historia y no se cambia desde aquí, para no romper el vínculo
  story?: Pick<BoardItem, "item_number" | "title" | "parent_id"> | null;
  // Probabilidad de cada integrante en la ruleta; sin integrantes no se ofrece
  roulette?: RouletteSlice[];
  // En proyectos archivados la ficha solo se puede leer
  readOnly: boolean;
  onClose: () => void;
  onUpdated: (item: WorkItemDetail) => void;
  onDeleted: (item: WorkItemDetail) => void;
}

type State =
  | { status: "success"; item: WorkItemDetail }
  | { status: "error"; message: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function TaskDialog({
  projectId,
  itemId,
  members,
  epics,
  story = null,
  roulette = [],
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
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
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

    trapTab(event, dialogRef.current);
  }

  async function handleSave(item: WorkItemDetail, values: TaskFormValues) {
    const { epicId, ...fields } = values;

    // PUT reemplaza la ficha: lo que queda vacío en el formulario se borra
    let updated = await updateWorkItem(projectId, item.id, fields);

    // La épica no viaja en el PUT: se cambia solo si cambió. Si la tarea
    // cuelga de una historia, su parent_id es la historia y no se toca
    const parentId = epicId ?? null;

    if (!story && parentId !== item.parent_id) {
      try {
        const assigned = await assignWorkItemToEpic(
          projectId,
          item.id,
          parentId,
        );

        updated = { ...updated, parent_id: assigned.parent_id };
      } catch (error) {
        // Los demás cambios ya se guardaron: el tablero los refleja y el
        // formulario sigue abierto para reintentar
        onUpdated(updated);

        throw new Error(
          `Se guardaron los demás cambios, pero no la épica: ${getErrorMessage(
            error,
            "no fue posible cambiarla",
          )}`,
          { cause: error },
        );
      }
    }

    setResult({ key: requestKey, state: { status: "success", item: updated } });
    setIsEditing(false);
    onUpdated(updated);
  }

  // La ruleta solo cambia el responsable: el resto de la ficha se reenvía tal cual
  async function handleRouletteAssign(item: WorkItemDetail, memberId: string) {
    const updated = await updateWorkItem(projectId, item.id, {
      title: item.title,
      description: item.description ?? undefined,
      type: item.type as TaskFormValues["type"],
      priority: item.priority,
      estimate: item.estimate ?? undefined,
      assigneeId: memberId,
      dueDate: item.due_date ?? undefined,
    });

    setResult({ key: requestKey, state: { status: "success", item: updated } });
    setIsRouletteOpen(false);
    onUpdated(updated);
    dialogRef.current?.focus();
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

  // La épica actual siempre se puede conservar, aunque esté archivada
  const epicId = story ? story.parent_id : (item?.parent_id ?? null);
  const currentEpic = epics.find(({ id }) => id === epicId);
  const selectableEpics =
    epicId && !currentEpic
      ? [...epics, { id: epicId, title: "Épica archivada" }]
      : epics;
  const storyLabel = story ? `#${story.item_number} ${story.title}` : null;

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
                    epicId: epicId ?? undefined,
                  }}
                  members={assignableMembers}
                  epics={selectableEpics}
                  epicHint={
                    storyLabel
                      ? `La épica viene de su historia ${storyLabel}.`
                      : undefined
                  }
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
                      <dt>Épica</dt>
                      <dd>
                        {currentEpic?.title ??
                          (epicId ? "Épica archivada" : "Sin épica")}
                        {storyLabel && (
                          <span className="task-dialog-story">
                            Por su historia {storyLabel}
                          </span>
                        )}
                      </dd>
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

                  {isRouletteOpen && (
                    <RoulettePanel
                      slices={roulette}
                      onAssign={(memberId) =>
                        handleRouletteAssign(item, memberId)
                      }
                      onCancel={() => setIsRouletteOpen(false)}
                    />
                  )}

                  {!readOnly && !isRouletteOpen && (
                    <div className="actions task-dialog-actions">
                      {/* Solo para tareas sin responsable que aún se trabajan */}
                      {!item.assignee_id &&
                        !item.is_archived &&
                        roulette.length > 0 && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setIsRouletteOpen(true)}
                          >
                            <Dices size={16} aria-hidden="true" />
                            Girar ruleta
                          </button>
                        )}
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
