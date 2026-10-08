import { useNavigate } from "react-router-dom";

import { createProject } from "../api/projects";
import ProjectForm from "../components/ProjectForm";
import type { ProjectFormValues } from "../components/ProjectForm";
import { useProjects } from "../context/projectsContext";

import "./CreateProjectPage.css";

const TEMP_USER_ID = "11111111-1111-1111-1111-111111111111";

function CreateProjectPage() {
  const navigate = useNavigate();
  const { reload } = useProjects();

  async function handleSubmit(values: ProjectFormValues) {
    const project = await createProject({
      ...values,
      createdBy: TEMP_USER_ID,
    });

    // Actualiza la lista y la barra lateral con el proyecto nuevo
    void reload();

    navigate(`/projects/${project.id}`);
  }

  return (
    <section className="create-project">
      <h1>Nuevo proyecto</h1>

      <p className="create-project-hint">
        Los campos marcados con <span aria-hidden="true">*</span> son
        obligatorios.
      </p>

      <ProjectForm
        submitLabel="Guardar"
        submittingLabel="Guardando..."
        onSubmit={handleSubmit}
        onCancel={() => navigate("/projects")}
      />
    </section>
  );
}

export default CreateProjectPage;
