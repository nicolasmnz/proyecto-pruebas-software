import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";

import ProjectCard from "../components/ProjectCard";
import { useProjects } from "../context/projectsContext";
import { normalizeText } from "../utils/format";

import "./ProjectsPage.css";

function ProjectsPage() {
  const { projects, isLoading, error, reload } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const normalizedQuery = normalizeText(query);

  const filteredProjects = normalizedQuery
    ? projects.filter((project) =>
        normalizeText(`${project.name} ${project.description ?? ""}`).includes(
          normalizedQuery,
        ),
      )
    : projects;

  function handleQueryChange(value: string) {
    setSearchParams(value ? { q: value } : {}, { replace: true });
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="projects-grid" role="status" aria-label="Cargando proyectos">
          {[0, 1, 2].map((item) => (
            <div key={item} className="project-card-skeleton" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="projects-message" role="alert">
          <p className="projects-message-title">
            No fue posible cargar los proyectos
          </p>
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={reload}>
            Reintentar
          </button>
        </div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="projects-message">
          <p className="projects-message-title">Aún no hay proyectos</p>
          <p>Crea tu primer proyecto para empezar a organizar el trabajo.</p>
          <Link to="/projects/new" className="btn-primary">
            Crear proyecto
          </Link>
        </div>
      );
    }

    if (filteredProjects.length === 0) {
      return (
        <div className="projects-message">
          <p className="projects-message-title">
            No hay proyectos que coincidan con «{query}»
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleQueryChange("")}
          >
            Limpiar búsqueda
          </button>
        </div>
      );
    }

    return (
      <ul className="projects-grid" aria-label="Proyectos">
        {filteredProjects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="projects-page">
      <header className="projects-header">
        <div>
          <h1>Proyectos</h1>
          {!isLoading && !error && (
            <p className="projects-count">
              {projects.length === 1
                ? "1 proyecto"
                : `${projects.length} proyectos`}
            </p>
          )}
        </div>

        <Link to="/projects/new" className="btn-primary">
          <Plus size={16} aria-hidden="true" />
          Crear proyecto
        </Link>
      </header>

      <div className="projects-search">
        <Search size={16} aria-hidden="true" className="projects-search-icon" />
        <input
          type="search"
          aria-label="Buscar proyectos"
          placeholder="Buscar por nombre o descripción"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="projects-search-clear"
            aria-label="Limpiar búsqueda"
            onClick={() => handleQueryChange("")}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {renderContent()}
    </section>
  );
}

export default ProjectsPage;
