import { useState } from "react";
import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createProject } from "../api/projects";
import { useProjects } from "../context/projectsContext";

import "./CreateProjectPage.css";

const TEMP_USER_ID = "11111111-1111-1111-1111-111111111111";

function CreateProjectPage() {
  const navigate = useNavigate();
  const { reload } = useProjects();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const project = await createProject({
        name,
        description: description || undefined,
        createdBy: TEMP_USER_ID,
      });

      // Actualiza la lista y la barra lateral con el proyecto nuevo
      void reload();

      navigate(`/projects/${project.id}`);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("No fue posible crear el proyecto.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="create-project">
      <h1>Nuevo proyecto</h1>

      <p className="create-project-hint">
        Los campos marcados con <span aria-hidden="true">*</span> son
        obligatorios.
      </p>

      <form className="create-project-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">
            Nombre{" "}
            <span className="required" aria-hidden="true">
              *
            </span>
          </label>

          <input id="name" name="name" type="text" required />
        </div>

        <div className="field">
          <label htmlFor="description">Descripción</label>

          <textarea id="description" name="description" rows={4} />
        </div>

        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}

        <div className="actions">
          <Link to="/projects" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CreateProjectPage;
