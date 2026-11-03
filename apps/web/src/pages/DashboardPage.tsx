import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ChevronRight, Lock } from "lucide-react";

import { getBoard } from "../api/board";
import type { Board } from "../api/board";
import { getEpics } from "../api/epics";
import type { Epic } from "../api/epics";
import { canManageProject, getProjectMembers } from "../api/members";
import type { ProjectMember } from "../api/members";
import { ApiError } from "../api/projects";
import { getSprints } from "../api/sprints";
import type { Sprint } from "../api/sprints";
import { useCurrentUser } from "../context/authContext";
import {
  describeSprintTiming,
  getActiveSprints,
  getMemberLoad,
  getOverdueItems,
} from "../utils/dashboard";
import { formatDueDate } from "../utils/format";
import { getLocalToday } from "../utils/myTasks";
import {
  describeProgress,
  getAllItems,
  getEpicItems,
  getProgress,
} from "../utils/progress";
import type { Progress } from "../utils/progress";
import { getSprintItems } from "../utils/sprints";

import "./BoardPage.css";
import "./DashboardPage.css";

type Result =
  | {
      status: "success";
      board: Board;
      epics: Epic[];
      sprints: Sprint[];
      members: ProjectMember[];
    }
  | { status: "not-found" }
  | { status: "error"; message: string };

interface ProgressMeterProps {
  // Nombre accesible de la barra
  label: string;
  progress: Progress;
  emptyText: string;
}

function ProgressMeter({ label, progress, emptyText }: ProgressMeterProps) {
  return (
    <div className="dashboard-meter">
      <p>{progress.total === 0 ? emptyText : describeProgress(progress)}</p>
      <div
        className="board-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percentage}
        aria-valuetext={`${progress.percentage} % completado`}
      >
        <div
          className="board-progress-fill"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatRange(sprint: Sprint) {
  if (!sprint.start_date && !sprint.end_date) {
    return "Sin fechas";
  }

  return [sprint.start_date, sprint.end_date]
    .map((date) => (date ? formatDueDate(date) : "sin fecha"))
    .join(" – ");
}

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

function DashboardPage() {
  const { projectId = "" } = useParams();
  const currentUser = useCurrentUser();
  const [attempt, setAttempt] = useState(0);
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

    Promise.all([
      getBoard(projectId, controller.signal),
      getEpics(projectId, controller.signal),
      getSprints(projectId, controller.signal),
      getProjectMembers(projectId, controller.signal),
    ])
      .then(([board, epics, sprints, members]) =>
        setState({ status: "success", board, epics, sprints, members }),
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
          message:
            error instanceof Error
              ? error.message
              : "No fue posible cargar el panel",
        });
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  if (!state) {
    return (
      <p className="board-status" role="status">
        Cargando panel…
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
        <h1>No fue posible cargar el panel</h1>
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

  const { board, epics, sprints, members } = state;
  const { project } = board;
  const role = members.find(({ id }) => id === currentUser.id)?.role;

  // Solo el dueño y los jefes de proyecto ven el panel
  if (!canManageProject(role)) {
    return (
      <section className="board-message">
        <Lock size={24} aria-hidden="true" />
        <h1>Panel solo para la jefatura del proyecto</h1>
        <p>
          Solo el dueño y los jefes de proyecto de {project.name} pueden ver su
          panel.
        </p>
        <Link to={`/projects/${project.id}/board`} className="btn-primary">
          Ver tablero
        </Link>
      </section>
    );
  }

  const today = getLocalToday();
  const boardPath = `/projects/${project.id}/board`;
  const projectProgress = getProgress(getAllItems(board));
  const activeSprints = getActiveSprints(sprints);
  const load = getMemberLoad(getAllItems(board), board.members);
  const overdue = getOverdueItems(getAllItems(board), today);

  return (
    <div className="dashboard-page">
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
          <li aria-current="page">Panel</li>
        </ol>
      </nav>

      <h1 className="board-title">Panel del proyecto</h1>

      {project.is_archived && (
        <p className="board-archived">
          Este proyecto está archivado: el panel muestra cómo quedó.
        </p>
      )}

      <div className="dashboard-grid">
        <section
          className="dashboard-card"
          aria-labelledby="dashboard-project-title"
        >
          <h2 id="dashboard-project-title">Avance del proyecto</h2>
          <ProgressMeter
            label="Avance del proyecto"
            progress={projectProgress}
            emptyText="Aún no hay tareas"
          />
        </section>

        <section
          className="dashboard-card"
          aria-labelledby="dashboard-sprint-title"
        >
          <h2 id="dashboard-sprint-title">
            {activeSprints.length > 1 ? "Sprints activos" : "Sprint activo"}
          </h2>

          {activeSprints.length === 0 ? (
            <div className="dashboard-empty">
              <p>No hay un sprint activo.</p>
              <Link to={`/projects/${project.id}/sprints`}>Ver sprints</Link>
            </div>
          ) : (
            <ul className="dashboard-list">
              {activeSprints.map((sprint) => {
                const timing = describeSprintTiming(sprint, today);

                return (
                  <li key={sprint.id} className="dashboard-sprint">
                    <h3>{sprint.name}</h3>
                    <p className="dashboard-muted">{formatRange(sprint)}</p>
                    <p
                      className={
                        timing.isLate
                          ? "dashboard-timing is-late"
                          : "dashboard-timing"
                      }
                    >
                      {timing.isLate && (
                        <AlertTriangle size={14} aria-hidden="true" />
                      )}
                      {timing.text}
                    </p>
                    <ProgressMeter
                      label={`Avance de ${sprint.name}`}
                      progress={getProgress(getSprintItems(board, sprint.id))}
                      emptyText="Este sprint aún no tiene tareas"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="dashboard-card"
          aria-labelledby="dashboard-epics-title"
        >
          <h2 id="dashboard-epics-title">Épicas</h2>

          {epics.length === 0 ? (
            <div className="dashboard-empty">
              <p>Este proyecto no tiene épicas.</p>
              <Link to={`/projects/${project.id}/epics`}>Ver épicas</Link>
            </div>
          ) : (
            <ul className="dashboard-list">
              {epics.map((epic) => {
                const progress = getProgress(getEpicItems(board, epic.id));

                return (
                  <li key={epic.id} className="dashboard-epic">
                    <Link
                      to={`${boardPath}?epic=${encodeURIComponent(epic.id)}`}
                    >
                      {epic.title}
                    </Link>
                    <ProgressMeter
                      label={`Avance de ${epic.title}`}
                      progress={progress}
                      emptyText="Sin tareas"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="dashboard-card"
          aria-labelledby="dashboard-load-title"
        >
          <h2 id="dashboard-load-title">Carga por integrante</h2>

          <table className="dashboard-table">
            <thead>
              <tr>
                <th scope="col">Integrante</th>
                <th scope="col">Tareas pendientes</th>
                <th scope="col">Puntos pendientes</th>
              </tr>
            </thead>
            <tbody>
              {[...load.members, load.unassigned].map((row) => (
                <tr
                  key={row.id ?? "unassigned"}
                  className={row.id ? undefined : "is-unassigned"}
                >
                  <th scope="row">
                    <Link
                      to={`${boardPath}?assignee=${encodeURIComponent(row.id ?? "none")}`}
                    >
                      {row.name}
                    </Link>
                  </th>
                  <td>{row.tasks}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section
          className="dashboard-card dashboard-card-wide"
          aria-labelledby="dashboard-overdue-title"
        >
          {/* La sección se nombra solo con el título, sin el contador */}
          <h2>
            <span id="dashboard-overdue-title">Tareas vencidas</span>
            {overdue.length > 0 && (
              <span className="dashboard-count">{overdue.length}</span>
            )}
          </h2>

          {overdue.length === 0 ? (
            <p className="dashboard-empty">No hay tareas vencidas.</p>
          ) : (
            <ul className="dashboard-overdue">
              {overdue.map(({ item, daysLate }) => (
                <li key={item.id}>
                  <Link
                    className="dashboard-overdue-link"
                    to={`${boardPath}?task=${encodeURIComponent(item.id)}`}
                  >
                    <span className="dashboard-overdue-key">
                      #{item.item_number}
                    </span>
                    {item.title}
                  </Link>
                  <span className="dashboard-muted">
                    {item.assignee_name ?? "Sin asignar"}
                  </span>
                  <span className="dashboard-overdue-late">
                    Venció el {formatDueDate(item.due_date as string)} · hace{" "}
                    {plural(daysLate, "día")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
