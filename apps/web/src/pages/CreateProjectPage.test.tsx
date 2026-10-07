import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi, beforeEach } from "vitest";

import CreateProjectPage from "./CreateProjectPage";
import { createProject } from "../api/projects";

vi.mock("../api/projects", () => ({
  createProject: vi.fn(),
}));

const mockedCreateProject = vi.mocked(createProject);

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/projects/new"]}>
      <Routes>
        <Route path="/projects/new" element={<CreateProjectPage />} />

        <Route path="/projects/:projectId" element={<h1>Proyecto</h1>} />
      </Routes>
    </MemoryRouter>,
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
});
