import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi, beforeEach } from "vitest";

import CreateProjectPage from "./CreateProjectPage";
import { createProject } from "../api/projects";
import { ProjectsContext } from "../context/projectsContext";

vi.mock("../api/projects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/projects")>()),
  createProject: vi.fn(),
}));

const mockedCreateProject = vi.mocked(createProject);

const reloadProjects = vi.fn(async () => {});

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
      <MemoryRouter initialEntries={["/projects/new"]}>
        <Routes>
          <Route path="/projects/new" element={<CreateProjectPage />} />

          <Route path="/projects" element={<h1>Listado</h1>} />
          <Route path="/projects/:projectId" element={<h1>Proyecto</h1>} />
        </Routes>
      </MemoryRouter>
    </ProjectsContext.Provider>,
  );
}

describe("CreateProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("muestra el formulario de creación", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        name: "Nuevo proyecto",
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Nombre/)).toBeRequired();
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute("maxLength", "150");

    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Guardar",
      }),
    ).toBeInTheDocument();
  });

  test("envía los datos y redirige al crear el proyecto", async () => {
    const user = userEvent.setup();

    mockedCreateProject.mockResolvedValue({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      name: "Proyecto Test",
      description: "Descripción Test",
      created_by: "11111111-1111-1111-1111-111111111111",
      is_archived: false,
      created_at: "2026-10-07T00:00:00Z",
      updated_at: "2026-10-07T00:00:00Z",
    });

    renderPage();

    await user.type(screen.getByLabelText(/Nombre/), "Proyecto Test");

    await user.type(screen.getByLabelText("Descripción"), "Descripción Test");

    await user.click(
      screen.getByRole("button", {
        name: "Guardar",
      }),
    );

    expect(mockedCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Proyecto Test",
        description: "Descripción Test",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Proyecto",
      }),
    ).toBeInTheDocument();

    // La lista y la barra lateral se actualizan con el proyecto nuevo
    expect(reloadProjects).toHaveBeenCalledTimes(1);
  });

  test("permite cancelar y volver al listado", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      await screen.findByRole("heading", { name: "Listado" }),
    ).toBeInTheDocument();
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });

  test("muestra un error si la API falla", async () => {
    const user = userEvent.setup();

    mockedCreateProject.mockRejectedValue(new Error("Error creando proyecto"));

    renderPage();

    await user.type(screen.getByLabelText(/Nombre/), "Proyecto Test");

    await user.click(
      screen.getByRole("button", {
        name: "Guardar",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error creando proyecto",
    );
  });

  test("no envía el formulario si el nombre solo tiene espacios", async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(screen.getByLabelText(/Nombre/), "   ");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El nombre del proyecto es obligatorio.",
    );
    expect(mockedCreateProject).not.toHaveBeenCalled();
  });
});
