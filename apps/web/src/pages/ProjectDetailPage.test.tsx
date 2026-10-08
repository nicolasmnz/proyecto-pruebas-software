import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProjectDetailPage from "./ProjectDetailPage";
import {
  ApiError,
  archiveProject,
  getProject,
  restoreProject,
  updateProject,
} from "../api/projects";
import type { Project } from "../api/projects";
import { ProjectsContext } from "../context/projectsContext";

vi.mock("../api/projects", async (importOriginal) => ({
  // Se mantiene ApiError real para que funcione instanceof
  ...(await importOriginal<typeof import("../api/projects")>()),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  restoreProject: vi.fn(),
}));

const mockedGetProject = vi.mocked(getProject);
const mockedUpdateProject = vi.mocked(updateProject);
const mockedArchiveProject = vi.mocked(archiveProject);
const mockedRestoreProject = vi.mocked(restoreProject);

const reloadProjects = vi.fn(async () => {});

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const project: Project = {
  id: PROJECT_ID,
  name: "Sistema de Gestión de Proyectos",
  description: "Aplicación web para administrar proyectos.",
  created_by: "11111111-1111-1111-1111-111111111111",
  is_archived: false,
  created_at: "2026-09-01T12:00:00Z",
  updated_at: "2026-10-07T12:00:00Z",
};

function renderPage() {
  render(
    <ProjectsContext.Provider
      value={{
        projects: [],
        archivedProjects: [],
        isLoading: false,
        error: null,
        reload: reloadProjects,
      }}
    >
      <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}`]}>
        <Routes>
          <Route path="/projects" element={<h1>Listado</h1>} />
          <Route path="/projects/archived" element={<h1>Archivados</h1>} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ProjectsContext.Provider>,
  );
}

async function renderLoadedPage(initialProject: Project = project) {
  mockedGetProject.mockResolvedValue(initialProject);

  renderPage();

  await screen.findByRole("heading", { level: 1, name: initialProject.name });
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra un indicador de carga", () => {
    mockedGetProject.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando proyecto");
  });

  test("obtiene el proyecto según el id de la URL y muestra su detalle", async () => {
    mockedGetProject.mockResolvedValue(project);

    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Sistema de Gestión de Proyectos",
      }),
    ).toBeInTheDocument();
    expect(mockedGetProject).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.any(AbortSignal),
    );
    expect(
      screen.getByText("Aplicación web para administrar proyectos."),
    ).toBeInTheDocument();
    expect(screen.getByText("Creado").nextSibling).toHaveTextContent("2026");
    expect(screen.queryByText("Archivado")).not.toBeInTheDocument();
  });

  test("indica cuando el proyecto no tiene descripción", async () => {
    mockedGetProject.mockResolvedValue({ ...project, description: null });

    renderPage();

    expect(
      await screen.findByText("Este proyecto no tiene descripción."),
    ).toBeInTheDocument();
  });

  test("marca los proyectos archivados", async () => {
    mockedGetProject.mockResolvedValue({ ...project, is_archived: true });

    renderPage();

    expect(await screen.findByText("Archivado")).toBeInTheDocument();
  });

  test("permite volver al listado desde la ruta de navegación", async () => {
    const user = userEvent.setup();
    mockedGetProject.mockResolvedValue(project);

    renderPage();

    const breadcrumb = await screen.findByRole("navigation", {
      name: "Ruta de navegación",
    });

    await user.click(
      within(breadcrumb).getByRole("link", { name: "Proyectos" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Listado" }),
    ).toBeInTheDocument();
  });

  test("muestra un mensaje cuando el proyecto no existe", async () => {
    mockedGetProject.mockRejectedValue(
      new ApiError("Proyecto no encontrado", 404),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver todos los proyectos" }),
    ).toHaveAttribute("href", "/projects");
  });

  test("muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockedGetProject
      .mockRejectedValueOnce(new ApiError("Error obteniendo proyecto", 500))
      .mockResolvedValueOnce(project);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo proyecto",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Sistema de Gestión de Proyectos",
      }),
    ).toBeInTheDocument();
    expect(mockedGetProject).toHaveBeenCalledTimes(2);
  });

  describe("editar", () => {
    test("el formulario se abre con los datos actuales", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Editar" }));

      expect(
        screen.getByRole("heading", { name: "Editar proyecto" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Nombre/)).toHaveValue(project.name);
      expect(screen.getByLabelText("Descripción")).toHaveValue(
        project.description,
      );
      // Mientras se edita no se ofrecen otras acciones
      expect(
        screen.queryByRole("button", { name: "Archivar" }),
      ).not.toBeInTheDocument();
    });

    test("guarda los cambios, muestra los datos nuevos y actualiza la barra lateral", async () => {
      const user = userEvent.setup();
      mockedUpdateProject.mockResolvedValue({
        ...project,
        name: "Nombre editado",
        description: "Descripción editada",
      });

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Editar" }));

      const nameInput = screen.getByLabelText(/Nombre/);
      const descriptionInput = screen.getByLabelText("Descripción");

      await user.clear(nameInput);
      await user.type(nameInput, "Nombre editado");
      await user.clear(descriptionInput);
      await user.type(descriptionInput, "Descripción editada");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(mockedUpdateProject).toHaveBeenCalledWith(PROJECT_ID, {
        name: "Nombre editado",
        description: "Descripción editada",
      });
      expect(
        await screen.findByRole("heading", { level: 1, name: "Nombre editado" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Descripción editada")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Proyecto actualizado.",
      );
      expect(screen.getByRole("button", { name: "Editar" })).toHaveFocus();
      expect(reloadProjects).toHaveBeenCalledTimes(1);
    });

    test("permite borrar la descripción", async () => {
      const user = userEvent.setup();
      mockedUpdateProject.mockResolvedValue({ ...project, description: null });

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Editar" }));
      await user.clear(screen.getByLabelText("Descripción"));
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(mockedUpdateProject).toHaveBeenCalledWith(PROJECT_ID, {
        name: project.name,
        description: undefined,
      });
      expect(
        await screen.findByText("Este proyecto no tiene descripción."),
      ).toBeInTheDocument();
    });

    test("cancelar descarta los cambios", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Editar" }));
      await user.type(screen.getByLabelText(/Nombre/), " cambiado");
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(
        screen.getByRole("heading", { level: 1, name: project.name }),
      ).toBeInTheDocument();
      expect(mockedUpdateProject).not.toHaveBeenCalled();
    });

    test("muestra el error de la API y mantiene el formulario abierto", async () => {
      const user = userEvent.setup();
      mockedUpdateProject.mockRejectedValue(
        new ApiError("name no puede superar 150 caracteres", 400),
      );

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Editar" }));
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "name no puede superar 150 caracteres",
      );
      expect(
        screen.getByRole("heading", { name: "Editar proyecto" }),
      ).toBeInTheDocument();
      expect(reloadProjects).not.toHaveBeenCalled();
    });
  });

  describe("archivar", () => {
    test("pide confirmación y no archiva si se cancela", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Archivar" }));

      const dialog = screen.getByRole("alertdialog", {
        name: "¿Archivar este proyecto?",
      });

      // El foco empieza en la opción segura
      expect(
        within(dialog).getByRole("button", { name: "Cancelar" }),
      ).toHaveFocus();

      await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(mockedArchiveProject).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Archivar" })).toHaveFocus();
    });

    test("Escape cierra el diálogo", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Archivar" }));
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    test("el foco no sale del diálogo con Tab", async () => {
      const user = userEvent.setup();

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Archivar" }));

      const dialog = screen.getByRole("alertdialog");

      await user.tab();
      expect(
        within(dialog).getByRole("button", { name: "Archivar" }),
      ).toHaveFocus();

      await user.tab();
      expect(
        within(dialog).getByRole("button", { name: "Cancelar" }),
      ).toHaveFocus();
    });

    test("al confirmar archiva el proyecto y ofrece restaurarlo", async () => {
      const user = userEvent.setup();
      mockedArchiveProject.mockResolvedValue({ ...project, is_archived: true });

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Archivar" }));
      await user.click(
        within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Archivar",
        }),
      );

      expect(mockedArchiveProject).toHaveBeenCalledWith(PROJECT_ID);
      expect(await screen.findByText("Archivado")).toBeInTheDocument();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Proyecto archivado.",
      );
      expect(
        screen.getByRole("button", { name: "Restaurar" }),
      ).toBeInTheDocument();
      // Un proyecto archivado no se puede editar ni volver a archivar
      expect(
        screen.queryByRole("button", { name: "Editar" }),
      ).not.toBeInTheDocument();
      expect(reloadProjects).toHaveBeenCalledTimes(1);
    });

    test("si falla, muestra el error dentro del diálogo", async () => {
      const user = userEvent.setup();
      mockedArchiveProject.mockRejectedValue(
        new ApiError("Error archivando proyecto", 500),
      );

      await renderLoadedPage();

      await user.click(screen.getByRole("button", { name: "Archivar" }));

      const dialog = screen.getByRole("alertdialog");

      await user.click(
        within(dialog).getByRole("button", { name: "Archivar" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Error archivando proyecto",
      );
      expect(reloadProjects).not.toHaveBeenCalled();
    });
  });

  describe("restaurar", () => {
    const archivedProject = { ...project, is_archived: true };

    test("un proyecto archivado muestra el aviso y la ruta a Archivados", async () => {
      await renderLoadedPage(archivedProject);

      expect(
        screen.getByText(/Este proyecto está archivado/),
      ).toBeInTheDocument();
      expect(
        within(
          screen.getByRole("navigation", { name: "Ruta de navegación" }),
        ).getByRole("link", { name: "Archivados" }),
      ).toHaveAttribute("href", "/projects/archived");
    });

    test("restaurar vuelve a habilitar la edición", async () => {
      const user = userEvent.setup();
      mockedRestoreProject.mockResolvedValue(project);

      await renderLoadedPage(archivedProject);

      await user.click(screen.getByRole("button", { name: "Restaurar" }));

      expect(mockedRestoreProject).toHaveBeenCalledWith(PROJECT_ID);
      expect(
        await screen.findByRole("button", { name: "Editar" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Archivado")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Proyecto restaurado.",
      );
      expect(reloadProjects).toHaveBeenCalledTimes(1);
    });

    test("si falla, muestra el error", async () => {
      const user = userEvent.setup();
      mockedRestoreProject.mockRejectedValue(
        new ApiError("Error restaurando proyecto", 500),
      );

      await renderLoadedPage(archivedProject);

      await user.click(screen.getByRole("button", { name: "Restaurar" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error restaurando proyecto",
      );
    });
  });
});
