import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test } from "vitest";

import Layout from "./Layout";
import { ProjectsContext } from "../context/projectsContext";
import type { Project } from "../api/projects";

function buildProject(id: string, name: string): Project {
  return {
    id,
    name,
    description: null,
    created_by: "11111111-1111-1111-1111-111111111111",
    is_archived: false,
    created_at: "2026-10-07T12:00:00Z",
    updated_at: "2026-10-07T12:00:00Z",
  };
}

const archivedProjects = [buildProject("9", "Proyecto Viejo")];

const projects = [
  buildProject("1", "Proyecto Uno"),
  buildProject("2", "Proyecto Dos"),
  buildProject("3", "Proyecto Tres"),
  buildProject("4", "Proyecto Cuatro"),
];

function renderLayout(initialEntry = "/projects") {
  render(
    <ProjectsContext.Provider
      value={{
        projects,
        archivedProjects,
        isLoading: false,
        error: null,
        reload: async () => {},
      }}
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/projects" element={<h1>Listado</h1>} />
            <Route path="/projects/new" element={<h1>Formulario</h1>} />
            <Route path="/projects/archived" element={<h1>Archivados</h1>} />
            <Route path="/projects/:projectId" element={<h1>Detalle</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ProjectsContext.Provider>,
  );
}

describe("Layout", () => {
  test("muestra en la barra lateral los 3 proyectos más recientes", () => {
    renderLayout();

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Proyecto Uno" }),
    ).toHaveAttribute("href", "/projects/1");
    expect(
      within(nav).getByRole("link", { name: "Proyecto Tres" }),
    ).toBeInTheDocument();
    expect(
      within(nav).queryByRole("link", { name: "Proyecto Cuatro" }),
    ).not.toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Ver todos los proyectos" }),
    ).toHaveAttribute("href", "/projects");
  });

  test("el botón Nuevo proyecto lleva al formulario", async () => {
    const user = userEvent.setup();

    renderLayout();

    await user.click(screen.getByRole("button", { name: "Nuevo proyecto" }));

    expect(
      await screen.findByRole("heading", { name: "Formulario" }),
    ).toBeInTheDocument();
  });

  test("el botón de menú abre y cierra la barra lateral en móvil", async () => {
    const user = userEvent.setup();

    renderLayout();

    const toggle = screen.getByRole("button", { name: "Abrir menú" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(
      screen.getByRole("button", { name: "Cerrar menú" }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: "Abrir menú" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("el menú se cierra al elegir un proyecto", async () => {
    const user = userEvent.setup();

    renderLayout();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await user.click(screen.getByRole("link", { name: "Ver todos los proyectos" }));

    expect(
      screen.getByRole("button", { name: "Abrir menú" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("la carpeta Archivados está cerrada y al abrirla muestra los archivados", async () => {
    const user = userEvent.setup();

    renderLayout();

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal",
    });
    const folder = within(nav).getByRole("button", { name: "Archivados" });

    expect(folder).toHaveAttribute("aria-expanded", "false");
    expect(
      within(nav).queryByRole("link", { name: "Proyecto Viejo" }),
    ).not.toBeInTheDocument();

    await user.click(folder);

    expect(folder).toHaveAttribute("aria-expanded", "true");
    expect(
      within(nav).getByRole("link", { name: "Proyecto Viejo" }),
    ).toHaveAttribute("href", "/projects/9");
    expect(
      within(nav).getByRole("link", { name: "Ver todos los archivados" }),
    ).toHaveAttribute("href", "/projects/archived");
  });

  test("Ver todos los proyectos solo se marca activo en el listado", () => {
    renderLayout("/projects/1");

    const nav = screen.getByRole("navigation", {
      name: "Navegación principal",
    });

    expect(
      within(nav).getByRole("link", { name: "Proyecto Uno" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(nav).getByRole("link", { name: "Ver todos los proyectos" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("Ver todos los proyectos se marca activo en /projects", () => {
    renderLayout("/projects");

    expect(
      screen.getByRole("link", { name: "Ver todos los proyectos" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("la carpeta Archivados se abre sola al estar en la vista de archivados", () => {
    renderLayout("/projects/archived");

    expect(
      screen.getByRole("button", { name: "Archivados" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: "Ver todos los archivados" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
