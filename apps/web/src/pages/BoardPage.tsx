import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { ApiError } from "../api/projects";
import {
  STATUS_LABELS,
  archiveWorkItem,
  createWorkItem,
  getBoard,
  moveWorkItem,
  restoreWorkItem,
  saveWipLimits,
} from "../api/board";
import type {
  Board,
  BoardItem,
  WipLimits,
  WorkItemDetail,
  WorkItemStatus,
} from "../api/board";
import ArchivedItems from "../components/ArchivedItems";
import BoardToolbar from "../components/BoardToolbar";
import BoardProgress from "../components/BoardProgress";
import KanbanBoard from "../components/KanbanBoard";
import TaskDialog from "../components/TaskDialog";
import WipLimitsDialog from "../components/WipLimitsDialog";
import type { TaskFormValues } from "../components/TaskForm";

import { hasActiveFilters, matchesFilters } from "../utils/boardFilters";
import type { BoardFilters } from "../utils/boardFilters";

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
  const [actionError, setActionError] = useState<string | null>(null);
  // Tarea cuya ficha está abierta
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [isLimitsOpen, setIsLimitsOpen] = useState(false);
  // Los filtros viven en la URL para poder compartir o recargar la vista
  const [searchParams, setSearchParams] = useSearchParams();
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

  const { project } = state.board;

  const filters: BoardFilters = {
    query: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    priority: searchParams.get("priority") ?? "",
    assignee: searchParams.get("assignee") ?? "",
  };
  const isFiltering = hasActiveFilters(filters);

  function handleFiltersChange(next: BoardFilters) {
    const params = new URLSearchParams();

    if (next.query) params.set("q", next.query);
    if (next.type) params.set("type", next.type);
    if (next.priority) params.set("priority", next.priority);
    if (next.assignee) params.set("assignee", next.assignee);

    // Escribir en el buscador no llena el historial del navegador
    setSearchParams(params, { replace: true });
  }

  const allItems = state.board.columns.flatMap((column) => column.items);
  const shownCount = isFiltering
    ? allItems.filter((item) => matchesFilters(item, filters)).length
    : allItems.length;

  // Aplica un cambio al tablero ya cargado, sin volver a pedirlo
  function updateBoard(change: (board: Board) => Board) {
    setResult((current) => {
      if (current?.key !== requestKey || current.result.status !== "success") {
        return current;
      }

      return {
        key: requestKey,
        result: { status: "success", board: change(current.result.board) },
      };
    });
  }

  async function handleCreateItem(
    status: WorkItemStatus,
    values: TaskFormValues,
  ) {
    const item = await createWorkItem(project.id, {
      ...values,
      status,
      createdBy: TEMP_USER_ID,
    });

    // La tarea nueva queda al final de su columna, sin recargar el tablero
    updateBoard((board) => ({
      ...board,
      columns: board.columns.map((column) =>
        column.status === status
          ? { ...column, items: [...column.items, item] }
          : column,
      ),
    }));
    setAnnouncement(`Tarea "${item.title}" creada.`);
  }

  async function handleMoveItem(
    item: BoardItem,
    status: WorkItemStatus,
    index?: number,
  ) {
    if (!status || (status === item.status && index === undefined)) {
      return;
    }

    try {
      setActionError(null);

      const moved = await moveWorkItem(project.id, item.id, status, index);
      let position = 0;
      let size = 0;

      // La tarea sale de su columna y entra en la de destino, en `index`
      // (o al final si no se indicó)
      updateBoard((board) => ({
        ...board,
        columns: board.columns.map((column) => {
          const others = column.items.filter(({ id }) => id !== item.id);

          if (column.status !== status) {
            return { ...column, items: others };
          }

          position = Math.min(index ?? others.length, others.length);
          size = others.length + 1;

          return {
            ...column,
            items: [
              ...others.slice(0, position),
              moved,
              ...others.slice(position),
            ],
          };
        }),
      }));
      setAnnouncement(
        status === item.status
          ? `Tarea "${item.title}" movida a la posición ${position + 1} de ${size}.`
          : `Tarea "${item.title}" movida a ${STATUS_LABELS[status]}.`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No fue posible mover la tarea.",
      );
    }
  }

  async function handleSaveLimits(limits: WipLimits) {
    const saved = await saveWipLimits(project.id, limits);

    updateBoard((board) => ({ ...board, wip_limits: saved }));
    setIsLimitsOpen(false);
    setAnnouncement("Límites de trabajo actualizados.");
  }

  // La ficha editada reemplaza a la tarea en su columna o en las archivadas
  function handleItemUpdated(updated: WorkItemDetail) {
    updateBoard((board) => ({
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        items: column.items.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      })),
      archived: board.archived.map((item) =>
        item.id === updated.id ? updated : item,
      ),
    }));
    setAnnouncement(`Tarea "${updated.title}" actualizada.`);
  }

  function handleItemDeleted(deleted: WorkItemDetail) {
    updateBoard((board) => ({
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        items: column.items.filter(({ id }) => id !== deleted.id),
      })),
      archived: board.archived.filter(({ id }) => id !== deleted.id),
    }));
    setOpenItemId(null);
    setAnnouncement(`Tarea "${deleted.title}" eliminada.`);
  }

  async function handleArchiveItem(item: BoardItem) {
    try {
      setActionError(null);

      const archived = await archiveWorkItem(project.id, item.id);

      updateBoard((board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          items: column.items.filter(({ id }) => id !== item.id),
        })),
        archived: [archived, ...board.archived],
      }));
      setAnnouncement(`Tarea "${item.title}" archivada.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No fue posible archivar la tarea.",
      );
    }
  }

  async function handleRestoreItem(item: BoardItem) {
    try {
      setActionError(null);

      const restored = await restoreWorkItem(project.id, item.id);

      // Vuelve al final de su columna (Hecho)
      updateBoard((board) => ({
        ...board,
        columns: board.columns.map((column) =>
          column.status === restored.status
            ? { ...column, items: [...column.items, restored] }
            : column,
        ),
        archived: board.archived.filter(({ id }) => id !== item.id),
      }));
      setAnnouncement(`Tarea "${item.title}" restaurada.`);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "No fue posible restaurar la tarea.",
      );
    }
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

      {actionError && (
        <p role="alert" className="form-error board-error">
          {actionError}
        </p>
      )}

      <BoardProgress
        columns={state.board.columns}
        archived={state.board.archived}
      />

      <BoardToolbar
        filters={filters}
        onChange={handleFiltersChange}
        members={state.board.members}
        shown={shownCount}
        total={allItems.length}
        onEditLimits={
          project.is_archived ? undefined : () => setIsLimitsOpen(true)
        }
      />

      <KanbanBoard
        columns={state.board.columns}
        wipLimits={state.board.wip_limits}
        isFiltering={isFiltering}
        isVisible={(item) => matchesFilters(item, filters)}
        onCreateItem={project.is_archived ? undefined : handleCreateItem}
        onOpenItem={(item) => setOpenItemId(item.id)}
        onMoveItem={project.is_archived ? undefined : handleMoveItem}
        onArchiveItem={project.is_archived ? undefined : handleArchiveItem}
      />

      <ArchivedItems
        items={state.board.archived}
        onOpen={(item) => setOpenItemId(item.id)}
        onRestore={project.is_archived ? undefined : handleRestoreItem}
      />

      {isLimitsOpen && (
        <WipLimitsDialog
          limits={state.board.wip_limits}
          onSave={handleSaveLimits}
          onClose={() => setIsLimitsOpen(false)}
        />
      )}

      {openItemId && (
        <TaskDialog
          key={openItemId}
          projectId={project.id}
          itemId={openItemId}
          members={state.board.members}
          readOnly={project.is_archived}
          onClose={() => setOpenItemId(null)}
          onUpdated={handleItemUpdated}
          onDeleted={handleItemDeleted}
        />
      )}
    </div>
  );
}

export default BoardPage;
