import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import ProjectsPage from "./ProjectsPage";
import ProjectsProvider from "../context/ProjectsProvider";
import { getArchivedProjects, getProjects } from "../api/projects";
import type { Project } from "../api/projects";

vi.mock("../api/projects", () => ({
  getProjects: vi.fn(),
  getArchivedProjects: vi.fn(),
}));

const mockedGetProjects = vi.mocked(getProjects);
const mockedGetArchivedProjects = vi.mocked(getArchivedProjects);

function buildProject(overrides: Partial<Project>): Project {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Proyecto",
    description: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    is_archived: false,
    created_at: "2026-10-07T12:00:00Z",
    updated_at: "2026-10-07T12:00:00Z",
    ...overrides,
  };
}

const projects = [
  buildProject({
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Sistema de Gestión de Proyectos",
    description: "Aplicación web para administrar sprints.",
  }),
  buildProject({
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: "Portal de Eventos USM",
    description: "Eventos universitarios.",
  }),
];

const archivedProject = buildProject({
  id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  name: "Proyecto Antiguo",
  is_archived: true,
});

function renderPage(initialEntry = "/projects") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ProjectsProvider>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/projects/archived"
            element={<ProjectsPage archived />}
          />
          <Route path="/projects/new" element={<h1>Nuevo proyecto</h1>} />
          <Route path="/projects/:projectId" element={<h1>Detalle</h1>} />
        </Routes>
      </ProjectsProvider>
    </MemoryRouter>,
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetArchivedProjects.mockResolvedValue([archivedProject]);
  });

  test("muestra un indicador de carga mientras obtiene los proyectos", () => {
    mockedGetProjects.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(
      screen.getByRole("status", { name: "Cargando proyectos" }),
    ).toBeInTheDocument();
  });

  test("lista los proyectos activos con su nombre y descripción", async () => {
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    const list = await screen.findByRole("list", { name: "Proyectos" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "Proyecto Antiguo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Aplicación web para administrar sprints."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Portal de Eventos USM" }),
    ).toHaveAttribute("href", "/projects/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
  });

  test("indica cuando un proyecto no tiene descripción", async () => {
    mockedGetProjects.mockResolvedValue([buildProject({ name: "Sin texto" })]);

    renderPage();

    expect(await screen.findByText("Sin descripción")).toBeInTheDocument();
  });

  test("navega al detalle al hacer clic en un proyecto", async () => {
    const user = userEvent.setup();
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    await user.click(
      await screen.findByRole("link", { name: "Portal de Eventos USM" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Detalle" }),
    ).toBeInTheDocument();
  });

  test("muestra un estado vacío con acceso a crear un proyecto", async () => {
    mockedGetProjects.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Aún no hay proyectos")).toBeInTheDocument();
    // Uno en la cabecera y otro en el estado vacío
    expect(
      screen.getAllByRole("link", { name: /Crear proyecto/ }),
    ).toHaveLength(2);
  });

  test("muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    mockedGetProjects
      .mockRejectedValueOnce(new Error("Error obteniendo proyectos"))
      .mockResolvedValueOnce(projects);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo proyectos",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("link", { name: "Portal de Eventos USM" }),
    ).toBeInTheDocument();
    expect(mockedGetProjects).toHaveBeenCalledTimes(2);
  });

  test("filtra por nombre sin distinguir mayúsculas ni tildes", async () => {
    const user = userEvent.setup();
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    await user.type(
      await screen.findByRole("searchbox", { name: "Buscar proyectos" }),
      "GESTION",
    );

    expect(
      screen.getByRole("link", { name: "Sistema de Gestión de Proyectos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Portal de Eventos USM" }),
    ).not.toBeInTheDocument();
  });

  test("filtra también por descripción", async () => {
    const user = userEvent.setup();
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    await user.type(
      await screen.findByRole("searchbox", { name: "Buscar proyectos" }),
      "universitarios",
    );

    expect(
      screen.getByRole("link", { name: "Portal de Eventos USM" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sistema de Gestión de Proyectos" }),
    ).not.toBeInTheDocument();
  });

  test("toma la búsqueda inicial desde la URL", async () => {
    mockedGetProjects.mockResolvedValue(projects);

    renderPage("/projects?q=portal");

    expect(
      await screen.findByRole("searchbox", { name: "Buscar proyectos" }),
    ).toHaveValue("portal");
    expect(
      screen.queryByRole("link", { name: "Sistema de Gestión de Proyectos" }),
    ).not.toBeInTheDocument();
  });

  test("informa cuando la búsqueda no tiene resultados y permite limpiarla", async () => {
    const user = userEvent.setup();
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    const search = await screen.findByRole("searchbox", {
      name: "Buscar proyectos",
    });

    await user.type(search, "inexistente");

    expect(
      screen.getByText("No hay proyectos que coincidan con «inexistente»"),
    ).toBeInTheDocument();

    // El botón del mensaje (el del buscador tiene el mismo nombre)
    await user.click(
      screen.getAllByRole("button", { name: "Limpiar búsqueda" })[1],
    );

    expect(search).toHaveValue("");
    expect(
      within(screen.getByRole("list", { name: "Proyectos" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
  });

  test("las pestañas muestran cuántos proyectos activos y archivados hay", async () => {
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    const tabs = screen.getByRole("navigation", {
      name: "Estado de los proyectos",
    });

    expect(
      await within(tabs).findByRole("link", { name: "Activos 2" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(tabs).getByRole("link", { name: "Archivados 1" }),
    ).toHaveAttribute("href", "/projects/archived");
  });

  test("la vista de archivados lista solo los proyectos archivados", async () => {
    const user = userEvent.setup();
    mockedGetProjects.mockResolvedValue(projects);

    renderPage();

    await user.click(await screen.findByRole("link", { name: "Archivados 1" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Proyectos archivados" }),
    ).toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Proyectos archivados" });

    expect(
      within(list).getByRole("link", { name: "Proyecto Antiguo" }),
    ).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    // En archivados no se ofrece crear proyectos
    expect(
      screen.queryByRole("link", { name: /Crear proyecto/ }),
    ).not.toBeInTheDocument();
  });

  test("muestra un estado vacío propio cuando no hay archivados", async () => {
    mockedGetProjects.mockResolvedValue(projects);
    mockedGetArchivedProjects.mockResolvedValue([]);

    renderPage("/projects/archived");

    expect(
      await screen.findByText("No hay proyectos archivados"),
    ).toBeInTheDocument();
  });
});
