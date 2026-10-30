import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import MyTasksPage from "./MyTasksPage";
import { getAssignedItems } from "../api/myTasks";
import type { AssignedItem } from "../api/myTasks";
import { ApiError } from "../api/projects";
import { TEST_USER, withSession } from "../test/session";

vi.mock("../api/myTasks", () => ({ getAssignedItems: vi.fn() }));

const mockedGetAssignedItems = vi.mocked(getAssignedItems);

function buildItem(overrides: Partial<AssignedItem>): AssignedItem {
  return {
    id: "1",
    item_number: 1,
    is_archived: false,
    parent_id: null,
    sprint_id: null,
    type: "TASK",
    title: "Tarea",
    status: "TODO",
    priority: "MEDIUM",
    estimate: null,
    position: 0,
    due_date: null,
    assignee_id: TEST_USER.id,
    assignee_name: TEST_USER.name,
    project_id: "web",
    project_name: "Portal web",
    ...overrides,
  };
}

// Como las entrega la API: de la fecha más cercana a la más lejana
const items = [
  buildItem({
    id: "login",
    item_number: 4,
    title: "Pantalla de login",
    type: "STORY",
    status: "IN_PROGRESS",
    priority: "HIGH",
    due_date: "2026-10-20",
    project_id: "app",
    project_name: "App móvil",
  }),
  buildItem({
    id: "menu",
    item_number: 2,
    title: "Corregir menú",
    type: "BUG",
    priority: "CRITICAL",
    due_date: "2026-11-05",
  }),
  buildItem({
    id: "push",
    item_number: 7,
    title: "Notificaciones",
    status: "DONE",
    due_date: "2026-11-06",
    project_id: "app",
    project_name: "App móvil",
  }),
  buildItem({ id: "docs", item_number: 9, title: "Documentar API" }),
];

function renderPage(search = "") {
  render(
    withSession(
      <MemoryRouter initialEntries={[`/my-tasks${search}`]}>
        <Routes>
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/projects" element={<h1>Listado</h1>} />
          <Route path="/projects/:projectId/board" element={<h1>Tablero</h1>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

function projectSection(name: string) {
  return screen.getByRole("region", { name });
}

function taskRow(title: string) {
  return screen.getByRole("link", { name: new RegExp(title) }).closest("li")!;
}

describe("MyTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo se falsea la fecha, para que «hoy» sea el 29 de octubre de 2026
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 29, 10, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("pide las tareas del usuario conectado y muestra un estado de carga", async () => {
    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando tus tareas…",
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Mis tareas" }),
    ).toBeInTheDocument();
    expect(mockedGetAssignedItems).toHaveBeenCalledWith(
      TEST_USER.id,
      expect.anything(),
    );
  });

  test("agrupa las tareas pendientes por proyecto, empezando por la más urgente", async () => {
    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage();

    expect(await screen.findByText("3 tareas pendientes")).toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 });

    expect(headings.map((heading) => heading.textContent)).toEqual([
      "App móvil",
      "Portal web",
    ]);
    expect(
      within(projectSection("Portal web"))
        .getAllByRole("link")
        .slice(1)
        .map((link) => link.textContent),
    ).toEqual(["#2Corregir menú", "#9Documentar API"]);
  });

  test("muestra el estado, la prioridad y la fecha límite de cada tarea", async () => {
    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage();

    await screen.findByText("3 tareas pendientes");

    const login = within(taskRow("Pantalla de login"));

    expect(login.getByText("Historia")).toBeInTheDocument();
    expect(login.getByText("En progreso")).toBeInTheDocument();
    expect(login.getByText("Prioridad alta")).toBeInTheDocument();
    expect(login.getByText(/Vence el 20 oct 2026/)).toBeInTheDocument();

    expect(
      within(taskRow("Documentar API")).getByText("Sin fecha límite"),
    ).toBeInTheDocument();
  });

  test("marca como vencidas las tareas pendientes con fecha anterior a hoy", async () => {
    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage();

    await screen.findByText("3 tareas pendientes");

    expect(
      within(taskRow("Pantalla de login")).getByText("Vencida"),
    ).toBeInTheDocument();
    expect(
      within(taskRow("Corregir menú")).queryByText("Vencida"),
    ).not.toBeInTheDocument();
    expect(
      within(taskRow("Documentar API")).queryByText("Vencida"),
    ).not.toBeInTheDocument();
  });

  test("cada tarea enlaza a su ficha en el tablero de su proyecto", async () => {
    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage();

    expect(
      await screen.findByRole("link", { name: /Pantalla de login/ }),
    ).toHaveAttribute("href", "/projects/app/board?task=login");
    expect(screen.getByRole("link", { name: "App móvil" })).toHaveAttribute(
      "href",
      "/projects/app/board",
    );
  });

  test("las terminadas se ocultan, pero se pueden mostrar", async () => {
    const user = userEvent.setup();

    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage();

    const toggle = await screen.findByRole("checkbox", {
      name: "Mostrar terminadas (1)",
    });

    expect(toggle).not.toBeChecked();
    expect(screen.queryByText("Notificaciones")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(
      within(taskRow("Notificaciones")).getByText("Hecho"),
    ).toBeInTheDocument();
    // Una tarea terminada no está vencida aunque su fecha haya pasado
    expect(
      within(taskRow("Notificaciones")).queryByText("Vencida"),
    ).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.queryByText("Notificaciones")).not.toBeInTheDocument();
  });

  test("con ?done=1 muestra las terminadas desde el inicio", async () => {
    mockedGetAssignedItems.mockResolvedValue(items);

    renderPage("?done=1");

    expect(
      await screen.findByRole("checkbox", { name: "Mostrar terminadas (1)" }),
    ).toBeChecked();
    expect(screen.getByText("Notificaciones")).toBeInTheDocument();
  });

  test("sin tareas asignadas muestra un estado vacío", async () => {
    mockedGetAssignedItems.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "No tienes tareas asignadas",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 tareas pendientes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver proyectos" })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  test("si todas están terminadas lo indica y permite mostrarlas", async () => {
    mockedGetAssignedItems.mockResolvedValue([items[2]]);

    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "No tienes tareas pendientes",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Mostrar terminadas (1)" }),
    ).toBeInTheDocument();
  });

  test("si falla la carga muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();

    mockedGetAssignedItems
      .mockRejectedValueOnce(new ApiError("Error obteniendo las tareas", 500))
      .mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo las tareas",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", {
        name: "No tienes tareas asignadas",
      }),
    ).toBeInTheDocument();
    expect(mockedGetAssignedItems).toHaveBeenCalledTimes(2);
  });
});
