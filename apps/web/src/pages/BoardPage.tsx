import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { ApiError } from "../api/projects";
import { createWorkItem, getBoard } from "../api/board";
import type { Board, WorkItemStatus } from "../api/board";
import type { AddItemValues } from "../components/AddItemForm";
import KanbanBoard from "../components/KanbanBoard";

import "./BoardPage.css";

type Result =
  | { status: "success"; board: Board }
  | { status: "not-found" }
  | { status: "error"; message: string };

const TEMP_USER_ID = "11111111-1111-1111-1111-111111111111";

function BoardPage() {
  const { projectId = "" } = useParams();
  const [attempt, setAttempt] = useState(0);
  // Mensaje para lectores de pantalla tras crear una tarea
  const [announcement, setAnnouncement] = useState("");
  const [result, setResult] = useState<{ key: string; result: Result } | null>(
    null,
  );

  // Mientras no llegue el resultado de esta carga, la página está cargando
  const requestKey = `${projectId}:${attempt}`;
  const state = result?.key === requestKey ? result.result : null;

  useEffect(() => {
    const controller = new AbortController();
    const setState = (value: Result) =>
      setResult({ key: requestKey, result: value });

    getBoard(projectId, controller.signal)
      .then((board) => setState({ status: "success", board }))
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
          message:
            error instanceof Error
              ? error.message
              : "No fue posible cargar el tablero",
        });
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  if (!state) {
    return (
      <p className="board-status" role="status">
        Cargando tablero…
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
        <h1>No fue posible cargar el tablero</h1>
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

  const { project, columns } = state.board;

  async function handleCreateItem(
    status: WorkItemStatus,
    values: AddItemValues,
  ) {
    const item = await createWorkItem(project.id, {
      ...values,
      status,
      createdBy: TEMP_USER_ID,
    });

    // La tarea nueva queda al final de su columna, sin recargar el tablero
    setResult({
      key: requestKey,
      result: {
        status: "success",
        board: {
          project,
          columns: columns.map((column) =>
            column.status === status
              ? { ...column, items: [...column.items, item] }
              : column,
          ),
        },
      },
    });
    setAnnouncement(`Tarea "${item.title}" creada.`);
  }

  return (
    <div className="board-page">
      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <ol>
          <li>
            <Link to={project.is_archived ? "/projects/archived" : "/projects"}>
              {project.is_archived ? "Archivados" : "Proyectos"}
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
          </li>
          <li>
            <Link to={`/projects/${project.id}`}>{project.name}</Link>
            <ChevronRight size={14} aria-hidden="true" />
          </li>
          <li aria-current="page">Tablero</li>
        </ol>
      </nav>

      <h1 className="board-title">Tablero</h1>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {project.is_archived && (
        <p className="board-archived">
          Este proyecto está archivado. Restáuralo para agregar tareas.
        </p>
      )}

      <KanbanBoard
        columns={columns}
        onCreateItem={project.is_archived ? undefined : handleCreateItem}
      />
    </div>
  );
}

export default BoardPage;
