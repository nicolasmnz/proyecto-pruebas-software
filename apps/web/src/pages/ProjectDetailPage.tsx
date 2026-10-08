import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { ApiError, getProject } from "../api/projects";
import type { Project } from "../api/projects";
import ProjectAvatar from "../components/ProjectAvatar";
import { formatDate } from "../utils/format";

import "./ProjectDetailPage.css";

type Result =
  | { status: "success"; project: Project }
  | { status: "not-found" }
  | { status: "error"; message: string };

type State = { status: "loading" } | Result;

function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; result: Result } | null>(
    null,
  );

  // Cada combinación proyecto/intento es una carga distinta: mientras no
  // llegue su resultado, la página está cargando (sin setState en el efecto)
  const requestKey = `${projectId}:${attempt}`;
  const state: State =
    result?.key === requestKey ? result.result : { status: "loading" };

  useEffect(() => {
    const controller = new AbortController();
    const setState = (result: Result) =>
      setResult({ key: requestKey, result });

    getProject(projectId, controller.signal)
      .then((project) => setState({ status: "success", project }))
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
              : "No fue posible cargar el proyecto",
        });
      });

    return () => controller.abort();
  }, [projectId, requestKey]);

  if (state.status === "loading") {
    return (
      <p className="project-detail-status" role="status">
        Cargando proyecto…
      </p>
    );
  }

  if (state.status === "not-found") {
    return (
      <section className="project-detail-message">
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
      <section className="project-detail-message" role="alert">
        <h1>No fue posible cargar el proyecto</h1>
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

  const { project } = state;

  return (
    <article className="project-detail">
      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <ol>
          <li>
            <Link to="/projects">Proyectos</Link>
            <ChevronRight size={14} aria-hidden="true" />
          </li>
          <li aria-current="page">{project.name}</li>
        </ol>
      </nav>

      <header className="project-detail-header">
        <ProjectAvatar id={project.id} name={project.name} size="lg" />
        <h1>{project.name}</h1>
        {project.is_archived && <span className="badge">Archivado</span>}
      </header>

      <div className="project-detail-layout">
        <section aria-labelledby="description-title" className="panel">
          <h2 id="description-title">Descripción</h2>
          {project.description ? (
            <p className="project-detail-description">{project.description}</p>
          ) : (
            <p className="project-detail-description is-empty">
              Este proyecto no tiene descripción.
            </p>
          )}
        </section>

        <aside aria-labelledby="details-title" className="panel">
          <h2 id="details-title">Detalles</h2>
          <dl className="project-detail-meta">
            <div>
              <dt>Creado</dt>
              <dd>
                <time dateTime={project.created_at}>
                  {formatDate(project.created_at)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>
                <time dateTime={project.updated_at}>
                  {formatDate(project.updated_at)}
                </time>
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </article>
  );
}

export default ProjectDetailPage;
