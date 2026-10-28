import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";

import { getBoard } from "../api/board";
import type { Board } from "../api/board";
import { archiveEpic, createEpic, getEpics, updateEpic } from "../api/epics";
import type { Epic } from "../api/epics";
import { ApiError } from "../api/projects";
import ConfirmDialog from "../components/ConfirmDialog";
import EpicCard from "../components/EpicCard";
import EpicForm from "../components/EpicForm";
import type { EpicFormValues } from "../components/EpicForm";
import { getEpicItems, getProgress } from "../utils/progress";

import "./BoardPage.css";
import "./EpicsPage.css";

type Result =
  | { status: "success"; board: Board; epics: Epic[] }
  | { status: "not-found" }
  | { status: "error"; message: string };

const TEMP_USER_ID = "11111111-1111-1111-1111-111111111111";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function EpicsPage() {
  const { projectId = "" } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; result: Result } | null>(
    null,
  );
  // Mensaje para lectores de pantalla tras cada acción
  const [announcement, setAnnouncement] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [archiving, setArchiving] = useState<Epic | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const wasCreating = useRef(false);

  // Mientras no llegue el resultado de esta carga, la página está cargando
  const requestKey = `${projectId}:${attempt}`;
  const state = result?.key === requestKey ? result.result : null;

  useEffect(() => {
    const controller = new AbortController();
    const setState = (value: Result) =>
      setResult({ key: requestKey, result: value });

    // El tablero trae el proyecto y las tareas para calcular el avance
    Promise.all([
      getBoard(projectId, controller.signal),
      getEpics(projectId, controller.signal),
    ])
      .then(([board, epics]) => setState({ status: "success", board, epics }))
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
          message: getErrorMessage(error, "No fue posible cargar las épicas"),
        });
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  // Al cerrar el formulario de creación, el foco vuelve a «Nueva épica»
  useEffect(() => {
    if (wasCreating.current && !isCreating) {
      createButtonRef.current?.focus();
    }

    wasCreating.current = isCreating;
  }, [isCreating]);

  if (!state) {
    return (
      <p className="board-status" role="status">
        Cargando épicas…
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
        <h1>No fue posible cargar las épicas</h1>
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

  const { board, epics } = state;
  const { project } = board;

  // Aplica un cambio a las épicas ya cargadas, sin volver a pedirlas
  function updateEpics(change: (epics: Epic[]) => Epic[]) {
    setResult((current) => {
      if (current?.key !== requestKey || current.result.status !== "success") {
        return current;
      }

      return {
        key: requestKey,
        result: { ...current.result, epics: change(current.result.epics) },
      };
    });
  }

  async function handleCreate(values: EpicFormValues) {
    const epic = await createEpic(project.id, {
      ...values,
      createdBy: TEMP_USER_ID,
    });

    // La API las lista de la más reciente a la más antigua
    updateEpics((epics) => [epic, ...epics]);
    setIsCreating(false);
    setAnnouncement(`Épica "${epic.title}" creada.`);
  }

  async function handleSave(epic: Epic, values: EpicFormValues) {
    const updated = await updateEpic(project.id, epic.id, {
      ...values,
      status: values.status ?? epic.status,
    });

    updateEpics((epics) =>
      epics.map((item) => (item.id === updated.id ? updated : item)),
    );
    setAnnouncement(`Épica "${updated.title}" actualizada.`);
  }

  async function handleArchive(epic: Epic) {
    try {
      setIsArchiving(true);
      setArchiveError(null);

      await archiveEpic(project.id, epic.id);

      updateEpics((epics) => epics.filter(({ id }) => id !== epic.id));
      setArchiving(null);
      setAnnouncement(`Épica "${epic.title}" archivada.`);
    } catch (error) {
      setArchiveError(
        getErrorMessage(error, "No fue posible archivar la épica."),
      );
    } finally {
      setIsArchiving(false);
    }
  }

  const readOnly = project.is_archived;

  return (
    <div className="epics-page">
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
          <li aria-current="page">Épicas</li>
        </ol>
      </nav>

      <header className="epics-header">
        <h1 className="board-title">Épicas</h1>

        {!readOnly && !isCreating && (
          <button
            ref={createButtonRef}
            type="button"
            className="btn-primary"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Nueva épica
          </button>
        )}
      </header>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {readOnly && (
        <p className="board-archived">
          Este proyecto está archivado. Restáuralo para gestionar sus épicas.
        </p>
      )}

      {isCreating && (
        <section aria-labelledby="new-epic-title" className="epics-new">
          <h2 id="new-epic-title">Nueva épica</h2>
          <EpicForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
          />
        </section>
      )}

      {epics.length === 0 ? (
        <p className="epics-empty">
          {readOnly
            ? "Este proyecto no tiene épicas."
            : "Este proyecto aún no tiene épicas. Crea una para agrupar tareas relacionadas."}
        </p>
      ) : (
        <ul className="epics-list" aria-label="Épicas del proyecto">
          {epics.map((epic) => (
            <li key={epic.id}>
              <EpicCard
                epic={epic}
                progress={getProgress(getEpicItems(board, epic.id))}
                onSave={
                  readOnly ? undefined : (values) => handleSave(epic, values)
                }
                onArchive={
                  readOnly
                    ? undefined
                    : () => {
                        setArchiveError(null);
                        setArchiving(epic);
                      }
                }
              />
            </li>
          ))}
        </ul>
      )}

      {archiving && (
        <ConfirmDialog
          title="¿Archivar esta épica?"
          confirmLabel="Archivar"
          confirmingLabel="Archivando..."
          isConfirming={isArchiving}
          error={archiveError}
          onConfirm={() => handleArchive(archiving)}
          onCancel={() => setArchiving(null)}
        >
          <p>
            <strong>{archiving.title}</strong> dejará de aparecer en la lista de
            épicas.
          </p>
          <p>Sus tareas seguirán en el tablero.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default EpicsPage;
