import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import DashboardPage from "./DashboardPage";
import { getBoard } from "../api/board";
import type { Board, BoardItem } from "../api/board";
import { getEpics } from "../api/epics";
import type { Epic } from "../api/epics";
import { getProjectMembers } from "../api/members";
import type { ProjectRole } from "../api/members";
import { ApiError } from "../api/projects";
import { getSprints } from "../api/sprints";
import type { Sprint } from "../api/sprints";
import { TEST_USER, withSession } from "../test/session";

vi.mock("../api/board", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/board")>()),
  getBoard: vi.fn(),
}));

vi.mock("../api/epics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/epics")>()),
  getEpics: vi.fn(),
}));

vi.mock("../api/sprints", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/sprints")>()),
  getSprints: vi.fn(),
}));

vi.mock("../api/members", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/members")>()),
  getProjectMembers: vi.fn(),
}));

const mockedGetBoard = vi.mocked(getBoard);
const mockedGetEpics = vi.mocked(getEpics);
const mockedGetSprints = vi.mocked(getSprints);
const mockedGetProjectMembers = vi.mocked(getProjectMembers);

const PROJECT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function buildItem(overrides: Partial<BoardItem>): BoardItem {
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
    assignee_id: null,
    assignee_name: null,
    ...overrides,
  };
}

function buildEpic(id: string, title: string): Epic {
  return {
    id,
    project_id: PROJECT_ID,
    item_number: 20,
    is_archived: false,
    type: "EPIC",
    title,
    description: null,
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    estimate: null,
    due_date: null,
    created_by: TEST_USER.id,
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
  };
}

function buildSprint(overrides: Partial<Sprint>): Sprint {
  return {
    id: "s1",
    project_id: PROJECT_ID,
    name: "Sprint 4",
    goal: null,
    status: "ACTIVE",
    start_date: "2026-10-20",
    end_date: "2026-11-02",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

// «Hoy» es el 29 de octubre de 2026
const board: Board = {
  project: {
    id: PROJECT_ID,
    name: "Portal web",
    description: null,
    created_by: TEST_USER.id,
    is_archived: false,
    created_at: "2026-09-01T12:00:00Z",
    updated_at: "2026-10-07T12:00:00Z",
  },
  columns: [
    {
      status: "TODO",
      items: [
        buildItem({
          id: "login",
          item_number: 1,
          title: "Pantalla de login",
          estimate: 3,
          assignee_id: TEST_USER.id,
          assignee_name: TEST_USER.name,
          due_date: "2026-10-20",
          sprint_id: "s1",
          parent_id: "e1",
        }),
        buildItem({
          id: "docs",
          item_number: 4,
          title: "Documentar API",
          due_date: "2026-11-10",
        }),
      ],
    },
    {
      status: "IN_PROGRESS",
      items: [
        buildItem({
          id: "menu",
          item_number: 2,
          title: "Corregir menú",
          type: "BUG",
          status: "IN_PROGRESS",
          estimate: 5,
          assignee_id: "u2",
          assignee_name: "Beto Soto",
          due_date: "2026-10-28",
          sprint_id: "s1",
        }),
      ],
    },
    {
      status: "DONE",
      items: [
        buildItem({
          id: "reports",
          item_number: 3,
          title: "Reportes",
          status: "DONE",
          estimate: 2,
          assignee_id: "u2",
          assignee_name: "Beto Soto",
          due_date: "2026-10-01",
          sprint_id: "s1",
          parent_id: "e1",
        }),
      ],
    },
  ],
  archived: [
    buildItem({
      id: "old",
      item_number: 5,
      title: "Prototipo",
      status: "DONE",
      is_archived: true,
      estimate: 1,
      parent_id: "e1",
    }),
  ],
  members: [
    { id: TEST_USER.id, name: TEST_USER.name },
    { id: "u2", name: "Beto Soto" },
    { id: "u3", name: "Carla Díaz" },
  ],
  wip_limits: {},
};

function mockData({
  role = "OWNER",
  sprints = [
    buildSprint({}),
    buildSprint({ id: "s0", name: "Sprint 3", status: "COMPLETED" }),
  ],
  data = board,
}: {
  role?: ProjectRole | null;
  sprints?: Sprint[];
  data?: Board;
} = {}) {
  mockedGetBoard.mockResolvedValue(data);
  mockedGetEpics.mockResolvedValue([
    buildEpic("e1", "Autenticación"),
    buildEpic("e2", "Pagos"),
  ]);
  mockedGetSprints.mockResolvedValue(sprints);
  mockedGetProjectMembers.mockResolvedValue(
    role
      ? [
          {
            id: TEST_USER.id,
            name: TEST_USER.name,
            email: TEST_USER.email,
            role,
          },
        ]
      : [],
  );
}

function renderPage() {
  render(
    withSession(
      <MemoryRouter initialEntries={[`/projects/${PROJECT_ID}/dashboard`]}>
        <Routes>
          <Route path="/projects" element={<h1>Listado</h1>} />
          <Route
            path="/projects/:projectId/dashboard"
            element={<DashboardPage />}
          />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

async function renderLoadedPage() {
  renderPage();

  await screen.findByRole("heading", { level: 1, name: "Panel del proyecto" });
}

function section(name: string) {
  return screen.getByRole("region", { name });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo se falsea la fecha
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 29, 10, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("muestra un estado de carga y pide los datos del proyecto", async () => {
    mockData();

    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando panel…");

    await screen.findByRole("heading", {
      level: 1,
      name: "Panel del proyecto",
    });

    for (const mocked of [
      mockedGetBoard,
      mockedGetEpics,
      mockedGetSprints,
      mockedGetProjectMembers,
    ]) {
      expect(mocked).toHaveBeenCalledWith(PROJECT_ID, expect.any(AbortSignal));
    }
  });

  test.each(["MEMBER", "VIEWER", null] as const)(
    "con el rol %s no muestra el panel",
    async (role) => {
      mockData({ role });

      renderPage();

      expect(
        await screen.findByRole("heading", {
          name: "Panel solo para la jefatura del proyecto",
        }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("region")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Ver tablero" })).toHaveAttribute(
        "href",
        `/projects/${PROJECT_ID}/board`,
      );
    },
  );

  test("un jefe de proyecto también ve el panel", async () => {
    mockData({ role: "ADMIN" });

    await renderLoadedPage();

    expect(section("Avance del proyecto")).toBeInTheDocument();
  });

  test("muestra el avance del proyecto, incluidas las archivadas", async () => {
    mockData();

    await renderLoadedPage();

    const progress = section("Avance del proyecto");

    expect(progress).toHaveTextContent(
      "2 de 5 tareas hechas · 3 de 11 pts · 27 %",
    );
    expect(within(progress).getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "27",
    );
  });

  test("muestra el sprint activo con sus fechas, el plazo y su avance", async () => {
    mockData();

    await renderLoadedPage();

    const sprint = section("Sprint activo");

    expect(
      within(sprint).getByRole("heading", { name: "Sprint 4" }),
    ).toBeInTheDocument();
    expect(sprint).toHaveTextContent("20 oct 2026 – 2 nov 2026");
    expect(sprint).toHaveTextContent("Quedan 4 días");
    expect(sprint).toHaveTextContent(
      "1 de 3 tareas hechas · 2 de 10 pts · 20 %",
    );
    expect(sprint).not.toHaveTextContent("Sprint 3");
  });

  test("avisa si el sprint activo ya debía terminar", async () => {
    mockData({ sprints: [buildSprint({ end_date: "2026-10-25" })] });

    await renderLoadedPage();

    expect(section("Sprint activo")).toHaveTextContent(
      "Atrasado: debía terminar hace 4 días",
    );
  });

  test("sin sprint activo lo indica y enlaza a los sprints", async () => {
    mockData({ sprints: [buildSprint({ status: "PLANNED" })] });

    await renderLoadedPage();

    const sprint = section("Sprint activo");

    expect(sprint).toHaveTextContent("No hay un sprint activo.");
    expect(
      within(sprint).getByRole("link", { name: "Ver sprints" }),
    ).toHaveAttribute("href", `/projects/${PROJECT_ID}/sprints`);
  });

  test("con varios sprints activos muestra todos", async () => {
    mockData({
      sprints: [
        buildSprint({ id: "b", name: "Sprint B", start_date: "2026-10-25" }),
        buildSprint({ id: "a", name: "Sprint A", start_date: "2026-10-15" }),
      ],
    });

    await renderLoadedPage();

    expect(
      within(section("Sprints activos"))
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Sprint A", "Sprint B"]);
  });

  test("muestra cada épica con su porcentaje y enlaza al tablero filtrado", async () => {
    mockData();

    await renderLoadedPage();

    const epics = section("Épicas");

    expect(
      within(epics).getByRole("progressbar", {
        name: "Avance de Autenticación",
      }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(epics).toHaveTextContent("2 de 3 tareas hechas · 3 de 6 pts · 50 %");
    expect(
      within(epics).getByRole("progressbar", { name: "Avance de Pagos" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      within(epics).getByRole("link", { name: "Autenticación" }),
    ).toHaveAttribute("href", `/projects/${PROJECT_ID}/board?epic=e1`);
  });

  test("muestra la carga pendiente por integrante y lo sin asignar", async () => {
    mockData();

    await renderLoadedPage();

    const table = within(section("Carga por integrante")).getByRole("table");
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) =>
        // La primera celda es el encabezado de fila (el integrante)
        Array.from(row.children, (cell) => cell.textContent),
      );

    expect(rows).toEqual([
      ["Beto Soto", "1", "5"],
      [TEST_USER.name, "1", "3"],
      ["Carla Díaz", "0", "0"],
      ["Sin asignar", "1", "0"],
    ]);
    expect(
      within(table).getByRole("link", { name: "Beto Soto" }),
    ).toHaveAttribute("href", `/projects/${PROJECT_ID}/board?assignee=u2`);
    expect(
      within(table).getByRole("link", { name: "Sin asignar" }),
    ).toHaveAttribute("href", `/projects/${PROJECT_ID}/board?assignee=none`);
  });

  test("lista las tareas vencidas con su responsable, de la más atrasada", async () => {
    mockData();

    await renderLoadedPage();

    const overdue = section("Tareas vencidas");
    const items = within(overdue).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(
      `#1Pantalla de login${TEST_USER.name}Venció el 20 oct 2026 · hace 9 días`,
    );
    expect(items[1]).toHaveTextContent(
      "#2Corregir menúBeto SotoVenció el 28 oct 2026 · hace 1 día",
    );
    expect(
      within(items[0]).getByRole("link", { name: /Pantalla de login/ }),
    ).toHaveAttribute("href", `/projects/${PROJECT_ID}/board?task=login`);
  });

  test("sin tareas vencidas lo indica", async () => {
    mockData({
      data: {
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          items: column.items.map((item) => ({ ...item, due_date: null })),
        })),
      },
    });

    await renderLoadedPage();

    expect(section("Tareas vencidas")).toHaveTextContent(
      "No hay tareas vencidas.",
    );
  });

  test("si el proyecto no existe lo indica", async () => {
    mockData();
    mockedGetBoard.mockRejectedValue(
      new ApiError("Proyecto no encontrado", 404),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Proyecto no encontrado" }),
    ).toBeInTheDocument();
  });

  test("si falla la carga muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();

    mockData();
    mockedGetSprints.mockRejectedValueOnce(
      new ApiError("Error obteniendo sprints", 500),
    );

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error obteniendo sprints",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByRole("heading", { name: "Panel del proyecto" }),
    ).toBeInTheDocument();
  });
});
