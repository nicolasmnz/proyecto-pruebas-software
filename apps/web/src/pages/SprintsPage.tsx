import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";

import { getBoard } from "../api/board";
import type { Board } from "../api/board";
import { ApiError } from "../api/projects";
import { createSprint, getSprints, updateSprint } from "../api/sprints";
import type { Sprint } from "../api/sprints";
import SprintCard from "../components/SprintCard";
import SprintForm from "../components/SprintForm";
import type { SprintFormValues } from "../components/SprintForm";
import SprintTaskList from "../components/SprintTaskList";
import {
  countActiveSprints,
  describeLoad,
  getBacklogItems,
  getSprintItems,
  sortSprints,
} from "../utils/sprints";

import "./BoardPage.css";
import "./SprintsPage.css";

type Result =
  | { status: "success"; board: Board; sprints: Sprint[] }
  | { status: "not-found" }
  | { status: "error"; message: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function SprintsPage() {
  const { projectId = "" } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; result: Result } | null>(
    null,
  );
  // Mensaje para lectores de pantalla tras cada acción
  const [announcement, setAnnouncement] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const wasCreating = useRef(false);

  // Mientras no llegue el resultado de esta carga, la página está cargando
  const requestKey = `${projectId}:${attempt}`;
  const state = result?.key === requestKey ? result.result : null;

  useEffect(() => {
    const controller = new AbortController();
    const setState = (value: Result) =>
      setResult({ key: requestKey, result: value });

    // El tablero trae el proyecto y las tareas de cada sprint
    Promise.all([
      getBoard(projectId, controller.signal),
      getSprints(projectId, controller.signal),
    ])
      .then(([board, sprints]) =>
        setState({ status: "success", board, sprints }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "not-found" });
          return;
        }

        setState({
          status: "error",
          message: getErrorMessage(error, "No fue posible cargar los sprints"),
        });
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  // Al cerrar el formulario de creación, el foco vuelve a «Nuevo sprint»
  useEffect(() => {
    if (wasCreating.current && !isCreating) {
      createButtonRef.current?.focus();
    }

    wasCreating.current = isCreating;
  }, [isCreating]);

  if (!state) {
    return (
      <p className="board-status" role="status">
        Cargando sprints…
      </p>
    );
  }

  if (state.status === "not-found") {
    return (
      <section className="board-message">
        <h1>Proyecto no encontrado</h1>
        <p>El proyecto que buscas no existe o el enlace es incorrecto.</p>
        <Link to="/projects" className="btn-primary">
          Ver todos los proyectos
        </Link>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="board-message" role="alert">
        <h1>No fue posible cargar los sprints</h1>
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

  const { board, sprints } = state;
  const { project } = board;
  const readOnly = project.is_archived;
  const activeCount = countActiveSprints(sprints);
  const backlog = getBacklogItems(board);

  // Aplica un cambio a los sprints ya cargados, sin volver a pedirlos
  function updateSprints(change: (sprints: Sprint[]) => Sprint[]) {
    setResult((current) => {
      if (current?.key !== requestKey || current.result.status !== "success") {
        return current;
      }

      return {
        key: requestKey,
        result: { ...current.result, sprints: change(current.result.sprints) },
      };
    });
  }

  async function handleCreate(values: SprintFormValues) {
    const sprint = await createSprint(project.id, values);

    updateSprints((sprints) => [sprint, ...sprints]);
    setIsCreating(false);
    setAnnouncement(`Sprint "${sprint.name}" creado.`);
  }

  async function handleSave(sprint: Sprint, values: SprintFormValues) {
    const updated = await updateSprint(project.id, sprint.id, {
      ...values,
      status: values.status ?? sprint.status,
    });

    updateSprints((sprints) =>
      sprints.map((item) => (item.id === updated.id ? updated : item)),
    );
    setAnnouncement(`Sprint "${updated.name}" actualizado.`);
  }

  return (
    <div className="sprints-page">
      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <ol>
          <li>
            <Link to={readOnly ? "/projects/archived" : "/projects"}>
              {readOnly ? "Archivados" : "Proyectos"}
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Link to={`/projects/${project.id}`}>{project.name}</Link>
            <ChevronRight size={14} aria-hidden="true" />
          </li>
          <li aria-current="page">Sprints</li>
        </ol>
      </nav>

      <header className="sprints-header">
        <h1 className="board-title">Sprints</h1>

        {!readOnly && !isCreating && (
          <button
            ref={createButtonRef}
            type="button"
            className="btn-primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo sprint
          </button>
        )}
      </header>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {readOnly && (
        <p className="board-archived">
          Este proyecto está archivado. Restáuralo para planificar sus sprints.
        </p>
      )}

      {/* Aviso de trabajo: se permite, pero no es lo habitual */}
      {activeCount > 1 && (
        <p className="sprints-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          Hay {activeCount} sprints activos al mismo tiempo. Lo habitual es
          trabajar en un solo sprint a la vez.
        </p>
      )}

      {isCreating && !readOnly && (
        <section aria-labelledby="new-sprint-title" className="sprints-new">
          <h2 id="new-sprint-title">Nuevo sprint</h2>
          <SprintForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </section>
      )}

      {sprints.length === 0 ? (
        <p className="sprints-empty">
          {readOnly
            ? "Este proyecto no tiene sprints."
            : "Este proyecto aún no tiene sprints. Crea uno para planificar la próxima iteración."}
        </p>
      ) : (
        <ul className="sprints-list" aria-label="Sprints del proyecto">
          {sortSprints(sprints).map((sprint) => (
            <li key={sprint.id}>
              <SprintCard
                sprint={sprint}
                items={getSprintItems(board, sprint.id)}
                onSave={
                  readOnly ? undefined : (values) => handleSave(sprint, values)
                }
              />
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="backlog-title" className="sprints-backlog">
        <header className="sprints-backlog-header">
          <h2 id="backlog-title">Backlog</h2>
          <p>{describeLoad(backlog)}</p>
        </header>

        <SprintTaskList
          items={backlog}
          emptyText="No hay tareas en el backlog: todas están en un sprint."
        />
      </section>
    </div>
  );
}

export default SprintsPage;
