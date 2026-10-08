import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  KanbanSquare,
  Pencil,
} from "lucide-react";

import { archiveProject, restoreProject, updateProject } from "../api/projects";
import type { Project } from "../api/projects";
import { useProjects } from "../context/projectsContext";
import { formatDate } from "../utils/format";
import ConfirmDialog from "./ConfirmDialog";
import ProjectAvatar from "./ProjectAvatar";
import ProjectForm from "./ProjectForm";
import type { ProjectFormValues } from "./ProjectForm";

import "./ProjectDetails.css";

interface ProjectDetailsProps {
  project: Project;
  onProjectChange: (project: Project) => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function ProjectDetails({ project, onProjectChange }: ProjectDetailsProps) {
  const { reload } = useProjects();

  const [isEditing, setIsEditing] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  // Mensaje para lectores de pantalla tras cada acción
  const [announcement, setAnnouncement] = useState("");

  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // Al cerrar el formulario, el foco vuelve al botón Editar
  useEffect(() => {
    if (wasEditing.current && !isEditing) {
      editButtonRef.current?.focus();
    }

    wasEditing.current = isEditing;
  }, [isEditing]);

  async function handleEdit(values: ProjectFormValues) {
    const updated = await updateProject(project.id, values);

    onProjectChange(updated);
    setIsEditing(false);
    setAnnouncement("Proyecto actualizado.");
    void reload();
  }

  async function handleArchive() {
    try {
      setIsArchiving(true);
      setArchiveError(null);

      const archived = await archiveProject(project.id);

      setIsArchiveDialogOpen(false);
      onProjectChange(archived);
      setAnnouncement("Proyecto archivado.");
      void reload();
    } catch (error) {
      setArchiveError(
        getErrorMessage(error, "No fue posible archivar el proyecto."),
      );
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleRestore() {
    try {
      setIsRestoring(true);
      setRestoreError(null);

      onProjectChange(await restoreProject(project.id));
      setAnnouncement("Proyecto restaurado.");
      void reload();
    } catch (error) {
      setRestoreError(
        getErrorMessage(error, "No fue posible restaurar el proyecto."),
      );
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <article className="project-detail">
      <p className="sr-only" role="status">
        {announcement}
      </p>

      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <ol>
          <li>
            {project.is_archived ? (
              <Link to="/projects/archived">Archivados</Link>
            ) : (
              <Link to="/projects">Proyectos</Link>
            )}
            <ChevronRight size={14} aria-hidden="true" />
          </li>
          <li aria-current="page">{project.name}</li>
        </ol>
      </nav>

      {project.is_archived && (
        <div className="archived-banner">
          <p>
            <Archive size={16} aria-hidden="true" />
            Este proyecto está archivado. Restáuralo para volver a editarlo.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRestore}
            disabled={isRestoring}
          >
            <ArchiveRestore size={16} aria-hidden="true" />
            {isRestoring ? "Restaurando..." : "Restaurar"}
          </button>
        </div>
      )}

      {restoreError && (
        <p role="alert" className="form-error">
          {restoreError}
        </p>
      )}

      <header className="project-detail-header">
        <ProjectAvatar id={project.id} name={project.name} size="lg" />

        <div className="project-detail-header-text">
          <h1>{project.name}</h1>
          {project.is_archived && <span className="badge">Archivado</span>}
        </div>

        {!project.is_archived && !isEditing && (
          <div className="project-detail-actions">
            <Link to={`/projects/${project.id}/board`} className="btn-primary">
              <KanbanSquare size={16} aria-hidden="true" />
              Ver tablero
            </Link>
            <button
              ref={editButtonRef}
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
                setArchiveError(null);
                setIsArchiveDialogOpen(true);
              }}
            >
              <Archive size={16} aria-hidden="true" />
              Archivar
            </button>
          </div>
        )}
      </header>

      {isEditing ? (
        <section aria-labelledby="edit-title" className="panel edit-panel">
          <h2 id="edit-title">Editar proyecto</h2>
          <ProjectForm
            initialValues={{
              name: project.name,
              description: project.description ?? undefined,
            }}
            submitLabel="Guardar cambios"
            submittingLabel="Guardando..."
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
          />
        </section>
      ) : (
        <div className="project-detail-layout">
          <section aria-labelledby="description-title" className="panel">
            <h2 id="description-title">Descripción</h2>
            {project.description ? (
              <p className="project-detail-description">
                {project.description}
              </p>
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
      )}

      {isArchiveDialogOpen && (
        <ConfirmDialog
          title="¿Archivar este proyecto?"
          confirmLabel="Archivar"
          confirmingLabel="Archivando..."
          isConfirming={isArchiving}
          error={archiveError}
          onConfirm={handleArchive}
          onCancel={() => setIsArchiveDialogOpen(false)}
        >
          <p>
            <strong>{project.name}</strong> dejará de aparecer en la lista de
            proyectos y pasará a la carpeta Archivados.
          </p>
          <p>Puedes restaurarlo cuando quieras.</p>
        </ConfirmDialog>
      )}
    </article>
  );
}

export default ProjectDetails;
