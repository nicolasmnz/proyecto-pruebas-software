import { Link } from "react-router-dom";

import type { Project } from "../api/projects";
import { formatDate } from "../utils/format";
import ProjectAvatar from "./ProjectAvatar";

import "./ProjectCard.css";

interface ProjectCardProps {
  project: Project;
}

function ProjectCard({ project }: ProjectCardProps) {
  return (
    <article className="project-card">
      <ProjectAvatar id={project.id} name={project.name} />

      <div className="project-card-body">
        <h2 className="project-card-name">
          {/* El enlace cubre toda la tarjeta mediante ::after */}
          <Link to={`/projects/${project.id}`}>{project.name}</Link>
        </h2>

        <p
          className={
            project.description
              ? "project-card-description"
              : "project-card-description is-empty"
          }
        >
          {project.description || "Sin descripción"}
        </p>

        <p className="project-card-meta">
          Creado el{" "}
          <time dateTime={project.created_at}>
            {formatDate(project.created_at)}
          </time>
        </p>
      </div>
    </article>
  );
}

export default ProjectCard;
