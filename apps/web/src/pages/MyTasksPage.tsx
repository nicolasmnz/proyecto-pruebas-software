import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import { STATUS_LABELS } from "../api/board";
import { getAssignedItems } from "../api/myTasks";
import type { AssignedItem } from "../api/myTasks";
import { PRIORITY_LABELS, TYPE_LABELS } from "../components/taskLabels";
import { useCurrentUser } from "../context/authContext";
import { formatDueDate } from "../utils/format";
import {
  getLocalToday,
  groupByProject,
  isOverdue,
  isPending,
} from "../utils/myTasks";

import "../components/KanbanCard.css";
import "./BoardPage.css";
import "./MyTasksPage.css";

type Result =
  | { status: "success"; items: AssignedItem[] }
  | { status: "error"; message: string };

function describePending(count: number) {
  return count === 1 ? "1 tarea pendiente" : `${count} tareas pendientes`;
}

function MyTasksPage() {
  const currentUser = useCurrentUser();
  const doneToggleId = useId();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; result: Result } | null>(
    null,
  );
  // Las terminadas se ocultan por defecto. La opción se guarda en la URL para
  // recargar o compartir la vista, pero el checkbox usa estado propio: el
  // router aplica la URL en una transición y el checkbox se desmarcaría un
  // instante tras el clic
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDone, setShowDone] = useState(searchParams.get("done") === "1");

  // Mientras no llegue el resultado de esta carga, la página está cargando
  const requestKey = `${currentUser.id}:${attempt}`;
  const state = result?.key === requestKey ? result.result : null;

  useEffect(() => {
    const controller = new AbortController();

    getAssignedItems(currentUser.id, controller.signal)
      .then((items) =>
        setResult({ key: requestKey, result: { status: "success", items } }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setResult({
          key: requestKey,
          result: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No fue posible cargar tus tareas",
          },
        });
      });

    return () => controller.abort();
  }, [currentUser.id, requestKey]);

  if (!state) {
    return (
      <p className="board-status" role="status">
        Cargando tus tareas…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <section className="board-message" role="alert">
        <h1>No fue posible cargar tus tareas</h1>
        <p>{state.message}</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Reintentar
        </button>
      </section>
    );
  }

  const today = getLocalToday();
  const pendingCount = state.items.filter(isPending).length;
  const doneCount = state.items.length - pendingCount;
  const shown = showDone ? state.items : state.items.filter(isPending);
  const groups = groupByProject(shown);

  function handleShowDoneChange(checked: boolean) {
    setShowDone(checked);
    setSearchParams(checked ? { done: "1" } : {}, { replace: true });
  }

  return (
    <div className="my-tasks-page">
      <header className="my-tasks-header">
        <h1>Mis tareas</h1>
        <p>{describePending(pendingCount)}</p>
      </header>

      {state.items.length === 0 ? (
        <section className="my-tasks-empty">
          <h2>No tienes tareas asignadas</h2>
          <p>
            Cuando te asignen una tarea en un proyecto, aparecerá aquí con su
            estado, prioridad y fecha límite.
          </p>
          <Link to="/projects" className="btn-secondary">
            Ver proyectos
          </Link>
        </section>
      ) : (
        <>
          {doneCount > 0 && (
            <div className="my-tasks-options">
              <input
                id={doneToggleId}
                type="checkbox"
                checked={showDone}
                onChange={(event) => handleShowDoneChange(event.target.checked)}
              />
              <label htmlFor={doneToggleId}>
                Mostrar terminadas ({doneCount})
              </label>
            </div>
          )}

          {groups.length === 0 ? (
            <section className="my-tasks-empty">
              <h2>No tienes tareas pendientes</h2>
              <p>Todas tus tareas asignadas están terminadas.</p>
            </section>
          ) : (
            groups.map((group) => (
              <section
                key={group.projectId}
                className="my-tasks-group"
                aria-labelledby={`project-${group.projectId}`}
              >
                <h2 id={`project-${group.projectId}`}>
                  <Link to={`/projects/${group.projectId}/board`}>
                    {group.projectName}
                  </Link>
                </h2>

                <ul className="my-tasks-list">
                  {group.items.map((item) => {
                    const overdue = isOverdue(item, today);

                    return (
                      <li key={item.id} className="my-task">
                        <Link
                          className="my-task-link"
                          to={`/projects/${item.project_id}/board?task=${encodeURIComponent(item.id)}`}
                        >
                          <span className="my-task-key">
                            #{item.item_number}
                          </span>
                          <span className="my-task-title">{item.title}</span>
                        </Link>

                        <div className="kanban-card-meta my-task-meta">
                          <span
                            className={`kanban-type kanban-type-${item.type.toLowerCase()}`}
                          >
                            {TYPE_LABELS[item.type]}
                          </span>
                          <span
                            className={`my-task-status is-${item.status.toLowerCase()}`}
                          >
                            {STATUS_LABELS[item.status]}
                          </span>
                          <span
                            className={`kanban-priority kanban-priority-${item.priority.toLowerCase()}`}
                          >
                            Prioridad{" "}
                            {PRIORITY_LABELS[item.priority].toLowerCase()}
                          </span>
                          <span
                            className={
                              overdue ? "my-task-due is-overdue" : "my-task-due"
                            }
                          >
                            {item.due_date
                              ? `Vence el ${formatDueDate(item.due_date)}`
                              : "Sin fecha límite"}
                          </span>
                          {overdue && (
                            <span className="my-task-overdue">
                              <AlertCircle size={12} aria-hidden="true" />
                              Vencida
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default MyTasksPage;
