import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProjectDetailPage from "./ProjectDetailPage";
import { ApiError, getProject } from "../api/projects";
import type { Project } from "../api/projects";

vi.mock("../api/projects", async (importOriginal) => ({
  // Se mantiene ApiError real para que funcione instanceof
  ...(await importOriginal<typeof import("../api/projects")>()),
  getProject: vi.fn(),
}));

const mockedGetProject = vi.mocked(getProject);

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
    <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}`]}>
      <Routes>
        <Route path="/projects" element={<h1>Listado</h1>} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
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
});
